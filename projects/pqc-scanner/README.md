# PQC Scanner

AI-powered cryptographic risk scanner. Finds quantum-vulnerable cryptography
in codebases, scores risk by data lifetime and sensitivity, and generates
compliance-ready reports for NIS2, DORA, and NIST FIPS 203/204.

## The problem

Most codebases use RSA, ECDSA, and Diffie-Hellman — all broken by a
cryptographically relevant quantum computer (CRQC). Nation-state adversaries
are harvesting encrypted traffic now to decrypt later. The NIST PQC standards
are final. NIS2 and DORA require action. The question is: where do you start?

PQC Scanner tells you exactly where.

## What it detects

### Quantum-vulnerable (flagged)

| Algorithm | Risk | Common usage |
|-----------|------|-------------|
| RSA (any key size) | HIGH | TLS, signatures, key exchange |
| ECDSA / ECDH | HIGH | TLS, JWT signing, key agreement |
| Diffie-Hellman / DHE | HIGH | Key exchange |
| DSA | HIGH | Signatures |
| SHA-1 (signing context) | HIGH | Legacy signatures |

### Quantum-safe (not flagged)

- AES-256, ChaCha20 (symmetric — not affected by quantum)
- SHA-2, SHA-3 (hashing — Grover's algorithm halves effective key size, doubling is sufficient)
- ML-KEM (FIPS 203 / Kyber)
- ML-DSA (FIPS 204 / Dilithium)
- SLH-DSA (FIPS 205 / SPHINCS+)
- FN-DSA (FIPS 206 / FALCON)

## Running locally

```bash
cd projects/pqc-scanner
cp .env.local.example .env.local
# Add ANTHROPIC_API_KEY if you want server-side AI scoring
npm install
npm run dev          # http://localhost:3000
```

The API key can also be entered in-browser. It's stored in `localStorage`
and sent as a request body field — it never touches the server logs.

## Architecture

Regex scanning runs entirely in the Next.js server-side route. No code is
stored. Only the report (algorithm names, file paths, line numbers) is kept
in memory during the request.

AI risk scoring sends 5-line snippets only — never full files. This is enforced
in `lib/scanner.ts:extractSnippet()`. For a CI-first deployment where source
code must never leave your infrastructure, use the GitHub Action (coming soon)
— the scanner runs inside your pipeline and only POSTs the compliance report.

```
Browser
  └── POST /api/scan {repoUrl or fileContent}
        └── fetchGithubFiles() — GitHub API + raw.githubusercontent.com
        └── scanFile() — regex rules → findings
        └── scoreWithAI() — 5-line snippets only → Claude Haiku → severity
        └── buildReport() — risk summary + compliance mapping
  └── NDJSON stream: status → findings → report
```

## Scan output

```json
{
  "source": "owner/repo",
  "riskSummary": { "critical": 1, "high": 5, "medium": 2, "low": 0 },
  "findings": [
    {
      "file": "src/auth/session.java",
      "line": 42,
      "algorithm": "RSA",
      "severity": "HIGH",
      "confidence": 8,
      "snippet": "KeyPairGenerator kg = KeyPairGenerator.getInstance(\"RSA\");",
      "message": "RSA key generation is quantum-vulnerable",
      "migration": "Replace with ML-DSA (FIPS 204) for signing or ML-KEM (FIPS 203) for key encapsulation.",
      "aiRisk": {
        "severity": "CRITICAL",
        "reasoning": "RSA key used for session signing with 30-day token validity — long-lived sensitive data.",
        "dataLifetime": "long-lived"
      }
    }
  ],
  "compliance": {
    "nist_fips_203": "NON-COMPLIANT",
    "nist_fips_204": "NON-COMPLIANT",
    "nis2": "AT RISK",
    "dora": "AT RISK"
  }
}
```

## Supported languages

Java (primary — enterprise), Python, JavaScript, TypeScript, Go

## Plugin system

Custom detection rules in YAML. Place them at `.pqc/rules/*.yaml` in the root
of the scanned project. Loaded alongside built-in rules at scan time.

```yaml
# .pqc/rules/internal-crypto.yaml
id: internal-rsa-wrapper
language: java
pattern: "InternalCrypto\\.rsaSign\\("
severity: HIGH
message: "Internal RSA wrapper is quantum-vulnerable"
migration: "Replace with InternalCrypto.mlDsaSign() — same interface"
```

## Project structure

```
projects/pqc-scanner/
├── app/
│   ├── api/scan/route.ts      # Streaming NDJSON scan API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # Entry: renders ScanInput
├── components/
│   ├── ScanInput.tsx          # GitHub URL + file upload + streaming results
│   └── Results.tsx            # Risk summary, compliance, findings list
├── lib/
│   ├── types.ts               # Finding, ScanReport, Rule, Severity, Language
│   ├── patterns.ts            # 25+ built-in detection rules (Java-first)
│   ├── rules.ts               # Rule loader: built-in + .pqc/rules/*.yaml
│   └── scanner.ts             # scanFile(), scoreWithAI(), buildReport()
└── .env.local.example
```

## Roadmap

- [ ] GitHub Action (CI/CD — code stays in your pipeline)
- [ ] Infrastructure scanning (TLS certs, SSH key types, API gateway configs)
- [ ] Compliance report PDF export
- [ ] AST-based detection (catches aliased imports, ~15% miss rate with regex alone)
- [ ] Slack / Jira integration
- [ ] Dashboard: aggregate findings across repos
