# PQC Scanner — Architecture

## Core Principle

**The scanner is a data producer. The compliance server is the product.**

Code never leaves customer infrastructure. Only the report (algorithm names,
file paths, line numbers, severity) is routed anywhere. This is the same
trust model as Snyk, Semgrep, and Trivy.

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│  Customer CI/CD (GitHub Actions / GitLab / Jenkins)             │
│                                                                  │
│  ┌──────────────────────────────────────────┐                   │
│  │  PQC Scanner Action / CLI                │                   │
│  │                                          │                   │
│  │  ┌─────────────┐  ┌───────────────────┐  │                   │
│  │  │ Rule Loader │  │  Detection Engine  │  │                   │
│  │  │             │  │                    │  │                   │
│  │  │ Built-in    │  │  scanFile()        │  │                   │
│  │  │ Local YAML  │  │  regex line-scan   │  │                   │
│  │  │ External    │  │  snippet extract   │  │                   │
│  │  │ rule sets   │  └───────────────────┘  │                   │
│  │  └─────────────┘                         │                   │
│  │                                          │                   │
│  │  (optional) scoreWithAI()                │                   │
│  │  → sends 5-line snippets only            │                   │
│  │  → Claude Haiku → severity + reasoning   │                   │
│  │                                          │                   │
│  │  buildReport() → ScanReport JSON         │                   │
│  └──────────────────────────────────────────┘                   │
│              │                                                   │
└──────────────┼───────────────────────────────────────────────── ┘
               │  report JSON (no source code)
               │
       ┌───────┴──────────────────────────────────┐
       │               Output routing             │
       │                                          │
       ├─ [free]       CI logs + build fail       │
       ├─ [paid SaaS]  POST → pqc-scanner.io      │
       ├─ [enterprise] POST → self-hosted server  │
       └─ [integration] → SonarQube / Snyk API    │
```

## Detection Engine

### Algorithm

1. Language detection from file extension (`.java` → `java`, etc.)
2. Load applicable rules (built-in + custom YAML)
3. For each rule, compile pattern as case-insensitive regex
4. Scan each line of the file
5. On match: extract 5-line snippet (lines `matchLine ± 2`)
6. Emit `Finding` with file, line, column, algorithm, severity, snippet, migration

### Why regex, not AST?

Regex hits ~85% of real-world cases. AST detection catches the remaining 15%
(aliased imports, dynamic algorithm strings) but requires a full language parser
per language. Trade-off accepted for V1: fast, zero dependencies, all languages
with one engine. AST is V3.

### Privacy boundary

`extractSnippet()` in `lib/scanner.ts` enforces a hard 5-line cap:

```typescript
function extractSnippet(lines: string[], matchLine: number): string {
  const start = Math.max(0, matchLine - 2)
  const end = Math.min(lines.length - 1, matchLine + 2)
  return lines.slice(start, end + 1).join('\n')
}
```

This is the only source code that ever leaves the file system. Full files
are never sent anywhere.

## Rule System

### Rule interface

```typescript
interface Rule {
  id: string           // unique, namespaced: 'java-rsa-keygen', 'custom:internal-rsa'
  language: Language | 'any'
  pattern: string      // regex, matched case-insensitively per line
  algorithm: string    // human-readable: 'RSA', 'ECDH', 'DSA'
  severity: Severity   // CRITICAL | HIGH | MEDIUM | LOW | SAFE
  message: string      // what was found
  migration: string    // how to fix it
  references?: string[]
}
```

### Rule loading order

1. **Built-in rules** (`lib/patterns.ts`) — 25+ rules, Java-first (enterprise priority)
2. **Custom local rules** (`.pqc/rules/*.yaml` in the scanned repo root)
3. **External rule sets** (V2: GitHub repo reference via `rule-sets` action input)

Custom rules override nothing — they are appended. ID collisions: last-write wins.

### Custom YAML format

```yaml
# .pqc/rules/internal.yaml
- id: internal-rsa-wrapper
  language: java
  pattern: "InternalCrypto\\.rsaSign\\("
  algorithm: RSA
  severity: HIGH
  message: "Internal RSA wrapper is quantum-vulnerable"
  migration: "Replace with InternalCrypto.mlDsaSign() — same interface, drop-in replacement"
```

## AI Risk Scoring

Optional. Requires an Anthropic API key. **Never sends full files.**

```
Finding (algorithm, file, 5-line snippet)
  → claude-haiku-4-5 prompt
  → JSON: { severity, reasoning, dataLifetime }
  → stored as Finding.aiRisk
```

Model rationale: Haiku is fast and cheap. The scoring prompt is constrained
(200 max tokens, JSON-only output). Cost: ~$0.001 per finding.

The AI scores on data lifetime context:
- CRITICAL: long-lived sensitive data (health records, financial transactions)
- HIGH: medium-lived or unclear context
- MEDIUM: short-lived (session tokens, ephemeral keys)
- LOW: test code, non-sensitive constants

## Compliance Mapping

```typescript
function buildCompliance(findings: Finding[]): ComplianceStatus {
  const hasHighOrCritical = findings.some(f => {
    const sev = f.aiRisk?.severity ?? f.severity
    return sev === 'HIGH' || sev === 'CRITICAL'
  })
  const status = hasHighOrCritical ? 'NON-COMPLIANT' : findings.length > 0 ? 'AT RISK' : 'COMPLIANT'
  return {
    nist_fips_203: status,  // ML-KEM standard — key encapsulation
    nist_fips_204: status,  // ML-DSA standard — digital signatures
    nis2: hasHighOrCritical ? 'AT RISK' : 'COMPLIANT',
    dora: hasHighOrCritical ? 'AT RISK' : 'COMPLIANT',
  }
}
```

NIS2/DORA are "AT RISK" rather than "NON-COMPLIANT" at HIGH because the
regulatory language is risk-based ("appropriate measures"), not binary.

## API (web demo / SaaS path)

`POST /api/scan` — streaming NDJSON

```
Request:  { repoUrl | (fileContent + fileName), apiKey?, aiScoring? }
Response: NDJSON stream, one JSON object per line:
  { type: 'status', message: '...' }
  { type: 'findings', file: '...', findings: [...] }
  { type: 'report', report: ScanReport }
  { type: 'error', message: '...' }
```

GitHub repo scanning uses the public GitHub API (no auth) and raw.githubusercontent.com
for file content. Max 200 files, 512KB per file.

## Data Model

```typescript
interface ScanReport {
  id: string               // UUID, generated per scan
  source: string           // repo URL or filename
  scannedAt: string        // ISO 8601
  durationMs: number
  findings: Finding[]
  riskSummary: RiskSummary // { critical, high, medium, low, safe, total }
  compliance: ComplianceStatus
  languagesScanned: Language[]
  filesScanned: number
  aiScoringEnabled: boolean
}
```

## Scaling Considerations

The web demo runs as a serverless Next.js function. GitHub repo scanning
is I/O bound (fetching files) and CPU light (regex). Max concurrency is
limited by GitHub API rate limits (60 req/hour unauthenticated, 5000 with token).

For the compliance server (V2): reports are small JSON (~10-50KB). PostgreSQL
for persistence. The scanning itself stays in customer CI — the server only
receives and stores reports.

## Future: External Rule Set Loading

V2 will support rule sets from external GitHub repos:

```yaml
- uses: pqcscanner/pqc-scanner-action@v1
  with:
    rule-sets: 'pqcscanner/pqc-rules@v1 myorg/private-rules@main'
```

The action fetches `rules/*.yaml` from each repo at the ref specified,
using `GITHUB_TOKEN` for private repos. This enables:
- Community-maintained rule sets (Rust, C++, COBOL, Swift, Kotlin)
- Enterprise private rule sets for internal crypto wrappers
- Versioned rule sets (pin to `@v1`, float on `@main`)
