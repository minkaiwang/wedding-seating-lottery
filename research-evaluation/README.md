# Research evaluation

This directory contains the reproducible evaluation of the browser-based seating-to-lottery handoff. The current study treats the handoff as a four-clause correctness contract: semantic identity, destination-state continuity, message eligibility, order, and empty-payload semantics, and post-commit completion. All datasets are synthetic.

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

Install root and lottery dependencies plus the three Playwright browser engines:

```powershell
npm ci
npm ci --prefix ./log-lottery
npx playwright install chromium firefox webkit
```

On Linux, use `npx playwright install --with-deps chromium firefox webkit` when system browser dependencies are absent. Run both regression suites before the measurement matrices:

```powershell
npm test
npm test --prefix ./log-lottery -- --run
```

Build both applications with the evaluation origins embedded:

```powershell
$env:NEXT_PUBLIC_LOTTERY_IMPORT_URL='http://localhost:6721/log-lottery/config/person/all'
npm run build
$env:VITE_WEDDING_SEATING_ORIGINS='http://localhost:3201'
npm run build --prefix ./log-lottery
```

Run the normal-path matrix. The runner starts and stops the production servers on ports 3201 and 6721; do not start separate servers on those ports:

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

Run the fault matrix. Each invocation starts and stops the same production-build stack:

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

Generate the processed summaries from the newly created raw files:

```powershell
python ./research-evaluation/scripts/summarize_bridge.py `
  ./research-evaluation/results/raw/bridge_production_reproduction_local-run.csv

python ./research-evaluation/scripts/summarize_faults.py `
  "./research-evaluation/results/raw/live_sync_fault_reproduction_*.json" `
  live_sync_fault_reproduction

$ablation = (Get-ChildItem ./research-evaluation/results/raw/ablation_reproduction_*.csv |
  Sort-Object LastWriteTime | Select-Object -Last 1).FullName
python ./research-evaluation/scripts/summarize_ablation.py $ablation
```

The property runner writes its raw JSON and summary CSV directly. The runners refuse to overwrite an existing run ID where one is required. Pilot, interrupted, and earlier formal batches remain under `results/` for audit and are excluded from current estimates unless explicitly named.

## Hosted replay archive

GitHub Actions run `30880727356` executed the same fixed-seed property set on Linux, Windows, and macOS. A repository copy of its six raw and processed artifacts is retained under `results/hosted/gh-run-30880727356/`, together with SHA-256 hashes, so reproduction does not depend on the temporary Actions artifact-retention window. The run used the property source fingerprint recorded in each raw JSON file; it should not be described as CI for a later repository tip.
