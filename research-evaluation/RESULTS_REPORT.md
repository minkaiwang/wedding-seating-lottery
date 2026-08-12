# Seating-Lottery Handoff: JSS Evaluation Report

## 1. Evaluated surface

The evaluation follows the handoff from source roster construction through peer-bound message exchange, receiver eligibility, normalization, state-preserving merge, IndexedDB commit, and completion acknowledgement. All rosters are synthetic. The evidence addresses the four-clause contract in `PROTOCOL.md` and does not evaluate seating quality, prize randomness, audience response, or operator workload.

The reproducible baseline is `e63c8d1e0093f304daa8f4e6e1e98605ed61c04c`. The peer-binding correction is `9ef774080125d6d0d7ae99701f2e27283e49ea51`. Each result batch records its own evaluated commit and source/build fingerprints.

## 2. Defect-guided hardening

Eight reproducible defects define the evaluated failure surface:

1. legacy identity upgrade could recreate a person and detach destination state;
2. repeated stable IDs could create duplicate destination rows;
3. overlapping persistence operations could leave durable state behind in-memory state;
4. non-unique legacy identities could reuse one destination object during upgrade;
5. historical deletion exclusions could be lost after stable-ID introduction;
6. delimiter and Unicode variation could collide or fragment fallback identity;
7. a sequence could be marked applied before its snapshot committed, blocking safe retry; and
8. the sender could accept handshake messages from a same-origin window other than the popup opened for the handoff.

The safeguards use structured normalized identities, deterministic stable-ID deduplication, one-to-one legacy upgrade queues, backward-compatible exclusion candidates, serialized atomic persistence, separate accepted and persisted sequence watermarks, and two-way binding to origin plus `WindowProxy`. The planner suite passed 13/13 tests and the lottery suite passed 34/34 tests after the corrections. `DEFECT_LOG.md` provides the defect-to-regression trace.

## 3. Production normal-path matrix

The formal batch used production builds on Windows 10.0.26200 with Node 24.15.0, Playwright 1.61.1, Chromium 149.0.7827.55, Firefox 151.0, and Playwright WebKit 26.5. It contains 30 measured transfers in each of 12 browser-size cells after one warm-up per cell.

All 360 measured transfers completed successfully (100%; Wilson 95% CI 98.94%-100%). Every transfer had the exact expected stable-ID set and exact normalized `name`, `department`, `identity`, and `avatar` fields, with no duplicate IDs or field mismatches.

| Engine | Records | Exact transfers | Median (ms) | IQR (ms) | P95 (ms) |
|---|---:|---:|---:|---:|---:|
| Chromium | 50 | 30/30 | 53.5 | 51.3-56.0 | 61.6 |
| Chromium | 200 | 30/30 | 81.0 | 76.0-84.0 | 89.6 |
| Chromium | 500 | 30/30 | 140.5 | 135.3-152.5 | 174.6 |
| Chromium | 1,000 | 30/30 | 216.0 | 209.3-222.0 | 255.8 |
| Firefox | 50 | 30/30 | 87.0 | 83.3-91.0 | 94.1 |
| Firefox | 200 | 30/30 | 118.0 | 113.0-121.8 | 132.2 |
| Firefox | 500 | 30/30 | 192.0 | 178.5-206.8 | 232.6 |
| Firefox | 1,000 | 30/30 | 289.5 | 272.3-301.8 | 321.3 |
| WebKit | 50 | 30/30 | 234.0 | 223.8-256.5 | 281.9 |
| WebKit | 200 | 30/30 | 573.0 | 561.8-596.5 | 622.6 |
| WebKit | 500 | 30/30 | 1,269.5 | 1,242.8-1,303.8 | 1,380.0 |
| WebKit | 1,000 | 30/30 | 2,352.0 | 2,288.0-2,397.0 | 2,474.2 |

The maximum readiness median was 12 ms. Persistence dominated the WebKit distribution and reached a median of 2,324.5 ms at 1,000 records. These measurements characterize the recorded Playwright engines and production builds; they are not native Safari measurements.

## 4. Fault-directed browser matrix

Each browser executed 30 seven-step sequences at 200 records, yielding 630 state checkpoints. All 630 checkpoints satisfied the expected protocol action and the exact semantic-state oracle. The batch recorded zero duplicate IDs, missing IDs, unexpected IDs, or public-field mismatches. Every browser-scenario cell passed 30/30, with a Wilson lower bound of 88.65% per cell.

Chromium and Firefox changed nonempty snapshots with medians between 45 and 62 ms. Playwright WebKit showed a heavier tail: duplicate-row correction had a median of 270 ms and P95 of 3,156.1 ms; recovery after clear had a median of 302.5 ms and P95 of 3,177.0 ms. Duplicate-sequence rejection, transient-empty protection, and explicit clearing had WebKit medians at or below 10 ms. The contrast localizes most of the runtime cost to persistence of changed nonempty snapshots.

The storage-failure retry defect (EC-007) and same-origin sibling-window defect (EC-008) are covered by deterministic regressions at their injection boundaries. They are not retroactively counted among the 630 browser checkpoints.

## 5. Analytical ablation

The formal ablation contains 3,200 records: four contract mechanisms, enabled and removed variants, four roster sizes, and 100 repetitions. Under each targeted fault condition, every enabled mechanism produced the correct outcome and every removed mechanism produced the corresponding failure:

| Targeted clause | Enabled mechanism | Enabled | Removed variant | Removed |
|---|---|---:|---|---:|
| Semantic identity | stable identity | 400/400 | without stable identity | 0/400 |
| State continuity | state-preserving merge | 400/400 | replace all | 0/400 |
| Message order | monotonic sequence guard | 400/400 | without sequence guard | 0/400 |
| Empty-payload semantics | transient-empty guard | 400/400 | without empty guard | 0/400 |

The 100%-versus-0% separation verifies that each mechanism controls its constructed failure condition. It does not estimate real-world fault frequency or comparative effect size.

## 6. Fixed-seed property contract

Nine executable properties each passed 2,000 generated cases: 18,000/18,000 cases, zero skips, zero failures, and zero shrinks. The properties cover normalization idempotence, Unicode and trim equivalence, delimiter-collision resistance, deterministic stable-ID deduplication, state-preserving merge, one-to-one legacy upgrade, exclusion continuity, persistence-failure retry, and transient-empty versus explicit-clear semantics.

Hosted Linux, Windows, and macOS jobs replayed the same seeds successfully. These jobs test portability of one generated corpus and are not pooled as independent cases.

## 7. Software-engineering implications

The evidence supports three reusable practices for browser-based cross-application handoffs. First, define completion as a conjunction of semantic, historical-state, protocol, and persistence clauses; a count match covers only part of semantic identity. Second, place oracles at the irreversible boundary: the final assertion must inspect the persisted semantic state after the commit acknowledgement. Third, derive tests from failure conditions across the complete boundary chain, including peer identity and retry state, rather than from nominal UI steps alone.

The defect trace also separates responsibilities that are often collapsed into one import function. Identity construction, state ownership, channel eligibility, sequence transition, and durable completion require distinct safeguards and evidence. This decomposition can be applied to other browser application pairs that move authoritative state into a destination with local history.

## 8. Evidence boundary

The results establish the recorded behavior of the evaluated application pair, commits, synthetic domains, browser engines, and production builds. Replication is still needed for other application pairs, native Safari, cross-device persistence, external file formats, malicious inputs, storage quotas, and independent test teams. Field experience and audience outcomes require separate study designs.

## 9. Current artifacts

- Normal path: `results/raw/bridge_production_formal_jss_field_oracle_20260812b.json`
- Normal summary: `results/processed/bridge_production_formal_jss_field_oracle_20260812b_summary.csv`
- Normal latency figure: `results/figures/bridge_production_formal_jss_field_oracle_20260812b_latency.pdf`
- Fault raw files: `results/raw/live_sync_fault_production_formal_jss_field_oracle_20260812c_*.json`
- Fault summary: `results/processed/live_sync_fault_production_formal_jss_field_oracle_20260812c_summary.csv`
- Ablation raw data: `results/raw/ablation_formal_jss_contract_20260812e_2026-08-12T140833483Z.csv`
- Ablation summary: `results/processed/ablation_formal_jss_contract_20260812e_2026-08-12T140833483Z_summary.csv`
- Property raw data: `results/raw/property_formal_jss_contract_20260812d.json`
- Property summary: `results/processed/property_formal_jss_contract_20260812d_summary.csv`

Earlier formal batches, pilots, interruptions, and setup records remain in `results/` for audit and are excluded from the current estimates unless explicitly named.
