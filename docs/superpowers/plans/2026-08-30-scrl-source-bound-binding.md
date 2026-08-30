# scRL Source-Bound Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fail-closed, source-bound scRL adapter compiler artifact so the Router can emit the real pipeline call and record exactly what has been verified, without claiming a public executable release that does not exist.

**Architecture:** Keep the frozen generic method compiler and public synthetic catalog unchanged. Add a small pure TypeScript binding compiler for the thesis-owned `scrl-adapter-v1` protocol; it validates package/source provenance, input/output keys, and deterministic Python emission. A thesis-side receipt will bind that artifact to the pinned `code/scRL` tree and the existing CPU runtime receipt. The public bridge will expose `source_bound` as a narrower status while retaining `executable=false`, `software_resource`, and zero holdouts.

**Tech Stack:** TypeScript (Nuxt/Node test runner), JSON, Python 3, AnnData/scRL CPU fixture, SHA-256 provenance.

**Spec:** `docs/superpowers/specs/2026-08-23-scportal-autoselect-router-design.md`

## Global Constraints

- Do not alter the public synthetic method catalog or flip any method to `executable=true`.
- Do not copy raw author observations, absolute paths, credentials, or unpublished benchmark claims into public assets.
- `scrl-adapter-v1` remains an interface/runtime receipt, not a biological benchmark.
- Source-bound means the emitted call is verified against the repository-local source tree; it is not a PyPI/public-release claim.
- Preserve the existing generic compiler API and its strict own-data/fail-closed validation.
- Use test-first changes and run the full relevant app and thesis verification gates before archiving.

---

### Task 1: Define and test the source-bound adapter contract

**Files:**
- Create: `app/core/config/scrl-adapter-binding.ts`
- Test: `tests/config/scrl-adapter-binding.test.ts`
- Modify: `package.json` (typecheck source list only if required)

**Interfaces:**
- `validateScrlAdapterBinding(value: unknown): ScrlAdapterBinding`
- `compileScrlAdapterBinding(value: unknown): ScrlAdapterArtifact`
- `ScrlAdapterBinding` includes protocol, method/package/source identity, dotted Python module, callable, four input keys, decision/metadata output keys, and bounded scalar parameters.
- `ScrlAdapterArtifact` includes the frozen validated binding, deterministic `pythonSnippet`, `status: 'source_bound'`, and no install command.

- [x] **Step 1: Write the failing tests**

  Test a valid binding emits:

  ```ts
  from scripts.sci.chain.scrl_adapter import run_scrl_adapter
  adapter = run_scrl_adapter(adata, latent_key='X_latent', embedding_key='X_embed', cluster_key='cluster', pseudotime_key='pt', episodes=10)
  adata.obs['scrl_state_value'] = adapter.get_state_value()
  adata.uns['scrl_adapter_metadata'] = adapter.metadata
  ```

  Also test deterministic parameter ordering and rejection of a wrong protocol, an unsafe dotted module, a missing input key, a non-positive episode count, and an attempted `installCommand`/public-release field.

- [x] **Step 2: Run the focused test and verify RED**

  Run: `npm run test:unit -- tests/config/scrl-adapter-binding.test.ts`

  Expected: FAIL because the binding module and exported functions do not exist.

- [x] **Step 3: Implement the minimal pure binding compiler**

  Validate own-data records, identifiers, dotted module segments, package/version/source URL, exact protocol, canonical input/output key order, and finite scalar parameters. Emit a single import, one deterministic adapter call, and the two protocol-defined output assignments. Never synthesize a pip install command.

- [x] **Step 4: Run the focused test and verify GREEN**

  Run: `npm run test:unit -- tests/config/scrl-adapter-binding.test.ts`

  Expected: all focused tests pass with the unsafe cases rejected.

---

### Task 2: Bind the compiler artifact to the real thesis source and runtime receipt

**Files:**
- Create: `scripts/sci/chain/scrl_release_binding.py`
- Create: `results/chain/scrl_release_binding.json`
- Create: `data/thesis-bridge-scrl-binding.json` (SCPortal)
- Test: `tests/test_scrl_release_binding.py`

**Interfaces:**
- `scrl_release_binding.py --output PATH` verifies `code/scRL` version `0.0.7`, the adapter callable signature, the generated snippet’s AST, and an execution of that exact snippet on the existing 64-cell synthetic fixture.
- The JSON receipt records `scrl-release-binding-v1`, protocol, source/package identity, stable source digest, runtime receipt version, `status: PASS`, `binding_scope: source_tree`, and the claim boundary.
- The sanitized bridge fixture contains only public-safe summary fields and the receipt digest.

- [x] **Step 1: Write the failing receipt/bridge tests**

  Assert that a valid receipt reports `binding_scope === 'source_tree'`, `compiler_status === 'PASS'`, `runtime_receipt === 'scrl-runtime-probe-v1'`, and rejects a changed source digest or a public-release status.

- [x] **Step 2: Run focused tests and verify RED**

  Run: `npm run test:unit -- tests/config/scrl-release-binding.test.ts`

  Expected: FAIL because the receipt and verifier do not exist.

- [x] **Step 3: Implement the verifier/receipt generator**

  Reuse the existing `ScRLAdapter` fixture path; hash only normalized source files (no caches); execute the generated call with CPU/10 episodes; and fail closed on version, protocol, shape, finite-value, or digest drift.

- [x] **Step 4: Run the binding command and focused tests**

  Run: `python3 scripts/sci/chain/scrl_release_binding.py --output results/chain/scrl_release_binding.json` and `npm run test:unit -- tests/config/scrl-release-binding.test.ts`.

  Expected: receipt status `PASS`, source-tree scope, and focused tests green.

---

### Task 3: Expose the narrower status in the public bridge and manuscript

**Files:**
- Modify: `scripts/build_thesis_bridge.mjs`
- Modify: `data/thesis-bridge.json`
- Modify: `data/thesis-bridge-runtime.json`
- Modify: `app/components/autoselect/ThesisIntegrationPanel.vue`
- Modify: `tests/ui/thesis-bridge.test.ts`
- Modify: `scripts/check_autoselect_rendered.mjs`
- Modify: `paper/sci-manifold-inference/slm/{methods.tex,results.tex,discussion.tex,abstract.tex}`
- Modify: `notes/model_router_application_status.md`

**Interfaces:**
- Bridge runtime summary changes `compilerBinding` from `pending` to `source_bound` and adds no raw paths.
- Copy and manuscript language distinguishes source-bound compiler/runtime verification from a public installable release and from a biological holdout.

- [x] **Step 1: Add failing assertions for the new status and positive wording**
- [x] **Step 2: Run bridge/UI tests and verify RED**
- [x] **Step 3: Load and validate the sanitized binding fixture, then update the copy and summary**
- [x] **Step 4: Rebuild bridge assets and run bridge/UI/rendered checks**

---

### Task 4: Full verification and archive

**Files:**
- Modify: `docs/superpowers/plans/2026-08-30-scrl-source-bound-binding.md` (checklist only)
- Modify: `notes/model_router_application_status.md` (final evidence section)

- [x] **Step 1:** Run app `npm run check` in the SCPortal worktree.
- [x] **Step 2:** Run thesis `pytest -q -m 'not slow'`, the scRL runtime/binding probes, and both English/Chinese LaTeX compile/render checks if manuscript files changed.
- [x] **Step 3:** Run manifest/hash and visual/static route checks; inspect generated bridge HTML for no raw paths and the intended positive wording.
- [x] **Step 4:** Review `git diff --check`, repository statuses, and commit each repository with the Lore decision-record trailers; tag the verified local archive. The existing user authorization covers this same audited SCPortal release, so the app is the only repository eligible for publication; the thesis and model-router remain private/local.

## Self-review checklist

- [x] Generic compiler behavior remains unchanged for all existing templates.
- [x] The scRL artifact is executable only in the thesis source-tree scope and explicitly has no public install command.
- [x] Public bridge status, manuscript wording, and tests agree on `source_bound`.
- [x] No holdout, biological performance, or universal ranking claim was added.
