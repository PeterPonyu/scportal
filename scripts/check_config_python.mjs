import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultGenerator = resolve(repositoryRoot, 'tests/config/fixtures/python-snippets.mjs')
const execFileAsync = promisify(execFile)

export async function checkPythonSnippets({ generator = defaultGenerator, python = 'python3' } = {}) {
  const directory = await mkdtemp(resolve(tmpdir(), 'scportal-config-python-'))
  const output = resolve(directory, 'snippets.py')
  try {
    try {
      await execFileAsync(process.execPath, ['--experimental-strip-types', generator, output], { cwd: repositoryRoot, encoding: 'utf8' })
    } catch (error) {
      const failure = error && typeof error === 'object' ? error : {}
      throw new Error(`Python snippet generator exited with status ${failure.code ?? 'unknown'}: ${failure.stderr?.trim?.() ?? (error instanceof Error ? error.message : String(error))}`)
    }
    const generated = await readFile(output, 'utf8')
    try {
      await execFileAsync(python, ['-c', 'import ast, sys; ast.parse(sys.argv[1])', generated], { cwd: repositoryRoot, encoding: 'utf8' })
    } catch (error) {
      const failure = error && typeof error === 'object' ? error : {}
      throw new Error(`Python parser exited with status ${failure.code ?? 'unknown'}: ${failure.stderr?.trim?.() ?? (error instanceof Error ? error.message : String(error))}`)
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await checkPythonSnippets()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
