# Seating-Lottery Handoff Evaluation Protocol

## 1. Scope and versioning

- Reproducible baseline: `e63c8d1e0093f304daa8f4e6e1e98605ed61c04c`
- Evaluation branch: `research/jss-evidence-alignment`
- Peer-binding correction: `9ef774080125d6d0d7ae99701f2e27283e49ea51`
- System under evaluation: the integration layer between the seating planner and the vendored lottery application
- Data: deterministic synthetic records only

The evaluation covers roster normalization, identity construction, peer and origin binding, message sequencing, state-preserving merge, IndexedDB commit, and completion acknowledgement. Seating quality, random prize selection, visual presentation, audience experience, and operator workload are outside the evaluated software surface.

## 2. Mode-aware executable handoff contract

The integration exposes two ingress modes with different destination semantics:

- **Final-snapshot replacement:** `P(S)` atomically initializes both destination person stores from a normalized, deduplicated, nonempty final snapshot `S`. A normalized empty input is rejected before `P(S)`.
- **State-preserving live synchronization:** message `n` applies `M(D_pre, S_n)` to update source-owned fields while retaining destination-owned state. `D_pre` is the persisted state before the message and `D_post` is the committed state afterward.

The contract has four clauses with mode-specific applicability:

1. **Semantic identity (I1):** both modes require one destination person per stable source identifier, deterministic duplicate handling, and normalized structured identities. Live synchronization additionally applies one-to-one migration when an existing destination record lacks the stable identifier.
2. **Destination-state continuity (I2):** live synchronization preserves destination-owned identifiers, winning state, prize history, and exclusions for the same person. Replacement initializes the two person stores and does not invoke this history-preservation clause.
3. **Message eligibility, order, and empty-payload semantics (I3):** replacement binds READY and DONE to the configured origin and opened child window and enforces READY-IMPORT-DONE phase order. Live synchronization binds the configured origin and parent window, rejects duplicate or stale sequences, protects a valid nonempty roster from malformed transient empties, permits an explicit zero-roster clear, and restores retry eligibility after an unsuperseded failed write.
4. **Post-commit completion (I4):** replacement reports successful DONE only after `P(S)` commits both stores. Live synchronization emits completion only after `M(D_pre, S_n)` commits `D_post` and the accepted and persisted sequence watermarks both equal `n`.

The two success predicates are:

`H_replace(S) = I1_replace(S) and I3_replace(S) and I4_replace(S)`

`H_sync(n) = I1_sync(S_n) and I2(D_pre, S_n, D_post) and I3_sync(n) and I4_sync(n)`

## 3. Research questions

**RQ1.** Which reproduced identity, state, peer, order, and persistence failure modes are retained by the defect audit, and which handoff properties do they violate?

**RQ2.** To what extent do the corrected safeguards maintain the nominated handoff properties across production-build browser runs, injected state sequences, targeted ablations, and generated inputs?

RQ2 is evaluated through four complementary evidence layers: normal-path browser execution, fault-directed state sequences, safeguard ablation, and fixed-seed property checks. Their denominators remain separate because they use different experimental units and oracles.

## 4. Units, matrices, and oracles

The replacement-mode normal-path unit is one production-build browser transfer. Roster sizes are 50, 200, 500, and 1,000 records. Each browser-size cell contains one warm-up and 30 measured transfers in Chromium, Firefox, and Playwright WebKit. The exact oracle compares stable IDs and all four normalized public fields; count equality alone is not sufficient.

The live-sync fault unit is one state checkpoint within a seven-step sequence at 200 records: initial synchronization, accepted current sequence, duplicate-sequence rejection, transient-empty protection, duplicate-row last-wins correction, explicit clear, and recovery after clear. Thirty independent sequences per browser yield 630 checkpoints. Exact IDs and public fields are checked after every step. Live-sync storage-failure retry and parent-window checks are deterministic regressions because they require a different injection boundary from the seven-step browser sequence. Replacement child-window binding, handshake order, and premature closure are separate sender-side regressions.

The ablation unit is one generated outcome under a safeguard-enabled or safeguard-removed analytical variant. Four safeguards, two variants, four roster sizes, and 100 repetitions yield 3,200 records. Each ablation changes one mechanism and retains its targeted fault condition.

The property unit is one generated pure-function case. Nine properties receive 2,000 cases each from recorded seeds, yielding 18,000 cases. Property checks complement the browser and ablation matrices; their denominators are not pooled.

## 5. Outcomes

| Outcome | Operational definition |
|---|---|
| Exact semantic state | Stable-ID set and normalized public fields equal the expected snapshot |
| Duplicate count | Repeated stable IDs or repeated fallback identities in the final roster |
| State continuity | Destination-owned ID, winning state, prize history, and exclusions remain attached to the same semantic identity |
| Protocol decision | The expected message is accepted, rejected, skipped, cleared, or made retryable |
| Durable completion | Completion follows successful persistence of the accepted snapshot |
| Latency | Monotonic elapsed time from sender dispatch to receiver completion |
| Ablation outcome | The targeted contract clause holds under the enabled or removed mechanism |

Deterministic matrices report pass counts against their executable oracles. Latency is reported with median, interquartile range, and 95th percentile.

## 6. Defect-to-evidence trace

Every retained defect records the triggering condition, observable failure, safeguard, protected invariant, and executable evidence. `DEFECT_LOG.md` contains the eight current defects and regression anchors. A defect is not counted from a failed environment setup or an expected safeguard rejection.

## 7. Reproducibility controls

- Raw records are generated by versioned runners and are not edited manually.
- Every formal batch records source hashes, runtime versions, timestamps, and relevant build hashes.
- Summary tables and figures are generated from raw records by scripts.
- Failed runs remain in the historical audit trail with explicit status.
- Formal batches use synthetic values and fixed dimensions; no private event roster is read.
- Hosted operating-system jobs replay the same property seeds and remain portability checks rather than independent inputs.

## 8. Interpretation boundary

The protocol supports claims about the tested handoff contract, safeguards, and runtime distributions in the recorded environments. It does not measure defect incidence in other systems, native Safari behavior, cross-device storage, malicious input, audience outcomes, perceived fairness, or operator workload. Generalization rests on the reusable failure conditions and executable contract, which require replication in other application pairs.
