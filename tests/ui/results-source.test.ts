import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

const REFUSAL_CODES = [
  'NO_COMPATIBLE_METHOD',
  'INSUFFICIENT_EVIDENCE',
  'UNSTABLE_TOP_THREE',
  'CRITICAL_COVERAGE_GAP',
  'CONFLICTING_REQUIREMENTS',
] as const

describe('AutoSelect results source contract', () => {
  it('worker imports routeMethods only from the landed index and stays DOM-free', () => {
    const worker = readSource('app/workers/router.worker.ts')
    assert.match(worker, /from ['"]\.\.\/core\/router\/index\.ts['"]/)
    assert.match(worker, /handleRouterWorkerRequest/)
    assert.match(worker, /\bself\b/)
    assert.equal(worker.includes('window'), false)
    assert.equal(worker.includes('document'), false)
    assert.equal(worker.includes('vue'), false)
    assert.equal(worker.includes('Vue'), false)
    assert.equal((worker.match(/routeMethods/g) ?? []).length > 0, true)
    assert.equal(worker.includes('../core/router/recommend'), false)
  })

  it('useRouterWorker loads all six observation groups and never calls routeMethods', () => {
    const composable = readSource('app/composables/useRouterWorker.ts')
    assert.match(composable, /loadRouterCatalog/)
    assert.match(composable, /loadRouterRelease/)
    assert.match(composable, /loadObservationGroups/)
    for (const group of [
      'latent_geometry',
      'continuity',
      'trajectory',
      'stability',
      'biology',
      'resources',
    ]) {
      assert.match(composable, new RegExp(`['"]${group}['"]`))
    }
    assert.equal(/requiredObservationGroups\s*\(/.test(composable), false)
    assert.match(composable, /ROUTER_VERSION/)
    assert.match(composable, /routerVersion:\s*ROUTER_VERSION/)
    assert.match(composable, /type:\s*['"]ROUTE['"]/)
    assert.match(composable, /type:\s*['"]CANCEL['"]/)
    assert.match(composable, /requestId/)
    assert.equal(composable.includes('routeMethods'), false)
    assert.equal(composable.includes('window'), false)
    assert.equal(composable.includes('document'), false)
  })

  it('ignores delayed worker failures from a discarded worker instance', () => {
    const composable = readSource('app/composables/useRouterWorker.ts')
    assert.match(
      composable,
      /if \(worker !== instance\) return[\s\S]*?applyWorkerFailure\?\./,
      'a stale worker error must not overwrite the replacement run',
    )
  })

  it('RecommendationCard shows roles, metrics, fractional ESS, and evidence details', () => {
    const card = readSource('app/components/autoselect/RecommendationCard.vue')
    assert.match(card, /roles/)
    assert.match(card, /methodId/)
    assert.match(card, /version/)
    assert.match(card, /paretoLayer/)
    assert.match(card, /outrankingFlow/)
    assert.match(card, /conservativeUtility/)
    assert.match(card, /confidence/)
    assert.match(card, /topThreeRetention/)
    assert.match(card, /effectiveDatasets/)
    assert.match(card, /criticalCoverage/)
    assert.match(card, /positiveEvidenceDetails/)
    assert.match(card, /score/)
    assert.match(card, /baseline/)
    assert.match(card, /contribution/)
    assert.match(card, /limitations/)
    assert.match(card, /confidenceReasons/)
    assert.match(card, /alternativeDispositions/)
    assert.equal(card.includes('Math.floor'), false)
    assert.equal(card.includes('Math.trunc'), false)
    assert.equal(card.includes('parseInt'), false)
    assert.equal(card.includes('toFixed(0)'), false)
    assert.equal(/universally best|the best method/i.test(card), false)
  })

  it('ReceiptStrip shows fingerprint, release id, synthetic, and both digests', () => {
    const strip = readSource('app/components/autoselect/ReceiptStrip.vue')
    assert.match(strip, /profileFingerprint/)
    assert.match(strip, /release\.id|receipt\.release\.id/)
    assert.match(strip, /synthetic/)
    assert.match(strip, /configDigest/)
    assert.match(strip, /evidenceDigest/)
  })

  it('RefusalPanel maps every RefusalCode and keeps exact-tie language first-class', () => {
    const panel = readSource('app/components/autoselect/RefusalPanel.vue')
    for (const code of REFUSAL_CODES) {
      assert.match(panel, new RegExp(code), `${code} must have a sentence`)
    }
    assert.match(panel, /candidates/)
    assert.match(panel, /evidenceGaps/)
    assert.match(panel, /exact tie/)
    assert.equal(/winner|universally best|recommended method/i.test(panel) && panel.includes('never invents'), false)
    assert.equal(/invent a winner|invented winner/i.test(panel) || panel.includes('does not invent'), true)
  })

  it('shell renders success or refusal through the worker and does not rank on the page', () => {
    const shell = readSource('app/components/autoselect/AutoSelectShell.vue')
    const results = readSource('app/components/autoselect/RecommendationResults.vue')
    assert.match(shell, /useRouterWorker/)
    assert.match(shell, /RecommendationResults|RefusalPanel/)
    assert.match(shell, /currentBoundOutcome|visibleOutcome/)
    assert.equal(shell.includes('routeMethods'), false)
    assert.match(results, /RecommendationCard/)
    assert.match(results, /RefusalPanel/)
    assert.match(results, /ReceiptStrip/)
  })
})
