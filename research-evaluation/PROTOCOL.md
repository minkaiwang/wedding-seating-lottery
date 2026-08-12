# Seating-Lottery Handoff Evaluation Protocol

## 1. Scope and versioning

- Reproducible baseline: `e63c8d1e0093f304daa8f4e6e1e98605ed61c04c`
- Evaluation branch: `research/jss-evidence-alignment`
- Peer-binding correction: `9ef774080125d6d0d7ae99701f2e27283e49ea51`
- System under evaluation: the integration layer between the seating planner and the vendored lottery application
- Data: deterministic synthetic records only

The evaluation covers roster normalization, identity construction, peer and origin binding, message sequencing, state-preserving merge, IndexedDB commit, and completion acknowledgement. Seating quality, random prize selection, visual presentation, audience experience, and operator workload are outside the evaluated software surface.

## 2. Executable handoff contract

A completed handoff must satisfy four coupled clauses:

1. **Semantic identity (I1):** the destination contains the expected stable-ID set, no duplicates, and exact normalized values for `name`, `department`, `identity`, and `avatar`.
2. **Destination-state continuity (I2):** updates preserve destination-owned identifiers, winning state, prize history, and exclusions for the same person.
3. **Message order and empty-payload semantics (I3):** the receiver accepts messages only from the bound peer and allowed origin, rejects duplicate or stale sequences, protects a valid nonempty roster from malformed transient empties, and permits an explicit zero-roster clear.
4. **Post-commit completion (I4):** completion is emitted only after the accepted snapshot has reached durable storage; a failed unsuperseded commit remains retryable.

For message sequence `n`, completion is sound only when `H(n) = I1 and I2 and I3 and I4` holds for the accepted and persisted snapshot.

## 3. Research questions

**RQ1 Defect structure.** Which failure conditions break the handoff contract across source construction, channel binding, receiver eligibility, merge, persistence, and completion?

**RQ2 Correctness.** Does the corrected production handoff satisfy semantic identity and exact public-field equality across roster sizes and browser engines?

**RQ3 Fault behavior.** Do the protocol and persistence safeguards preserve the expected state under duplicate messages, transient empty payloads, duplicate rows, explicit clearing, recovery, storage rejection, and same-origin sibling-window messages?

**RQ4 Safeguard contribution.** Does removing stable identity, state-preserving merge, sequence checking, or transient-empty protection produce the corresponding targeted failure?

**RQ5 Generated-domain robustness.** Do the nine pure-function properties hold over fixed-seed generated inputs and replay across hosted operating systems?

## 4. Units, matrices, and oracles

The normal-path unit is one production-build browser transfer. Roster sizes are 50, 200, 500, and 1,000 records. Each browser-size cell contains one warm-up and 30 measured transfers in Chromium, Firefox, and Playwright WebKit. The exact oracle compares stable IDs and all four normalized public fields; count equality alone is not sufficient.

The fault unit is one state checkpoint within a seven-step sequence at 200 records: initial synchronization, accepted current sequence, duplicate-sequence rejection, transient-empty protection, duplicate-row last-wins correction, explicit clear, and recovery after clear. Thirty independent sequences per browser yield 630 checkpoints. Exact IDs and public fields are checked after every step. Storage-failure retry and sibling-window rejection are deterministic regressions because they require a different injection boundary from the seven-step browser sequence.

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

Success rates use Wilson 95% confidence intervals. Latency is reported with median, interquartile range, and 95th percentile.

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
