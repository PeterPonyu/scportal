import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

import { buildThesisBridge, loadChainGateSnapshot, loadScrlRuntimeReceipt, scrlRuntimeSnapshot } from '../../scripts/build_thesis_bridge.mjs'

describe('thesis integration bridge', () => {
  it('publishes a sanitized, digest-independent 13-publication summary', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'scportal-thesis-bridge-'))
    try {
      const written = await buildThesisBridge(directory)
      assert.deepEqual(written, ['thesis-bridge.json'])
      const bridge = JSON.parse(await readFile(resolve(directory, 'thesis-bridge.json'), 'utf8'))

      assert.equal(bridge.version, 'thesis-router-bridge-v1')
      assert.equal(bridge.publicationCount, 13)
      assert.equal(bridge.layerCount, 5)
      assert.equal(bridge.methodIds.length, 13)
      assert.equal(bridge.chain.identityResolved, 13)
      assert.equal(bridge.chain.configTemplates, 13)
      assert.equal(bridge.chain.pinnedDistributions, 8)
      assert.equal(bridge.chain.contractsCheckedAtPin, 5)
      assert.equal(bridge.chain.contractsMatchingAtPin, 4)
      assert.deepEqual(bridge.runtime.scrlAdapter, {
        protocol: 'scrl-adapter-v1',
        pinnedVersion: '0.0.7',
        status: 'PASS',
        fixtureSynthetic: true,
        fixtureObservations: 64,
        episodesRequested: 10,
        episodesCompleted: 10,
        stateValueShape: [64],
        compilerBinding: 'pending',
      })
      assert.equal(bridge.evidence.admittedObservationCount, 30)
      assert.equal(bridge.evidence.studyGroupCount, 18)
      assert.equal(bridge.evidence.evaluableHoldouts, 0)
      assert.equal(bridge.evidence.claimStatus, 'software_resource')
      assert.equal(bridge.evidence.uiCatalogSynthetic, true)
      assert.equal(Object.hasOwn(bridge, 'observations'), false)
      assert.equal(JSON.stringify(bridge).includes('rawValue'), false)
      assert.equal(JSON.stringify(bridge).includes('blockedReason'), false)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('binds the bridge to the AutoSelect page without changing the ranking surface', async () => {
    const { readFile } = await import('node:fs/promises')
    const source = await readFile(resolve(import.meta.dirname, '../../app/pages/autoselect/index.vue'), 'utf8')
    assert.match(source, /ThesisIntegrationPanel/)
    assert.match(source, /AutoSelectShell/)
  })

  it('explains the intentional non-executable public gate', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../../app/components/autoselect/ThesisIntegrationPanel.vue'), 'utf8')
    assert.match(source, /four pinned method contracts \(LiVAE, CODE, GNODEVAE, and LAIOR\) are\s+now shape-checked/i)
    assert.match(source, /dedicated scRL adapter now has a bounded synthetic CPU runtime receipt/i)
    assert.match(source, /scrl-adapter-v1/i)
    assert.match(source, /public methods remain non-executable\s+until\s+its compiler\/release binding and holdout gates close/i)
  })

  it('fails closed when the structured scRL receipt is missing or incomplete', () => {
    assert.throws(() => scrlRuntimeSnapshot(null), /runtime receipt is required/i)
    assert.throws(() => scrlRuntimeSnapshot({ status: 'PASS' }), /runtime receipt version/i)
  })

  it('keeps a repository-local receipt so the bridge is rebuildable outside the thesis checkout', async () => {
    const repository = await mkdtemp(resolve(tmpdir(), 'scportal-thesis-receipt-'))
    try {
      const receipt = {
        version: 'scrl-runtime-probe-v1',
        method: 'scRL',
        pinned_version: '0.0.7',
        adapter_protocol: 'scrl-adapter-v1',
        fixture: { synthetic: true, n_obs: 64 },
        device: 'cpu',
        episodes_requested: 10,
        episodes_completed: 10,
        state_value_shape: [64],
        status: 'PASS',
      }
      const { mkdir, writeFile } = await import('node:fs/promises')
      await mkdir(resolve(repository, 'data'), { recursive: true })
      await writeFile(resolve(repository, 'data/thesis-bridge-runtime.json'), `${JSON.stringify(receipt)}\n`)

      const loaded = await loadScrlRuntimeReceipt(repository)
      assert.deepEqual(loaded, receipt)
    } finally {
      await rm(repository, { recursive: true, force: true })
    }
  })

  it('fails closed when the repository-local receipt is absent', async () => {
    const repository = await mkdtemp(resolve(tmpdir(), 'scportal-thesis-receipt-missing-'))
    try {
      await assert.rejects(() => loadScrlRuntimeReceipt(repository), /repository-local scRL runtime receipt/i)
    } finally {
      await rm(repository, { recursive: true, force: true })
    }
  })

  it('fails closed when a nested thesis probe drifts from the repository receipt', async () => {
    const container = await mkdtemp(resolve(tmpdir(), 'scportal-thesis-receipt-drift-'))
    const repository = resolve(container, 'nested', 'repo')
    try {
      const { mkdir, writeFile } = await import('node:fs/promises')
      const receipt = {
        version: 'scrl-runtime-probe-v1',
        method: 'scRL',
        pinned_version: '0.0.7',
        adapter_protocol: 'scrl-adapter-v1',
        fixture: { synthetic: true, n_obs: 64 },
        device: 'cpu',
        episodes_requested: 10,
        episodes_completed: 10,
        state_value_shape: [64],
        status: 'PASS',
      }
      await mkdir(resolve(repository, 'data'), { recursive: true })
      await mkdir(resolve(container, 'chapters'), { recursive: true })
      await mkdir(resolve(container, 'results/chain'), { recursive: true })
      await writeFile(resolve(repository, 'data/thesis-bridge-runtime.json'), `${JSON.stringify(receipt)}\n`)
      await writeFile(resolve(container, 'chapters/publications.md'), '# marker\n')
      await writeFile(resolve(container, 'results/chain/scrl_runtime_probe.json'), `${JSON.stringify({ ...receipt, episodes_completed: 9 })}\n`)

      await assert.rejects(() => loadScrlRuntimeReceipt(repository), /runtime episodes|does not match the thesis probe/i)
    } finally {
      await rm(container, { recursive: true, force: true })
    }
  })

  it('keeps the pinned chain summary when the bridge is rebuilt without the thesis checkout', async () => {
    const repository = await mkdtemp(resolve(tmpdir(), 'scportal-thesis-chain-'))
    try {
      const { mkdir, writeFile } = await import('node:fs/promises')
      await mkdir(resolve(repository, 'data'), { recursive: true })
      await writeFile(resolve(repository, 'data/thesis-bridge-chain.json'), `${JSON.stringify({
        version: 'chain-gate-v3',
        rung: 'pinned_chain',
        n_methods: 13,
        n_identity_resolved: 13,
        n_config_template: 13,
        n_template_version_pinned: 8,
        n_source_repository: 11,
        n_archived_version: 4,
        n_contract_checked_at_pin: 5,
        n_contract_holds: 4,
      })}\n`)

      assert.deepEqual(await loadChainGateSnapshot(repository, 13, 13, 8), {
        source: 'graduation-thesis chain gate',
        rung: 'pinned_chain',
        identityResolved: 13,
        configTemplates: 13,
        pinnedDistributions: 8,
        sourceRepositories: 11,
        archivedVersions: 4,
        contractsCheckedAtPin: 5,
        contractsHolding: 4,
        contractsMatchingAtPin: 4,
      })
    } finally {
      await rm(repository, { recursive: true, force: true })
    }
  })

  it('fails closed when the repository-local chain snapshot is absent', async () => {
    const repository = await mkdtemp(resolve(tmpdir(), 'scportal-thesis-chain-missing-'))
    try {
      await assert.rejects(() => loadChainGateSnapshot(repository, 13, 13, 8), /repository-local chain gate snapshot/i)
    } finally {
      await rm(repository, { recursive: true, force: true })
    }
  })
})
