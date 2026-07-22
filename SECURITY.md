# Security

## Reporting vulnerabilities

If you find a security issue in **this integration repository**, please report it responsibly:

- **Preferred:** [GitHub Security Advisories](https://github.com/minkaiwang/wedding-seating-lottery/security/advisories/new) (private report)
- **Alternative:** open a GitHub issue with **minimal** reproduction steps and **without** exploit payloads in public threads

Do **not** post working exploit code in public issues.

## Scope

| In scope (this repo) | Out of scope (report upstream) |
|----------------------|--------------------------------|
| `/api/auth/*`, `/api/plan`, JWT session handling | Core log-lottery draw / 3D logic |
| `postMessage` origin checks for seating ↔ lottery | wedding-seats drag-and-drop core |
| Login rate limiting (`429` + `Retry-After`) | |
| Default / weak `ADMIN_PASSWORD` in local seed | |

## Deployment hygiene

- Set strong **`JWT_SECRET`** (≥32 random characters) and **`ADMIN_PASSWORD`** before any public `/sync` deployment.
- Use **HTTPS** in production; restrict database network access.
- Do not commit `.env`, database files, or guest export files (see [docs/PRIVACY-CHECKLIST.md](docs/PRIVACY-CHECKLIST.md)).
- **`NEXT_PUBLIC_*`** and lottery **`VITE_*`** vars are embedded in client-side builds and must never contain secrets. Rebuild after changing these public values; restarting alone is not sufficient.

## Authentication model (`/sync`)

- Session cookie signed with `JWT_SECRET`; optional `COOKIE_SECURE` / `COOKIE_INSECURE` for reverse proxies.
- Development-only seed user: **`admin`** / **`88888888`** when `ADMIN_PASSWORD` is unset. In production, seed rejects the default password and passwords shorter than 12 characters; set a strong `ADMIN_PASSWORD` before initialization.
- Failed login attempts are **rate-limited in memory** per IP (HTTP **429**); not suitable as sole protection against distributed attacks — use network-level controls for public deployments.
- **`planKey`** (default `singleton`) isolates cloud plan blobs; any authenticated user who knows a key can read/write that plan — treat keys as shared secrets within your team, not multi-tenant isolation.

## postMessage integration

- Lottery accepts messages only from origins in `allowedWeddingSeatingOrigins()` (`VITE_WEDDING_SEATING_ORIGINS` **merges with** localhost defaults).
- Bridge import requires `window.opener` and matching `?from=` origin.
- Live sync iframe uses hidden embed mode; seating origin must match configured allowlist.

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for protocol details.
