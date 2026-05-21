# Formage — Design System
_Generated from design-consultation session, 2026-05-21_

---

## Aesthetic Direction

**Name:** Composed European Editorial

**Emotion:** Relief — the opposite of Google Forms. A tool that respects your attention, looks like it was made by a human, and doesn't make you feel like you're filling out a tax form.

**Reference points:**
- Dutch clarity (Werkplaats Typografie, Total Design) — structured, honest, no decoration for its own sake
- Scandinavian warmth — natural materials, unhurried spacing, nothing aggressive
- Editorial modernism — serifs for hierarchy, sans for utility, never mixed carelessly

**In one sentence:** The form builder that looks like it belongs on a good architect's desk, not a growth-hacker's SaaS dashboard.

---

## Color System

### CSS Custom Properties

```css
:root {
  /* Backgrounds */
  --color-bg:           #F5F2EC; /* warm off-white — paper, not clinical white */
  --color-surface:      #FFFFFF; /* card/form surface — lifts off the bg */
  --color-surface-alt:  #FAF8F4; /* subtle alt surface for table rows, hover states */

  /* Text */
  --color-text:         #1C1A17; /* near-black — warm, not pure #000 */
  --color-text-muted:   #8A8278; /* secondary labels, help text, timestamps */
  --color-text-disabled:#C4BFB8; /* placeholder, disabled states */

  /* Accent — Primary */
  --color-green:        #1D5C4A; /* forest green — trust, EU, nature */
  --color-green-hover:  #174D3E; /* 8% darker for hover */
  --color-green-light:  #EAF2EF; /* tint for focus rings, selected states */

  /* Accent — Secondary */
  --color-terracotta:   #C4622D; /* warm orange-red — warning, highlight, personality */
  --color-terracotta-light: #FBF0EA; /* tint for notification badges, callouts */

  /* Borders */
  --color-border:       #E8E4DC; /* default border — warm, not gray */
  --color-border-focus: #1D5C4A; /* focus ring on inputs — 2px solid */

  /* Status */
  --color-success:      #2D7A5F; /* slightly brighter green for success states */
  --color-error:        #C0392B; /* standard error red */
  --color-warning:      #C4622D; /* reuse terracotta */

  /* Shadows */
  --shadow-sm:   0 1px 2px rgba(28, 26, 23, 0.06);
  --shadow-md:   0 4px 12px rgba(28, 26, 23, 0.08);
  --shadow-lg:   0 12px 32px rgba(28, 26, 23, 0.12);
  --shadow-form: 0 2px 8px rgba(28, 26, 23, 0.06), 0 0 0 1px var(--color-border);
}
```

### Usage Rules

| Token | Use for |
|-------|---------|
| `--color-bg` | Page background, sidebar, app shell |
| `--color-surface` | Cards, form builder canvas, modal dialogs |
| `--color-surface-alt` | Table stripes, hover rows, nested sections |
| `--color-green` | Primary CTA buttons, active nav, focus rings, left-border on focused fields |
| `--color-terracotta` | Destructive confirm buttons, upgrade prompts, "pro" badges, error icons |
| `--color-text-muted` | Help text, field keys, timestamps, empty states |
| `--color-border` | All dividers, input borders at rest |

---

## Typography

### Font Stack

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap');

/* Geist and Geist Mono are self-hosted or via Vercel CDN */

:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'Geist', system-ui, -apple-system, sans-serif;
  --font-mono:    'Geist Mono', 'Fira Code', monospace;
}
```

**Fraunces** — variable optical size serif. Use for: form titles on the hosted form page, marketing headlines, empty state headings, the Formage wordmark. Set `font-optical-sizing: auto` — it automatically adapts the letterforms at small vs large sizes.

**Geist** — clean geometric sans. Use for: all UI chrome, field labels, button text, navigation, body copy in the dashboard.

**Geist Mono** — use for: field keys (`full_name`), form slugs, webhook URLs, API responses, code examples.

### Type Scale

```css
:root {
  /* Display — Fraunces only */
  --text-display-xl: clamp(2.5rem, 5vw, 4rem);   /* marketing hero */
  --text-display-lg: clamp(1.75rem, 3vw, 2.5rem); /* form title on /f/slug */
  --text-display-md: 1.5rem;                       /* section headers in builder */

  /* UI — Geist */
  --text-xl:   1.25rem;   /* 20px — modal titles, page headings */
  --text-lg:   1.125rem;  /* 18px — card titles, field labels */
  --text-md:   1rem;      /* 16px — body, button text, primary inputs */
  --text-sm:   0.875rem;  /* 14px — secondary labels, help text */
  --text-xs:   0.75rem;   /* 12px — timestamps, badges, field keys */

  /* Line heights */
  --leading-tight:  1.2;
  --leading-snug:   1.35;
  --leading-normal: 1.5;
  --leading-loose:  1.7;

  /* Letter spacing */
  --tracking-tight: -0.02em;  /* large display text */
  --tracking-normal: 0;
  --tracking-wide:  0.04em;   /* uppercase labels, badges */
}
```

### Typography Rules

- **Form titles** (on `/f/slug`): Fraunces, `--text-display-lg`, `font-weight: 300`, `--tracking-tight`
- **Field labels**: Geist, `--text-md`, `font-weight: 500`, `--color-text`
- **Help text**: Geist, `--text-sm`, `font-weight: 400`, `--color-text-muted`
- **Button text**: Geist, `--text-sm`, `font-weight: 500`, uppercase NO — sentence case always
- **Field keys**: Geist Mono, `--text-xs`, `--color-text-muted`
- **Never** mix Fraunces and Geist in the same sentence or label. Fraunces is for titles only.

---

## Spacing System

8px base unit. All spacing is a multiple of 8 (with 4px allowed for tight internal padding).

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

**European whitespace principle:** When in doubt, add more. The form builder canvas uses 64px between fields minimum. The hosted form page has 80px padding top/bottom. White space is not wasted — it's trust.

---

## Motion

```css
:root {
  --duration-fast:    100ms;
  --duration-normal:  150ms;
  --duration-slow:    250ms;
  --duration-breath:  100ms; /* intentional pause on destructive confirms */

  --ease-out:     cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-in-out:  cubic-bezier(0.4, 0.0, 0.2, 1.0);
}
```

**Rules:**
- Default: `150ms ease-out` for all state changes (hover, focus, open/close)
- Destructive confirm (delete form, delete field): `100ms` — a deliberate breath before the danger zone renders. Not a full pause, but a subtle slowing that communicates "pay attention."
- Submission success state: fade + subtle upward translate, `250ms ease-out`
- SSE new submission arriving: slide down from top, `200ms ease-out`, no bounce
- Never animate layout changes (adding/removing fields) — just reflow. Animating layout creates janky paint.

---

## Border Radius

```css
:root {
  --radius-sm:   4px;   /* badges, tags, small chips */
  --radius-md:   8px;   /* input fields, buttons */
  --radius-lg:   12px;  /* cards, dropdowns, modals */
  --radius-xl:   16px;  /* form canvas, large panels */
  --radius-full: 9999px; /* pill buttons (avoid — use sparingly) */
}
```

---

## Component Design

### Inputs (on hosted form page)

```
┌─────────────────────────────────────────────────────────┐
│ Full name                                               │ ← Geist 16px 500 --color-text
│                                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │                                                   │  │ ← --color-surface
│ │                                                   │  │   border: 1px solid --color-border
│ └───────────────────────────────────────────────────┘  │   radius: --radius-md
│ Enter your legal name as it appears on ID               │ ← Geist 14px --color-text-muted
└─────────────────────────────────────────────────────────┘
```

**Focus state:**
```css
input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-green-light);
}
```

Left border accent on the field container when focused:
```css
.field-wrapper:focus-within {
  border-left: 3px solid var(--color-green);
  padding-left: calc(var(--space-4) - 3px); /* compensate for border width */
}
```

**Error state:**
```css
input[aria-invalid="true"] {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.12);
}
```

### Buttons

**Primary (green):**
```css
.btn-primary {
  background: var(--color-green);
  color: #FFFFFF;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font: 500 var(--text-sm) / 1 var(--font-body);
  transition: background var(--duration-normal) var(--ease-out);
}
.btn-primary:hover { background: var(--color-green-hover); }
```

**Secondary (ghost):**
```css
.btn-secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font: 500 var(--text-sm) / 1 var(--font-body);
}
.btn-secondary:hover { background: var(--color-surface-alt); }
```

**Destructive (terracotta):**
```css
.btn-destructive {
  background: var(--color-terracotta);
  color: #FFFFFF;
  /* Same dimensions as primary */
  transition: background var(--duration-breath) var(--ease-out); /* deliberate breath */
}
```

**Disabled state:** 50% opacity, `cursor: not-allowed`, no hover effect.

### Form Builder Field Card

```
┌─── drag handle (hidden until hover) ──────────────────────────────┐
│  ≡   [text ▾]  Full name *                              [⋮ menu]  │
│        key: full_name                                              │
│        Help text: optional                              [required] │
└────────────────────────────────────────────────────────────────────┘
```

- Background: `--color-surface`
- Border: `1px solid --color-border`
- Shadow: `--shadow-sm`
- Radius: `--radius-lg`
- Active/selected: left border `3px solid --color-green`, `--shadow-md`
- Hover: `background: --color-surface-alt`, drag handle appears

### Consent Field (special)

Visually distinct from regular fields. Slightly inset background (`--color-surface-alt`), italic Fraunces label at small size for the legal text, required with no optional toggle.

---

## Layout: Three Surfaces

### 1. Form Builder (owner dashboard)

```
┌──────────────┬──────────────────────────────────┬─────────────────┐
│  Field       │  Canvas                           │  Field editor   │
│  palette     │                                   │  drawer         │
│  260px       │  ~65% of viewport                 │  320px          │
│              │                                   │  (slides in on  │
│  + Text      │  ┌──────────────────────────┐    │  field select)  │
│  + Email     │  │ Form title               │    │                 │
│  + Textarea  │  │ (Fraunces, editable)     │    │  Label          │
│  + Dropdown  │  ├──────────────────────────┤    │  [___________]  │
│  + Checkbox  │  │ ≡ Full name *            │    │                 │
│  + Date      │  │ ≡ Email address *        │    │  Help text      │
│  + Consent   │  │ ≡ Your message           │    │  [___________]  │
│              │  │ + Add field              │    │                 │
│              │  └──────────────────────────┘    │  ☐ Required     │
│              │                                   │                 │
│              │  [Save]  [Preview ↗]              │  [Delete field] │
└──────────────┴──────────────────────────────────┴─────────────────┘
```

- Left palette: sticky, scrollable if overflow. Click-to-add only (no drag-drop v1).
- Canvas: `--color-bg` background, centered, max 720px, cards for each field
- Right drawer: slides in from right, `--color-surface`, `--shadow-lg`. Closes on Escape or clicking canvas.
- **Explicit save button** — dirty-state tracked. Button shows "Unsaved changes" in muted text when dirty. Browser warns on tab close if dirty.
- Unsaved state indicator: small dot `--color-terracotta` next to page title

### 2. Hosted Form Page (`/f/slug`)

```
┌─────────────────────────────────────────────────────────────┐
│                        [Formage logo]                       │ ← if free tier / branding enabled
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         Contact us                                          │ ← Fraunces display
│         We'd love to hear from you.                         │ ← Geist body muted
│                                                             │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Full name *                                     │      │
│   │ ┌─────────────────────────────────────────────┐│      │
│   │ │                                             ││      │
│   │ └─────────────────────────────────────────────┘│      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │ ← 64px between fields
│   ┌─────────────────────────────────────────────────┐      │
│   │ Email address *                                 │      │
│   │ ┌─────────────────────────────────────────────┐│      │
│   │ │                                             ││      │
│   │ └─────────────────────────────────────────────┘│      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│              [          Submit          ]                   │ ← full-width on mobile
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Max width: `620px`, horizontally centered
- Background: `--color-bg` (warm off-white)
- `80px` padding top/bottom on desktop, `40px` on mobile
- Each field: `--color-surface` card with `--shadow-form`
- Mobile-first: single column always, no side-by-side fields
- Submit button: full-width on mobile (`< 640px`), left-aligned fixed-width on desktop

**Success state:**
```
         ✓

    Thanks for your response.

    We'll be in touch shortly.
```
- Checkmark: `--color-green`, 48px
- Title: Fraunces display
- Body: Geist muted
- Fade in + 8px upward translate, `250ms ease-out`

### 3. Submission Dashboard (owner view)

```
┌─────────────────────────────────────────────────────────────────┐
│  Contact form  ·  23 responses  ·  ● Live                       │
├─────────────────────────────────────────────────────────────────┤
│  Filter ▾    Export ▾                              [+ New form]  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Maria Chen · 2 min ago                          [expand] │  │ ← new arrival: slides in
│  │  Full name: Maria Chen                                    │  │
│  │  Email: maria@example.com                                 │  │
│  │  Message: I'd like to schedule a consultation...          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Anonymous · 15 min ago                          [expand] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Jan de Vries · 1 hour ago                       [expand] │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

- List-first: collapsed rows, expand inline (no separate detail page)
- SSE: new submissions slide in at top, `200ms ease-out`
- Live indicator: `●` green dot, pulses every 3s using CSS animation
- Collapsed row: name + time + one-line preview of first field
- Expanded row: all fields, `--color-surface-alt` background
- No pagination in v1 — virtual scroll if > 500 rows (TBD)

**Poll results inline** (for multiple choice fields with `public_results: true`):

```
  How did you hear about us?
  ─────────────────────────
  Friend / word of mouth  ████████████████░░░░  42%  (14)
  LinkedIn                ██████████░░░░░░░░░░  27%  (9)
  Google Search           ████████░░░░░░░░░░░░  21%  (7)
  Other                   ████░░░░░░░░░░░░░░░░  10%  (3)
```

- Bars: `--color-green`, `--color-surface-alt` background
- Counts update in real-time via SSE
- Owner-only view (public results page = v2)

---

## Navigation (Owner Dashboard)

```
┌──────────────────────────────────────────────────────────────────┐
│  Formage          Forms    Account                  user@email   │
└──────────────────────────────────────────────────────────────────┘
```

- Logo: Fraunces, `--color-text`, 20px
- Nav links: Geist, `--text-sm`, `--color-text-muted` at rest, `--color-text` active
- Active indicator: `2px solid --color-green` bottom border on active link
- Mobile: hamburger collapses to drawer from left

---

## Empty States

Three types, all use Fraunces for the heading:

**No forms yet:**
```
      [icon: form outline]

      Your first form is one click away

      Create a form, share the link,
      see responses arrive live.

      [Create form]
```

**Form has no submissions:**
```
      [icon: inbox]

      No responses yet

      Share your form link to get started:
      formage.eu/f/your-slug  [Copy]
```

**No account (landing):**
Not an empty state — this is the marketing page. Different design scope.

---

## Form Status Badges

```
draft      → grey pill, "Draft"
published  → green pill, "Live"
archived   → muted pill, "Archived"
```

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font: 500 var(--text-xs) / 1 var(--font-body);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.badge--draft     { background: var(--color-surface-alt); color: var(--color-text-muted); }
.badge--published { background: var(--color-green-light); color: var(--color-green); }
.badge--archived  { background: var(--color-surface-alt); color: var(--color-text-disabled); }
```

---

## "Made with Formage" Branding (Free Tier)

Small, tasteful, bottom of hosted form page.

```
Made with Formage
```

- Geist, `--text-xs`, `--color-text-disabled`
- "Formage" links to formage.eu
- Never intrusive — no logo, no badge, no color. Pure text.
- Pro plan: remove entirely. No toggle needed — auto-hidden.

---

## Responsive Breakpoints

```css
/* Mobile first */
/* Base: 0–639px — phone */

@media (min-width: 640px) { /* sm — tablet portrait */ }
@media (min-width: 1024px) { /* lg — desktop */ }
@media (min-width: 1280px) { /* xl — wide desktop */ }
```

Builder: desktop-only in v1 (building forms on mobile = v2 problem). Show a friendly "Form builder works best on desktop" message on small screens. Hosted form pages (`/f/slug`) are fully mobile-optimized from day one.

---

## Accessibility

- All inputs: `aria-label` or `for`/`id` pair
- Error messages: `role="alert"` with `aria-live="polite"`
- Focus visible: never remove `:focus-visible` outline — the green ring is part of the design
- Color contrast: `--color-green` on `--color-surface` = 7.2:1 (AAA). `--color-text-muted` on `--color-bg` = 4.6:1 (AA large).
- SSE new submission notification: `aria-live="polite"` region so screen readers announce new arrivals

---

## Design Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Fraunces classified as "display serif" — may feel too editorial for a business tool | Test with target users (therapist, coach). If it reads as playful rather than professional, swap to Inter Display or DM Sans Bold for titles. Variable axis gives escape hatch — dial up optical size for a more restrained look. |
| Warm paper background (`#F5F2EC`) may look "designer" not "enterprise" | This IS the differentiator. Typeform and Google Forms are both cold/clinical. Don't compromise — this is the product positioning. Monitor conversion rate on landing page. |
| No onboarding wizard — blank canvas with "Add field" may confuse first-time users | Empty state shows a pre-built example form (greyed out, "here's how it works") on first visit. One-time dismissible. Not an onboarding wizard — an example. |
| Deliberate breath on destructive actions may feel like a bug | The 100ms delay is imperceptible as a delay — it just removes the "snappy" feeling. Test with users; if anyone notices, remove it. |

---

## Implementation Notes

### CSS Variables — where to define them
`src/main/resources/META-INF/resources/styles/tokens.css` — imported first, before any component styles. No CSS-in-JS. Served as static asset by Quarkus.

### Font loading
Fraunces via Google Fonts (variable font, single request). Geist + Geist Mono self-hosted from `public/fonts/` (no Google dependency for UI fonts — EU privacy posture).

```html
<!-- In <head>, preconnect for Fraunces only -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap" rel="stylesheet">

<!-- Geist: self-hosted, preload critical weights -->
<link rel="preload" href="/fonts/GeistVF.woff2" as="font" type="font/woff2" crossorigin>
```

### Dark mode
Not in v1. Token names are semantic (`--color-bg` not `--color-gray-50`) — adding dark mode later is a single override block, not a rewrite.

### Templating
Qute (Quarkus's native template engine) renders all HTML server-side. Templates live in `src/main/resources/templates/`. HTMX targets return partial HTML fragments — Qute handles both full-page and partial renders cleanly.

### Component library
No third-party component library. Hand-build form inputs, buttons, and the field card. The entire UI surface is small enough that custom components are faster and lighter than adapting any third-party library to match the design language exactly.

---

_This document is the design source of truth. Update here before touching any component. Version it alongside DESIGN.md._
