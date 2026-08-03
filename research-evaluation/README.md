# Research evaluation

This directory contains the reproducible evaluation of the seating-to-lottery integration layer. Start with `PROTOCOL.md`. Generated raw data and summaries will be kept separate from source scenarios and will identify the evaluated commit.

The evaluation uses synthetic records only. Do not copy wedding guest files, photographs, contact details, or private event exports into this directory.

## Current frozen results

- `RESULTS_REPORT.md`: human-readable method, findings, incidents, and claim boundaries.
- `results/raw/bridge_production_formal_ec007_20260803c.json`: current production E2E batch, including environment and build fingerprints.
- `results/processed/bridge_production_formal_ec007_20260803c_summary.csv`: current browser-by-size summary.
- `results/figures/bridge_production_formal_ec007_20260803c_latency.pdf`: current publication latency figure.
- `results/processed/live_sync_fault_production_ec007_20260803c_summary.csv`: current production fault-sequence summary from 90 run files.
- `results/raw/ablation_formal_ec007_20260803c_2026-08-03T132449529Z.csv`: current analytical ablation records.
- `results/figures/ablation_formal_ec007_20260803c_2026-08-03T132449529Z_outcomes.pdf`: current ablation figure.
- `DEFECT_LOG.md`: reproducible baseline defects and regression evidence.

The earlier `20260802a` and `20260803b` production batches remain in `results/raw/` for historical audit. Pilot and failed setup files also remain there and are not pooled with the current frozen summaries. The current source commit is `fddac24062ecd34776dd5c4180c7a58a6ddea700`.

## Reproduction

Install root and lottery dependencies, then build both applications with the evaluation origins embedded:

```powershell
$env:NEXT_PUBLIC_LOTTERY_IMPORT_URL='http://localhost:6721/log-lottery/config/person/all'
npm run build
$env:VITE_WEDDING_SEATING_ORIGINS='http://localhost:3101'
npm run build --prefix ./log-lottery
```

Run the primary E2E matrix:

```powershell
$env:EVAL_SIZES='50,200,500,1000'
$env:EVAL_REPETITIONS='30'
$env:EVAL_WARMUPS='1'
$env:EVAL_BROWSERS='chromium,firefox,webkit'
$env:EVAL_SERVER_MODE='production'
$env:EVAL_BATCH_LABEL='bridge_production_formal'
$env:EVAL_RUN_ID='local-run'
npm run evaluate:bridge:pilot
```

If an outer process limit interrupts the batch, repeat the same command with `$env:EVAL_RESUME='1'`. The runner verifies source, environment, build, and design metadata before skipping completed cells.

Generate summaries and figures:

```powershell
python research-evaluation/scripts/summarize_bridge.py research-evaluation/results/raw/bridge_production_formal_local-run.csv
python research-evaluation/scripts/summarize_faults.py 'live_sync_fault_production_postcompat_*.json' live_sync_fault_production_postcompat_local
python research-evaluation/scripts/summarize_ablation.py research-evaluation/results/raw/ablation_formal_<timestamp>.csv
```
