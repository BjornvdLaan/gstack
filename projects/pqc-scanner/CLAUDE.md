# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build (also runs TypeScript check)
npm run lint     # ESLint
npm start        # production server (after build)
```

No test suite yet. TypeScript errors surface via `npm run build`.

To build the GitHub Action bundle after editing `action/index.js`:
```bash
cd action && npx @vercel/ncc build index.js -o dist --quiet
```

## Architecture

### Scanning pipeline

`lib/scanner.ts` is the core. `scanFile(content, filename)` runs all applicable
rules from `loadRules()` against each line via regex, returns `Finding[]`.
`scoreWithAI(finding, apiKey)` sends a 5-line snippet (never the full file) to
Claude Haiku for severity scoring. `buildReport()` assembles the final `ScanReport`.

### Rule system

Rules come from two sources, merged in `lib/rules.ts`:
1. `BUILT_IN_RULES` in `lib/patterns.ts` — 25+ regex patterns, Java-first
2. Custom YAML files at `.pqc/rules/*.yaml` in the scanned project root

Rule interface: `{ id, language, pattern (regex), algorithm, severity, message, migration }`.
`language: 'any'` matches all supported languages.

### Streaming API

`app/api/scan/route.ts` streams NDJSON. Each line is a JSON object:
`{ type: 'status'|'findings'|'report'|'error', ...payload }`.
The client (`components/ScanInput.tsx`) reads the stream line-by-line and
updates UI state incrementally. The final `report` message contains the full
`ScanReport`.

### GitHub Action

`action/index.js` is a self-contained copy of the scanner logic (no imports
from `lib/`) bundled to `action/dist/index.js` via `@vercel/ncc`. The action
metadata is in `action.yml` at the project root. When the project splits to
its own repo, the action directory becomes the repo root.

### Key types (`lib/types.ts`)

`Severity`: `CRITICAL | HIGH | MEDIUM | LOW | SAFE`
`Language`: `java | python | javascript | typescript | go | unknown`
`Finding.aiRisk`: optional, added by `scoreWithAI()` — overrides `severity` in UI
`ScanReport.compliance`: maps `nist_fips_203 | nist_fips_204 | nis2 | dora` → `COMPLIANT | AT RISK | NON-COMPLIANT`

## Privacy constraints

- `extractSnippet()` hard-caps at 5 lines. This is the only source code that ever
  leaves the filesystem. Full files are never sent anywhere.
- AI scoring requires the user to supply their own Anthropic API key.
- The web demo only scans public GitHub repos (no auth token collected).

## Docs

Comprehensive docs for splitting into a standalone repo are in `docs/`:
- `PRODUCT.md` — business model, EU compliance focus, roadmap
- `ARCHITECTURE.md` — data flow, design decisions, scaling
- `SECURITY.md` — threat model, privacy boundaries
- `GITHUB_ACTION.md` — action usage, custom rules, report format
