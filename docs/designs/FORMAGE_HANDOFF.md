# Formage — New Session Handoff

You are starting the implementation of **Formage**, a GDPR-first EU form builder.
The product has been fully designed. Your job is to initialize the codebase.

**First task:** Scaffold the Quarkus project in this repo directory. Full context below.

---

## What to build

A privacy-first, EU-hosted form builder for solo professionals (therapists, coaches,
consultants) in the EU. Competes with Typeform on design quality, Google Forms on
privacy. Price: €12/month. Wedge: beautiful + EU-hosted + GDPR-compliant.

Goal: stable side income (~100–500 paying customers). Not a unicorn.

---

## Tech stack (decided, do not change)

| Layer | Choice | Reason |
|-------|--------|--------|
| Language | Java 21 | Owner is proficient |
| Framework | Quarkus 3 | ~50MB idle, instant startup, same Java ecosystem as Spring |
| HTTP | RESTEasy Reactive | Bundled with Quarkus |
| DB access | jOOQ | Type-safe SQL, schema is hand-designed and stable |
| Migrations | Flyway | Quarkus extension, runs on startup |
| Database | PostgreSQL | EU-hosted on Hetzner |
| Frontend | HTMX + Alpine.js | Server renders HTML, no SPA, no build step |
| Templates | Qute | Quarkus native template engine |
| Email | Resend | Plain HTTP API |
| Payments | Paddle | Merchant of Record — handles EU VAT across 27 countries |
| Hosting | Hetzner CAX11 | €3.29/mo, 4GB RAM, ARM64, Germany |
| TLS | Caddy | On Hetzner VPS |

**SSE:** PostgreSQL LISTEN/NOTIFY via Vert.x PG client (bundled with Quarkus reactive).
Returns `Multi<String>` from RESTEasy Reactive endpoint.

**Dev:** `./mvnw quarkus:dev` — Quarkus Dev Services auto-spins PostgreSQL container,
live reload on save, Dev UI at `:8080/q/dev`.

**Native build:** `./mvnw package -Pnative` → `target/formage-runner` (~20MB, ~30ms startup).

---

## Database schema

Apply all of these as Flyway migrations. This is the final schema — all pre-code
decisions have already been made.

```sql
-- V1__initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Identity
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT UNIQUE NOT NULL,
  plan               TEXT NOT NULL DEFAULT 'free',         -- 'free' | 'pro'
  plan_expires_at    TIMESTAMPTZ,
  paddle_customer_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,  -- SecureRandom.nextBytes(32) → base64url
  expires_at TIMESTAMPTZ NOT NULL,  -- 15 minutes from creation
  used_at    TIMESTAMPTZ            -- null = still valid
);

CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,  -- 30 days from creation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Forms
CREATE TABLE forms (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                   TEXT UNIQUE NOT NULL,  -- title-derived + 4-char nanoid, owner-editable
  status                 TEXT NOT NULL DEFAULT 'draft',  -- draft | published | archived
  title                  TEXT NOT NULL,
  description            TEXT,
  submit_label           TEXT NOT NULL DEFAULT 'Submit',
  success_message        TEXT NOT NULL DEFAULT 'Thanks for your response.',
  redirect_url           TEXT,                  -- validated: https-only, prevent open redirect
  respondent_mode        TEXT NOT NULL DEFAULT 'anonymous',  -- v1: anonymous only
  contact_enabled        BOOLEAN NOT NULL DEFAULT false,
  contact_consent_text   TEXT,
  public_results_enabled BOOLEAN NOT NULL DEFAULT false,
  data_retention_days    INT,                   -- null = keep forever; preset: 30/90/365/null
  settings               JSONB NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fields (ordered)
CREATE TABLE fields (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id        UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  key            TEXT NOT NULL,          -- stable slug: "full_name", "email_address"
  type           TEXT NOT NULL,          -- text|email|textarea|dropdown|checkbox|date|consent
  label          TEXT NOT NULL,
  help_text      TEXT,
  required       BOOLEAN NOT NULL DEFAULT false,
  position       INT NOT NULL,
  public_results BOOLEAN NOT NULL DEFAULT false,  -- true = poll results view
  deleted_at     TIMESTAMPTZ,            -- soft delete — never hard delete (breaks export)
  config         JSONB NOT NULL DEFAULT '{}'  -- {options:[...]} for dropdown/checkbox, {multiple:true}
);

-- Submissions (denormalized JSONB — no answers table in v1)
CREATE TABLE submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,  -- null = anonymous
  contact_consent BOOLEAN NOT NULL DEFAULT false,
  ip_hash         TEXT,   -- SHA-256(ip + daily_salt), soft dedup only
  data            JSONB NOT NULL,  -- {"full_name": "John", "email": "john@example.com", "_consent_text": "..."}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX submissions_data_gin ON submissions USING gin(data);
CREATE INDEX submissions_form_created ON submissions(form_id, created_at);

-- Config / system state
CREATE TABLE config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- daily_salt row: INSERT INTO config VALUES ('ip_hash_salt', '<random>', now());
-- Rotate at midnight UTC via cron.

-- GDPR erasure audit trail
CREATE TABLE erasure_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL
);
```

**Key schema decisions (already made — don't revisit):**
- `voter_token` NOT in DB — localStorage-only UI hint, not a security gate
- No `answers` table — `submissions.data` JSONB + GIN index only
- `fields.deleted_at` soft delete — hard delete breaks export for existing submissions
- `submissions.data` must snapshot consent text at submit time: store as `_consent_text` key
- `redirect_url` validated on write: https-only, prevent open redirect
- Auth tokens: constant-time comparison (`MessageDigest.isEqual` or equivalent)
- Magic link rate limit: 5 req/hour per IP + 3 req/hour per email
- Slug: title-derived + 4-char nanoid suffix, owner-editable, lowercase/digits/hyphens, 4–80 chars

---

## Build order (do these in sequence)

1. **Initialize Quarkus project** — Maven, Java 21, extensions listed below
2. **Flyway migration** — V1__initial_schema.sql from above
3. **jOOQ codegen** — generate from the schema
4. **Magic link auth** — users, auth_tokens, sessions + rate limiting + constant-time compare
5. **Form CRUD** — create, edit, delete with IDOR protection (check `form.user_id == session.user_id`)
6. **Field editor UI** — list-based, explicit save button, dirty-state tracking
7. **Hosted form page** — `/f/{slug}`, client-side + server-side validation, success state, mobile-first
8. **Honeypot spam protection** — hidden input, reject if filled
9. **Submission storage** — JSONB insert, snapshot consent text
10. **Email notification** — Resend HTTP API, async fire-and-forget, log failures
11. **SSE live feed** — PostgreSQL LISTEN/NOTIFY → `Multi<String>` → HTMX `hx-sse`
12. **SSE reconnect** — `retry: 3000` in SSE frame + re-fetch state on reconnect
13. **Tier enforcement** — free = 1 form + 100 submissions/month
14. **Anonymous voter_token** — localStorage UUID, "already voted" UI hint only

---

## Quarkus extensions to include in pom.xml

```
quarkus-resteasy-reactive
quarkus-resteasy-reactive-qute
quarkus-reactive-pg-client      ← Vert.x PG client for LISTEN/NOTIFY
quarkus-flyway
quarkus-agroal                  ← JDBC connection pool (for jOOQ)
quarkus-jdbc-postgresql
quarkus-smallrye-openapi        ← optional, handy for dev
quarkus-scheduler               ← for GDPR retention cron + salt rotation
quarkus-config-yaml
```

jOOQ: add as plain Maven dependency (not a Quarkus extension — works fine alongside).
Use jOOQ codegen Maven plugin to generate from the Flyway-migrated schema.

---

## Design system summary

**Aesthetic:** Composed European Editorial — warm, unhurried, trustworthy. The opposite of Google Forms.

**Colors (CSS custom properties):**
```css
:root {
  --color-bg:               #F5F2EC;  /* warm off-white */
  --color-surface:          #FFFFFF;
  --color-surface-alt:      #FAF8F4;
  --color-text:             #1C1A17;
  --color-text-muted:       #8A8278;
  --color-text-disabled:    #C4BFB8;
  --color-green:            #1D5C4A;  /* primary accent */
  --color-green-hover:      #174D3E;
  --color-green-light:      #EAF2EF;
  --color-terracotta:       #C4622D;  /* secondary / destructive */
  --color-terracotta-light: #FBF0EA;
  --color-border:           #E8E4DC;
  --color-border-focus:     #1D5C4A;
  --color-error:            #C0392B;
  --shadow-sm:   0 1px 2px rgba(28,26,23,0.06);
  --shadow-md:   0 4px 12px rgba(28,26,23,0.08);
  --shadow-lg:   0 12px 32px rgba(28,26,23,0.12);
  --shadow-form: 0 2px 8px rgba(28,26,23,0.06), 0 0 0 1px var(--color-border);
}
```

**Fonts:**
- `Fraunces` (variable serif, Google Fonts) — form titles, empty state headings, wordmark only
- `Geist` (self-hosted) — all UI: labels, buttons, nav, body
- `Geist Mono` (self-hosted) — field keys, slugs, code

**Spacing:** 8px base unit. 64px between fields on hosted form. 80px top/bottom padding.

**Motion:** 150ms ease-out default. 100ms deliberate breath on destructive actions. 250ms on success state.

**Layouts:**
- Form builder: 260px left palette | canvas (65%) | 320px right drawer (slides in on field select)
- Hosted form: 620px centered, `--color-bg` background, cards per field
- Dashboard: list-first, expand inline, SSE slides new submissions in at top

CSS tokens file: `src/main/resources/META-INF/resources/styles/tokens.css`
Qute templates: `src/main/resources/templates/`

Full design system is in `DESIGN-SYSTEM.md` in this repo.

---

## Business model (for tier enforcement)

**Free:** 1 form, 100 submissions/month, "Made with Formage" branding
**Pro:** €12/month or €99/year, unlimited forms, 2000 submissions/month, no branding

Payments via Paddle. `users.plan` = `'free'` or `'pro'`. `users.plan_expires_at` for
annual subscriptions.

---

## Security requirements (non-negotiable)

- Session cookie: `httpOnly`, `Secure`, `SameSite=Strict`
- Auth token comparison: constant-time (`MessageDigest.isEqual`)
- Magic link rate limit: 5/hour per IP, 3/hour per email
- IDOR: every form/submission access checks `form.user_id == session.user_id`
- `redirect_url`: reject anything that isn't `https://` or same-origin
- Honeypot: hidden input named something innocuous, reject submission if non-empty
- XSS: Qute auto-escapes by default — never use raw/unescaped output on submission data

---

## What's deferred (do not build in v1)

- File uploads (needs R2 + virus scan)
- Conditional logic (show/hide fields)
- `<script>` embed tag
- Custom domains (Caddy on-demand TLS)
- Custom themes per form
- Webhooks + API
- Multi-step forms
- `optional_auth` + `required_auth` respondent modes
- Public poll results page (SSE broadcast to public)
- Export (CSV/JSON) — v1.5

---

## Pre-launch checklist (after build)

- [ ] DPA document + "Download DPA" link in dashboard
- [ ] Magic link expiry screen with resend link
- [ ] Empty state: share URL + copy button
- [ ] Submission limit warning at 80/100 (free tier) + upgrade prompt
- [ ] GDPR retention cron (Quarkus @Scheduled) + deletion log
- [ ] Security audit (XSS, IDOR, CSRF, secrets in logs)
- [ ] QA full app
