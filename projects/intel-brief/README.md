# Intel Brief

AI-powered intelligence briefings on any topic. Create a profile, attach sources,
get a synthesized newsletter on demand or on schedule. Built for analysts,
consultants, and researchers who track topics professionally.

## What it does

- **Topic profiles** — create a profile for any topic (person, company, regulation, market)
- **Source connectors** — attach URLs (news sites, Wikipedia, company pages, RSS feeds)
- **Claude synthesis** — one click generates a cited briefing from all sources
- **Memory** — next briefing only surfaces what's new since the last one
- **Briefing history** — every briefing saved, searchable, linkable

## Running locally

```bash
cd projects/intel-brief
cp .env.local.example .env.local
# Add your Anthropic API key to .env.local
npm install
npm run dev          # dev server at http://localhost:3000
```

If you don't have an `.env.local`, the app prompts for the API key in-browser
and stores it in localStorage.

## Production

```bash
npm run build
npm start            # production server at http://localhost:3000

# With a custom port:
PORT=3001 npm start
```

For cloud deployment: push to Railway, Fly.io, or Vercel. Set
`ANTHROPIC_API_KEY` as an environment variable. No other config needed.

## Project structure

```
projects/intel-brief/
├── app/
│   ├── api/
│   │   ├── generate/route.ts     # streaming Claude synthesis
│   │   └── profiles/             # CRUD for profiles + briefings
│   ├── profiles/
│   │   ├── new/page.tsx          # create profile form
│   │   └── [id]/
│   │       ├── page.tsx          # profile view + generate button
│   │       └── briefings/[briefingId]/page.tsx  # full briefing view
│   ├── page.tsx                  # home: profile list
│   └── layout.tsx
├── components/
│   └── GenerateBriefing.tsx      # streaming client component
├── lib/
│   ├── scraper.ts                # fetch + strip HTML from URLs
│   ├── store.ts                  # JSON file storage (data/profiles.json)
│   └── types.ts                  # Profile, Briefing, Citation, Source
└── data/                         # created on first run, gitignored
    └── profiles.json
```

## How the synthesis works

1. User clicks "Generate briefing"
2. Server fetches all source URLs and strips HTML
3. Previous briefing (if any) is read — Claude uses it to surface only what's new
4. Claude streams a synthesis with inline citations `[1]`, `[2]`...
5. Briefing saved to `data/profiles.json` with citation metadata

## Roadmap

- [ ] Scheduled briefings (weekly cron)
- [ ] Email delivery
- [ ] Team profiles (shared sources + subscriptions)
- [ ] Real-time alerts (threshold-based notifications)
- [ ] Audio podcast output (ElevenLabs TTS)
- [ ] Slack / Notion delivery
