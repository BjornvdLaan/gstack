# Groundstate — Security Model

## What Groundstate stores

Groundstate stores **findings metadata only** — never source code.

| Field | Example | Stored? |
|-------|---------|---------|
| File path | `src/auth/KeyManager.java` | Yes |
| Line number | 42 | Yes |
| Algorithm | RSA | Yes |
| Severity | HIGH | Yes |
| Code snippet | 5-line window | Yes (from Observer) |
| Migration guidance | "Replace with ML-DSA…" | Yes |
| Full source file | — | **Never** |

The 5-line snippet is extracted by Observer before sending. Groundstate stores
whatever Observer sends — ensure your Observer configuration caps snippets
(the default is 5 lines, enforced in `extractSnippet()`).

---

## Auth model

**V1 (current):** Plain-text Bearer token matched against `OrgData.apiKey` in
`data/orgs.json`. The demo key is `demo-key`.

**Threats:**
- Token interception in transit → mitigated by HTTPS in production
- Token leak from `data/orgs.json` → treat the data directory as a secret

**V2 roadmap:** Store bcrypt hash of token; compare at ingest with `bcrypt.compare()`.
Rotate tokens via a management API.

---

## Threat model

### In-scope for V1

| Threat | Mitigation |
|--------|-----------|
| Forged scan reports (attacker POSTs fake data) | Bearer token auth; invalid token → 403 |
| Data file read by unauthorised process | Deploy with filesystem permissions limiting read to app process |
| XSS via finding content | Next.js escapes all rendered content; no `dangerouslySetInnerHTML` used |

### Out of scope for V1 (document for V2)

| Threat | Notes |
|--------|-------|
| Race condition on concurrent writes | JSON file writes are not atomic; use DB in production |
| Token brute-force | No rate limiting in V1; add in V2 |
| Multi-tenant data isolation | V1 is single-org demo; V2 needs per-org access control on all reads |

---

## Deployment security checklist

- [ ] Serve over HTTPS only (TLS termination at reverse proxy)
- [ ] Set `REPORT_API_KEY` to a random 32-byte token (not `demo-key`)
- [ ] Mount `data/` as a persistent volume with restricted read permissions
- [ ] Rotate the API key if it appears in logs or is shared unintentionally
- [ ] Pin Observer Action to a commit SHA in your CI: `uses: GetQuantumDrive/observer@<sha>`

---

## Data residency

Groundstate is self-contained. Scan data never leaves the server it runs on.
For EU data residency requirements (NIS2, GDPR), deploy Groundstate in an EU region.

The SaaS offering at `getquantumdrive.io` runs in EU-West (Frankfurt). Enterprise
customers can self-host Groundstate for full data sovereignty.
