# Groundstate — Product Overview

## What it is

Groundstate is the compliance dashboard for [Observer](https://github.com/GetQuantumDrive/Observer).
It receives scan reports from the Observer GitHub Action, stores history per organisation,
and renders NIS2/DORA/NIST FIPS 203/204 compliance status across all your repositories.

**Narrative:** Observer shows where you are. Groundstate is where you need to be.

---

## The problem it solves

Running the Observer GitHub Action in CI gives you per-repo findings in the CI log.
But a CISO or compliance officer needs:

- Aggregate view across 50 repos, not 50 CI logs
- Trend data: is the organisation improving or regressing?
- Evidence for NIS2 Article 21 / DORA Article 9 audits (PDF export)
- A single URL to share with a board or regulator

That is Groundstate.

---

## Business model

### Open-core

| Tier | Price | What they get |
|------|-------|---------------|
| Observer (scanner) | Free | GitHub Action, detection rules, JSON report output |
| Groundstate SaaS | €X / repo / month | Compliance dashboard, trend tracking, PDF exports, Slack/Jira |
| Groundstate Enterprise | Contract | Self-hosted server, SonarQube integration, SLA |

The detection rules are open source (community moat, Semgrep-style). The compliance
intelligence — NIS2 gap analysis, board-level risk summaries, NIST FIPS status tracking —
is the paid product.

### Why enterprise pays

EU NIS2 (Oct 2024) and DORA (Jan 2025) require documented evidence of cryptographic
risk management. A CI log is not evidence. Groundstate generates the artifact that
satisfies the auditor.

---

## Target market

**Primary:** EU-regulated organisations — financial services (DORA), critical infrastructure
and digital service providers (NIS2), healthcare, energy.

**Secondary:** Any organisation migrating to NIST PQC standards (FIPS 203/204/205) —
US federal contractors, defence supply chain, large enterprises ahead of the curve.

**Champion:** CISO or security architect. Distribution path: developer installs the free
GitHub Action, finding reach the CISO, CISO buys Groundstate to aggregate and report.

---

## Distribution

1. **Inbound from Observer** — every organisation that uses the free GitHub Action with
   `report-url` set becomes a Groundstate lead. The conversion prompt is in the CI log:
   *"Post report to your compliance dashboard: getquantumdrive.io/dashboard"*

2. **Direct outbound** — target NIS2/DORA compliance teams directly. The regulatory
   deadline has passed; they are already looking for tooling.

3. **Partner channel** — cybersecurity consultancies doing NIS2 gap assessments
   can white-label or resell Groundstate reports.

---

## Roadmap

### V1 (built)
- [x] Receive and store scan reports via POST /api/reports (Bearer token)
- [x] Per-repo compliance status (NIS2, DORA, NIST FIPS 203, NIST FIPS 204)
- [x] Trend tracking (improving / worsening / stable per repo)
- [x] Risk summary grid with finding detail and migration guidance
- [x] Demo seeding for live dashboard presentation

### V2
- [ ] PDF export of compliance report (NIS2 Article 21 evidence package)
- [ ] Slack / Teams notifications (new HIGH findings, regression alerts)
- [ ] Multi-user org with role-based access (CISO view vs developer view)
- [ ] Scan history diff: what changed between scans
- [ ] Jira integration: auto-create tickets for HIGH/CRITICAL findings

### V3
- [ ] SonarQube integration: push findings as external issues
- [ ] SBOM integration: correlate crypto findings with dependency graph
- [ ] AI-generated remediation roadmap with effort estimates
- [ ] Regulatory mapping: auto-generate NIS2 Article 21 / DORA Annex II evidence
