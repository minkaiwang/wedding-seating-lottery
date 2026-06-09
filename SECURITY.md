# Security

## Reporting vulnerabilities

If you find a security issue in **this integration repository**, please open a
private report via GitHub **Security Advisories** (if enabled) or email the
maintainer listed on the repository profile. Do **not** post exploit details in
public issues.

## Scope

| In scope (this repo) | Out of scope (report upstream) |
|----------------------|--------------------------------|
| `/api/auth/*`, `/api/plan`, JWT session handling | Core log-lottery draw logic |
| `postMessage` origin checks for seating ↔ lottery | wedding-seats drag-and-drop core |
| Default / weak `ADMIN_PASSWORD` in local seed | |

## Deployment hygiene

- Set strong `JWT_SECRET` and `ADMIN_PASSWORD` before any public `/sync` deployment.
- Use HTTPS in production; restrict database network access.
- Do not commit `.env`, database files, or guest export files (see [docs/PRIVACY-CHECKLIST.md](docs/PRIVACY-CHECKLIST.md)).
