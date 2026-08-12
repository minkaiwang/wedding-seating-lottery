# Research evaluation

This directory contains the reproducible evaluation of the browser-based seating-to-lottery handoff. The current study treats the handoff as a four-clause correctness contract: semantic identity, destination-state continuity, message order and empty-payload semantics, and post-commit completion. All datasets are synthetic.

Start with `PROTOCOL.md`, then read `RESULTS_REPORT.md` and `DEFECT_LOG.md`. Raw records, processed summaries, and figures are kept separately. Each formal batch records the evaluated commit, source fingerprint, runtime, and relevant build fingerprints.

Do not copy wedding guest files, photographs, contact details, questionnaires, or private event exports into this directory.

## Current JSS evidence set

- Normal-path raw batch: `results/raw/bridge_production_formal_jss_field_oracle_20260812b.json`
- Normal-path summary: `results/processed/bridge_production_formal_jss_field_oracle_20260812b_summary.csv`
- Normal-path latency figure: `results/figures/bridge_production_formal_jss_field_oracle_20260812b_latency.pdf`
- Fault-sequence raw files: `results/raw/live_sync_fault_production_formal_jss_field_oracle_20260812c_*.json`
- Fault-sequence summary: `results/processed/live_sync_fault_production_formal_jss_field_oracle_20260812c_summary.csv`
- Ablation raw data: `results/raw/ablation_formal_jss_contract_20260812e_2026-08-12T140833483Z.csv`
- Ablation summary: `results/processed/ablation_formal_jss_contract_20260812e_2026-08-12T140833483Z_summary.csv`
- Property raw batch: `results/raw/property_formal_jss_contract_20260812d.json`
- Property summary: `results/processed/property_formal_jss_contract_20260812d_summary.csv`

The four evidence units remain separate:

- 360 production-build browser transfers;
- 630 fault-directed state checkpoints;
- 3,200 analytical ablation records; and
- 18,000 fixed-seed generated property cases.

Hosted Linux, Windows, and macOS jobs replay the same fixed-seed property cases. They are portability replays, not an additional 54,000 independent cases.

## Reproduction

Install root and lottery dependencies, then build both applications with the evaluation origins embedded:

```powershell
$env:NEXT_PUBLIC_LOTTERY_IMPORT_URL='http://localhost:6721/log-lottery/config/person/all'
npm run build
$env:VITE_WEDDING_SEATING_ORIGINS='http://localhost:3201'
npm run build --prefix ./log-lottery
```

Start the production servers on ports 3201 and 6721, then run the normal-path matrix:

```powershell
$env:EVAL_SEATING_ORIGIN='http://localhost:3201'
$env:EVAL_LOTTERY_ORIGIN='http://localhost:6721'
$env:EVAL_SIZES='50,200,500,1000'
$env:EVAL_REPETITIONS='30'
$env:EVAL_WARMUPS='1'
$env:EVAL_BROWSERS='chromium,firefox,webkit'
$env:EVAL_SERVER_MODE='production'
$env:EVAL_BATCH_LABEL='bridge_production_reproduction'
$env:EVAL_RUN_ID='local-run'
npm run evaluate:bridge:pilot
```

Run the fault matrix against the same production servers:

```powershell
$env:EVAL_SEATING_ORIGIN='http://localhost:3201'
$env:EVAL_LOTTERY_ORIGIN='http://localhost:6721'
$env:EVAL_SERVER_MODE='production'
$env:EVAL_FAULT_ROSTER_SIZE='200'
$env:EVAL_FAULT_BATCH_LABEL='live_sync_fault_reproduction'
foreach ($browser in 'chromium','firefox','webkit') {
  $env:EVAL_FAULT_BROWSER=$browser
  1..30 | ForEach-Object { npm run evaluate:faults:pilot }
}
```

Run the analytical ablation and property contract:

```powershell
$env:EVAL_ABLATION_SIZES='50,200,500,1000'
$env:EVAL_ABLATION_REPETITIONS='100'
$env:EVAL_ABLATION_BATCH_LABEL='ablation_reproduction'
npm run evaluate:ablation:pilot

$env:EVAL_PROPERTY_RUNS='2000'
$env:EVAL_PROPERTY_SEED='20260804'
$env:EVAL_PROPERTY_RUN_ID='property_local_reproduction'
npm run evaluate:properties
```

Generate processed outputs with the scripts in `scripts/`. The runners refuse to overwrite an existing run ID where one is required. Pilot, interrupted, and earlier formal batches remain under `results/` for audit and are excluded from current estimates unless explicitly named.
