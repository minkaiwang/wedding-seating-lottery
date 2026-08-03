# Seating-Lottery Integration Evaluation Protocol

## 1. Evaluation status

- Baseline commit: `e63c8d1`
- Evaluation branch: `research/ec-evaluation`
- System under evaluation: the repository's integration layer between the seating planner and the vendored lottery application
- Out of scope: upstream seating algorithms, 3D rendering, prize-selection UI, and claims about guest satisfaction or organizer workload
- Data: deterministic synthetic guest records only; no real guest names or contact details

This protocol is fixed before changing integration behavior. Any defect discovered after the baseline run must be retained as a failing regression case. Results must distinguish the baseline from the corrected implementation.

## 2. Research questions

**RQ1 Correctness.** Does the integration produce the intended normalized lottery roster without loss, duplication, or unintended identity changes under nominal transfers?

**RQ2 State continuity.** When seating records change, does the integration preserve lottery-side state for the same guest, including the internal identifier, winning state, and prize history, while respecting intentional lottery-side exclusions?

**RQ3 Fault tolerance.** How does the protocol respond to delayed readiness, duplicate or reordered messages, malformed records, transient empty payloads, closed windows, and untrusted origins?

**RQ4 Scalability and portability.** How do completion time and correctness change with roster size and browser engine?

**RQ5 Safeguard contribution.** Which outcomes change when stable guest identifiers, monotonic sequence checks, transient-empty protection, or state-preserving merge are removed one at a time?

## 3. Units and conditions

The primary unit is one transfer or synchronization run. Deterministic datasets use fixed seeds and roster sizes of 50, 200, 500, and 1,000 records. The 200-record condition approximates the field case without reproducing its private data.

Browser runs cover Chromium, Firefox, and WebKit when the installed Playwright runtime supports them. Every browser-size-condition cell is repeated at least 30 times after one warm-up run. Failed or unsupported browser launches are reported rather than silently dropped.

## 4. Outcomes

| Outcome | Operational definition |
|---|---|
| Transfer correctness | Final stable-ID set and normalized public fields exactly match the expected roster |
| Duplicate count | Number of repeated stable IDs or repeated fallback identity keys in the final roster |
| State preservation | Proportion of matched existing guests retaining internal ID, winning state, and prize arrays |
| Exclusion preservation | Proportion of explicitly excluded records not restored by merge synchronization |
| Stale rejection | Reordered or repeated sequence number leaves the accepted state unchanged |
| Empty-payload safety | A malformed empty payload cannot clear a non-empty authoritative roster |
| Intentional clear | A valid zero-roster payload clears the lottery roster |
| Completion latency | Monotonic elapsed time from sender dispatch to receiver acceptance event |
| Recovery success | Expected state is reached after the injected transient fault and documented recovery action |

Success rates are reported with binomial confidence intervals. Latencies are reported with median, interquartile range, and 95th percentile; means may be included only as supplementary descriptors.

## 5. Scenario matrix

Nominal scenarios include initial full import, unchanged repeat import, name/table/tag update with stable ID, add/remove, and an intentional zero-roster clear.

Continuity scenarios include a winning guest updated by stable ID, an Excel-origin legacy row upgraded to stable ID, a lottery-side deletion protected by the exclusion list, and duplicate display names belonging to different stable IDs.

Fault scenarios include duplicate sequence, stale sequence, delayed receiver readiness, invalid origin, wrong window identity, partially malformed rows, declared nonzero source with an empty normalized payload, closed popup, and receiver storage delay or rejection where reproducible.

Ablations disable exactly one safeguard per run while retaining the same dataset and fault schedule. They are analytical variants in the evaluation harness, not recommended production configurations.

## 6. Reproducibility and audit trail

- Machine-readable scenario definitions and seeds are versioned with the harness.
- Raw run-level records are written as CSV or JSON Lines and never edited manually.
- Summary tables and figures are generated from raw records by scripts.
- Runtime versions, browser versions, commit hashes, operating system, and timestamps are captured with each run batch.
- A failed run remains in the raw data with an explicit status and error class.
- Defect fixes require a regression test and a short entry in `DEFECT_LOG.md`.

## 7. Claim boundaries

The controlled evaluation may support claims about software correctness, protocol robustness, state continuity, and measured execution latency in the tested environments. It cannot establish reduced human workload, improved satisfaction, improved perceived fairness, or universal reliability in all live-event settings. The wedding remains a field demonstration of use, not a controlled causal comparison.

## 8. Execution record

The current post-EC-007 normal-path matrix was executed against production builds on 2026-08-03 at source commit `fddac24062ecd34776dd5c4180c7a58a6ddea700`. It contains one warm-up and 30 measured runs in each of 12 browser-size cells. All 360 measured transfers completed with the exact expected stable-ID set and no duplicate stable IDs. The current production fault matrix contains 30 independent seven-scenario sequences per browser at 200 records; all 630 outcomes passed. The current analytical ablation contains 100 generated cases per roster size and variant (3,200 records).

EC-007 concerns retrying the same sequence after receiver persistence rejects. It is covered by deterministic sequence-state and live-listener regression tests. The cross-browser 630-outcome matrix retains its preregistered seven-scenario definition and does not include an injected storage rejection; the aggregate must not be cited as direct EC-007 evidence.

Every current fault-sequence file shares one evaluated source hash and one pair of production-build hashes. The current E2E batch records its own source and build fingerprints. The ablation records a separate hash over its pure evaluation path because each harness fingerprints a different relevant file set.

The earlier `bridge_production_formal_20260802a` batch remains part of the audit trail. It was resumed once after an outer command-time limit and retained one WebKit 1,000-record non-completion whose Playwright wait substantially exceeded the requested timeout. That event was not reproduced in the later 30-run post-compatibility cell. It remains historical evidence and is not pooled into the current 360-run estimate.
