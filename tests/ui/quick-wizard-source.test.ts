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
})
