# Intel Brief — Architecture

## Overview

Next.js 16 App Router. Server components for data fetching, one client component
for the streaming briefing generation. JSON file storage. No database dependency.

## Data Flow

```
User clicks "Generate briefing"
  │
  ▼
POST /api/generate { profileId, apiKey }
  │
  ├── 1. Load profile from store (profiles.json)
  ├── 2. Fetch + scrape all source URLs (parallel)
  │       scrapeUrl() → strip HTML → truncate to 8000 chars
  │
  ├── 3. Load previous briefing (if exists) → memory context
  │
  ├── 4. Build Claude prompt:
  │       - System: intelligence analyst persona
  │       - Sources: scraped content with labels
  │       - Memory: previous briefing (tells Claude what's already known)
  │       - Instruction: synthesize what's NEW, cite inline
  │
  ├── 5. Stream response from claude-sonnet-4-6 (or configured model)
  │       → NDJSON text chunks → client renders incrementally
  │
  ├── 6. On stream end: parse citations, detect __BRIEFING_ID__:uuid sentinel
  ├── 7. POST /api/profiles/[id]/briefings — save briefing to profiles.json
  └── 8. Client updates UI from idle → done
```

## Storage

**File**: `data/profiles.json` — created on first run, gitignored.

```typescript
// lib/store.ts
interface Profile {
  id: string
  topic: string
  sources: Source[]
  briefings: Briefing[]    // newest first
  createdAt: string
}
```

No database. This is intentional for V1: zero ops overhead, instant local setup,
trivially deployable to any Node.js host. V2 migration path: swap `store.ts` for
a Postgres/Supabase implementation behind the same interface.

## Scraper

`lib/scraper.ts` fetches URLs with a 10s timeout, strips HTML (removes `<script>`,
`<style>`, `<nav>`, `<footer>`, `<header>` nodes), collapses whitespace, and
truncates to 8000 characters. This is a privacy + quality trade-off:

- 8000 chars captures the lead content of most news articles
- Prevents context bloat from very long pages
- Metadata and boilerplate is removed to save tokens

No headless browser. Playwright would be more accurate but slower and harder to
deploy. For V2: detect JS-rendered pages and fall back to a headless fetch.

## Claude Integration

Model: `claude-sonnet-4-6` (configurable via env `ANTHROPIC_MODEL`).

Streaming: `client.messages.stream()` from `@anthropic-ai/sdk`. The route handler
reads chunks and re-emits them as `text/plain; charset=utf-8` with `Transfer-Encoding: chunked`.

Memory prompt:
```
Previous briefing (for reference — do NOT repeat this content):
---
{previous briefing text}
---
Focus on what is NEW since this briefing.
```

Citation format: Claude is instructed to cite inline as `[1]`, `[2]`, etc.,
with a sources list at the end. The client renders these as blue superscripts
with tooltips.

## Sentinel-based save trigger

The route handler appends `__BRIEFING_ID__:{uuid}\n` at the end of the stream.
The client detects this sentinel, strips it from the displayed text, and uses the
ID to confirm the server has saved the briefing. This avoids a second round-trip
and keeps the save logic server-side while giving the client the ID it needs.

## Component architecture

```
app/page.tsx                    # server: profile list
app/profiles/new/page.tsx       # server: create profile form
app/profiles/[id]/page.tsx      # server: profile view + source list
  └── components/GenerateBriefing.tsx  # client: streaming generation UI
app/profiles/[id]/briefings/[briefingId]/page.tsx  # server: full briefing view
```

All pages are server components except `GenerateBriefing.tsx` (needs browser APIs
for streaming fetch + localStorage API key).

## Design System

- Font: Geist Sans (UI chrome), Georgia serif (briefing body)
- Background: `#f9f7f4` (warm white — paper feel)
- Primary: `#1a1a1a` (near-black)
- Accent: none — intentionally minimal
- Cards: `#fff` with `1px solid #ebe8e3` border, no drop shadow

The brief content uses Georgia at 15px/1.7 line-height to feel like reading a
printed document, not a web page.

## Deployment

Any Node.js 18+ host. Requires write access to `data/` directory.
Recommended: Railway, Fly.io, Render (persistent disk for `data/profiles.json`).
Not Vercel (no persistent filesystem on serverless).

Environment variables:
```
ANTHROPIC_API_KEY=sk-ant-...   # optional: server-side key
                                # users can supply their own key in-browser
```
