# PQC Scanner — Security Model

## Trust Model

PQC Scanner is designed so that **source code never leaves the customer's
infrastructure**. This is a hard requirement for enterprise adoption.

```
What leaves customer infra:
  ✅ Report JSON: { file paths, line numbers, algorithm names, severity }
  ✅ 5-line code snippets (only if AI scoring enabled + DPA in place)

What never leaves customer infra:
  ❌ Full source files
  ❌ Repository contents
  ❌ Secrets, tokens, private keys found in code
  ❌ Business logic
```

## GitHub Action Security

### Permissions
The action requires only `contents: read`. It does not need write permissions,
does not create issues, does not comment on PRs.

```yaml
permissions:
  contents: read   # minimum required
```

### Secrets handling
- `report-token` and `api-key` are passed as GitHub Action secrets
- They are never written to logs (GitHub Actions masks secrets automatically)
- The action does not persist secrets to disk

### Supply chain
The `action/dist/index.js` is a pre-bundled single file (via `@vercel/ncc`).
Dependencies: `@actions/core`, `@actions/glob`, `js-yaml`. All MIT licensed.
Pin the action to a specific SHA for supply chain safety:
```yaml
uses: pqcscanner/pqc-scanner-action@abc1234  # pin to commit SHA
```

## Web Demo Security

### API key handling
- Anthropic API keys entered in-browser are stored in `localStorage`
- Keys are sent as a request body field (never as a header or URL parameter)
- Keys are never logged server-side (`route.ts` does not log request bodies)
- If `ANTHROPIC_API_KEY` env var is set server-side, browser key is optional

### GitHub API usage
- Public repos only via unauthenticated GitHub API + `raw.githubusercontent.com`
- No OAuth, no user GitHub tokens collected
- Rate limited: 60 API requests/hour per IP (unauthenticated)

### Content limits
- Max 200 files per repo scan (prevents runaway API costs)
- Max 512KB per file (prevents memory exhaustion)
- No file content is stored — all processing is in-memory per request

## AI Scoring Privacy

When AI scoring is enabled, only the 5-line snippet is sent to Claude.
This is enforced at the `extractSnippet()` function boundary in `lib/scanner.ts`.

**For enterprise customers**: AI scoring requires a Data Processing Agreement (DPA)
with Anthropic. Document this clearly in the enterprise contract. The web demo
uses the customer's own API key, so data flows directly customer → Anthropic,
not through PQC Scanner's infrastructure.

## Threat Model

### Threats considered

**Malicious repo content (prompt injection)**
A scanned repo could contain code that looks like an AI prompt designed to
influence Claude's risk scoring. Mitigations:
- Snippets are sent in a `\`\`\`` code block with explicit instruction to analyze as code
- Claude Haiku's instruction-following is robust to embedded natural language in code
- Output is parsed as JSON with strict validation; invalid JSON → `null` (no scoring)

**Oversized files / zip bombs**
`MAX_FILE_SIZE = 512KB` per file prevents memory exhaustion from large generated files.
`MAX_REPO_FILES = 200` prevents excessive API calls.

**SSRF via report-url**
The `report-url` action input accepts any URL. An attacker who controls the workflow
config could set this to an internal endpoint. Mitigations:
- The action runs in the customer's own runner — SSRF would be self-inflicted
- The report JSON contains only scan metadata, no secrets from the scanned code

**Rule injection via custom YAML**
Custom rules (`.pqc/rules/*.yaml`) are loaded and compiled as regexes. A malicious
or overly broad regex could cause ReDoS (catastrophic backtracking). Mitigations:
- Regexes are compiled with `new RegExp(pattern, 'i')` — no `s` (dotAll) flag
- Line-by-line matching limits exposure: a single line can't be more than ~32KB
- Rule files are checked in by the repo owner, not loaded from untrusted sources

### Out of scope (V1)
- Authentication for the compliance server endpoint (use `report-token`)
- Rate limiting on the web demo (relied on GitHub API rate limits)
- Scanning binary or compiled files (text files only)

## Data Retention

Web demo: No data is persisted. All scan state lives in the HTTP response stream.

Compliance server (V2): Reports stored per customer, isolated by org ID.
Retention policy: 24 months (configurable). GDPR: reports contain file paths
and algorithm names only — no personal data, no code content.
