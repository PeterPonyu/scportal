import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const LAYERS = [
  {
    id: 'representation',
    label: 'Representation',
    question: 'Where are cell states represented?',
    methods: ['iVAE', 'CCVGAE'],
  },
  {
    id: 'geometry',
    label: 'Geometry',
    question: 'Which structure does the latent space preserve?',
    methods: ['LiVAE', 'GAHIB', 'MCCVAE'],
  },
  {
    id: 'dynamics',
    label: 'Dynamics',
    question: 'How can state change be followed over time?',
    methods: ['GNODEVAE', 'CODE', 'iAODE', 'LAIOR'],
  },
  {
    id: 'decision',
    label: 'Decision',
    question: 'How are branches and fate choices described?',
    methods: ['scRL', 'scFocus'],
  },
  {
    id: 'generation_evaluation',
    label: 'Generation & evaluation',
    question: 'How are candidate states generated and compared?',
    methods: ['CLOP-DiT', 'scCCVGBen'],
  },
]

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function readOptionalJson(path) {
  if (!existsSync(path)) return null
  return readJson(path)
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, received ${actual}`)
}

function assertMethodSet(methodIds, expected, message) {
  const actual = [...new Set(methodIds)].sort()
  const wanted = [...new Set(expected)].sort()
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${message}: expected ${wanted.join(', ')}, received ${actual.join(', ')}`)
  }
}

function chainSnapshot(status, methodCount, templateCount, pinnedCount) {
  const fallback = {
    source: 'release snapshot',
    rung: 'pinned_chain',
    identityResolved: methodCount,
    configTemplates: templateCount,
    pinnedDistributions: pinnedCount,
    sourceRepositories: 11,
    archivedVersions: 4,
    contractsCheckedAtPin: 5,
    contractsHolding: 0,
    contractsMatchingAtPin: 0,
  }
  if (!status) return fallback
  return {
    source: 'graduation-thesis chain gate',
    rung: status.rung,
    identityResolved: status.n_identity_resolved,
    configTemplates: status.n_config_template,
    pinnedDistributions: status.n_template_version_pinned,
    sourceRepositories: status.n_source_repository,
    archivedVersions: status.n_archived_version,
    contractsCheckedAtPin: status.n_contract_checked_at_pin,
    contractsHolding: status.n_contract_holds,
    // The historical gate field n_contract_holds counts templates whose
    // declared wrapper matches the inspected package API.
    contractsMatchingAtPin: status.n_contract_holds,
  }
}

function validateChainGateSnapshot(status, methodCount, templateCount, pinnedCount, label) {
  if (!status || typeof status !== 'object') {
    throw new Error(`${label} is required for the thesis bridge`)
  }
  assertEqual(status.version, 'chain-gate-v3', `${label} version`)
  assertEqual(status.rung, 'pinned_chain', `${label} rung`)
  assertEqual(status.n_methods, methodCount, `${label} method count`)
  assertEqual(status.n_identity_resolved, methodCount, `${label} identity count`)
  assertEqual(status.n_config_template, templateCount, `${label} template count`)
  assertEqual(status.n_template_version_pinned, pinnedCount, `${label} pinned count`)
  for (const [key, expected] of [
    ['n_source_repository', 11],
    ['n_archived_version', 4],
    ['n_contract_checked_at_pin', 5],
    ['n_contract_holds', 4],
  ]) assertEqual(status[key], expected, `${label} ${key}`)
  return chainSnapshot(status, methodCount, templateCount, pinnedCount)
}

/**
 * Load the versioned chain summary carried by SCPortal.  The parent thesis
 * receipt is an optional consistency oracle for nested worktrees, never a
 * required build dependency for an independent portal checkout.
 */
export async function loadChainGateSnapshot(repositoryRoot = ROOT, methodCount = 13, templateCount = 13, pinnedCount = 8) {
  const localPath = resolve(repositoryRoot, 'data/thesis-bridge-chain.json')
  const localStatus = await readOptionalJson(localPath)
  const localSummary = validateChainGateSnapshot(localStatus, methodCount, templateCount, pinnedCount, 'repository-local chain gate snapshot')

  const parentRoot = resolve(repositoryRoot, '../..')
  const parentMarker = resolve(parentRoot, 'chapters/publications.md')
  const parentPath = resolve(parentRoot, 'results/chain/chain_gate_status.json')
  if (existsSync(parentMarker)) {
    const parentStatus = await readOptionalJson(parentPath)
    if (parentStatus) {
      const parentSummary = validateChainGateSnapshot(parentStatus, methodCount, templateCount, pinnedCount, 'thesis chain gate snapshot')
      if (JSON.stringify(parentSummary) !== JSON.stringify(localSummary)) {
        throw new Error('repository-local chain gate snapshot does not match the thesis chain gate')
      }
    }
  }
  return localSummary
}

export function scrlRuntimeSnapshot(probe) {
  if (!probe || typeof probe !== 'object') {
    throw new Error('scRL runtime receipt is required for the thesis bridge')
  }
  assertEqual(probe.version, 'scrl-runtime-probe-v1', 'scRL runtime receipt version')
  assertEqual(probe.method, 'scRL', 'scRL runtime receipt method')
  assertEqual(probe.pinned_version, '0.0.7', 'scRL runtime receipt pin')
  assertEqual(probe.adapter_protocol, 'scrl-adapter-v1', 'scRL adapter protocol')
  assertEqual(probe.status, 'PASS', 'scRL runtime receipt status')
  assertEqual(probe.device, 'cpu', 'scRL runtime receipt device')
  if (probe.fixture?.synthetic !== true) throw new Error('scRL runtime fixture must be synthetic')
  assertEqual(probe.fixture?.n_obs, 64, 'scRL runtime fixture observations')
  assertEqual(probe.episodes_requested, 10, 'scRL runtime requested episodes')
  assertEqual(probe.episodes_completed, 10, 'scRL runtime episodes')
  if (!Array.isArray(probe.state_value_shape) || JSON.stringify(probe.state_value_shape) !== JSON.stringify([64])) {
    throw new Error('scRL runtime state-value shape must be [64]')
  }
  return {
    protocol: probe.adapter_protocol,
    pinnedVersion: probe.pinned_version,
    status: probe.status,
    fixtureSynthetic: probe.fixture.synthetic,
    fixtureObservations: probe.fixture.n_obs,
    episodesRequested: probe.episodes_requested,
    episodesCompleted: probe.episodes_completed,
    stateValueShape: [...probe.state_value_shape],
    // The receipt proves the adapter/runtime slice; package/compiler release
    // binding remains a separate, intentionally explicit gate.
    compilerBinding: 'pending',
  }
}

/**
 * Load the receipt from the repository that is being built.  A local SCPortal
 * checkout cannot assume that the thesis repository is present two directories
 * above it, so the versioned receipt is the portability boundary.  When this
 * worktree is nested in the thesis checkout, compare the local receipt with the
 * canonical probe as an additional consistency check.
 */
export async function loadScrlRuntimeReceipt(repositoryRoot = ROOT) {
  const localPath = resolve(repositoryRoot, 'data/thesis-bridge-runtime.json')
  const localReceipt = await readOptionalJson(localPath)
  if (!localReceipt) {
    throw new Error('repository-local scRL runtime receipt is required for the thesis bridge')
  }

  const parentRoot = resolve(repositoryRoot, '../..')
  const parentMarker = resolve(parentRoot, 'chapters/publications.md')
  const parentPath = resolve(parentRoot, 'results/chain/scrl_runtime_probe.json')
  if (existsSync(parentMarker)) {
    const parentReceipt = await readOptionalJson(parentPath)
    if (parentReceipt && JSON.stringify(scrlRuntimeSnapshot(parentReceipt)) !== JSON.stringify(scrlRuntimeSnapshot(localReceipt))) {
      throw new Error('repository-local scRL runtime receipt does not match the thesis probe')
    }
  }
  return localReceipt
}

/**
 * Build the public-safe bridge between the 13-paper thesis line and AutoSelect.
 *
 * The author evidence catalog is intentionally not copied to public assets. Only
 * counts, layer membership, release identifiers and the fail-closed claim level
 * are exported. Ranking continues to use the synthetic production catalog.
 */
export async function buildThesisBridge(outputDirectory, repositoryRoot = ROOT) {
  const bridgeTemplate = await readJson(resolve(repositoryRoot, 'data/thesis-bridge.json'))
  const authorDirectory = resolve(repositoryRoot, 'data/router/author')
  const methods = await readJson(resolve(authorDirectory, 'methods.json'))
  const templates = await readJson(resolve(authorDirectory, 'config-templates.json'))
  const observations = await readJson(resolve(authorDirectory, 'observations.json'))
  const release = await readJson(resolve(authorDirectory, 'release.json'))
  const lattice = await readJson(resolve(repositoryRoot, 'validation/author-admission/remaining-lattice.json'))
  const claim = await readJson(resolve(repositoryRoot, 'validation/results/author-claim-status.json'))

  if (!Array.isArray(methods) || !Array.isArray(templates) || !Array.isArray(observations)) {
    throw new Error('author bridge inputs must be arrays')
  }
  const methodIds = methods.map((method) => method.id)
  assertEqual(methodIds.length, 13, 'author method count')
  assertMethodSet(lattice.methodIds, methodIds, 'lattice method IDs')
  assertMethodSet(LAYERS.flatMap((layer) => layer.methods), methodIds, 'layer method IDs')
  assertEqual(bridgeTemplate.version, 'thesis-router-bridge-v1', 'bridge version')
  assertEqual(bridgeTemplate.publicationCount, methodIds.length, 'bridge publication count')
  assertEqual(bridgeTemplate.layerCount, LAYERS.length, 'bridge layer count')
  assertMethodSet(bridgeTemplate.methodIds, methodIds, 'bridge method IDs')
  if (JSON.stringify(bridgeTemplate.layers) !== JSON.stringify(LAYERS)) {
    throw new Error('bridge layer mapping must match the canonical thesis layer mapping')
  }
  assertEqual(templates.length, methodIds.length, 'author template count')
  assertEqual(observations.length, lattice.observationCount, 'admitted observation count')
  assertEqual(claim.status, lattice.claimStatus, 'claim status')
  assertEqual(claim.evidenceVersion, release.id, 'claim evidence release')
  assertEqual(claim.observationCount, observations.length, 'claim observation count')
  assertEqual(claim.studyGroups.length, lattice.studyGroupCount, 'claim study-group count')
  assertEqual(claim.syntheticUiCatalog, 'router-evidence-synthetic-v1', 'synthetic UI catalog')
  assertEqual(release.id, lattice.evidenceReleaseId, 'author release ID')

  const pinnedDistributions = methods.filter((method) => !method.installCommand.includes('0.0.0-author')).length
  const chain = await loadChainGateSnapshot(repositoryRoot, methodIds.length, templates.length, pinnedDistributions)
  const scrlAdapter = scrlRuntimeSnapshot(await loadScrlRuntimeReceipt(repositoryRoot))
  if (JSON.stringify(bridgeTemplate.runtime?.scrlAdapter) !== JSON.stringify(scrlAdapter)) {
    throw new Error('bridge runtime template must match the verified scRL adapter receipt')
  }

  const bridge = {
    ...bridgeTemplate,
    generatedAt: new Date().toISOString(),
    publicationCount: methodIds.length,
    layerCount: LAYERS.length,
    methodIds,
    layers: LAYERS,
    chain,
    runtime: { scrlAdapter },
    evidence: {
      authorRelease: release.id,
      uiCatalogSynthetic: claim.syntheticUiCatalog === 'router-evidence-synthetic-v1',
      uiEvidenceRelease: claim.syntheticUiCatalog,
      admittedObservationCount: lattice.observationCount,
      studyGroupCount: lattice.studyGroupCount,
      evaluableHoldouts: lattice.evaluableHoldouts,
      claimStatus: claim.status,
    },
  }

  await mkdir(outputDirectory, { recursive: true })
  await writeFile(resolve(outputDirectory, 'thesis-bridge.json'), `${JSON.stringify(bridge, null, 2)}\n`)
  return ['thesis-bridge.json']
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildThesisBridge(resolve(ROOT, 'public/router-data'))
}
