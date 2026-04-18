# Groundstate — PQC Compliance Dashboard

Self-hosted compliance dashboard for [Observer](https://github.com/GetQuantumDrive/Observer).
Receives scan reports from the Observer GitHub Action, stores history per organisation,
and renders NIS2 / DORA / NIST FIPS 203 / 204 compliance status across all your repositories.

**Narrative:** Observer shows where you are. Groundstate is where you need to be.

---

## Running locally

```bash
git clone https://github.com/GetQuantumDrive/Groundstate
cd Groundstate
go run ./cmd/groundstate          # http://localhost:3000
```

The demo dashboard is seeded automatically on first run — no config needed.

## Production

```bash
go build -o groundstate ./cmd/groundstate
./groundstate --port 8080 --db /data/groundstate.db
```

Set `REPORT_API_KEY` to override the default `demo-key` for ingest auth.

### Docker

```bash
docker build -t groundstate .
docker run -p 3000:3000 -v $(pwd)/data:/data groundstate
```

---

## Configuration

| Flag / Env | Default | Description |
|------------|---------|-------------|
| `--port` / `PORT` | `3000` | HTTP listen port |
| `--db` / `DB_PATH` | `data/groundstate.db` | SQLite database path |

Mount the `data/` directory as a persistent volume in production.

---

## Connecting Observer

In your GitHub Actions workflow:

```yaml
- uses: GetQuantumDrive/Observer@main
  with:
    report-url: ${{ secrets.GROUNDSTATE_URL }}   # e.g. https://groundstate.example.com
    report-token: ${{ secrets.GROUNDSTATE_TOKEN }}
```

Set `GROUNDSTATE_TOKEN` to the value of `OrgData.apiKey` in your organisation record.

---

## Architecture

```
Observer GitHub Action (runs in customer CI)
  └── POST /api/reports  (Bearer token, JSON body)
        └── SQLite store → findings metadata only, never source code
              └── GET /              → org dashboard (repo list + compliance)
              └── GET /repos/{slug}  → repo detail (findings + scan history)
```

### Storage

Single SQLite database. WAL mode, 1 writer, capped at 50 reports per repo.
For multi-tenant SaaS scale: swap `internal/store` for Postgres behind the same interface.

### Security

- Bearer token auth on ingest (V1 plain-text; V2 will bcrypt-hash tokens)
- No source code is ever stored — only findings metadata (file path, line, algorithm, severity)
- Deploy behind HTTPS; treat `DB_PATH` data as a secret

See [SECURITY.md](docs/SECURITY.md) for the full threat model.

---

## Compliance coverage

| Regulation | What Groundstate provides |
|------------|--------------------------|
| NIS2 Article 21(2)(h) | Per-repo compliance status + trend tracking + audit evidence |
| DORA Article 9(4)(c) | Cryptographic control gap analysis across all repos |
| NIST FIPS 203 | ML-KEM migration readiness dashboard |
| NIST FIPS 204 | ML-DSA migration readiness dashboard |
