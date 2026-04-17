# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build + TypeScript check
npm start        # production server (after build)
npm run lint     # ESLint
```

No test suite. TypeScript errors surface via `npm run build`.

## What this is

Compliance dashboard for PQC Scanner. Receives `ScanReport` JSON POSTed from
the GitHub Action (`POST /api/reports` with `Authorization: Bearer <api-key>`),
stores them per org, and shows NIS2/DORA/NIST FIPS compliance status per repo.

## Architecture

### Data flow

GitHub Action → `POST /api/reports` (Bearer token) → `lib/store.ts` saves `StoredReport` to
`data/orgs.json` → dashboard pages read from same store via `getRepoSummaries()` / `getRepoReports()`.

### Storage

`lib/store.ts` reads/writes `data/orgs.json`. Structure: `OrgData[]` where each org
has `reports: StoredReport[]` (capped at 50). Functions: `getOrgByKey(apiKey)`,
`saveReport(orgId, report)`, `getRepoSummaries(orgId)`, `getRepoReports(orgId, repo)`.

Demo org (`orgId: 'demo'`, `apiKey: 'demo-key'`) is pre-seeded in `lib/seed.ts`
with 3 repos and realistic findings. Seeding happens on first server render/request.

### Key types (`lib/types.ts`)

`StoredReport` extends `ScanReport` with `orgId` and `receivedAt`.
`RepoSummary` = latest report + reportCount + trend (`improving|worsening|stable|new`).
`ComplianceValue` = `'COMPLIANT' | 'AT RISK' | 'NON-COMPLIANT'`.

### Routes

- `/` — dashboard: org-level framework status + repo list sorted by worst compliance
- `/repos/[slug]` — repo detail: risk summary, per-framework compliance, findings, scan history
- `POST /api/reports` — ingest endpoint (Bearer token auth, validates required fields)

### Auth model (V1)

Plain-text API key matched against `OrgData.apiKey`. Demo key is `demo-key`.
Replace with hashed keys + multi-tenant org management for production.
