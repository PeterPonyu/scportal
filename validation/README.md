# Router validation protocol

This directory freezes the evidence standard for AutoSelect Router **before** any comparative ranking results exist. Changing a threshold, fold, case role, or endpoint requires a new protocol version and a complete rerun.

Do not treat the current synthetic catalog as published evidence. GEO accessions listed here are reserved identities, not in-repo matrices and not download jobs.

## Frozen files

| File | Role |
| --- | --- |
| `protocol.json` | Version `router-validation-v1`, seed, replicates, primary endpoint, claim gate |
| `splits.json` | Leave-one-study-group-out over the three current synthetic study groups |
| `cases.json` | Reserved GEO identities and roles |
| `schemas/` | JSON Schema contracts for the three files |

## Primary endpoint

Normalized regret for held-out task `t`:

```text
regret(t) = (oracle_utility(t) - recommended_utility(t)) /
            max(oracle_utility(t) - worst_compatible_utility(t), 1e-9)
```

Paired improvement is `baseline_regret - router_regret`. Positive values favor Router against the global-average baseline.

## Claim gate

`algorithmic_router` requires, among other later checks:

- 95% CI lower bound for paired regret improvement `> 0`
- at least 20 evaluable holdout tasks
- at least 5 independent study groups
- Top-3 hit rate no more than `0.05` below the best context-free baseline

The current catalog has three synthetic study groups. That is below the frozen `minimumStudyGroups` of 5. The gate is fail-closed on purpose.

## Leakage barriers

- Study groups never appear in both `fitStudyGroups` and `heldOutStudyGroups` of the same fold.
- Reserved case IDs (`gse280270_ucb_tpo`, `gse277292_dapp1`, `gse278673_radiation`, `gse280145_sleep_deprivation`) must not appear in `data/router/datasets.json`, `data/router/observations.synthetic.json`, or any fold.
- External holdout `gse280270_ucb_tpo` is excluded from fit, prior estimation, and protocol tuning until a later sealed holdout step.
- Application and supplemental cases are workflow identities. They do not enter primary-endpoint aggregation.

## Commands

```bash
npm run validate:protocol
npm run test:validation
```
