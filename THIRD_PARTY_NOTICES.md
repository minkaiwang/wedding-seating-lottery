# Third-Party Notices

This project bundles or depends on open-source software. The integration layer
is released under the MIT License (see [LICENSE](LICENSE)).

## Upstream applications (substantial code)

| Component | Repository | License (as stated upstream) | Notes |
|-----------|------------|------------------------------|--------|
| Wedding seating UI & logic | [ajdincatic/wedding-seats](https://github.com/ajdincatic/wedding-seats) | MIT | Fork/derivative in `src/` |
| log-lottery | [LOG1997/log-lottery](https://github.com/LOG1997/log-lottery) | MIT | Expected at `log-lottery/` |

Always retain upstream `LICENSE` / copyright headers when redistributing.

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
