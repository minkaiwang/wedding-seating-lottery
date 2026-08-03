# Seating-Lottery Integration: Frozen Evaluation Report

## 1. Evaluated system and evidence boundary

This evaluation covers the integration between the seating planner and the vendored lottery application: normalization, stable identity, transfer completion, state-preserving synchronization, duplicate/stale-message safeguards, and IndexedDB persistence. It does not evaluate seating quality, random prize selection, guest satisfaction, perceived fairness, or organizer workload.

All evaluation rosters are deterministic synthetic records. The 200-record condition approximates the field deployment scale without reproducing any private wedding data.

Baseline commit: `e63c8d1e0093f304daa8f4e6e1e98605ed61c04c`. The current corrected source commit is `fddac24062ecd34776dd5c4180c7a58a6ddea700`. Every formal batch records both that commit and a SHA-256 fingerprint over the relevant source files and production builds.

## 2. Defect-guided hardening

Six baseline or compatibility defects and one post-publication audit defect were reproduced and converted into regression evidence:

1. A legacy Excel-origin row with a `uid` could fail to upgrade to the planner's stable guest ID, risking identity and lottery-state discontinuity.
2. Repeated stable-ID rows in one payload could create duplicate lottery people.
3. Overlapping live-sync retries could interleave IndexedDB clear/add operations and leave the persisted roster empty after an in-memory success.
4. Two legacy rows sharing the same public identity fields could reuse one internal lottery person during stable-ID upgrade.
5. A historical `uid`-based deletion exclusion could stop matching after the same row gained a stable planner ID.
6. Delimiter-based fallback keys could collide, and equivalent Unicode or outer-whitespace variants could fail to match consistently.
7. A live-sync sequence could be marked applied before persistence completed, causing a same-sequence retry to be rejected after storage failure.

The corrected integration uses structured fallback identities, backward-compatible exclusion candidates, one-to-one legacy upgrade queues, trimmed NFC scalar normalization, deterministic last-row-wins deduplication, immutable serialized snapshots, atomic replacement of both person stores, completion events emitted only after persistence resolves, and separate accepted/persisted sequence watermarks. See `DEFECT_LOG.md` and the 34-test lottery suite. EC-007 is directly supported by deterministic sequence-state and live-listener regression tests; it is not counted as an injected scenario in the 630-outcome cross-browser matrix.

## 3. Production normal-path evaluation

The primary batch used production builds, Chromium 149.0.7827.55, Firefox 151.0, and Playwright WebKit 26.5 on Windows 10.0.26200 with Node 24.15.0 and Playwright 1.61.1. Four roster sizes (50, 200, 500, and 1,000) were tested with one warm-up and 30 measured runs per browser-size cell.

Across 360 measured runs, all 360 completed end to end (100%; Wilson 95% CI 98.94%-100%). Every transfer produced the exact expected stable-ID set, the requested final count, and zero duplicate stable IDs.

| Engine | Records | E2E passes | Median protocol latency (ms) | IQR (ms) | P95 (ms) |
|---|---:|---:|---:|---:|---:|
| Chromium | 50 | 30/30 | 56.5 | 53.3-61.0 | 65.6 |
| Chromium | 200 | 30/30 | 92.0 | 84.3-99.5 | 113.3 |
| Chromium | 500 | 30/30 | 146.5 | 141.3-152.8 | 168.2 |
| Chromium | 1,000 | 30/30 | 252.0 | 236.5-272.3 | 328.1 |
| Firefox | 50 | 30/30 | 94.0 | 69.0-105.8 | 117.2 |
| Firefox | 200 | 30/30 | 137.0 | 125.3-146.8 | 158.7 |
| Firefox | 500 | 30/30 | 223.5 | 208.3-235.8 | 255.5 |
| Firefox | 1,000 | 30/30 | 307.0 | 282.3-352.8 | 407.7 |
| WebKit | 50 | 30/30 | 1,206.0 | 1,190.3-1,223.5 | 1,245.1 |
| WebKit | 200 | 30/30 | 4,137.5 | 4,115.3-4,153.3 | 4,190.0 |
| WebKit | 500 | 30/30 | 9,846.0 | 8,594.5-9,975.5 | 10,095.9 |
| WebKit | 1,000 | 30/30 | 19,732.5 | 19,685.5-19,784.8 | 20,012.2 |

Preparation medians remained at or below 14.0 ms in every cell. Persistence dominated receiver time, rising from 52.6 to 232.1 ms in Chromium, 89.5 to 290.0 ms in Firefox, and 1,188.5 to 19,704.5 ms in WebKit from 50 to 1,000 records. This is evidence for the tested Playwright runtimes, not a native Safari benchmark.

An earlier production batch (`bridge_production_formal_20260802a`) retained one WebKit 1,000-record non-completion, during which Playwright remained blocked for approximately 1,804 seconds despite a nominal 30-second wait timeout. The event did not recur in the later post-compatibility batch and is not pooled into the current estimate. It remains an auditable historical runtime incident rather than being reclassified as a proven application defect.

## 4. Production fault sequences

At 200 synthetic records, each browser executed 30 independent seven-step sequences: initial synchronization, accepted current sequence, duplicate sequence rejection, transient empty-payload protection, duplicate-row last-wins correction, intentional clear, and recovery after clear. All 630 scenario outcomes passed (aggregate Wilson 95% CI 99.39%-100%). Every browser-scenario cell was 30/30 (Wilson lower bound 88.65% for run-level repetition), and all 90 raw files shared one source fingerprint and one pair of production-build fingerprints.

The WebKit runs again localized cost to changed non-empty snapshots: duplicate-row correction and recovery medians were approximately 3.1 seconds, while stale-sequence rejection, transient-empty protection, and intentional clear completed in milliseconds. This supports snapshot reuse for unchanged state and the distinction between protocol decisions and persistence work.

## 5. Analytical ablation

The formal ablation generated 3,200 records across four roster sizes, 100 repetitions, four safeguards, and enabled/removed variants. Under each safeguard's targeted fault condition:

- Stable identity preserved identity/state in 100% of generated cases; removing stable IDs preserved it in 0%.
- State-preserving merge retained lottery-side state in 100%; replace-all retained it in 0%.
- Monotonic sequence checking rejected the stale message in 100%; removing it failed the targeted outcome in 100%.
- Transient-empty protection retained the authoritative non-empty roster in 100%; removing it cleared the roster in 100%.

These are constructed condition outcomes, not estimates of real-world fault incidence or universal effect sizes.

## 6. Interpretation and limits

The evidence supports a bounded technical claim: the corrected integration preserved roster identity and lottery-side state, rejected the tested stale/transient inputs, and completed accurately across the current tested production engines and scales. It also shows that technical transformation time was small relative to browser-specific persistence time, especially in Playwright WebKit. The earlier single WebKit non-completion remains a reason not to claim universal reliability.

The evidence does not establish that the system reduced labor, improved experience, increased fairness, or outperformed commercial event platforms. The field wedding demonstrates situated use and accountable human verification; the controlled evaluation supplies software evidence for the integration protocol. Transfer to other one-off events should be argued from shared operating conditions, not from wedding-category similarity alone.

## 7. Frozen artifacts

- Primary raw batch: `results/raw/bridge_production_formal_ec007_20260803c.json`
- Primary summary: `results/processed/bridge_production_formal_ec007_20260803c_summary.csv`
- Primary figure: `results/figures/bridge_production_formal_ec007_20260803c_latency.pdf`
- Fault summary: `results/processed/live_sync_fault_production_ec007_20260803c_summary.csv`
- Ablation raw data: `results/raw/ablation_formal_ec007_20260803c_2026-08-03T132449529Z.csv`
- Ablation figure: `results/figures/ablation_formal_ec007_20260803c_2026-08-03T132449529Z_outcomes.pdf`

The earlier `20260802a` production batch, pilot, development-mode, interrupted, and defect-discovery runs remain under `results/raw/` and are excluded from the current frozen summaries unless explicitly named.
