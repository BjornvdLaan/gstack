# Product Vision & Integration Plan: Native Scheduling in Privacy-First Form Builder

---

## 1. Product Vision

This product becomes the single tool that B2B teams use to capture leads, qualify prospects, and book meetings — without stitching together Typeform, Calendly, and Zapier, and without importing three separate vendor privacy policies into every customer DPA negotiation. The scheduling feature is not a bolt-on integration; it is a native block type inside the form builder, which means availability windows, booking confirmation, and cancellation all live under the same data model, the same privacy policy, and the same admin dashboard as the form responses they accompany. The product wins not by targeting privacy zealots but by being the path of least resistance for sales and ops teams at companies selling into healthcare, finance, and legal — verticals where a procurement team will reject a vendor stack the moment they see third-party pixel domains in a network trace. Being price-competitive with the Typeform + Calendly bundle (~$50–70/mo combined) while eliminating the compliance overhead is the wedge; the lock-in comes from the fact that form responses and booking data are unified in one place, making it painful to migrate either without losing the other.

---

## 2. User Stories

### US-01: Form-gated booking (core flow)
A sales rep builds a multi-step form that asks company size, industry, and use case. On the final step, instead of a "thank you" screen, the respondent sees a calendar picker. Only respondents who answered "50+ employees" see the calendar; others get a standard thank-you. The booking is created with the form response ID attached, so the CRM import contains both qualification data and the meeting time in one row.

### US-02: Standalone booking link
A customer success manager wants a direct scheduling link to paste into email signatures — no form preamble. They create a BookingPage with no attached form, configure their availability, and get a shareable URL (`/book/jane-cs`) that shows only the calendar picker. This is the direct Calendly replacement for users who do not need qualification.

### US-03: Embedded booking widget on a website
A marketing team wants to embed a booking calendar on their "Contact Sales" landing page. They get an `<iframe>` or `<script>` embed snippet (same mechanism as the existing form embed). The widget respects the site's color scheme via CSS custom properties passed as query params. No third-party scripts are injected into the host page.

### US-04: Post-submission redirect to booking
An existing form already has hundreds of responses. The team wants to add scheduling without rebuilding the form. They configure a post-submission action: "redirect to BookingPage" with URL params forwarding the respondent's email and name. The booking page pre-fills invitee details from the URL params. This is a migration path, not a first-class flow, but it must work cleanly.

### US-05: Round-robin team booking
A BDR team of three reps shares one inbound booking link. The system assigns each new booking to the rep with the fewest bookings in the current week (or round-robin by arrival order, configurable). Each rep connects their own calendar. The invitee sees one link and one availability grid that is the union of all reps' free windows.

### US-06: Booking management (invitee self-service)
After booking, the invitee receives a confirmation email with links to reschedule or cancel. Rescheduling opens the same calendar picker with the original slot pre-highlighted. Cancellation requires a reason field (optional, configurable by the host). Both actions update the Booking record and send notifications to host and invitee. No account required for the invitee.

---

## 3. Feature Scope for v1

### In scope

**Booking infrastructure**
- BookingPage entity with configurable availability windows (days of week, time ranges, per-timezone)
- Duration options: 15, 30, 45, 60 min (fixed per BookingPage, not per-slot)
- Buffer time before/after bookings (configurable, default 0)
- Maximum bookings per day cap
- Minimum notice period (e.g., "must book at least 4 hours in advance")

**Calendar integration**
- Google Calendar OAuth2 read/write (check free/busy, create events)
- Microsoft/Outlook OAuth2 read/write
- iCal feed read-only (for availability checking, no write-back)
- One calendar connection per user in v1; multi-calendar merge deferred

**Form builder integration**
- New block type: `scheduling` — renders inline calendar picker as a form step
- Conditional logic support: show/hide scheduling block based on prior answers (same mechanism as existing conditional logic)
- Post-submission action: "redirect to BookingPage" with field-mapping for name/email pre-fill

**Standalone flows**
- Shareable `/book/:slug` URL for standalone booking pages
- `<iframe>` embed snippet generator in admin UI

**Notifications**
- Confirmation email to invitee (configurable template, plain text + minimal HTML, no tracking pixels)
- Notification email to host
- Cancellation and reschedule emails triggered by invitee self-service
- ICS attachment on all confirmation emails

**Invitee self-service**
- Cancel link in confirmation email (token-authenticated, no account required)
- Reschedule link in confirmation email

**Admin dashboard**
- Booking list view per BookingPage (date, invitee name/email, status, linked form response ID if applicable)
- Manual cancel by host
- Export bookings as CSV

### Explicitly deferred (not v1)

- SMS/WhatsApp notifications
- Payments (deposit to hold slot)
- Group events / webinar-style bookings (many invitees, one slot)
- Multi-calendar merge per user (check free/busy across 2+ connected calendars simultaneously)
- Collective scheduling (all attendees must be free — "find a time" style)
- Zapier/Make/n8n webhook triggers (add in v1.1 — high demand but not blocking)
- Native video conferencing link generation (Zoom/Meet auto-create) — iCal location field works as workaround in v1
- Calendar sync back to form responses for existing integrations
- White-label custom domains for booking URLs
- Availability override (blocking out specific dates/times beyond recurring windows)
- Waitlist for fully-booked slots

---

## 4. Data Model Sketch

The following uses pseudo-schema notation. Assume the existing system has `Form`, `FormResponse`, and `User` entities.

```
User
  id
  email
  timezone (IANA tz string, e.g. "Europe/Amsterdam")

CalendarConnection
  id
  user_id                    → User
  provider                   enum: google | microsoft | ical
  provider_account_email     string
  access_token               encrypted at rest
  refresh_token              encrypted at rest
  token_expires_at           timestamp
  ical_feed_url              nullable string (for ical-only connections)
  is_active                  bool
  last_synced_at             timestamp
  created_at / updated_at

BookingPage
  id
  slug                       unique, URL-safe string
  owner_id                   → User (or Team)
  title                      string
  description                nullable string
  duration_minutes           int (15 | 30 | 45 | 60)
  buffer_before_minutes      int default 0
  buffer_after_minutes       int default 0
  min_notice_hours           int default 4
  max_bookings_per_day       nullable int
  availability_windows       JSONB array of AvailabilityWindow (see below)
  owner_timezone             IANA tz string
  calendar_connection_id     → CalendarConnection (which calendar to write to)
  routing_mode               enum: single | round_robin
  confirmation_message       nullable string
  cancellation_policy_text   nullable string
  require_cancellation_reason bool default false
  is_active                  bool default true
  form_id                    nullable → Form (if attached to a form)
  created_at / updated_at

AvailabilityWindow (embedded in BookingPage.availability_windows as JSONB)
  day_of_week                int 0–6 (0 = Sunday)
  start_time                 "HH:MM" in owner_timezone
  end_time                   "HH:MM" in owner_timezone

BookingPageMember (for round-robin team pages)
  id
  booking_page_id            → BookingPage
  user_id                    → User
  calendar_connection_id     → CalendarConnection
  booking_count_this_week    int (maintained by application, reset weekly)
  is_active                  bool

TimeSlot (computed, not stored — generated on-demand from availability + calendar free/busy)
  Represented as: { start: ISO8601, end: ISO8601, assignee_user_id }
  Do not persist; generate per-request and cache with short TTL (60s)

Booking
  id
  booking_page_id            → BookingPage
  assignee_user_id           → User (the host for this specific booking)
  form_response_id           nullable → FormResponse
  invitee_name               string
  invitee_email              string
  invitee_timezone           IANA tz string
  host_timezone              IANA tz string (snapshot at booking time)
  start_at                   timestamp (UTC)
  end_at                     timestamp (UTC)
  status                     enum: confirmed | cancelled | rescheduled
  cancel_token               string (random, used in cancel link — not the booking id)
  reschedule_token           string (random, used in reschedule link)
  cancellation_reason        nullable string
  cancelled_at               nullable timestamp
  cancelled_by               nullable enum: invitee | host
  rescheduled_from_id        nullable → Booking (self-referential, for reschedule chain)
  calendar_event_id          string (provider's event ID, for update/delete)
  calendar_provider          enum: google | microsoft
  metadata                   JSONB (arbitrary key/value, for form field pre-fills passed via URL)
  created_at / updated_at

BookingNotification (audit log — do not use for retry logic, use a job queue)
  id
  booking_id                 → Booking
  recipient_email            string
  type                       enum: confirmation | cancellation | reschedule | reminder
  sent_at                    timestamp
  status                     enum: sent | failed
  error_message              nullable string
```

**Key relationships:**
- A `Form` may have zero or one associated `BookingPage` (via `BookingPage.form_id`). This is optional — booking pages can exist standalone.
- A `FormResponse` may have zero or one associated `Booking` (via `Booking.form_response_id`). Set at booking creation time when the booking originates from a form submission.
- A `Booking` always has exactly one `assignee_user_id`, resolved at booking time (either the page owner, or the round-robin selection from `BookingPageMember`).
- `CalendarConnection` is per-user; multiple users can share a `BookingPage` through `BookingPageMember`.

---

## 5. Integration Points in the Form Builder

### 5.1 New block type: `scheduling`

Add a `scheduling` block to the existing block type registry alongside `short_text`, `multiple_choice`, etc.

**Render behavior:**
- In the form flow, when the respondent reaches a `scheduling` block, the form pauses and renders the calendar picker inline (not a redirect, not a modal — it is a native step in the form).
- The calendar picker fetches available slots from `GET /api/booking-pages/:id/slots?date=YYYY-MM-DD&timezone=:tz`.
- On slot selection, the picker renders a confirmation micro-form (name, email — pre-filled if captured in earlier form fields via field mapping config).
- On submit, the picker calls `POST /api/bookings` with `{ booking_page_id, form_response_id, ... }`. The form response ID is passed through from the form submission context.
- The form then advances to the next step (typically a thank-you screen) or the form is considered complete.

**Block configuration (in the form builder admin):**
- Select or create a `BookingPage` to attach
- Field mapping: map `invitee_name` and `invitee_email` to earlier form fields (so the picker pre-fills them)
- Optional: show picker only if condition met (uses existing conditional logic engine — no new code needed if the existing engine operates on block visibility)

**Important:** The `scheduling` block must complete before the form response is marked as submitted. If the user selects a slot and submits the booking, the form response status transitions to `submitted_with_booking`. If they skip (if the block is optional — configurable), it transitions to `submitted_without_booking`. Do not silently drop partial states.

### 5.2 Post-submission action: redirect to booking page

In the existing post-submission action configurator (wherever "redirect to URL" or "show custom message" is configured today), add a new action type: `redirect_to_booking_page`.

Config fields:
- `booking_page_id` (select from existing pages)
- Field mappings: which form fields populate `?name=` and `?email=` URL params

The redirect target is `/book/:slug?name=:encoded_name&email=:encoded_email`. The booking page reads these params and pre-fills the invitee fields.

This is intentionally a looser integration than the native block — it loses the `form_response_id` linkage unless the redirect also passes a `?response_id=:id` param, which the booking endpoint must accept and validate (check that the response belongs to the same organization, then link).

### 5.3 Standalone booking page route

New public route: `GET /book/:slug`

Renders the same calendar picker component used inside the form builder, but without a form wrapper. This route must work without the user being logged in. It must not load any third-party scripts. The only external resource it may load is a font file if the organization has configured a custom font — and even then, self-host the font file or document the privacy tradeoff explicitly.

### 5.4 Embed snippet

In the BookingPage admin view, add an "Embed" tab (same pattern as the existing form embed if one exists). Generate:

```html
<iframe 
  src="https://yourapp.com/book/:slug?embed=1"
  width="100%" 
  height="700" 
  frameborder="0">
</iframe>
```

The `?embed=1` param suppresses the page chrome (nav, footer) and enables `postMessage` events for height auto-resize. No JavaScript snippet injection into the host page — iframe only.

### 5.5 Admin dashboard additions

- New top-level nav item: "Scheduling" or merge under "Forms" as a sub-section
- BookingPage list/create/edit views
- Calendar connection settings (OAuth flows) in user Settings
- Booking list per page with filter by date range and status

---

## 6. Privacy and Compliance Requirements

These are hard requirements, not aspirational. They are what differentiate this product from Calendly in a regulated-industry procurement conversation.

### 6.1 No third-party pixels or trackers

The booking page and form pages must load zero third-party JavaScript. This means:
- No analytics (Mixpanel, Amplitude, Segment, Intercom, etc.) on the public-facing booking/form pages. Analytics can run in the authenticated admin UI only, and only with user consent and disclosure.
- No CDN-hosted JavaScript for the calendar picker or any UI component. Bundle everything.
- No remote font loading from Google Fonts or similar. Either self-host the font or use system fonts.
- Verify with a network trace test: assert that no third-party requests are made from the booking page in CI.

### 6.2 Invitation emails: no tracking pixels

Confirmation, cancellation, and reschedule emails must not contain:
- 1x1 tracking pixels
- Click-tracking redirects (do not wrap links through a tracking domain)
- Open-tracking query params

Use plain SMTP or a transactional provider that allows disabling tracking per-message (Postmark, AWS SES both support this). Configure tracking disabled at the account level and at the message level. Document this in the privacy policy.

### 6.3 Calendar OAuth token handling

OAuth tokens are credentials. Treat them as such:
- Encrypt `access_token` and `refresh_token` at rest using the same key management as other secrets in the system. Do not store them in plaintext.
- Scope OAuth permissions to the minimum required. For Google: `calendar.events` (create/read/delete own events) + `calendar.freebusy` (read free/busy). Do not request full calendar access.
- Implement token refresh proactively (before expiry), not reactively (after a 401). Failed refreshes should mark the connection inactive and notify the user.
- On user account deletion, revoke OAuth tokens via the provider API, then delete `CalendarConnection` records.

### 6.4 Data residency

Booking data (invitee names, emails, meeting times) must be stored in the same region as form response data. No cross-region replication without disclosure. If the product offers EU data residency today, the booking feature inherits it automatically.

### 6.5 Data Processing Agreement (DPA) coverage

The existing DPA with customers must explicitly list the scheduling/booking feature as a processing activity. Update the DPA template to include:
- Purpose: scheduling meetings between the customer's staff and their end users
- Categories of data processed: name, email address, timezone, meeting time
- Retention period: configurable by customer, default 12 months post-meeting date
- Sub-processors: list the transactional email provider and calendar API providers (Google, Microsoft) by name

### 6.6 Invitee data minimization

- Collect only name, email, and timezone from invitees in v1. No phone, company, or custom fields.
- Do not use invitee email addresses for any purpose other than the booking transaction. No marketing.
- Provide a data deletion endpoint: `DELETE /api/bookings/:id/invitee-data` that nulls out name and email while preserving the slot occupancy for the host's calendar management.

### 6.7 Audit log

Every state change to a Booking record (created, cancelled by invitee, cancelled by host, rescheduled) must be logged with timestamp and actor. Retain for the legal retention period. This is for GDPR audit requests, not debugging.

---

## 7. Risks and Open Questions

### 7.1 Calendar OAuth complexity (high risk)

Google and Microsoft OAuth flows are fragile in production. Token refresh failures, scope changes, and corporate admin policy revocations are all real operational pain points.

**Mitigations:**
- Build a health check UI in Settings showing calendar connection status with actionable error messages.
- Treat every calendar API call as potentially failing. Degrade gracefully: show an error to the invitee rather than showing all slots as free and double-booking the host.
- Microsoft/Outlook: corporate environments often require admin consent, not just user consent. Document the admin consent flow.
- Rate limits: cache free/busy results per user with a 60-second TTL.

**Open question:** Do we support Google Workspace service account access (admin grants for whole domain) in v1? Required for some enterprise customers but significantly more complex. Recommend deferring to v1.2.

### 7.2 Email deliverability (medium risk)

Transactional emails from a new sending domain will initially land in spam. Calendar invites (.ics attachments) are particularly likely to be filtered by corporate mail gateways.

**Mitigations:**
- Set up SPF, DKIM, and DMARC on the sending domain before launch.
- Use a dedicated sending subdomain (`mail.yourapp.com`).
- Test ICS attachments against Gmail, Outlook Web, and Outlook Desktop — these three behave differently.
- Allow customers to configure a custom reply-to address so calendar invites appear to come from their own domain.

### 7.3 Timezone edge cases (medium risk)

DST transitions, half-hour offset timezones, and the 14-hour UTC range create edge cases that are expensive to debug after bad bookings are created.

**Mitigations:**
- Store all timestamps as UTC. Convert to display timezone only at render time.
- Generate available slots server-side, not client-side. The client sends its IANA timezone string; the server returns ISO8601 UTC timestamps.
- Write unit tests for: DST transition days, availability windows that cross midnight, slots in UTC-12 and UTC+14.
- Display the host's timezone clearly on the booking page.
- Snapshot `host_timezone` on each `Booking` record so display of past bookings is stable if the host changes their timezone setting.

### 7.4 Double-booking and race conditions (high risk)

Two invitees can simultaneously see the same slot as available and both submit.

**Mitigation:**
- Add a unique partial index on `Booking(assignee_user_id, start_at)` where `status != 'cancelled'`.
- At booking creation, use a database transaction with SELECT FOR UPDATE on the assignee's bookings for the time window, then insert.
- Return a clear error to the second invitee: "This slot was just taken. Please choose another time."
- For round-robin: use a database-level atomic increment on `booking_count_this_week`.

### 7.5 Google/Microsoft OAuth app approval (medium risk, timeline risk)

To use Google Calendar OAuth in production with more than 100 test users, the app must go through Google's OAuth verification process — involves a privacy policy review and can take 4–6 weeks.

**Mitigation:** Start the Google OAuth verification process immediately, even before v1 code is complete. Do not discover this process 2 weeks before launch.

### 7.6 Open question: Form response status when booking is cancelled

If a form response is linked to a booking and the booking is cancelled, the admin dashboard currently shows these as "booked." After cancellation they should show "booking cancelled." Decision needed before building the admin dashboard view: join on the Booking table in the response list query, or add a denormalized `booking_status` column on `FormResponse`. Recommendation: denormalized column for query simplicity.

---

## 8. Suggested Build Order

### Phase 1: Core booking infrastructure (week 1–2)
Goal: standalone booking page working end-to-end with manual availability (no calendar sync).

1. Migrations: `BookingPage`, `Booking`, `BookingNotification`, stub `CalendarConnection`
2. Availability engine: generate slots from `availability_windows`, exclude already-booked. Write thorough unit tests — this is the hardest logic in the product.
3. Public booking route (`/book/:slug`): renders availability grid, accepts submission, creates `Booking`
4. Confirmation email: ICS + plain text to invitee and host. No tracking pixels. Test against Gmail and Outlook.
5. Cancel/reschedule tokens: generate, implement cancel endpoint, include cancel link in confirmation email

**End of phase 1:** A founder can send a `/book/` link to a prospect and receive a booking.

### Phase 2: Google Calendar integration (week 3–4)
Goal: real free/busy checking and calendar event creation.

1. OAuth2 flow for Google Calendar: connect in Settings, store encrypted tokens
2. Free/busy query: call Google Calendar API when generating slots
3. Calendar event creation on booking
4. Calendar event update/delete on cancel/reschedule
5. Token refresh logic + health check UI in Settings

**End of phase 2:** Real users can connect Google Calendar and have accurate availability shown.

### Phase 3: Form builder integration (week 5–6)
Goal: the `scheduling` block inside a form.

1. Register `scheduling` as a block type
2. Reuse calendar picker component from phase 1 (same API, same design)
3. Field mapping configuration (form fields → `invitee_name` / `invitee_email`)
4. Form response linkage: pass `form_response_id` to booking creation
5. Verify conditional logic engine can show/hide the `scheduling` block
6. Form response status: `submitted_with_booking` vs `submitted_without_booking`

**End of phase 3:** Users can build a qualifying form with a calendar picker as the final step.

### Phase 4: Microsoft/Outlook + polish (week 7–8)
Goal: feature-complete v1, ready for launch.

1. Microsoft OAuth2 flow and calendar integration (implement against the `CalendarConnection` abstraction)
2. Round-robin team booking: `BookingPageMember`, assignment logic, atomic booking count
3. Admin dashboard: booking list, CSV export, manual cancel by host
4. Embed snippet: `?embed=1` mode, postMessage height resize
5. Reschedule flow: token → re-render picker → update Booking + calendar event + send email
6. Privacy audit: run a network trace on the public booking page. Assert zero third-party requests.
7. DPA update: add scheduling as a listed processing activity
8. Load test: concurrent booking submissions on the same slot. Verify unique index prevents double-bookings.

**End of phase 4:** v1 ships.

### Phase 4 gate criteria (all must be true before launch)
- [ ] Booking flow works end-to-end with Google and Outlook
- [ ] Confirmation, cancel, and reschedule emails send correctly with ICS attachments
- [ ] Zero third-party requests from public booking page (verified by network trace)
- [ ] Double-booking prevented under concurrent load (load test)
- [ ] OAuth tokens encrypted at rest (verified by reading raw DB values)
- [ ] Google OAuth verification submitted
- [ ] DPA updated
- [ ] Unit tests cover DST transitions, midnight-crossing windows, concurrent booking races
