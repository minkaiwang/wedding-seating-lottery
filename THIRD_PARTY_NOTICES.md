# Third-Party Notices

This project bundles or depends on open-source software. The integration layer
is released under the MIT License (see [LICENSE](LICENSE)); that license does
not replace or expand the licenses of bundled upstream code.

## Upstream applications (substantial code)

| Component | Repository | License (as stated upstream) | Notes |
|-----------|------------|------------------------------|--------|
| Wedding seating UI & logic | [ajdincatic/wedding-seats](https://github.com/ajdincatic/wedding-seats) | Upstream README states MIT; no separate LICENSE file was present when this notice was prepared | Fork/derivative in `src/`; seek clarification from the upstream author if you need a formal license record |
| log-lottery | [LOG1997/log-lottery](https://github.com/LOG1997/log-lottery) | MIT | Vendored at `log-lottery/`, based on upstream tag `v0.6.0-5` (commit `07d0948ea7741bd890bd097dee0f2fc2b995a316`) plus local integration patches |

Always retain upstream `LICENSE` / copyright headers when redistributing.

### Vendored license text

`log-lottery/LICENSE` is retained from the upstream snapshot. Its copyright
line contains the upstream placeholder `[fullname]`; this repository does not
replace that placeholder with an unverified legal name. Attribution to the
upstream project remains [LOG1997/log-lottery](https://github.com/LOG1997/log-lottery).
If you redistribute the vendored application, obtain an authoritative copyright
notice from the upstream maintainer where your use requires one.

## Root project (`package.json` dependencies)

Includes but not limited to:

- **Next.js** — MIT ([vercel/next.js](https://github.com/vercel/next.js))
- **React** — MIT
- **Prisma** — Apache-2.0
- **@dnd-kit** — MIT
- **jose**, **bcryptjs**, **xlsx**, **jspdf**, **html2canvas** — see each package on npm

## log-lottery (`log-lottery/package.json`)

Includes but not limited to:

- **Vue 3**, **Vite**, **Pinia** — MIT
- **Three.js** — MIT
- **Dexie** — Apache-2.0
- **daisyUI**, **@vueuse/core**, **xlsx**, etc.

For a full machine-readable list after install:

```bash
npm ls --all --json > dependency-tree.json   # root
npm ls --all --json --prefix ./log-lottery > log-lottery-dependency-tree.json
```

Review those files before enterprise compliance audits; this document is a human summary, not legal advice.

## Media assets

The audio cues shipped in the current working tree under
`log-lottery/src/assets/audio/` are generated specifically for this repository
from mathematical waveforms and envelopes by
`log-lottery/scripts/generate-synthetic-audio.mjs`. The generator does not use
recorded performances, sampled music, or other third-party media inputs.
Generation parameters and the output inventory are documented in
`log-lottery/src/assets/audio/README.md`.

The generator source is covered by the root MIT License. To the extent that
copyright or related rights apply to the generated audio files and are
controlled by this project's contributors, those files are offered under the
same license. This statement does not cover music or other media uploaded by
users, media supplied by external services, or audio retained in earlier Git
history. Users remain responsible for obtaining the rights required for any
media they add or distribute.

Other images, fonts, and visual media inherited from upstream snapshots may not
have a separate asset-level rights manifest. The software licenses listed above
do not independently establish third-party image, trademark, or personality
rights; verify or replace those assets when your deployment requires it.
