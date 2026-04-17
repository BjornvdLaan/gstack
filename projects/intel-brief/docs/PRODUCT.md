# Intel Brief — Product Document

## Problem

Analysts, consultants, researchers, and executives track topics professionally.
They check 5–15 sources daily, synthesize information mentally, and write updates
manually. This is 1–3 hours of reading and writing per topic per week.

AI can compress that to 5 minutes: fetch all sources, synthesize what's new,
cite everything, remember what was covered last time.

## Target Users

**Primary**: Independent consultants, market analysts, investment researchers,
strategy teams. People who are paid to know what's happening in a domain and
communicate it to stakeholders.

**Secondary**: Executives who track competitors, regulation, or market trends.
Need the briefing, not the research process.

**Not the target**: Casual readers. People who want a news app. The product
requires intentionality — you define what you track and why.

## Value Proposition

- **Profile-based**: Create a profile for any topic (company, person, regulation, market).
  Attach the sources you already trust. Get synthesis from those sources, not from
  Claude's training data.
- **Memory**: The next briefing starts from where the last one ended. No re-reading
  old news.
- **Citations**: Every claim in the briefing is cited `[1]`, `[2]`. You can verify
  everything. The model cannot hallucinate unchecked.
- **On demand**: Generate when you need it. No algorithmic feed, no push notifications.

## Business Model

**Freemium SaaS**: Free tier (limited profiles/sources), paid tier for unlimited
profiles + team sharing + scheduled delivery.

Pricing anchors:
- Individual: ~€15/month (cheaper than a Bloomberg terminal, 1% of the time saved)
- Team: ~€49/month for 5 users (shared profiles, team source libraries)
- Enterprise: contract (API access, custom integrations, SSO)

Distribution: Product-led growth. The briefing output is shareable. Recipients
ask "how did you make this?" — that's the viral loop.

## Competitive Landscape

| Tool | Approach | Gap |
|------|----------|-----|
| Feedly / Flipboard | RSS aggregation, no synthesis | You still have to read |
| Perplexity | Real-time web search, no profiles | No memory, no source control |
| ChatGPT with plugins | Ad hoc, no structure | No persistent profiles, no memory |
| Manual newsletter tools | You write it | Time-consuming |
| **Intel Brief** | Your sources + Claude synthesis + memory | None currently |

The key differentiator is **memory** (diff mode) + **trusted source control**
(you define the sources, not an algorithm).

## Roadmap

### V1 (current)
- [x] Topic profiles with source URLs
- [x] Claude synthesis with inline citations
- [x] Memory (previous briefing as context)
- [x] Briefing history per profile

### V2
- [ ] Scheduled delivery (cron: daily, weekly)
- [ ] Email output (MJML template)
- [ ] Multiple output formats (email, Slack, Notion)

### V3
- [ ] Team profiles (shared sources, shared briefings)
- [ ] Source quality scoring (based on citation frequency, accuracy)
- [ ] Real-time alerts (threshold-based: new regulatory filing, earnings announcement)
- [ ] Audio output (ElevenLabs TTS — briefing as podcast)
- [ ] API (programmatic access for enterprise workflows)
