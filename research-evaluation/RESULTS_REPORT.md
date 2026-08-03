# Seating-Lottery Integration: Frozen Evaluation Report

## 1. Evaluated system and evidence boundary

This evaluation covers the integration between the seating planner and the vendored lottery application: normalization, stable identity, transfer completion, state-preserving synchronization, duplicate/stale-message safeguards, and IndexedDB persistence. It does not evaluate seating quality, random prize selection, guest satisfaction, perceived fairness, or organizer workload.

All evaluation rosters are deterministic synthetic records. The 200-record condition approximates the field deployment scale without reproducing any private wedding data.

Baseline commit: `e63c8d1e0093f304daa8f4e6e1e98605ed61c04c`. The corrected implementation remained uncommitted in the isolated `research/ec-evaluation` worktree during evaluation, so every formal batch records a SHA-256 fingerprint over the relevant source files in addition to the baseline commit.

## 2. Defect-guided hardening

Six baseline or compatibility defects were reproduced and converted into regression evidence:

1. A legacy Excel-origin row with a `uid` could fail to upgrade to the planner's stable guest ID, risking identity and lottery-state discontinuity.
2. Repeated stable-ID rows in one payload could create duplicate lottery people.
3. Overlapping live-sync retries could interleave IndexedDB clear/add operations and leave the persisted roster empty after an in-memory success.
4. Two legacy rows sharing the same public identity fields could reuse one internal lottery person during stable-ID upgrade.
5. A historical `uid`-based deletion exclusion could stop matching after the same row gained a stable planner ID.
6. Delimiter-based fallback keys could collide, and equivalent Unicode or outer-whitespace variants could fail to match consistently.

The corrected integration uses structured fallback identities, backward-compatible exclusion candidates, one-to-one legacy upgrade queues, trimmed NFC scalar normalization, deterministic last-row-wins deduplication, immutable serialized snapshots, atomic replacement of both person stores, and completion events emitted only after persistence resolves. See `DEFECT_LOG.md` and the 30-test lottery suite.

## 3. Production normal-path evaluation

The primary batch used production builds, Chromium 149.0.7827.55, Firefox 151.0, and Playwright WebKit 26.5 on Windows 10.0.26200 with Node 24.15.0 and Playwright 1.61.1. Four roster sizes (50, 200, 500, and 1,000) were tested with one warm-up and 30 measured runs per browser-size cell.

Across 360 measured runs, all 360 completed end to end (100%; Wilson 95% CI 98.94%-100%). Every transfer produced the exact expected stable-ID set, the requested final count, and zero duplicate stable IDs.

| Engine | Records | E2E passes | Median protocol latency (ms) | IQR (ms) | P95 (ms) |
|---|---:|---:|---:|---:|---:|
| Chromium | 50 | 30/30 | 55.0 | 53.3-55.0 | 57.0 |
| Chromium | 200 | 30/30 | 82.0 | 80.0-84.8 | 86.0 |
| Chromium | 500 | 30/30 | 138.0 | 136.0-141.0 | 147.6 |
| Chromium | 1,000 | 30/30 | 225.5 | 221.0-232.0 | 240.0 |
| Firefox | 50 | 30/30 | 95.5 | 91.0-100.8 | 113.8 |
| Firefox | 200 | 30/30 | 141.0 | 137.3-147.0 | 153.7 |
| Firefox | 500 | 30/30 | 215.0 | 208.0-224.8 | 235.6 |
| Firefox | 1,000 | 30/30 | 334.0 | 319.0-349.8 | 371.3 |
| WebKit | 50 | 30/30 | 1,202.0 | 1,101.5-1,219.8 | 1,231.3 |
| WebKit | 200 | 30/30 | 3,921.0 | 3,755.3-3,988.5 | 4,060.2 |
| WebKit | 500 | 30/30 | 9,407.5 | 9,095.5-9,553.3 | 9,716.2 |
| WebKit | 1,000 | 30/30 | 18,983.5 | 18,602.3-19,308.0 | 19,671.6 |

Preparation medians remained at or below 11.0 ms in every cell. Persistence dominated receiver time, rising from 50.9 to 211.4 ms in Chromium, 93.0 to 322.0 ms in Firefox, and 1,183.5 to 18,959.5 ms in WebKit from 50 to 1,000 records. This is evidence for the tested Playwright runtimes, not a native Safari benchmark.

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

- Primary raw batch: `results/raw/bridge_production_formal_postcompat_20260803b.json`
- Primary summary: `results/processed/bridge_production_formal_postcompat_20260803b_summary.csv`
- Primary figure: `results/figures/bridge_production_formal_postcompat_20260803b_latency.pdf`
- Fault summary: `results/processed/live_sync_fault_production_postcompat_20260803b_summary.csv`
- Ablation raw data: `results/raw/ablation_formal_postcompat_20260803b_2026-08-03T064441946Z.csv`
- Ablation figure: `results/figures/ablation_formal_postcompat_20260803b_2026-08-03T064441946Z_outcomes.pdf`

The earlier `20260802a` production batch, pilot, development-mode, interrupted, and defect-discovery runs remain under `results/raw/` and are excluded from the current frozen summaries unless explicitly named.
