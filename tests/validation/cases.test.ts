import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = resolve(import.meta.dirname, '../..')

async function readJson(relative: string) {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8'))
}

const BLOCKED = [
  'Router found the true fate',
  'radiation causes the inferred program',
  'Dapp1 causality established by Router',
  'sleep deprivation validates trajectory reconstruction',
] as const

const ALLOWED = [
  'workflow applicability',
  'method-selection recommendation',
  'hypothesis-generating biological concordance',
] as const

describe('bounded hematopoietic case identities', () => {
  it('rejects GSE280270 labeled radiation', async () => {
    const { assertAccessionIdentity } = await import('../../validation/src/case-profiles.ts')
    assert.throws(
      () => assertAccessionIdentity({
        accession: 'GSE280270',
        biology: 'human UCB labeled as radiation injury',
        labels: ['radiation'],
      }),
      /radiation|identity|mislabeled/i,
    )
  })

  it('rejects GSE277292 labeled radiation', async () => {
    const { assertAccessionIdentity } = await import('../../validation/src/case-profiles.ts')
    assert.throws(
      () => assertAccessionIdentity({
        accession: 'GSE277292',
        biology: 'mouse LSK Dapp1 knockout described as radiation',
        labels: ['radiation'],
      }),
      /radiation|identity|mislabeled/i,
    )
  })

  it('rejects GSE278673 labeled chemotherapy or IRALL', async () => {
    const { assertAccessionIdentity } = await import('../../validation/src/case-profiles.ts')
    assert.throws(
      () => assertAccessionIdentity({
        accession: 'GSE278673',
        biology: 'mouse LSK chemotherapy time course',
        labels: ['chemotherapy'],
      }),
      /chemotherapy|IRALL|identity|mislabeled/i,
    )
    assert.throws(
      () => assertAccessionIdentity({
        accession: 'GSE278673',
        biology: 'IRALL hematopoietic injury',
        labels: ['IRALL'],
      }),
      /chemotherapy|IRALL|identity|mislabeled/i,
    )
  })

  it('rejects GSE280145 treated as a longitudinal differentiation trajectory', async () => {
    const { assertAccessionIdentity } = await import('../../validation/src/case-profiles.ts')
    assert.throws(
      () => assertAccessionIdentity({
        accession: 'GSE280145',
        biology: 'sleep-deprivation longitudinal differentiation trajectory',
        goals: ['trajectory_reconstruction'],
        topology: 'linear',
      }),
      /trajectory|longitudinal|identity|mislabeled/i,
    )
  })

  it('rejects any case described as a new causal experiment', async () => {
    const { assertAccessionIdentity, reservedCases } = await import('../../validation/src/case-profiles.ts')
    for (const row of reservedCases()) {
      assert.throws(
        () => assertAccessionIdentity({
          accession: row.accession,
          biology: `${row.biology}; new causal experiment`,
          claim: 'This is a new causal experiment',
        }),
        /causal|identity|mislabeled/i,
      )
    }
  })

  it('keeps the four reserved accessions correctly bounded', async () => {
    const { reservedCases, assertAccessionIdentity } = await import('../../validation/src/case-profiles.ts')
    const frozen = await readJson('validation/cases.json') as Array<{ id: string; role: string; biology: string }>
    const cases = reservedCases()
    assert.equal(cases.length, 4)
    assert.deepEqual(cases.map((row) => row.id), frozen.map((row) => row.id))

    const byId = Object.fromEntries(cases.map((row) => [row.id, row]))
    const ucb = byId.gse280270_ucb_tpo
    assert.equal(ucb.accession, 'GSE280270')
    assert.equal(ucb.role, 'external_holdout')
    assert.equal(ucb.profile.modality, 'scrna')
    assert.deepEqual(ucb.profile.goals, ['trajectory_reconstruction', 'lineage_contribution'])
    assert.equal(ucb.profile.priors.time, true)
    assert.match(ucb.biology, /megakaryocyte|UCB|TPO|D0-D14/i)
    assert.equal(/radiation/i.test(ucb.biology), false)

    const dapp1 = byId.gse277292_dapp1
    assert.equal(dapp1.accession, 'GSE277292')
    assert.equal(dapp1.role, 'application_case')
    assert.equal(dapp1.profile.modality, 'scrna')
    assert.deepEqual(dapp1.profile.goals, ['fate_decision', 'lineage_contribution'])
    assert.equal(dapp1.profile.priors.perturbation, true)
    assert.notEqual(dapp1.profile.priors.time, true)
    assert.match(dapp1.biology, /Dapp1|knockout|wild type/i)
    assert.equal(/radiation/i.test(dapp1.biology), false)

    const radiation = byId.gse278673_radiation
    assert.equal(radiation.accession, 'GSE278673')
    assert.equal(radiation.role, 'application_case')
    assert.equal(radiation.profile.modality, 'scrna')
    assert.deepEqual(radiation.profile.goals, ['trajectory_reconstruction', 'fate_decision'])
    assert.equal(radiation.profile.priors.time, true)
    assert.equal(radiation.profile.topology, 'bifurcating')
    assert.match(radiation.biology, /radiation/i)
    assert.equal(/chemotherapy|IRALL/i.test(radiation.biology), false)

    const sleep = byId.gse280145_sleep_deprivation
    assert.equal(sleep.accession, 'GSE280145')
    assert.equal(sleep.role, 'supplemental_case')
    assert.equal(sleep.profile.modality, 'scrna')
    assert.deepEqual(sleep.profile.goals, ['latent_representation', 'lineage_contribution'])
    assert.equal(sleep.profile.topology, 'unknown')
    assert.equal(sleep.profile.perturbation, true)
    assert.equal(sleep.profile.goals.includes('trajectory_reconstruction'), false)
    assert.match(sleep.biology, /sleep-deprivation|non-trajectory/i)
    assert.equal(/longitudinal differentiation trajectory/i.test(sleep.biology), false)

    for (const row of cases) {
      assertAccessionIdentity(row)
      assert.equal(row.profile.seed, 20260823)
      assert.equal(/new causal experiment/i.test(`${row.biology} ${row.claimCeiling}`), false)
      assert.equal(/published case evidence/i.test(row.claimCeiling), false)
    }
  })
})

describe('nonclaim wording ceilings', () => {
  it('blocks causal and fate-true wording and lists allowed ceilings', async () => {
    const nonclaims = await readJson('validation/nonclaims.json')
    const { scanNonclaims } = await import('../../validation/src/case-profiles.ts')
    const blocked = new Set((nonclaims.blocked as string[]).map((phrase) => phrase.toLowerCase()))
    for (const phrase of BLOCKED) {
      assert.equal(blocked.has(phrase.toLowerCase()), true, phrase)
      const hit = scanNonclaims(phrase, nonclaims)
      assert.equal(hit.ok, false)
      assert.ok(hit.hits.length > 0)
    }
    const allowed = new Set((nonclaims.allowed as string[]).map((phrase) => phrase.toLowerCase()))
    for (const phrase of ALLOWED) {
      assert.equal(allowed.has(phrase.toLowerCase()), true, phrase)
      const hit = scanNonclaims(phrase, nonclaims)
      assert.equal(hit.ok, true)
      assert.deepEqual(hit.hits, [])
    }
    assert.equal(allowed.has('published case evidence'), false)
  })
})

describe('bounded case routing', () => {
  it('reuses registered weights and does not add GEO observations', async () => {
    const { reservedCases } = await import('../../validation/src/case-profiles.ts')
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const catalog = await loadRouterCatalog()
    const quick = catalog.profiles.find((row) => row.id === 'quick_trajectory')
    const advanced = catalog.profiles.find((row) => row.id === 'advanced_trajectory')
    assert.ok(quick)
    assert.ok(advanced)
    const cases = reservedCases()
    for (const row of cases) {
      const registered = row.weightsSource === 'advanced_trajectory' ? advanced : quick
      assert.deepEqual(row.profile.weights, registered.weights)
      assert.equal(row.profile.seed, 20260823)
    }
    const reservedIds = new Set(cases.map((row) => row.id))
    assert.equal(catalog.datasets.some((row) => reservedIds.has(row.id)), false)
    assert.equal(catalog.observations.some((row) => reservedIds.has(row.datasetId)), false)
  })

  it('refuses reserved identities without admitted observations and writes unchanged outcomes', async () => {
    const { runCases } = await import('../../validation/run-cases.ts')
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const before = await loadRouterCatalog()
    const observationCount = before.observations.length
    const result = await runCases()
    assert.equal(result.rows.length, 4)
    assert.equal(result.seed, 20260823)
    assert.equal(result.geoObservationsAdded, false)
    assert.equal(result.compiled, false)
    const after = await loadRouterCatalog()
    assert.equal(after.observations.length, observationCount)
    assert.deepEqual(after.observations, before.observations)
    for (const row of result.rows) {
      assert.equal(row.seed, 20260823)
      assert.equal(row.outcome.status, 'REFUSED')
      if (row.outcome.status !== 'REFUSED') throw new Error('expected REFUSED')
      assert.equal(row.outcome.code, 'INSUFFICIENT_EVIDENCE')
      assert.ok(row.outcome.evidenceGaps.includes('reserved_identity_without_admitted_observations'))
      assert.equal(Object.hasOwn(row.outcome, 'recommendations'), false)
      assert.equal(Object.hasOwn(row.outcome, 'methodId'), false)
      assert.equal(row.compiled, false)
      assert.equal(row.geoObservationsAdded, false)
      assert.equal(row.nonclaimScan.ok, true)
      assert.equal(/published case evidence/i.test(row.claimCeiling), false)
      const written = await readJson(`validation/results/cases/${row.id}.json`)
      assert.deepEqual(written.outcome, row.outcome)
      assert.equal(written.outcome.status, 'REFUSED')
      assert.equal(Object.hasOwn(written.outcome, 'recommendations'), false)
      assert.equal(Object.hasOwn(written.outcome, 'methodId'), false)
      assert.equal(written.seed, 20260823)
    }
    const committed = await readJson('data/router/methods.json') as Array<{ executable: boolean }>
    assert.equal(committed.every((method) => method.executable === false), true)
  })

  it('does not compile configs, download GEO, or relabel accessions', async () => {
    const runSource = await readFile(resolve(root, 'validation/run-cases.ts'), 'utf8')
    const profileSource = await readFile(resolve(root, 'validation/src/case-profiles.ts'), 'utf8')
    const source = `${runSource}\n${profileSource}`
    assert.equal(runSource.includes('routeMethods'), false)
    assert.equal(/compileConfig/.test(source), false)
    assert.equal(/ncbi\.nlm\.nih\.gov|geo\/query|downloadGEO|h5ad|\bfetch\s*\(|https:\/\/|http:\/\//i.test(source), false)
    assert.equal(source.includes('GSE280270') && source.includes('GSE277292'), true)
    assert.equal(/GSE280270[\s\S]{0,80}radiation injury/i.test(profileSource), false)
    assert.equal(/GSE277292[\s\S]{0,80}radiation/i.test(profileSource), false)
    assert.equal(/GSE278673[\s\S]{0,80}chemotherapy|GSE278673[\s\S]{0,80}IRALL/i.test(profileSource), false)
  })
})
