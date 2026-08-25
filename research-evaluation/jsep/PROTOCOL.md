# JSEP technology and oracle-evaluation protocol

Design freeze date: 2026-08-26

Parent evidence commit: `4210c83b06b31e325acdb67adc35fa8ae51c0526`

Development branch: `research/jsep-technology-evaluation`
Status: design frozen after implementation pilots and before the formal-candidate runs

## 1. Study purpose

This study evaluates a reusable, mode-aware contract checker for browser-based cross-application state handoffs. The seating-planner-to-prize-draw workflow supplies the first application adapter and eight reproducible defects. The checker core is independent of wedding, guest, seating, lottery, and prize field names.

The paper's intended value has three evidence-linked levels:

| Contribution | Claim | Required evidence |
|---|---|---|
| Conceptual | Handoff correctness is a relation among the source snapshot, destination pre-state, message trace, and committed post-state, not a record count or success signal. | Reproducible failure classes spanning identity, destination-owned state, protocol eligibility, and completion. |
| Methodological | The relation can be encoded as executable, mode-aware contract oracles. | Incremental fault detection and minimal counterexamples relative to O0 and O1. |
| Engineering | The checker can guide mode selection, observation placement, and regression-test construction at acceptable cost. | Runtime overhead, adapter scope, executable reports, and reproducible examples. |

No contribution is promoted to the abstract or conclusion unless its required evidence is produced by the frozen design.

## 2. Research questions

**RQ1.** Which identity, state-ownership, message-eligibility, and persistence defects allow a browser handoff to appear complete while producing an incorrect or non-durable destination state?

**RQ2.** How much additional fault detection do mode-aware contract oracles provide over completion-only and unkeyed surface-state oracles on the same fixed fault corpus?

**RQ3.** What execution cost does contract checking add across handoff modes and roster sizes?

A fourth question on adaptation to another browser workflow is activated only if a license-compatible second subject is implemented. A team-authored second subject will be described as a reference subject, not independent external validation.

## 3. Contract and modes

The reusable checker evaluates four clauses:

1. `I1 Semantic identity`: one destination record per semantic source identity, deterministic last-row handling, exact source-owned public state by identity, and unique destination instance identities when exposed.
2. `I2 Destination-state continuity`: synchronization preserves destination-owned identity, status, history, and secondary-list membership for stable or one-to-one migrated identities. This clause is not applicable to replacement.
3. `I3 Message eligibility and semantics`: origin, peer, phase, sequence, transient-empty, explicit-clear, and failed-sequence retry behavior matches the selected mode.
4. `I4 Post-commit completion`: success follows an atomic durable commit; failed or ineligible operations do not change durable state or report successful completion.

The success predicates remain:

`H_replace = I1_replace and I3_replace and I4_replace`

`H_sync = I1_sync and I2_sync and I3_sync and I4_sync`

The checker returns clause-level `pass/fail/not-applicable`, stable failure codes, the first or complete failure set, JSON-serializable metrics, and an assertion interface.

## 4. Frozen oracle regimes

All three oracles inspect the same execution observation. A faulty observation is detected when an oracle returns `fail`.

- `O0 Completion`: checks only whether successful completion is present when the scenario expects a successful commit, and absent otherwise.
- `O1 Surface`: applies O0, then compares destination count and the unkeyed multiset of visible source-owned fields. It does not bind public fields to stable identities and does not inspect destination-owned history, peer identity, message order, sequence watermarks, or commit order.
- `O2 Mode-aware contract`: applies all applicable I1-I4 clauses, including identity-keyed state, destination continuity, origin and peer binding, decision semantics, watermarks, and commit-before-completion order.

These definitions will not be changed after the implementation pilots. A reproduced or seeded fault is the analysis unit. Generated cases, repetitions, browsers, and operating-system replays are search or execution budgets and are not additional independent faults.

## 5. Fixed fault corpus

### 5.1 Reproduced defects

The eight defects in `../DEFECT_LOG.md` remain the historical defect subset. They are not inferred from failed environment setup, expected safeguard rejection, or an interrupted timing run.

### 5.2 Systematically seeded boundary faults

`fault-catalogue.json` freezes 20 fault-injection operators before the formal oracle matrix. They alter observable destination state or protocol traces at the contract boundary rather than compiling source-code mutants. The catalogue includes six I1, five I2, seven I3, and two I4 variants. Each seeded fault must have:

1. one local mechanism change;
2. a satisfiable trigger fixture using synthetic data;
3. evidence that the full implementation passes the same fixture;
4. evidence that the seeded fault changes the intended observable behavior;
5. an equivalent, unreachable, duplicate, or invalid label when any of conditions 1-4 is not met.

Equivalent, unreachable, duplicate, and invalid variants remain in the audit file with reasons but are excluded from the fault-detection denominator. Exclusion decisions are made before computing aggregate oracle scores.

## 6. Measures and analysis

The primary table has one row per retained reproduced or seeded fault and one column per oracle:

- detected by O0, O1, and O2;
- first failed assertion and contract clause;
- reproduced defect or systematically seeded boundary fault;
- mode and trigger;
- equivalent-review outcome.

Primary summaries are fault-detection rate, unique detections, shared detections, and misses by clause. The fixed corpus is described rather than treated as a random sample from all browser defects. No significance test will be added merely to decorate the comparison.

For property-based counterexample generation, each retained generative fault operator uses a preset seed list and fixed maximum case budget. Results report detection/no detection, cases to first counterexample, shrink count, and minimized counterexample. Passing generated cases are not counted as independent faults.

The formal-candidate counterexample subset is `JSEP-M01`, `JSEP-M02`, `JSEP-M07`, `JSEP-M09`, `JSEP-M13`, `JSEP-M14`, `JSEP-M15`, `JSEP-M16`, `JSEP-M18`, `JSEP-M19`, and `JSEP-M20`. Each O0/O1/O2 comparison uses seeds `2026082601` through `2026082610` and a maximum of 200 generated cases per seed. Seeds are repeated search runs; the fault remains the analysis unit.

Cost measurements compare the unkeyed surface oracle and the full contract checker on the same prepared synthetic observations. Planned sizes are 50, 200, 500, and 1,000 records, with warm-up and repeated measurements fixed in the runner before formal execution. The paired operations alternate execution order. Report median, IQR, P95, and the incremental share of full contract time. Browser persistence latency remains a separate system measure and is not attributed to the pure checker.

## 7. Reproducibility and privacy

- Only deterministic synthetic records are permitted.
- Raw output is generated by versioned scripts and is not manually edited.
- Every formal run records commit, dirty status, source fingerprint, runtime, seed, dimensions, and output path.
- Existing 360 replacement transfers, 630 synchronization checkpoints, 3,200 ablation records, and 18,000 generated cases retain their original denominators and are not pooled with the new fault corpus.
- No guest list, telephone number, questionnaire, identifiable photograph, or event export may enter this directory.

## 8. Interpretation boundary

The first evaluation can establish behavior of the checker, the fixed defect corpus, and the seating-to-prize-draw adapter. It does not estimate field defect prevalence, prove all browser handoffs correct, measure audience or operator outcomes, or establish cross-domain validity. Transfer beyond the first application requires a second subject or later replication.

## 9. Protocol amendment A1: external reference-subject adaptation

Amendment freeze date: 2026-08-26

Status: frozen after repository screening and adapter implementation checks, before the formal-candidate adaptation run

The adaptation study uses the independently authored, MIT-licensed `GDSC-ESTIN/checkin-system` repository at commit `839831c9be7d2409e825ca14d27a3c285bde3764`. Its published workflow separates CSV roster preparation, a check-in backend, and a scanner client. The prepared source schema contains generated `id` values together with `email`, `username`, `teamName`, and `tShirt`; the check-in backend later maintains the `checked` field. Full provenance and the interpretation boundary are recorded in `subjects/GDSC_CHECKIN_SUBJECT.md`.

The adapter models initial import as replacement and a later roster-correction feature as state-preserving synchronization. The latter is an evolution scenario applied to the published schema, not a feature attributed to the upstream repository. Evaluation uses nine predefined synthetic scenarios:

- I1: swapped public state across stable identities, duplicated or regenerated retained identifiers, and a missing replacement record;
- I2: reset check-in state;
- I3: retained failed-sequence watermark and acceptance from an unbound import peer;
- I4: completion before durable commit and durable-state change after failed commit.

Each faulty scenario is paired with a correct control using the same synthetic source and destination pre-state. The primary measures are correct-control passage, target-clause detection, O0/O1/O2 detection, adapter physical lines, and whether the generic checker core changes after the first-subject freeze. These nine scenarios remain separate from the 28-fault primary corpus and cannot increase its denominator. Because the adapter and scenarios are authored by the research team and the upstream runtime is not executed, the result supports schema-level adaptability, not independent external validation or upstream product correctness.
