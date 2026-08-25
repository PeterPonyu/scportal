import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '..')
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const javascriptExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs'])
const forbiddenGlobals = new Set(['window', 'document', 'fetch', 'globalThis', 'eval', 'Function'])

function compareCodeUnits(left, right) { return left < right ? -1 : left > right ? 1 : 0 }

function sourceFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => compareCodeUnits(left.name, right.name))
    .flatMap((entry) => entry.isDirectory() ? sourceFiles(resolve(directory, entry.name)) : sourceExtensions.has(extname(entry.name)) ? [resolve(directory, entry.name)] : [])
}

function isWithin(directory, file) {
  const path = relative(directory, file)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !path.includes(`..${sep}`))
}

function sourceFileKind(file) {
  if (extname(file) === '.tsx') return ts.ScriptKind.TSX
  if (extname(file) === '.jsx') return ts.ScriptKind.JSX
  return javascriptExtensions.has(extname(file)) ? ts.ScriptKind.JS : ts.ScriptKind.TS
}

function lineColumn(sourceFile, position) {
  const point = sourceFile.getLineAndCharacterOfPosition(position)
  return `${point.line + 1}:${point.character + 1}`
}

function finding(findings, sourceFile, node, message) {
  findings.add(`${sourceFile.fileName}:${lineColumn(sourceFile, node.getStart(sourceFile))} ${message}`)
}

function bindingNames(name) {
  if (ts.isIdentifier(name)) return [name.text]
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) return name.elements.flatMap((element) => ts.isOmittedExpression(element) ? [] : bindingNames(element.name))
  return []
}

function hasModifier(node, kind) { return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind)) }

function isRuntimeDeclaration(node) {
  if (hasModifier(node, ts.SyntaxKind.DeclareKeyword) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) return false
  if (ts.isEnumDeclaration(node)) return !hasModifier(node, ts.SyntaxKind.ConstKeyword)
  return true
}

function scanBindings(node, scope, scopes) {
  const add = (names, target = scope) => names.forEach((name) => target.bindings.add(name))
  const hoistTarget = () => {
    let target = scope
    while (target.parent && !target.functionLike && !target.source) target = target.parent
    return target
  }
  if (ts.isVariableDeclarationList(node)) {
    const target = (node.flags & ts.NodeFlags.BlockScoped) ? scope : hoistTarget()
    node.declarations.forEach((declaration) => add(bindingNames(declaration.name), target))
  }
  for (const child of node.statements ?? node.elements ?? []) {
    if (ts.isVariableStatement(child)) {
      const target = (child.declarationList.flags & ts.NodeFlags.BlockScoped) ? scope : hoistTarget()
      child.declarationList.declarations.forEach((declaration) => add(bindingNames(declaration.name), target))
    } else if ((ts.isFunctionDeclaration(child) || ts.isClassDeclaration(child) || ts.isModuleDeclaration(child) || ts.isEnumDeclaration(child)) && child.name && isRuntimeDeclaration(child)) {
      add([child.name.text])
    } else if (ts.isImportDeclaration(child) && child.importClause && !child.importClause.isTypeOnly) {
      const clause = child.importClause
      if (clause.name) add([clause.name.text])
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) add([clause.namedBindings.name.text])
        else clause.namedBindings.elements.filter((element) => !element.isTypeOnly).forEach((element) => add([element.name.text]))
      }
    } else if (ts.isImportEqualsDeclaration(child) && !child.isTypeOnly) add([child.name.text])
  }
  ts.forEachChild(node, (child) => {
    if (ts.isFunctionLike(child) || ts.isBlock(child) || ts.isCatchClause(child) || ts.isModuleDeclaration(child) || ts.isForStatement(child) || ts.isForInStatement(child) || ts.isForOfStatement(child) || ts.isCaseBlock(child)) {
      const childScope = { parent: scope, bindings: new Set(), functionLike: ts.isFunctionLike(child), source: false }
      scopes.set(child, childScope)
      if (ts.isFunctionLike(child)) {
        if (child.name && ts.isIdentifier(child.name)) childScope.bindings.add(child.name.text)
        child.parameters.forEach((parameter) => add(bindingNames(parameter.name), childScope))
      }
      if (ts.isCatchClause(child) && child.variableDeclaration) add(bindingNames(child.variableDeclaration.name), childScope)
      scanBindings(child, childScope, scopes)
    } else scanBindings(child, scope, scopes)
  })
}

function isPropertyName(identifier) {
  const parent = identifier.parent
  return (ts.isPropertyAccessExpression(parent) && parent.name === identifier)
    || (ts.isPropertyAssignment(parent) && parent.name === identifier)
    || (ts.isPropertyDeclaration(parent) && parent.name === identifier)
    || (ts.isPropertySignature(parent) && parent.name === identifier)
    || (ts.isMethodDeclaration(parent) && parent.name === identifier)
    || (ts.isMethodSignature(parent) && parent.name === identifier)
    || (ts.isBindingElement(parent) && parent.propertyName === identifier)
}

function resolves(scope, name) { for (let current = scope; current; current = current.parent) if (current.bindings.has(name)) return true; return false }

function resolveRelativeTarget(file, specifier) {
  const candidate = resolve(dirname(file), specifier)
  const candidates = [candidate, ...[...sourceExtensions].map((extension) => `${candidate}${extension}`), ...[...sourceExtensions].map((extension) => resolve(candidate, `index${extension}`))]
  return candidates.find((target) => existsSync(target) && statSync(target).isFile())
}

function allowedJsonAdapter(root, file, specifier, node) {
  const allowed = new Set(['../../../data/router/methods.json', '../../../data/router/config-templates.json'])
  return ts.isImportDeclaration(node) && resolve(file) === resolve(root, 'app/core/config/compiler.ts') && allowed.has(specifier)
    && Boolean(node.attributes?.elements.some((element) => element.name.getText() === 'type' && element.value?.text === 'json'))
}

// Pure serialization adapter: this is the only bare runtime dependency allowed in Router/config core.
function allowedBareModuleAdapter(root, file, specifier, node) {
  return ts.isImportDeclaration(node) && resolve(file) === resolve(root, 'app/core/config/serialize.ts') && specifier === 'yaml'
}

function typescriptOnly(node) {
  return ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isTypeAssertionExpression(node)
    || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node) || ts.isImportTypeNode(node)
    || ts.isTypeParameterDeclaration(node) || (ts.isVariableDeclaration(node) && Boolean(node.type)) || (ts.isParameter(node) && Boolean(node.type))
    || (ts.isFunctionDeclaration(node) && (Boolean(node.type) || Boolean(node.typeParameters)))
}

function isDeclarationOrTypeIdentifier(identifier) {
  const parent = identifier.parent
  if ((ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)) && parent.name === identifier) return true
  if ((ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isClassDeclaration(parent) || ts.isClassExpression(parent) || ts.isModuleDeclaration(parent) || ts.isEnumDeclaration(parent) || ts.isInterfaceDeclaration(parent) || ts.isTypeAliasDeclaration(parent)) && parent.name === identifier) return true
  if ((ts.isImportClause(parent) || ts.isImportSpecifier(parent) || ts.isNamespaceImport(parent) || ts.isImportEqualsDeclaration(parent)) && parent.name === identifier) return true
  for (let current = parent; current && !ts.isSourceFile(current); current = current.parent) if (ts.isTypeNode(current)) return true
  return false
}

function isBindingIdentifier(identifier) {
  const parent = identifier.parent
  return ((ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)) && parent.name === identifier)
    || ((ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isClassDeclaration(parent) || ts.isClassExpression(parent) || ts.isModuleDeclaration(parent) || ts.isEnumDeclaration(parent)) && parent.name === identifier)
    || ((ts.isImportClause(parent) || ts.isImportSpecifier(parent) || ts.isNamespaceImport(parent) || ts.isImportEqualsDeclaration(parent)) && parent.name === identifier)
}

function scanFile(root, file) {
  const text = readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(relative(root, file), text, ts.ScriptTarget.ESNext, true, sourceFileKind(file))
  const findings = new Set()
  for (const diagnostic of sourceFile.parseDiagnostics) finding(findings, sourceFile, { getStart: () => diagnostic.start ?? 0 }, `parse diagnostic: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`)
  const rootScope = { parent: null, bindings: new Set(), functionLike: true, source: true }
  const scopes = new Map([[sourceFile, rootScope]])
  scanBindings(sourceFile, rootScope, scopes)
  const coreDirectory = resolve(root, 'app/core')
  const checkSpecifier = (node, specifier, kind) => {
    if (allowedJsonAdapter(root, file, specifier, node) || allowedBareModuleAdapter(root, file, specifier, node)) return
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) finding(findings, sourceFile, node, `forbidden module specifier: ${specifier}`)
    else {
      const target = resolveRelativeTarget(file, specifier)
      const rawTarget = resolve(dirname(file), specifier)
      if (!isWithin(coreDirectory, rawTarget)) finding(findings, sourceFile, node, `dependency escapes app/core: ${specifier}`)
      else if (!target) finding(findings, sourceFile, node, `unresolved relative dependency: ${specifier}`)
    }
    if (kind === 'require') finding(findings, sourceFile, node, 'direct require is forbidden')
  }
  const visit = (node, scope) => {
    const current = scopes.get(node) ?? scope
    if (javascriptExtensions.has(extname(file)) && typescriptOnly(node)) finding(findings, sourceFile, node, 'TypeScript-only syntax in JavaScript module')
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) checkSpecifier(node, node.moduleSpecifier.text, 'import')
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) checkSpecifier(node, node.moduleSpecifier.text, 'export')
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const specifier = node.moduleReference.expression
      if (!specifier || !ts.isStringLiteral(specifier)) {
        finding(findings, sourceFile, node, 'nonliteral require is forbidden')
        finding(findings, sourceFile, node, 'direct require is forbidden')
      } else checkSpecifier(node, specifier.text, 'require')
    }
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) finding(findings, sourceFile, node.expression, 'nonliteral dynamic import is forbidden')
        else checkSpecifier(node, node.arguments[0].text, 'import')
      }
      if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
        if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) finding(findings, sourceFile, node.expression, 'nonliteral require is forbidden')
        else checkSpecifier(node, node.arguments[0].text, 'require')
      }
    }
    if (ts.isIdentifier(node) && node.text === 'require' && isBindingIdentifier(node)) finding(findings, sourceFile, node, 'local require binding is forbidden')
    if (ts.isIdentifier(node) && !isPropertyName(node) && !isDeclarationOrTypeIdentifier(node)) {
      if (node.text === 'require' && resolves(current, 'require')) finding(findings, sourceFile, node, 'local require binding is forbidden')
      else if (node.text === 'require' && ts.isCallExpression(node.parent) && node.parent.expression === node) { /* direct require is reported above */ }
      else if ((forbiddenGlobals.has(node.text) || node.text === 'require') && !resolves(current, node.text)) finding(findings, sourceFile, node, `forbidden unshadowed global: ${node.text}`)
    }
    ts.forEachChild(node, (child) => visit(child, current))
  }
  visit(sourceFile, rootScope)
  return [...findings]
}

export function scanRouterBoundaries(root = repositoryRoot) {
  return sourceFiles(resolve(root, 'app/core/router')).concat(sourceFiles(resolve(root, 'app/core/config'))).flatMap((file) => scanFile(root, file)).sort(compareCodeUnits)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = scanRouterBoundaries()
  if (findings.length) {
    console.error(findings.join('\n'))
    process.exitCode = 1
  }
}
