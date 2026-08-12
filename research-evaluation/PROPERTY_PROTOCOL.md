# Property-Based Handoff Invariant Protocol

## 1. Purpose

This protocol adds generated-input checks to the browser, fault-sequence, and analytical-ablation evidence. It tests whether the pure protocol and merge functions satisfy their stated properties across synthetic Unicode, whitespace, delimiter, duplicate-identity, exclusion, and sequence-failure inputs.

The evaluation uses `fast-check` 3.23.2. A fixed seed and a fixed run count are recorded for every property. On failure, the raw JSON retains the seed, shrink count, replay path, and minimized counterexample.

## 2. Properties

| ID | Executable property | Boundary addressed |
|---|---|---|
| PB-01 | Normalizing an already normalized roster is idempotent | Semantic normalization |
| PB-02 | NFC-equivalent and trim-equivalent records normalize to the same identity | Semantic normalization |
| PB-03 | Structured legacy identity keys distinguish tuples that collide under delimiter concatenation | Semantic identity |
| PB-04 | Repeated rows with one stable ID produce one row and deterministically retain the last row | Semantic identity |
| PB-05 | Stable-ID merge updates public fields while preserving lottery-side ID, winning state, and prize history | Historical state |
| PB-06 | Multiple legacy rows with identical public fields are consumed one-to-one when stable IDs arrive | Identity upgrade and historical state |
| PB-07 | A historical UID-based exclusion remains effective after a row gains a stable planner ID | Exclusion continuity |
| PB-08 | Sequence watermarks reject pending duplicates, permit retry after an unsuperseded failure, and do not roll back past a newer accepted sequence | Message order and retry |
| PB-09 | Invalid empty payloads with a declared nonempty source are skipped, while an explicit zero roster is cleared | Empty-payload semantics |

## 3. Design

- Default runs: 2,000 generated cases per property, 18,000 total.
- Default master seed: `20260804`; each property receives a recorded deterministic offset.
- Data: synthetic generated values only. No wedding roster, contact detail, photograph, questionnaire response, or field export is read.
- Unit under test: pure functions in `weddingSeatingProtocol.ts`, `weddingSeatingMerge.ts`, and `seatingSyncExclusions.ts`.
- Negative controls: PB-02 confirms that raw, non-normalized legacy strings differ; PB-03 constructs pairs that collide under the historical delimiter-concatenation pattern; PB-05 confirms that replace-all would not preserve the generated lottery-side identifiers.

The runner records the parent Git commit, dirty-worktree state, relevant-source SHA-256, runtime information, dependency version, per-property elapsed time, executed cases, skips, shrinks, and failure details. Source and result files must be committed together before the evidence is described as publicly frozen.

## 4. Execution

```powershell
$env:EVAL_PROPERTY_RUNS='2000'
$env:EVAL_PROPERTY_SEED='20260804'
$env:EVAL_PROPERTY_RUN_ID='property_local_reproduction'
npm run evaluate:properties
```

The runner refuses to overwrite an existing run ID. Successful execution writes:

- `research-evaluation/results/raw/<run-id>.json`
- `research-evaluation/results/processed/<run-id>_summary.csv`

## 5. Interpretation boundary

A passing property evaluation supports the listed invariants for the generated input domains and recorded implementation. It is not exhaustive proof and does not establish browser behavior, native Safari behavior, storage-failure incidence, usability, or field reliability. Generated cases are property checks rather than participants or event observations.
