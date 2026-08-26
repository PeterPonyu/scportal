import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

const STEP_FILES = [
  'app/components/autoselect/steps/DataStep.vue',
  'app/components/autoselect/steps/GoalsStep.vue',
  'app/components/autoselect/steps/TopologyStep.vue',
  'app/components/autoselect/steps/PriorsStep.vue',
  'app/components/autoselect/steps/PrioritiesStep.vue',
  'app/components/autoselect/steps/EnvironmentStep.vue',
  'app/components/autoselect/steps/ReviewStep.vue',
] as const

const WIZARD_SOURCE_FILES = [
  'app/pages/autoselect/index.vue',
  'app/components/autoselect/AutoSelectShell.vue',
  'app/components/autoselect/AutoSelectStepper.vue',
  'app/components/autoselect/ChoiceGroup.vue',
  ...STEP_FILES,
] as const

const RELEVANT_OPTION_LIST_FILES = [
  'app/components/autoselect/steps/DataStep.vue',
  'app/components/autoselect/steps/TopologyStep.vue',
  'app/components/autoselect/steps/PriorsStep.vue',
] as const

describe('AutoSelect Quick wizard source contract', () => {
  it('uses fieldset and legend on every step', () => {
    for (const file of STEP_FILES) {
      const source = readSource(file)
      assert.match(source, /<fieldset/, `${file} must use <fieldset>`)
      assert.match(source, /<legend/, `${file} must use <legend>`)
    }
  })

  it('does not accept a file upload or multipart form encoding', () => {
    for (const file of WIZARD_SOURCE_FILES) {
      const source = readSource(file)
      assert.equal(source.includes('<input type="file">'), false, `${file} must not use <input type="file">`)
      assert.equal(source.includes('enctype='), false, `${file} must not set enctype=`)
    }
  })

  it('keeps Unknown as a first-class choice on relevant option lists', () => {
    for (const file of RELEVANT_OPTION_LIST_FILES) {
      const source = readSource(file)
      assert.match(source, /Unknown/, `${file} must include Unknown`)
    }
  })

  it('announces the Goals cap through aria-live', () => {
    assert.match(readSource('app/components/autoselect/steps/GoalsStep.vue'), /aria-live/)
  })

  it('states that no expression matrix leaves the browser', () => {
    assert.match(
      readSource('app/components/autoselect/steps/ReviewStep.vue'),
      /No expression matrix or cell-level data leaves this browser\./,
    )
  })

  it('adds AutoSelect to the header navigation', () => {
    assert.match(
      readSource('app/components/AppHeader.vue'),
      /\{\s*to:\s*'\/autoselect',\s*label:\s*'AutoSelect'\s*\}/,
    )
  })

  it('keeps PrioritiesStep read-only with no range or number inputs', () => {
    const source = readSource('app/components/autoselect/steps/PrioritiesStep.vue')
    assert.equal(source.includes('type="range"'), false, 'PrioritiesStep must not use type="range"; WeightEditor is the only weight editor')
    assert.equal(source.includes('type="number"'), false, 'PrioritiesStep must not use type="number"')
    assert.match(source, /locked in Quick/)
    assert.match(source, /switch to Advanced to edit weights/)
    assert.match(source, /edit weights in Advanced controls above/i)
    assert.equal(source.includes('update:weights'), false, 'PrioritiesStep must not emit weight changes')
  })

  it('hides EnvironmentStep evidence and seed inputs unless Advanced', () => {
    const source = readSource('app/components/autoselect/steps/EnvironmentStep.vue')
    assert.match(source, /v-if="mode === 'advanced'"/)
    assert.match(source, /minEffectiveDatasets/)
    assert.match(source, /minCriticalCoverage/)
    assert.match(source, /seed/)
    assert.match(source, /Maximum resource tier/)
    const unguardedThreshold = source
      .split(/v-if="mode === 'advanced'"/)
      .at(0) ?? source
    assert.equal(unguardedThreshold.includes('minEffectiveDatasets'), false)
    assert.equal(unguardedThreshold.includes('minCriticalCoverage'), false)
  })

  it('passes mode into Priorities, Environment, and Review, and reviews candidate methods', () => {
    const shell = readSource('app/components/autoselect/AutoSelectShell.vue')
    const review = readSource('app/components/autoselect/steps/ReviewStep.vue')
    assert.match(shell, /<PrioritiesStep[\s\S]*?:mode="state\.mode"/)
    assert.match(shell, /<EnvironmentStep[\s\S]*?:mode="state\.mode"/)
    assert.match(shell, /<ReviewStep[\s\S]*?:mode="state\.mode"/)
    assert.match(shell, /:candidate-method-ids="state\.candidateMethodIds"/)
    assert.match(review, /candidateMethodIds/)
    assert.match(review, /all catalog methods/)
  })
})
