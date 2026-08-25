# Research evaluation

This directory contains the reproducible evaluation of the browser-based seating-to-lottery handoff. The current study treats the handoff as a four-clause correctness contract: semantic identity, destination-state continuity, message eligibility, order, and empty-payload semantics, and post-commit completion. All datasets are synthetic.

Start with `PROTOCOL.md`, then read `RESULTS_REPORT.md` and `DEFECT_LOG.md`. Raw records, processed summaries, and figures are kept separately. Each formal batch records the evaluated commit, source fingerprint, runtime, and relevant build fingerprints.

Do not copy wedding guest files, photographs, contact details, questionnaires, or private event exports into this directory.

## Current JSEP evidence set

The JSEP study evaluates four nested observation regimes (`O0`, `O1`, `O1K`, and `O2`) and keeps development-corpus, source-variant, generated-counterexample, cost, browser, and adaptation results as separate evidence units. The study protocol and amendments are in `jsep/PROTOCOL.md`; the executable fault definitions are in `jsep/fault-catalogue.json` and `jsep/holdout-mutants.json`.

### Contract and implementation evidence

- Development-corpus oracle matrix: `jsep/results/raw/jsep_oracle_formal_o1k_20260826a.json`
- Processed oracle matrix: `jsep/results/processed/jsep_oracle_formal_o1k_20260826a_matrix.csv`
- Generated counterexamples: `jsep/results/raw/jsep_counterexamples_formal_o1k_20260826a.json`
- Counterexample records and summary: `jsep/results/raw/jsep_counterexamples_formal_o1k_20260826a_records.csv` and `jsep/results/processed/jsep_counterexamples_formal_o1k_20260826a_summary.csv`
- In-process checker cost: `jsep/results/raw/jsep_contract_cost_formal_o1k_20260826a.json`
- Cost records and summary: `jsep/results/raw/jsep_contract_cost_formal_o1k_20260826a_records.csv` and `jsep/results/processed/jsep_contract_cost_formal_o1k_20260826a_summary.csv`
- Check-in schema adaptation: `jsep/results/raw/jsep_adaptation_formal_o1k_20260826a.json`
- Processed adaptation matrix: `jsep/results/processed/jsep_adaptation_formal_o1k_20260826a_matrix.csv`
- Source-level browser variants: `results/raw/jsep_holdout_suite_formal_20260826d.json` and `results/raw/jsep_holdout_formal_20260826d/`

The 28-item development corpus was used to construct and diagnose the nested oracle regimes. It is not an independent estimate of detection performance. The later source-level comparison uses eight implementation variants, 24 paired control executions, and three browser engines as technical replications. Existing project tests, an independently implemented keyed post-state check, and O2 detected 1/8, 6/8, and 8/8 variants, respectively.

### Production-browser evidence

- Replacement matrix: `results/raw/jsep_bridge_contract_formal_20260826a.json` and `results/raw/jsep_bridge_contract_formal_20260826a.csv`
- Synchronization formal records: `results/raw/jsep_sync_contract_formal_{chromium,firefox,webkit}_*.json`
- Formal 15-second WebKit timeout record: `results/raw/jsep_sync_contract_failure_record15s_webkit_2026-08-25T181231998Z.json`
- Separate 60-second diagnostic: `results/raw/jsep_sync_contract_diagnostic60s_webkit_2026-08-25T181355434Z.json`

The replacement matrix contains 120 measured production-build transfers. The synchronization sequence contains 69 passed contract checkpoints, one timed-out checkpoint, and two checkpoints not executed after that timeout. The 60-second diagnostic is reported separately and does not replace the formal timeout.

All JSEP records use deterministic synthetic rosters. In code and older raw labels, `atomicCommit` or `durable` denotes state observable from IndexedDB within the declared transaction boundary; it does not claim hardware-level durability or crash recovery.

## Reproducing JSEP evidence

Install dependencies and browser engines, then run the existing regression suites:

```powershell
npm ci
npm ci --prefix ./log-lottery
npx playwright install chromium firefox webkit
npm test
npm test --prefix ./log-lottery -- --run
```

Run the development-corpus, counterexample, cost, and adaptation evaluations with new run IDs:

```powershell
$env:JSEP_ORACLE_RUN_ID='jsep_oracle_local'
npm run evaluate:jsep:oracles

$env:JSEP_COUNTEREXAMPLE_RUN_ID='jsep_counterexamples_local'
npm run evaluate:jsep:counterexamples

$env:JSEP_COST_RUN_ID='jsep_contract_cost_local'
npm run evaluate:jsep:cost

$env:JSEP_ADAPTATION_RUN_ID='jsep_adaptation_local'
npm run evaluate:jsep:adaptation
```

Build the two production applications before browser replay:

```powershell
$env:NEXT_PUBLIC_LOTTERY_IMPORT_URL='http://localhost:6721/log-lottery/config/person/all'
npm run build
$env:VITE_WEDDING_SEATING_ORIGINS='http://localhost:3101'
npm run build --prefix ./log-lottery
```

Run the replacement matrix:

```powershell
$env:EVAL_SEATING_ORIGIN='http://localhost:3101'
$env:EVAL_LOTTERY_ORIGIN='http://localhost:6721'
$env:EVAL_SIZES='50,200,500,1000'
$env:EVAL_REPETITIONS='10'
$env:EVAL_WARMUPS='1'
$env:EVAL_BROWSERS='chromium,firefox,webkit'
$env:EVAL_SERVER_MODE='production'
$env:EVAL_BATCH_LABEL='jsep_bridge_contract_reproduction'
$env:EVAL_RUN_ID='local-run'
npm run evaluate:bridge:pilot
```

Run one synchronization sequence for each browser and roster size. Each invocation writes a separate JSON result:

```powershell
$env:EVAL_SEATING_ORIGIN='http://localhost:3101'
$env:EVAL_LOTTERY_ORIGIN='http://localhost:6721'
$env:EVAL_SERVER_MODE='production'
$env:EVAL_FAULT_BATCH_LABEL='jsep_sync_contract_reproduction'
$env:EVAL_FAULT_ACTION_TIMEOUT_MS='15000'
foreach ($browser in 'chromium','firefox','webkit') {
  $env:EVAL_FAULT_BROWSER=$browser
  foreach ($size in 50,200,500,1000) {
    $env:EVAL_FAULT_ROSTER_SIZE=[string]$size
    npm run evaluate:faults:pilot
  }
}
```

The source-level variant suite mutates and restores product files. Run it only in a clean linked worktree checked out at the application base commit recorded by `jsep/holdout-mutants.json`:

```powershell
git worktree add ../wedding-jsep-holdout-reproduction e7373e212d711103f0822c9928200289b0adb5c4
Set-Location ../wedding-jsep-holdout-reproduction
npm ci
npm ci --prefix ./log-lottery
npx playwright install chromium firefox webkit
node ./research-evaluation/scripts/run-jsep-holdout-suite.mjs --run-id local_reproduction
```

## Historical JSS evidence set

The manuscript uses the two research questions stated in `PROTOCOL.md`. The reported evaluation is selected by the exact commit and artifact anchors listed in the manuscript and supplementary appendix; later branch-tip maintenance commits do not retroactively change the measured batches. `PROPERTY_MANIFEST_SHA256.txt` is the historical property-evaluation snapshot created at commit `978d43e55e6b4fcaae1356c94fdea688dbc84a42`. Use `JSS_EVIDENCE_MANIFEST_SHA256.txt` and `scripts/verify-evidence-manifest.py` to verify the current JSS evidence set.

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

## Historical JSS reproduction

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

## Historical JSS hosted replay archive

GitHub Actions run `30880727356` executed the same fixed-seed property set on Linux, Windows, and macOS. A repository copy of its six raw and processed artifacts is retained under `results/hosted/gh-run-30880727356/`, together with SHA-256 hashes, so reproduction does not depend on the temporary Actions artifact-retention window. The run used the property source fingerprint recorded in each raw JSON file; it should not be described as CI for a later repository tip.
