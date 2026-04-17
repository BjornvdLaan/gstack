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

The API key can be set in `.env.local` (`ANTHROPIC_API_KEY=sk-ant-...`) or
supplied by the user in-browser (stored in `localStorage`).

## Architecture

### Data flow for briefing generation

1. User hits "Generate" in `components/GenerateBriefing.tsx` (the only client component)
2. POSTs `{ profileId, apiKey }` to `app/api/generate/route.ts`
3. Route scrapes all source URLs in parallel (`lib/scraper.ts`) — strips HTML, truncates to 8000 chars
4. Loads previous briefing from `lib/store.ts` as memory context
5. Streams Claude synthesis (`claude-sonnet-4-6`) with inline citation instructions
6. Route appends `__BRIEFING_ID__:{uuid}` sentinel at stream end → triggers server-side save
7. Client detects sentinel, strips it from display, confirms save

### Storage

`lib/store.ts` reads/writes `data/profiles.json` (gitignored, created on first run).
Functions: `readProfiles()`, `writeProfiles()`, `getProfile(id)`, `saveProfile(profile)`.
No database. Swap `store.ts` for Postgres/Supabase behind the same interface for V2.

### Key types (`lib/types.ts`)

```typescript
Profile  { id, topic, sources: Source[], briefings: Briefing[], createdAt }
Briefing { id, content, citations: Citation[], createdAt }
Citation { index, url, label, excerpt }
Source   { id, url, label }
```

### API routes

- `POST /api/generate` — streams briefing, saves on completion
- `GET /api/profiles` — list all profiles
- `POST /api/profiles` — create profile
- `GET /api/profiles/[id]` — get single profile
- `PATCH /api/profiles/[id]` — update (add/remove sources, rename)
- `DELETE /api/profiles/[id]` — delete profile and all briefings
- `GET /api/profiles/[id]/briefings` — list briefings
- `POST /api/profiles/[id]/briefings` — save briefing (called internally by generate)

### Sentinel-based save

The generate route can't easily do a POST-after-stream in the same handler, so it
appends `__BRIEFING_ID__:{uuid}\n` as the last chunk. `GenerateBriefing.tsx` detects
this in the stream, strips it from the rendered text, and uses the ID to confirm the
save happened server-side. This avoids a second client-initiated round-trip.

### Design system

Warm off-white background (`#f9f7f4`), Geist Sans for UI chrome, Georgia serif for
briefing body text (mimics a printed document). All color values are inline styles,
not Tailwind classes, so they're easy to audit and change in one pass.

## Docs

`docs/` contains repo-split-ready documentation:
- `PRODUCT.md` — personas, business model, competitive positioning, roadmap
- `ARCHITECTURE.md` — detailed data flow, Claude integration, deployment notes
- `SECURITY.md` — API key handling, SSRF risk, V1 threat model
