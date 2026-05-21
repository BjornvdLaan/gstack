# Formage — Design Document
_Generated from office-hours session, 2026-05-21_

---

## What it is

A privacy-first, EU-hosted form builder and polling tool for small European businesses and solo professionals. Competes on design quality and GDPR compliance — not features. Think Typeform at 1/5 the price, built and hosted in Europe, with no third-party trackers embedded in the forms themselves.

---

## Target customer

**Primary:** Solo professionals in the EU — therapists, coaches, consultants, accountants, freelancers. They collect client intake data, want to look professional, and are exposed to GDPR risk using Google Forms or Typeform. They pay €10–20/month for professional tools without hesitation.

**Secondary:** Small EU businesses with a website needing contact forms, event registrations, client onboarding.

**Not the target (yet):** Agencies (more complex needs), enterprise, consumers.

---

## The wedge

Typeform charges €50+/month. Google Forms is free but sends data to US Google servers — a real GDPR exposure for EU businesses collecting personal data. Tally is free but lacks EU-first positioning.

A beautiful, EU-hosted form tool at €12/month is a clear two-line pitch: save money, stay compliant.

---

## Business model

### Tiers

**Free**
- 1 form
- 3 polls (multiple choice fields with public results)
- 100 form submissions/month
- Unlimited poll votes
- "Made with Formage" branding on forms
- CSV export

**Pro — €12/month or €99/year**
- Unlimited forms + polls
- 2,000 submissions/month
- No branding
- Custom colors/logo per form
- CSV + JSON export
- API (read submissions)
- Webhooks (POST to endpoint on new submission)
- Priority email support

**Payments:** Paddle (Merchant of Record — handles EU VAT across all 27 countries). Migrate to Mollie when scale makes 5% fee painful.

No enterprise tier until 200+ Pro customers ask for it.

### Income targets

| Customers | MRR |
|-----------|-----|
| 100 | €1,200 |
| 250 | €3,000 |
| 500 | €6,000 |

---

## Core features (POC scope)

### Field types
- `text` — single line
- `email` — with email format validation
- `textarea` — multi-line
- `dropdown` — single select, options in config
- `checkbox` — boolean OR multi-select (config: `{ multiple: true }`)
- `date` — date picker
- `consent` — required checkbox with fixed GDPR text (set by owner)

### Form builder UI
List-based editor. No drag-drop in v1. Add field → pick type → write label → toggle required. Explicit save button (dirty-state tracking + unsaved-changes warning on tab close). That's it.

### Hosted form page
Respondent-facing page at `/f/slug`. Renders form schema, client-side + server-side validation, thank you state, optional redirect URL.

### Polls
A poll is a multiple choice field (`checkbox` or `dropdown`) with `public_results: true`. No separate poll entity. **v1: data model only — no shareable results page, no SSE broadcast to public.** Owner sees live counts in their dashboard. Public results page is v2.

### Streaming participation dashboard
Owner's submission view is live — new submissions appear at the top of the feed via SSE without refresh. Charts update in real-time for multiple choice fields.

### Auth (owners)
Magic link only. No passwords stored. Flow: enter email → receive link → click → session cookie set. `httpOnly + Secure + SameSite=Strict`. Session expires in 30 days.

### Respondent modes (per form setting)
- `anonymous` — v1 only. voter_token in localStorage for "you already voted" UI hint (not server-enforced — localStorage-only).
- `optional_auth` — v2
- `required_auth` — v2

### Spam protection
Honeypot field (hidden input, bots fill it, submission rejected). Cloudflare Turnstile for v2.

### Email notifications
Owner receives an email on each submission. Resend as provider.

### Export
CSV (free + pro), JSON (pro only). Built from `submissions.data` JSONB + field schema.

### GDPR features
- Contact consent: separate optional checkbox, owner writes the text
- Data retention: per-form setting, auto-delete submissions after N days
- Erasure requests: respondent deletes account → user_id set to null on submissions + erasure_request logged → owner notified to review
- Owner deletes account → CASCADE delete all forms and submissions
- "Delete my account" always available

---

## Data model

```sql
-- Identity
users (
  id          uuid pk default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz default now()
)

auth_tokens (
  id          uuid pk,
  user_id     uuid references users(id) on delete cascade,
  token       text unique not null,
  expires_at  timestamptz not null,   -- 15 minutes
  used_at     timestamptz             -- null = still valid
)

sessions (
  id          uuid pk,
  user_id     uuid references users(id) on delete cascade,
  expires_at  timestamptz not null,   -- 30 days
  created_at  timestamptz default now()
)

-- Forms
forms (
  id                    uuid pk,
  user_id               uuid references users(id) on delete cascade,
  slug                  text unique not null,
  title                 text not null,
  description           text,
  submit_label          text default 'Submit',
  success_message       text default 'Thanks for your response.',
  redirect_url          text,
  respondent_mode       text default 'anonymous', -- anonymous|optional_auth|required_auth
  contact_enabled       bool default false,
  contact_consent_text  text,
  public_results_enabled bool default false,
  data_retention_days   int,                      -- null = keep forever; UI: preset dropdown (30/90/365/null)
  settings              jsonb default '{}',
  created_at            timestamptz default now()
)

-- Fields (ordered)
fields (
  id          uuid pk,
  form_id     uuid references forms(id) on delete cascade,
  key         text not null,        -- stable slug: "full_name", "email_address"
  type        text not null,        -- text|email|textarea|dropdown|checkbox|date|consent
  label       text not null,
  help_text   text,
  required    bool default false,
  position    int not null,
  public_results bool default false, -- true = this field powers a poll results view
  config      jsonb default '{}'    -- {options:[...]} for dropdown/checkbox, {multiple:true}, {min_length:N}
)

-- Submissions (denormalized JSONB — no separate answers table in v1)
submissions (
  id              uuid pk,
  form_id         uuid references forms(id) on delete cascade,
  user_id         uuid references users(id) on delete set null, -- null = anonymous
  -- voter_token removed: localStorage-only UI state, not a security gate
  contact_consent bool default false,
  ip_hash         text,             -- SHA-256(ip + daily_salt), soft dedup only
  data            jsonb not null,   -- {"full_name": "John", "email": "john@example.com"}
  created_at      timestamptz default now()
)
-- GIN index on submissions.data for aggregate queries (poll counts, filtering)
-- CREATE INDEX submissions_data_gin ON submissions USING gin(data);
-- CREATE INDEX submissions_form_created ON submissions(form_id, created_at);

-- GDPR erasure audit trail
erasure_requests (
  id            uuid pk,
  submission_id uuid references submissions(id) on delete cascade,
  requested_at  timestamptz default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references users(id) on delete set null
)
```

---

## Architecture

### Stack
- **Language:** Java 21 (virtual threads via Project Loom)
- **Framework:** Quarkus 3 (native compilation, ~20MB binary, instant startup)
- **HTTP layer:** RESTEasy Reactive
- **Database:** PostgreSQL on Hetzner (Germany)
- **DB access:** jOOQ (type-safe SQL — stays close to the schema, no magic)
- **Migrations:** Flyway (Quarkus extension, runs on startup)
- **Frontend:** HTMX + Alpine.js — server renders HTML, no SPA
- **Email:** Resend (plain HTTP API, no SDK)
- **File storage:** Cloudflare R2 (deferred — file uploads are v2)
- **Payments:** Paddle (Merchant of Record — handles EU VAT across 27 countries)
- **Hosting:** Hetzner CAX11 (€3.29/month, 4GB RAM, ARM64), Caddy for TLS

**Why Quarkus over Spring Boot:** Same Java ecosystem, same annotations, ~5× lower idle memory (~50MB vs ~250MB), instant startup with native image. No new language to learn.

**Why jOOQ over Hibernate/Panache:** The schema is hand-designed and stable. jOOQ generates type-safe Java from SQL — you write SQL, you get Java, no impedance mismatch. Hibernate is better when you don't know your schema upfront.

**Why HTMX over React:** The UI surface is small and server-driven. HTMX handles the SSE live feed, form submissions, and inline expand/collapse with almost no JavaScript. Fewer moving parts, no build step, easier to maintain solo.

### Custom domain for hosted forms (v2)
Customer adds CNAME: `forms.theirdomain.com → forms.yourtool.com`.
Caddy on-demand TLS auto-provisions Let's Encrypt certs. App exposes `/api/check-domain` for Caddy to verify before cert provisioning.

### Real-time (SSE)
PostgreSQL LISTEN/NOTIFY from day one. Quarkus RESTEasy Reactive returns `Multi<String>` — each emission is an SSE frame.

```
submission arrives
  → store in DB (jOOQ insert)
  → pg_notify('form_<form_id>', json payload)
  → Vert.x PG client LISTEN picks it up
  → broadcast Multi emission to all SSE subscribers watching that form_id
  → owner dashboard receives full submission JSON
  → public results viewers receive aggregate-only payload
```

Vert.x PostgreSQL client (bundled with Quarkus reactive stack) has native async LISTEN/NOTIFY — no polling, no in-memory map, works across restarts.

### Native image build
```bash
./mvnw package -Pnative
# produces: target/formage-runner (~20MB, ~30ms startup)
```
GraalVM/Mandrel handles the AOT compilation. Quarkus's build-time CDI means almost nothing needs reflection config.

### Dev experience
Quarkus Dev Services spins up a PostgreSQL container automatically in dev mode — no local Postgres install needed:
```bash
./mvnw quarkus:dev
# → app on :8080, live reload on save, Dev UI on :8080/q/dev
```

### Respondent identity
- Anonymous: `voter_token` = `localStorage.getItem('voter_id')` (UUID generated client-side on first visit, UI hint only)
- Authenticated respondents: v2

---

## What's cut from v1

| Feature | Status |
|---------|--------|
| File uploads | v2 — needs R2, virus scan, size limits |
| Conditional logic | v2 — show/hide fields based on answers |
| Embed script (`<script>` tag) | v2 — hosted page only for POC |
| Custom domain for forms | v2 — Caddy on-demand TLS |
| Custom themes | v2 — CSS variables per form |
| API + webhooks | v2 — after form itself works |
| Multi-step forms | v2 — one page for POC |
| Export | v1.5 — easy, not day-one |

---

## Go-to-market

- **SEO:** "GDPR form builder Netherlands", "privacy-friendly contact form EU", "Typeform alternative Europe"
- **Communities:** Freelancer forums, coach/therapist professional groups in NL/DE/BE
- **Validation step (before building):** Talk to 5 solo professionals (therapist, coach, consultant). Ask: "What do you use for client intake forms? What's annoying about it?" If 3/5 mention price, ugliness, or data concerns unprompted — build it.
- **Pricing page:** Lead with "Made in Europe. Your data stays in Europe."

---

## TODOs

### Design phase
- [x] /autoplan — run CEO + eng + design review on this doc ✓ 2026-05-21
- [ ] /design-consultation — nail the visual identity before writing UI code

### Pre-code fixes (blocking — do these before any implementation)
- [ ] Add `plan` + `stripe_customer_id` (or `paddle_customer_id`) columns to `users` — no way to enforce tiers without it
- [ ] Cut `optional_auth` + `required_auth` respondent modes from v1 — ship anonymous-only, unblock when customers ask
- [ ] Cut `answers` table from v1 — use `submissions.data` JSONB + GIN index; add `answers` later via migration if needed
- [ ] Decide Paddle vs Stripe now — recommendation: Paddle (MoR handles EU VAT across 27 countries, ~5% vs DIY VAT compliance)
- [ ] Use PostgreSQL LISTEN/NOTIFY for SSE instead of in-memory map — 30 lines difference, prevents rewrite when you deploy
- [ ] Define slug generation: title-derived + 4-char nanoid suffix, user-editable, lowercase/digits/hyphens, 4-80 chars
- [ ] Define form states: `draft | published | archived` — add `status` column to `forms`
- [ ] Validate `redirect_url` on write — https-only or same-origin, prevent open redirect
- [ ] Use constant-time comparison for auth tokens: `crypto.timingSafeEqual`
- [ ] Rate-limit magic link endpoint: 5 req/hour per IP + 3 req/hour per email

### Pre-code schema fixes
- [ ] Snapshot consent field text into `submissions.data` at submit time (audit trail — owner can edit field later)
- [ ] Add `INDEX submissions_form_created ON submissions(form_id, created_at)` — needed for tier enforcement + list view
- [ ] Define `daily_salt` lifecycle for IP hashing: generated at midnight UTC, stored in `config` table with TTL
- [ ] Soft-delete fields (`deleted_at timestamptz`) — hard-delete breaks export for existing submissions

### Build phase
- [ ] Initialize repo (Bun + Hono + Drizzle + PostgreSQL)
- [ ] DB schema + migrations (with above fixes applied)
- [ ] Magic link auth (users, auth_tokens, sessions) + rate limiting
- [ ] Form CRUD (create, edit, delete) with IDOR protection
- [ ] Field editor UI (list-based, no drag-drop) — decide autosave vs explicit save first
- [ ] Hosted form page + validation + success state (mobile-first)
- [ ] Honeypot spam protection
- [ ] Submission storage (JSONB only, no answers table)
- [ ] Email notification on submission (Resend) — async, fire-and-forget, log failures
- [ ] Submission list view + live SSE feed (PostgreSQL LISTEN/NOTIFY)
- [ ] SSE client reconnect: `retry: 3000` + re-fetch current state on reconnect
- [ ] Anonymous voter_token (localStorage) — server enforces uniqueness
- [ ] Poll results page + SSE live counts (aggregate cached in pub/sub state)
- [ ] Tier enforcement: free = 1 form + 100 submissions/month
- [ ] /checkpoint — regularly throughout

### Pre-launch additions (high trust signals, low effort)
- [ ] Write DPA document + add "Download DPA" link in owner dashboard
- [ ] Magic link expiry screen: clear message + resend link
- [ ] Empty state for owner dashboard: confirm form is live + share URL + copy button
- [ ] Submission limit warning at 80/100 (free tier) with upgrade prompt
- [ ] GDPR retention cron (systemd timer) + log what was deleted

### Pre-launch quality
- [ ] /cso — security audit (XSS on submission data render, IDOR on form management, CSRF, secrets)
- [ ] /health — code quality dashboard
- [ ] /qa — systematic QA of the full app

### Each feature ship
- [ ] /review — before merging
- [ ] /ship — bump version, CHANGELOG, push, PR

---

## GSTACK REVIEW REPORT

| Review | Trigger | Runs | Status | Top findings |
|--------|---------|------|--------|--------------|
| CEO Review | `/plan-ceo-review` | 1 | ✓ DONE_WITH_CONCERNS | Cut respondent auth v1; Paddle > Stripe; PostgreSQL LISTEN/NOTIFY; DPA doc; mobile-first |
| Eng Review | `/plan-eng-review` | 1 | ✓ DONE_WITH_CONCERNS | No billing field in schema; cut answers table; slug undefined; constant-time token compare; 31 test paths |
| Design Review | `/plan-design-review` | 1 | ✓ NEEDS_CONTEXT | 2/10 design completeness; 14 unresolved decisions; run /design-consultation before any UI |
| Codex Review | `/codex review` | 0 | — | — |
| DX Review | `/plan-devex-review` | 0 | — | — |

**VERDICT:** BUILD IT — 10 pre-code fixes required, /design-consultation required before UI. Core concept is sharp, wedge is real, stack is sound.
