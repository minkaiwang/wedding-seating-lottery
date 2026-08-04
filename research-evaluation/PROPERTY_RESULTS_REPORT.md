# Property-Based Handoff Invariant Results

## Status

- Formal run: `property_formal_20260804b`
- Evaluated code commit: `a035b1fea7367466f21194c4685687d545ceecfc`
- Working tree at evaluation start: clean
- Relevant-source SHA-256: `820fc6725e1ff0d1a85d68b97deab3e6abe636338081b0a5147066558134e003`
- Runtime: Node.js 24.15.0 on Windows 10.0.26200
- Generator: `fast-check` 3.23.2
- Design: 9 properties x 2,000 fixed-seed generated cases
- Result: 9/9 properties passed; 18,000/18,000 cases passed; 0 skips; 0 failures; 0 shrinks

The raw JSON records the master seed, per-property seed, elapsed time, source hash, runtime, and replay fields. The summary CSV contains one row per property.

## Results

| Property | Boundary | Cases | Result |
|---|---|---:|---|
| PB-01 normalization idempotence | Semantic normalization | 2,000 | Passed |
| PB-02 NFC and trim equivalence | Semantic normalization | 2,000 | Passed |
| PB-03 delimiter-collision resistance | Semantic identity | 2,000 | Passed |
| PB-04 stable-ID last-row deduplication | Semantic identity | 2,000 | Passed |
| PB-05 lottery-state preservation | Historical state | 2,000 | Passed |
| PB-06 one-to-one legacy upgrade | Identity upgrade and historical state | 2,000 | Passed |
| PB-07 historical exclusion continuity | Exclusion continuity | 2,000 | Passed |
| PB-08 persistence-failure sequence recovery | Message order and retry | 2,000 | Passed |
| PB-09 transient-empty versus explicit-clear semantics | Empty-payload semantics | 2,000 | Passed |

PB-02 also checked that the non-normalized historical string representation distinguishes composed and decomposed forms before canonicalization. PB-03 constructed tuple pairs that collide under delimiter concatenation and confirmed that the structured key separates them. PB-05 confirmed that a replace-all negative control does not preserve the generated lottery-side identifiers. These controls show that the properties can distinguish the corrected semantic behavior from the corresponding risk pattern; they are not estimates of field defect incidence.

## Repository verification

After adding the runner and direct testing dependency:

- Root ESLint: passed.
- Root tests: 11/11 passed.
- Root production build: passed after running the repository's existing Prisma generation step in the new worktree.
- Lottery ESLint: passed.
- Lottery tests: 34/34 passed.
- Lottery production build: passed.

The first root build attempt compiled and type-checked but stopped during page-data collection because the fresh worktree had no generated Prisma client. `npm run db:generate` initialized the client, and the unchanged production build then passed. This was an environment-initialization event, not a protocol test failure.

`npm audit` reported the same root findings as the frozen evaluation worktree: three moderate and one high finding in the existing dependency graph. The lottery tree reported one moderate and one high finding. `fast-check` was not among the vulnerable packages. No automated dependency upgrade was applied because it would be unrelated to the property evaluation and could alter the frozen system surface.

## Claim boundary

The formal run supports the nine listed properties for the generated domains and the recorded pure-function implementation. It is not exhaustive proof. It does not establish browser or device portability, native Safari behavior, storage-failure incidence, organizer workload, usability, guest experience, perceived fairness, or wedding-day performance. It must remain separate from the existing browser, fault-sequence, and ablation denominators.
