# GitHub Action — Usage Guide

## Quick start

Add to your repository at `.github/workflows/pqc-scan.yml`:

```yaml
name: PQC Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: GetQuantumDrive/observer@v1
        with:
          fail-on: HIGH
```

That's it. The action scans all Java, Python, JS/TS, and Go files. Findings
appear in the job summary. PRs fail if HIGH or CRITICAL findings are detected.

## Distribution

The action is published on the **GitHub Actions Marketplace**:
`marketplace.github.com/actions/observer`

When the repo splits to `github.com/GetQuantumDrive/observer`:
1. Any public repo with `action.yml` at root auto-qualifies for the marketplace
2. Create a release: `git tag v1.0.0 && git push --tags`
3. GitHub surfaces the action in marketplace search

Users reference it as:
```yaml
uses: GetQuantumDrive/observer@v1    # floating major version (recommended)
uses: GetQuantumDrive/observer@v1.2.0  # pinned version
uses: GetQuantumDrive/observer@abc123  # pinned to commit SHA (most secure)
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `fail-on` | `HIGH` | Minimum severity that fails the build: `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
| `paths` | `**/*.java **/*.py **/*.js **/*.ts **/*.go` | Space-separated glob patterns to scan |
| `exclude` | `''` | Space-separated glob patterns to exclude (e.g. `test/** vendor/**`) |
| `report-url` | _(none)_ | POST compliance report JSON to this URL (compliance dashboard) |
| `report-token` | _(none)_ | Bearer token for `report-url` authentication |
| `api-key` | _(none)_ | Anthropic API key for AI risk scoring |
| `ai-scoring` | `false` | Enable AI risk scoring (sends 5-line snippets to Claude Haiku) |

## Outputs

| Output | Description |
|--------|-------------|
| `critical-count` | Number of CRITICAL findings |
| `high-count` | Number of HIGH findings |
| `total-count` | Total findings across all severities |
| `report-json` | Path to report JSON file (in `RUNNER_TEMP`, persists for job duration) |
| `compliant` | `"true"` if no findings above `fail-on` threshold |

## Examples

### Send report to compliance dashboard

```yaml
- uses: GetQuantumDrive/observer@v1
  with:
    fail-on: HIGH
    report-url: ${{ secrets.PQC_DASHBOARD_URL }}
    report-token: ${{ secrets.PQC_DASHBOARD_TOKEN }}
```

The action POSTs the full `ScanReport` JSON to your compliance server.
The server stores and aggregates reports across repos for NIS2/DORA reporting.

### Enable AI risk scoring

```yaml
- uses: GetQuantumDrive/observer@v1
  with:
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    ai-scoring: 'true'
```

Sends 5-line code snippets (not full files) to Claude Haiku for context-aware
severity assessment. Requires a DPA with Anthropic for enterprise use.

### Save report as artifact

```yaml
- uses: GetQuantumDrive/observer@v1
  id: pqc

- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: pqc-compliance-report
    path: ${{ steps.pqc.outputs.report-json }}
    retention-days: 365   # keep for annual audit trail
```

### Scan specific directories, exclude tests

```yaml
- uses: GetQuantumDrive/observer@v1
  with:
    paths: 'src/**/*.java src/**/*.go'
    exclude: 'src/test/** src/**/*Test.java'
    fail-on: CRITICAL   # only fail on CRITICAL in this case
```

### Use in a matrix (scan multiple services)

```yaml
strategy:
  matrix:
    service: [auth-service, payment-service, data-api]

steps:
  - uses: actions/checkout@v4
  - uses: GetQuantumDrive/observer@v1
    with:
      paths: '${{ matrix.service }}/src/**/*.java'
      report-url: ${{ secrets.PQC_DASHBOARD_URL }}
```

## Rule Sets

Rules come from three sources, applied in this order:

1. **Built-in** — 25+ patterns bundled in the action (Java, Python, JS/TS, Go)
2. **External rule sets** — fetched from GitHub repos at action runtime
3. **Local rules** — `.pqc/rules/*.yaml` in your repository (highest priority)

### External rule sets

Reference any GitHub repo containing `rules/*.yaml` files:

```yaml
- uses: GetQuantumDrive/observer@v1
  with:
    rule-sets: 'GetQuantumDrive/observer-rules@v1 myorg/custom-rules@main'
```

- Uses `github-token` (defaults to `${{ github.token }}`) for private repos
- Rules are namespaced by source repo: `myorg/custom-rules:rule-id`
- Fetched fresh on every run — pin to a tag for stability

### Local custom rules

```yaml
# .pqc/rules/internal-crypto.yaml
- id: internal-rsa-sign
  language: java
  pattern: "InternalCrypto\\.rsaSign\\("
  algorithm: RSA
  severity: HIGH
  message: "Internal RSA signing wrapper is quantum-vulnerable"
  migration: "Replace with InternalCrypto.mlDsaSign() — same interface, FIPS 204 compliant"

- id: legacy-des-usage
  language: java
  pattern: "Cipher\\.getInstance\\s*\\(\\s*['\"]DES"
  algorithm: DES
  severity: CRITICAL
  message: "DES is classically broken and must be removed immediately"
  migration: "Replace with AES-256-GCM"
```

Rules support all five severity levels: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `SAFE`.
Use `language: any` to match all supported languages.

## Report format

```json
{
  "id": "uuid",
  "source": "org/repo",
  "ref": "refs/heads/main",
  "sha": "abc123",
  "scannedAt": "2026-04-17T12:00:00.000Z",
  "filesScanned": 142,
  "rulesApplied": 25,
  "riskSummary": { "critical": 0, "high": 3, "medium": 1, "low": 0, "total": 4 },
  "compliance": {
    "nist_fips_203": "NON-COMPLIANT",
    "nist_fips_204": "NON-COMPLIANT",
    "nis2": "AT RISK",
    "dora": "AT RISK"
  },
  "findings": [
    {
      "ruleId": "java-rsa-keygen",
      "file": "src/auth/KeyManager.java",
      "line": 42,
      "algorithm": "RSA",
      "severity": "HIGH",
      "confidence": 8,
      "snippet": "KeyPairGenerator kg = KeyPairGenerator.getInstance(\"RSA\");\nkg.initialize(2048);",
      "message": "RSA key generation is quantum-vulnerable",
      "migration": "Replace with ML-DSA (FIPS 204) for signing or ML-KEM (FIPS 203) for key encapsulation."
    }
  ]
}
```
