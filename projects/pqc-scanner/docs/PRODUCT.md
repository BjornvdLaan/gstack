# PQC Scanner — Product Document

## Problem

Most enterprise codebases use RSA, ECDSA, and Diffie-Hellman for cryptography.
All three are broken by a cryptographically relevant quantum computer (CRQC).

Nation-state adversaries are running **Harvest Now, Decrypt Later (HNDL)** attacks
today — collecting encrypted traffic to decrypt once a CRQC exists. NIST published
final PQC standards in 2024 (FIPS 203, 204, 205). The EU has already moved:

- **NIS2** (October 2024): requires "state of the art" cryptography across critical infrastructure
- **DORA** (January 2025): financial entities must mitigate ICT risks including crypto obsolescence
- **NSA CNSA 2.0**: mandates full PQC migration by 2030–2033

Most enterprises don't know where their quantum-vulnerable crypto is. PQC Scanner finds it.

## Target Market

**Primary (EU enterprise)**: Financial services (ING, ABN AMRO, Rabobank), insurance,
healthcare, energy, critical infrastructure — all subject to NIS2 and/or DORA.
These companies have compliance officers who need to demonstrate crypto hygiene to regulators.

**Secondary (global developer)**: Any engineering team that wants to stay ahead of the
migration. GitHub Action distribution gives us reach without a sales team.

## Value Proposition

| Buyer | Pain | What we solve |
|-------|------|---------------|
| CISO / Compliance officer | "Are we NIS2/DORA compliant on quantum crypto?" | Compliance status report per framework, board-ready |
| Security engineer | "Where is our vulnerable crypto?" | File + line level findings with migration guidance |
| Developer | "Will my PR introduce quantum-vulnerable crypto?" | GitHub Action blocks the PR automatically |

## Business Model (open core)

```
Free tier (open source)
  GitHub Action — runs in customer CI, code never leaves their infra
  CLI binary — local scan, JSON output
  Detection rules — open source, community contributions welcome

Paid SaaS (pqc-scanner.io)
  Compliance dashboard — NIS2/DORA/NIST FIPS status across all repos
  Trend tracking — are you getting better or worse over time?
  PDF compliance report — board and regulator ready
  Team management — assign findings, track remediation
  Price: per-repo or per-org pricing (TBD, ~€50/repo/month)

Enterprise
  Self-hosted compliance server (for regulated industries, air-gapped)
  SonarQube / Snyk integration — feed findings into existing tooling
  Custom rule sets — private company-specific patterns
  SLA + support contract
  Price: contract
```

## Distribution

### GitHub Action (primary channel)
The action appears on **GitHub Actions Marketplace** (marketplace.github.com/actions).
Any engineer googling "quantum crypto scan" or browsing the marketplace finds it.
It's free, runs in 30 seconds, zero onboarding friction.

When split to its own repo (`pqcscanner/pqc-scanner-action`):
1. Tag a release: `git tag v1 && git push --tags`
2. GitHub auto-lists it on the marketplace
3. The `action.yml` `branding` field controls the marketplace icon/color

### Rule Sets (community moat)
Detection rules are published as a separate open-source repo
(`pqcscanner/pqc-rules`). Community can contribute rules for additional
languages (Rust, C++, COBOL, Kotlin, Swift). Enterprises publish private
rule sets for internal crypto wrappers.

Rule set reference in the action:
```yaml
- uses: pqcscanner/pqc-scanner-action@v1
  with:
    rule-sets: 'pqcscanner/pqc-rules@v1 myorg/custom-pqc-rules@main'
```

### Semgrep Registry
Publish the detection patterns as Semgrep rules at semgrep.dev/r. Free discovery
for the millions of developers already running Semgrep in their pipelines.

### SonarQube Marketplace
Publish a SonarQube plugin that adds PQC rules to existing SonarQube installs.
Enterprise procurement is already approved for SonarQube. We're an add-on.

## Competitive Landscape

| Tool | Scope | PQC-specific | Compliance reports | Distribution |
|------|-------|--------------|-------------------|--------------|
| Snyk | Dependencies, SAST | No | No | GitHub marketplace |
| SonarQube | Code quality, SAST | No | No | SonarQube marketplace |
| Semgrep | SAST, custom rules | Community rules only | No | GitHub marketplace |
| **PQC Scanner** | Crypto patterns only | Yes (primary focus) | Yes (NIS2/DORA/NIST) | GitHub marketplace + SonarQube |

**Defensibility**: Detection rules can be copied. The compliance reporting layer —
NIS2/DORA gap analysis, board-level risk summaries, remediation tracking, EU regulatory
context — cannot be easily replicated by tools whose primary product is something else.

## EU Regulatory Context

**NIS2 Article 21**: "Appropriate technical and operational measures... including
policies on the use of cryptography and, where appropriate, encryption."
Non-compliance: fines up to €10M or 2% of global annual turnover.

**DORA Article 9**: "ICT risk management framework shall include... protocols and tools
for ICT security testing." PQC readiness testing falls squarely under this.

**NIST FIPS 203/204/205**: Published August 2024. RSA and ECC are not quantum-safe.
Migration timeline: NIST recommends completing migration before 2030.

## Roadmap

### V1 (current)
- [x] Regex detection engine (Java, Python, JS/TS, Go)
- [x] AI risk scoring (Claude Haiku, 5-line snippets)
- [x] YAML custom rule plugin system
- [x] Web demo (public GitHub repos)
- [x] NIS2/DORA/NIST compliance report JSON

### V2
- [ ] GitHub Action (Marketplace distribution)
- [ ] Report routing (`--report-url` flag)
- [ ] Compliance dashboard (SaaS)
- [ ] PDF export (NIS2/DORA audit trail)

### V3
- [ ] SonarQube plugin
- [ ] Semgrep rule registry publication
- [ ] External rule set loading (GitHub repo reference)
- [ ] Self-hosted server (Docker Compose)
- [ ] AST-based detection (fixes ~15% miss rate from aliased imports)
- [ ] Infrastructure scanning (TLS certs, SSH key types)
