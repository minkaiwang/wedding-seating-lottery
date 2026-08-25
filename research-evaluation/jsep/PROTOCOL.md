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
| Methodological | The relation can be encoded as executable, mode-aware contract oracles. | Incremental fault detection and shrunk counterexamples relative to O0, O1, and the keyed O1K baseline. |
| Engineering | The checker can guide mode selection, observation placement, and regression-test construction at acceptable cost. | Runtime overhead, adapter scope, executable reports, and reproducible examples. |

No contribution is promoted to the abstract or conclusion unless its required evidence is produced by the frozen design.

## 2. Research questions

**RQ1.** Which identity, state-ownership, message-eligibility, and persistence defects allow a browser handoff to appear complete while producing an incorrect or non-durable destination state?

**RQ2.** How much additional fault detection do mode-aware contract oracles provide over completion-only, unkeyed surface-state, and keyed post-state oracles on the same fixed fault corpus?

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

All four oracles inspect the same execution observation. A faulty observation is detected when an oracle returns `fail`.

- `O0 Completion`: checks only whether successful completion is present when the scenario expects a successful commit, and absent otherwise.
- `O1 Surface`: applies O0, then compares destination count and the unkeyed multiset of visible source-owned fields. It does not bind public fields to stable identities and does not inspect destination-owned history, peer identity, message order, sequence watermarks, or commit order.
- `O1K Keyed post-state`: applies O0, then compares the exact semantic-identity set and source-owned public fields by identity. It does not inspect destination-owned pre-state, peer identity, message order, sequence watermarks, or commit order. This stronger baseline was added through amendment A2 before the post-amendment formal runs.
- `O2 Mode-aware contract`: applies all applicable I1-I4 clauses, including identity-keyed state, destination continuity, origin and peer binding, decision semantics, watermarks, and commit-before-completion order.

The original O0, O1, and O2 definitions remain unchanged after their implementation pilots; O1K is frozen by amendment A2. A reproduced or seeded fault is the analysis unit. Generated cases, repetitions, browsers, and operating-system replays are search or execution budgets and are not additional independent faults.

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

- detected by O0, O1, O1K, and O2;
- first failed assertion and contract clause;
- reproduced defect or systematically seeded boundary fault;
- mode and trigger;
- equivalent-review outcome.

Primary summaries are fault-detection rate, unique detections, shared detections, and misses by clause. The fixed corpus is described rather than treated as a random sample from all browser defects. No significance test will be added merely to decorate the comparison.

For property-based counterexample generation, each retained generative fault operator uses a preset seed list and fixed maximum case budget. Results report detection/no detection, cases to first counterexample, shrink count, and the shrunk counterexample returned by the generator. Passing generated cases are not counted as independent faults.

The formal-candidate counterexample subset is `JSEP-M01`, `JSEP-M02`, `JSEP-M07`, `JSEP-M09`, `JSEP-M13`, `JSEP-M14`, `JSEP-M15`, `JSEP-M16`, `JSEP-M18`, `JSEP-M19`, and `JSEP-M20`. Each O0/O1/O1K/O2 comparison uses seeds `2026082601` through `2026082610` and a maximum of 200 generated cases per seed. Seeds are repeated search runs; the fault remains the analysis unit.

Cost measurements compare the unkeyed surface oracle, the keyed post-state baseline, and the full contract checker on the same prepared synthetic observations. Planned sizes are 50, 200, 500, and 1,000 records, with warm-up and repeated measurements fixed in the runner before formal execution. The three operations rotate execution order. Report median, IQR, P95, and the full contract increment over both baselines. Browser persistence latency remains a separate system measure and is not attributed to the pure checker.

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

Each faulty scenario is paired with a correct control using the same synthetic source and destination pre-state. The primary measures are correct-control passage, target-clause detection, O0/O1/O1K/O2 detection, adapter physical lines, and whether the generic checker core changes after the first-subject freeze. These nine scenarios remain separate from the 28-fault primary corpus and cannot increase its denominator. Because the adapter and scenarios are authored by the research team and the upstream runtime is not executed, the result supports schema-level adaptability, not independent external validation or upstream product correctness.

## 10. Protocol amendment A2: keyed post-state baseline

Amendment freeze date: 2026-08-26

Status: frozen before rerunning the primary, counterexample, cost, adaptation, and browser-path evaluations

Internal review identified that O0 and O1 are useful lower bounds but do not represent a common regression assertion that binds visible fields to stable identifiers. The original O0, O1, and O2 definitions, the 28-fault corpus, the nine adaptation scenarios, and the contract clauses remain unchanged. A fourth comparator is added:

- `O1K Keyed post-state`: applies O0, then requires the exact semantic-identity set and source-owned public fields to match by stable identity after a successful handoff. It inspects neither destination-owned pre-state nor message, sequence, persistence, or completion order.

All post-amendment runs report O1K beside O0, O1, and O2. The primary comparison for incremental contract detection becomes O2 versus O1K; O0 and O1 remain descriptive lower baselines. Cost runs add a standalone keyed post-state implementation and report O2 increment over both O1 and O1K. This amendment strengthens the comparator without adding, removing, or relabeling faults after seeing O1K results.

## 11. Protocol amendment A3: production-browser observation replay

Amendment freeze date: 2026-08-26

Status: frozen after implementation and static checks, before browser pilot and formal execution

The production-browser evaluation connects the frozen checker to observations from the deployed replacement and synchronization paths without placing the checker in the application decision loop. Receiver code emits metadata-only phase events (`mode`, `phase`, optional sequence, local trace order, and time); it emits no roster fields or identities. The runners combine these phases with synthetic source payloads and IndexedDB destination snapshots read before and after persistence, then execute O0, O1, O1K, and O2 offline.

Replacement uses a fresh browser context for each transfer, so its destination pre-state is empty. Formal dimensions are Chromium, Firefox, and Playwright WebKit; 50, 200, 500, and 1,000 records; one warm-up and ten measured transfers per browser-size cell. This yields 120 measured replacement observations. The handshake phases are supplied by the accepted source path, while message receipt, commit start, commit success, and completion are taken from receiver trace events.

Synchronization runs one fixed seven-step sequence per browser-size cell: startup merge, current-sequence merge, duplicate-sequence rejection, transient-empty protection, duplicate-row last-write merge, explicit clear, and recovery merge. The startup row verifies deployment readiness but is excluded from contract replay because retry messages may establish more than one destination pre-state before its final event. The remaining six steps yield 72 contract-replayed checkpoints across three browser engines and four sizes. Each step records the actual receiver phase sequence and IndexedDB states; accepted and persisted watermarks are derived from the injected sequence and the receiver action event.

Checker execution time is measured in the runner after the browser state is observed. It describes offline replay cost and is not added to, or subtracted from, application completion latency. Browser findings establish observation availability and correct-path contract passage in the tested production builds; the 28-fault matrix remains the evidence for fault discrimination.

## 12. Protocol amendment A4: WebKit slow-path diagnostic

Amendment date: 2026-08-26

Status: added after the first production-browser execution and before any extended-timeout diagnostic

The A3 synchronization run used the runner's pre-existing 15,000 ms per-action observation window. In the WebKit 1,000-record cell, the first three replayed actions completed, but the duplicate-row merge produced no result event within that window; an immediate repeat under the same condition stopped at the same action. These timeouts remain part of the execution record and are not replaced by a later successful run.

The runner now writes partial records when a sequence stops and exposes the action observation window as metadata. A repeat at 15,000 ms is used to preserve a machine-readable failure record. One 60,000 ms run may then determine whether the same action eventually completes and measure its wait; that run is diagnostic and is reported separately from the A3 formal denominator. No fault, oracle, roster, browser, or sequence definition changes under A4.

## 13. Protocol amendment A5: source-level browser holdout

Amendment freeze date: 2026-08-26

Status: mutation selection and analysis rules frozen before holdout harness results and before any holdout execution

The primary 28-fault corpus was used to develop and debug the contract, so it is diagnostic evidence rather than an independent estimate of detection. A separate holdout therefore uses eight source-level variants selected by source inspection and path reachability, without consulting holdout O2 outcomes. Two variants are fixed in each implementation stratum: replacement sender, replacement receiver, synchronization protocol, and merge or persistence. The operators are field assignment deletion or replacement, guard-boundary replacement, asynchronous completion reordering, relational or Boolean condition replacement, state assignment deletion, and persistence-call deletion. Exact edits and expected external consequences are frozen in `holdout-mutants.json`.

Each variant and its unmodified control run the same designated production-browser scenario with 200 synthetic records in Chromium, Firefox, and Playwright WebKit. This yields 48 executions: eight faults multiplied by two implementations and three engines. The fault is the unit of analysis; the three engines are technical replications and are not counted as three faults. A selected variant may be excluded before O2 is inspected only if it cannot compile or build, its designated path cannot reach the changed statement, or its complete observation is behaviorally equivalent to the unmodified control. Every exclusion remains in the catalogue and result table.

Three detection layers are recorded separately. `B-existing` is the unchanged project test suite executed against the variant. `B-state` is an independent post-state checker implemented outside the contract core and adapter: for replacement it compares the expected keyed snapshot or unchanged rejected state; for synchronization it compares source-owned fields by stable identity and preserves the destination-owned projection from the actual pre-state. O2 receives the same source, pre-state, metadata-only trace, and post-state observation. O0 and O1/O1K may be retained as descriptive results but are not the principal holdout comparators.

The holdout reports fault-level detection for B-existing, B-state, and O2; O2-only detections; paired control passage; clause-to-consequence agreement; and observation completeness. It does not estimate defect prevalence or combine its denominator with the 28-fault primary corpus, 11 generated fault families, or nine schema-adaptation scenarios. If O2 detects no holdout fault missed by both B-existing and B-state, the contribution is limited to unified modelling, diagnosis, and reusable test organization rather than improved detection.
