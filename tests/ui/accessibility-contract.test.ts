import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function listVueFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry)
    if (statSync(full).isDirectory()) {
      files.push(...listVueFiles(full))
      continue
    }
    if (entry.endsWith('.vue')) files.push(relative(root, full).replaceAll('\\', '/'))
  }
  return files.sort()
}

const AUTOSELECT_VUE = [
  'app/pages/autoselect/index.vue',
  ...listVueFiles(resolve(root, 'app/components/autoselect')),
]

const CHOICE_GROUP_CONSUMERS = AUTOSELECT_VUE.filter((file) => {
  if (file.endsWith('ChoiceGroup.vue')) return false
  return readSource(file).includes('<ChoiceGroup')
})

function inputTags(source: string): string[] {
  return [...source.matchAll(/<input\b[^>]*>/g)].map((match) => match[0])
}

function buttonBlocks(source: string): string[] {
  return [...source.matchAll(/<button\b[\s\S]*?<\/button>/g)].map((match) => match[0])
}

function isLabeledRangeOrNumber(source: string, tag: string): boolean {
  if (/aria-label=/.test(tag) || /:aria-label=/.test(tag)) return true
  const index = source.indexOf(tag)
  if (index < 0) return false
  const before = source.slice(0, index)
  const lastLabel = before.lastIndexOf('<label')
  if (lastLabel < 0) return false
  return !before.slice(lastLabel).includes('</label>')
}

describe('AutoSelect accessibility source contract', () => {
  it('has exactly one h1 on the AutoSelect page', () => {
    const source = readSource('app/pages/autoselect/index.vue')
    assert.equal((source.match(/<h1[\s>]/g) ?? []).length, 1)
  })

  it('uses fieldset and legend on every ChoiceGroup consumer', () => {
    assert.ok(CHOICE_GROUP_CONSUMERS.length > 0, 'expected ChoiceGroup consumers')
    for (const file of CHOICE_GROUP_CONSUMERS) {
      const source = readSource(file)
      assert.match(source, /<fieldset/, `${file} must use <fieldset>`)
      assert.match(source, /<legend/, `${file} must use <legend>`)
    }
    const choiceGroup = readSource('app/components/autoselect/ChoiceGroup.vue')
    assert.match(choiceGroup, /<fieldset/)
    assert.match(choiceGroup, /<legend/)
  })

  it('labels every range and number input', () => {
    let found = 0
    for (const file of AUTOSELECT_VUE) {
      const source = readSource(file)
      for (const tag of inputTags(source)) {
        if (!/type="(range|number)"/.test(tag)) continue
        found += 1
        assert.equal(
          isLabeledRangeOrNumber(source, tag),
          true,
          `${file} ${tag} must have a label or aria-label`,
        )
      }
    }
    assert.ok(found > 0, 'expected range or number inputs')
  })

  it('announces loading, errors, and the goal cap through aria-live', () => {
    const shell = readSource('app/components/autoselect/AutoSelectShell.vue')
    const goals = readSource('app/components/autoselect/steps/GoalsStep.vue')
    assert.match(goals, /aria-live/)
    assert.match(shell, /status === 'loading'[\s\S]{0,240}aria-live|aria-live[\s\S]{0,240}status === 'loading'/)
    assert.match(shell, /status === 'error'[\s\S]{0,240}aria-live|aria-live[\s\S]{0,240}status === 'error'/)
    assert.match(shell, /validationMessage[\s\S]{0,200}aria-live|aria-live[\s\S]{0,200}validationMessage/)
  })

  it('shows high, medium, or low confidence text beside any color class', () => {
    const card = readSource('app/components/autoselect/RecommendationCard.vue')
    assert.match(card, /recommendation\.confidence/)
    assert.match(card, /\bhigh\b/)
    assert.match(card, /\bmedium\b/)
    assert.match(card, /\blow\b/)
    for (const file of AUTOSELECT_VUE) {
      const source = readSource(file)
      const usesConfidenceColor = /confidence/i.test(source)
        && /(?:text|bg|border)-(?:red|green|emerald|amber|yellow|orange)-/.test(source)
      if (!usesConfidenceColor) continue
      assert.match(source, /\bhigh\b/, `${file} must not encode confidence with color alone`)
      assert.match(source, /\bmedium\b/, `${file} must not encode confidence with color alone`)
      assert.match(source, /\blow\b/, `${file} must not encode confidence with color alone`)
    }
  })

  it('does not accept a file upload', () => {
    for (const file of AUTOSELECT_VUE) {
      const source = readSource(file)
      assert.equal(/type\s*=\s*["']file["']/.test(source), false, `${file} must not use type="file"`)
      assert.equal(source.includes('enctype='), false, `${file} must not set enctype=`)
    }
  })

  it('gives Back, Continue, and download buttons a 44px minimum height', () => {
    let found = 0
    for (const file of AUTOSELECT_VUE) {
      const source = readSource(file)
      for (const button of buttonBlocks(source)) {
        if (!/\b(Back|Continue|Download)\b/.test(button)) continue
        found += 1
        assert.match(
          button,
          /min-h-11|min-h-\[44px\]/,
          `${file} Back/Continue/download button must use min-h-11 or min-h-[44px]`,
        )
      }
    }
    assert.ok(found >= 3, 'expected Back, Continue, and download buttons')
  })

  it('honors prefers-reduced-motion on the page wrapper', () => {
    const page = readSource('app/pages/autoselect/index.vue')
    assert.match(page, /prefers-reduced-motion|motion-reduce/)
    assert.match(page, /autoselect-page|class=/)
  })
})
