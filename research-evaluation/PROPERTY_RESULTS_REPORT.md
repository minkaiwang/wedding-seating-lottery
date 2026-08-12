# Property-Based Handoff Contract Results

## Status

- Formal run: `property_formal_jss_contract_20260812d`
- Evaluated parent commit: `64e95880c91bf7fc552a8662cb1396020b1a3305`
- Working tree at evaluation start: clean
- Relevant-source SHA-256: `820fc6725e1ff0d1a85d68b97deab3e6abe636338081b0a5147066558134e003`
- Runtime: Node.js 24.15.0 on Windows 10.0.26200
- Generator: `fast-check` 3.23.2
- Design: 9 properties x 2,000 fixed-seed cases
- Result: 9/9 properties and 18,000/18,000 cases passed; zero skips, failures, or shrinks

The raw JSON records the master seed (`20260804`), per-property seeds (`20260805`-`20260813`), elapsed time, source hash, runtime, and replay fields. The summary CSV contains one row per property.

## Results

| Property | Contract boundary | Cases | Result |
|---|---|---:|---|
| PB-01 normalization idempotence | Semantic normalization | 2,000 | Passed |
| PB-02 NFC and trim equivalence | Semantic normalization | 2,000 | Passed |
| PB-03 delimiter-collision resistance | Semantic identity | 2,000 | Passed |
| PB-04 stable-ID last-row deduplication | Semantic identity | 2,000 | Passed |
| PB-05 destination-state preservation | State continuity | 2,000 | Passed |
| PB-06 one-to-one legacy upgrade | Identity upgrade and state continuity | 2,000 | Passed |
| PB-07 historical exclusion continuity | Exclusion continuity | 2,000 | Passed |
| PB-08 persistence-failure sequence recovery | Message order and retry | 2,000 | Passed |
| PB-09 transient-empty versus explicit-clear semantics | Empty-payload semantics | 2,000 | Passed |

PB-02 checks that normalization joins canonically equivalent inputs. PB-03 generates tuples that collide under delimiter concatenation and confirms that structured keys remain distinct. PB-05 includes a replace-all negative control that loses generated destination-owned identifiers. These controls establish sensitivity to the targeted risk patterns.

## Cross-platform replay

Hosted Linux, Windows, and macOS runners replayed the same seeds successfully. The three jobs demonstrate replay portability for the recorded corpus. They remain the same 18,000 generated cases and are not pooled as 54,000 independent inputs.

## Repository verification

- Planner tests: 13/13 passed.
- Planner lint and production build: passed.
- Lottery tests: 34/34 passed.
- Lottery production build: passed.

## Interpretation

The formal run supports the nine properties for the recorded pure functions and generated domains. Browser matrices, fault sequences, and ablations supply distinct evidence at integration and negative-control boundaries. The property result does not constitute exhaustive proof or evidence about native Safari, real storage-failure incidence, usability, or field reliability.

## Artifacts

- Raw result: `results/raw/property_formal_jss_contract_20260812d.json`
- Summary: `results/processed/property_formal_jss_contract_20260812d_summary.csv`
- Runner: `scripts/run-property-evaluation.ts`
- Protocol: `PROPERTY_PROTOCOL.md`
