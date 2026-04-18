# Groundstate — Architecture

## Overview

Groundstate is a Next.js application that receives compliance scan reports from
the Observer GitHub Action, stores them per organisation, and serves a dashboard.

Code never flows into Groundstate — only findings metadata (file path, line number,
algorithm, severity, migration guidance). No source code is ever stored.

---

## Data flow

```
Observer GitHub Action (runs in customer CI)
  └── POST /api/reports (Bearer token, JSON body)
        └── lib/store.ts → data/orgs.json
              └── app/page.tsx          → org dashboard
              └── app/repos/[slug]/page → repo detail + findings
```

### Ingest (POST /api/reports)

1. Action sends `ScanReport` JSON with Bearer token in `Authorization` header
2. `route.ts` validates token against `OrgData.apiKey` in the store
3. `StoredReport` is created (extends `ScanReport` with `orgId` + `receivedAt`)
4. Saved to `data/orgs.json`, capped at 50 reports per org (oldest dropped)

### Dashboard rendering

Server components read directly from `data/orgs.json` at request time.
`getRepoSummaries(orgId)` groups reports by repo, sorts by worst compliance,
computes trend from last two scans.

---

## Storage

`data/orgs.json` — single JSON file, array of `OrgData` objects.

```typescript
OrgData {
  orgId: string        // slug used in all lookups
  name: string         // display name
  apiKey: string       // plain-text Bearer token (V1 — hash in V2)
  createdAt: string
  reports: StoredReport[]  // capped at 50, newest first
}
```

No database required for V1. Swap `lib/store.ts` for Postgres/Supabase behind the
same interface for production multi-tenant scale.

**Concurrency note:** JSON file writes are synchronous and not atomic. Concurrent
POST requests from multiple CI pipelines could race. For V1 (single-tenant demo)
this is acceptable. V2 needs a database or write queue.

---

## Key types

```typescript
// lib/types.ts

StoredReport          // ScanReport + orgId + receivedAt
RepoSummary           // latest report + reportCount + trend
ComplianceValue       // 'COMPLIANT' | 'AT RISK' | 'NON-COMPLIANT'

// Inherited from Observer (ScanReport):
Finding               // ruleId, file, line, algorithm, severity, snippet, migration
RiskSummary           // { critical, high, medium, low, safe, total }
ComplianceStatus      // per-framework: nist_fips_203, nist_fips_204, nis2, dora
```

---

## Auth model (V1)

Plain-text API key matched against `OrgData.apiKey`. Demo key is `demo-key`.

**V2:** Hash keys with bcrypt at creation time, store only the hash. Compare at
ingest time with `bcrypt.compare()`. Never log the raw key.

---

## Demo seeding

`lib/seed.ts` exports `SEED_REPORTS` and `ensureSeeded()`. On first page render
or API request, `ensureSeeded()` checks if the demo org has no reports and seeds
three realistic repos (payment-service with 4 findings, auth-service with 1,
data-api with 0). This ensures the dashboard looks alive without requiring a
real Observer scan.

---

## Deployment

```bash
# Development
npm run dev            # http://localhost:3000

# Production
npm run build
npm start

# Environment (optional)
REPORT_API_KEY=...     # override demo-key for production ingest
```

For cloud: push to Railway, Fly.io, or any Node.js host. Set `REPORT_API_KEY`
as an environment variable. The `data/` directory must be a persistent volume
(not ephemeral storage) in production — or swap `lib/store.ts` for a database.

---

## Scaling path

| Scale | Storage | Notes |
|-------|---------|-------|
| V1 (demo / single org) | JSON file | Adequate for demos and small teams |
| V2 (SaaS, multi-org) | Postgres | Replace store.ts; same interface |
| V3 (enterprise, air-gapped) | Self-hosted DB | Docker Compose single-binary deploy |
