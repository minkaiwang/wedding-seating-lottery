# Optional local WebSocket relay

This service is only needed for the optional remote-control/message relay feature. The wedding seating planner and the normal lottery flow do not require it.

Run locally:

```powershell
cargo run --locked
```

The service binds to `127.0.0.1:8080`. Browser origins are restricted to local development origins by default (`localhost` and `127.0.0.1`, ports 3000–3002 and 6719). For a deployed seating application, explicitly provide a comma-separated allowlist before starting the service:

```powershell
$env:WEDDING_SEATING_ORIGINS='https://your-app.example.com,https://your-lottery.example.com'
cargo run --locked
```

Do not expose this relay directly to the public internet without an authenticated reverse proxy, TLS, request logging controls, and an external rate limiter. `userSignature` routes a message to a browser session; it is not an authentication credential.
