# Author admission ledger

This slice projects 13×A published cells into a second catalog. The UI catalog remains `router-evidence-synthetic-v1`. Claim floors do not move. There is no matrix download.

`router-author-admission-v1` freezes identity before any published table cells are copied: the same 13 method IDs, the same `router-validation-v1` claim floors (20 holdouts, 5 study groups, CI lower bound 0, Top-3 margin 0.05), and the reserved GEO accessions as identities only.

Foreign boards (Saelens, scIB, OpenProblems), locked local panels (`results/en_panel`, `results/formal`), missing CODE.pdf, unaudited scFocus figure digitization, and exploded aggregate means are named in `rejects.json` and must not be admitted.

## Frozen files

| File | Role |
| --- | --- |
| `protocol.json` | Version `router-author-admission-v1`, method IDs, claim gate, allow/deny extraction sources |
| `rejects.json` | Named foreign boards and locked panels that stay out of the author catalog |

## Commands

```bash
npm run validate:author-admission
```
