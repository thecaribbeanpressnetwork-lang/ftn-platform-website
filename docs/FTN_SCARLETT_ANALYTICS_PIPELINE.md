# Scarlett founder analytics pipeline

Date: 2026-09-19
Scope: `supabase/migrations/20260919140000_ftn_scarlett_analytics.sql`,
`supabase/functions/ftn-scarlett-telemetry/`, `supabase/functions/ftn-owner-control/index.ts`
(`scarlett-analytics` action), `supabase/functions/ftn-scarlett-billing/index.ts` and
`ftn-scarlett-wam-webhook/index.ts` (essential event emission), `apps/ftn-scarlett-browser-extension/analytics.js`,
`god-mode/scarlett/`, `js/scarlett-analytics-dashboard.js`, `legal/privacy-policy/index.html#scarlett`.

## 1. Core principle

Scarlett's whole pitch is that it protects users from being tracked. This pipeline analyzes
**product usage**, never **browsing content**: it can tell the founder whether people install
Scarlett, activate it, which modes they use, whether Data Faucet drives retention, whether
Transform drives conversion, which acquisition channel performs, where onboarding fails, which
version/browser produces errors, how many users convert to paid, and what retention/churn look
like. It cannot and does not answer which exact websites a given person visited, what page text
they read, what they typed into a form, what emails they opened, what a Google Doc said, or what
search query an identified person typed. Every layer below (schema, ingestion, extension client)
enforces that boundary independently, not just by policy.

## 2. Why Supabase, not a new vendor

FTN already runs its own Supabase project, with an established pattern for exactly this shape of
problem: `ftn_ibis_mcp_usage_events` (aggregate adoption evidence, server-only RLS, a small
allow-listed ingestion function `ftn-ibis-mcp-usage`) and `ftn-owner-control`'s "dashboard" action
(which already aggregates that table for the founder). This pipeline is the same pattern applied to
Scarlett's own event vocabulary -- no Mixpanel/Amplitude/PostHog dependency, no new vendor, no data
leaving FTN's own infrastructure.

## 3. Event schema

One canonical event, `public.ftn_scarlett_analytics_events` (append-only):

| Field | Notes |
|---|---|
| `event_id` | Client-generated UUID, unique -- makes a replayed submission an idempotent no-op |
| `event_name` | Closed allow-list, see §4 |
| `event_version` | Currently always `1` |
| `occurred_at` | **Server-derived only** (`default now()`); a client-supplied timestamp is never read |
| `anonymous_install_id` / `anonymous_session_id` | See §6 |
| `account_state` / `subscription_tier` | Self-reported by the client, dashboard-dimension use only -- see §3.1 |
| `scarlett_version`, `browser_family`, `browser_version_bucket`, `platform_family` | Coarse client environment |
| `country_or_region_coarse` | Locale-derived, see §7 |
| `acquisition_source`, `campaign_id` | See §8 |
| `feature`, `mode`, `result` | Short, closed/bounded strings |
| `duration_bucket`, `performance_bucket` | One of six fixed buckets, see §9 |
| `error_class`, `error_code` | Closed class + a short machine code, never a stack trace |
| `experiment_id`, `experiment_variant` | Schema-ready; always null -- no experimentation is implemented in this build |
| `metadata` | A strictly allow-listed `jsonb` object, see §3.2 |

### 3.1 Self-reported dimension data vs. server truth

`account_state`/`subscription_tier` on an event row are exactly what the client believed at the
moment it fired -- **never** re-verified against the entitlements table before being written. A
compromised or buggy client could send a wrong value here, but that can only skew a usage-breakdown
chart; it grants nothing. The founder dashboard's paid-user counts, MRR and conversion figures come
from `ftn_scarlett_entitlements`/`ftn_scarlett_payment_orders` (written only by the WAM-webhook-verified
billing path), never from this column. This distinction is documented in both
`ftn-scarlett-telemetry/index.ts` and `ftn-owner-control/index.ts`.

### 3.2 Metadata is allow-listed, not blocklisted

`metadata` is not "anything except a few banned keys" -- it is **exactly five keys**, each with its
own value validator, and nothing else survives ingestion no matter what a call site sends:

| Key | Allowed values |
|---|---|
| `pageType` | `APP` \| `LISTING` \| `FORM_SERVICE` \| `ARTICLE` \| `GENERIC` (page-understanding.js's own closed classification) |
| `blendLevel` | integer 0-100 |
| `resultCount` | integer 0-1000 |
| `trackerCategory` | `analytics` \| `advertising` \| `social` \| `essential` \| `unknown` |
| `capability` | a short dotted capability id, e.g. `scarlett.transform` |
| `searchIntent` | `SHOPPING` \| `OPPORTUNITY` \| `LOCATION` \| `CURRENT_EVENTS` \| `RESEARCH` \| `GENERAL` (ibis-search-client.js's local keyword classification, never the query text itself) |

Even an allowed key's string value is still checked (`looksLikeContent()`): longer than 60
characters, or containing `http(s)://`, `<tag`, `&lt;` or `javascript:`, and it is dropped anyway.
This is defense in depth -- the allow-list alone already makes a raw-content backdoor structurally
impossible, since no other key can ever reach storage.

## 4. Allowed events

Enforced identically in three places -- the migration's `check` constraint, the ingestion
function's `ALLOWED_EVENT_NAMES`, and the extension's `analytics.js`'s `ALLOWED_EVENTS`
(`tests/scarlett-analytics-audit.mjs` asserts all three never drift apart):

```
install · extension_updated
onboarding_started · onboarding_completed
session_started
mode_used · assist_used · adapt_used · transform_used · compare_used · blend_used
data_faucet_opened · shield_enabled · shield_disabled · site_break_recovery_used
search_used · find_used
ibis_handoff · headspace_handoff
paywall_seen · premium_preview_used · checkout_started · checkout_completed · checkout_failed
subscription_started · subscription_renewed · subscription_cancelled · subscription_expired · subscription_past_due
error · performance_sample
```

**What's real vs. schema-ready, honestly**: 26 of these 30 are actually emitted by real code this
pass. Four are schema-ready but not yet reachable, and this is disclosed rather than hidden:

- `onboarding_started`/`onboarding_completed` -- Scarlett has no dedicated onboarding flow yet (out
  of scope for this pass: building one would be a product feature, not an analytics change).
- `paywall_seen` -- Transform currently runs in full for free in this build (see
  `entitlements.js`), so there is no real blocking-paywall moment yet; `premium_preview_used` is
  what actually fires today (a non-blocking "this previews what Scarlett+ includes" note).
- `site_break_recovery_used` -- Scarlett has an Original button that always restores the page, but
  there is no dedicated "this broke, fix it" affordance distinct from ordinary use of that button;
  inferring "recovery intent" from an Original click would be a guess, not a real signal.

`subscription_cancelled`/`subscription_expired`/`subscription_past_due` are similarly schema-ready
but structurally unreachable today: the WAM webhook only ever writes `status: 'ACTIVE'` on a
successful payment (see the webhook's own top-of-file comment) -- there is no cancellation flow or
expiry-sweep job yet. `TRIAL`/`PAST_DUE`/`CANCELLED` entitlement rows are schema-supported but never
written by any code path today, exactly like `ftn_scarlett_wam_billing.sql`'s own PAST_DUE
disclosure.

## 5. Essential vs. optional events

- **Optional product analytics** (feature usage, mode adoption, retention signals): emitted by
  `analytics.js` from the extension, gated entirely by the user's analytics preference (§10).
- **Essential operational events** (checkout started/completed/failed, subscription
  started/renewed): emitted **server-side**, directly by `ftn-scarlett-billing` and
  `ftn-scarlett-wam-webhook`, using the same service-role client that just verified the real
  outcome -- never trusted from a client report, and not gated by the analytics preference (the
  same way any product must record that a payment happened in order to grant what was paid for).
  These writes are best-effort and never block or fail the billing operation itself.

## 6. Identifier model

- **Anonymous install id**: a random UUID, generated once by `analytics.js` and stored in
  `chrome.storage.local`. Not derived from hardware/device identity. Used for activation,
  retention, session continuity and feature-adoption dimensions.
- **Anonymous session id**: rotates after 30 minutes of inactivity (a standard analytics session
  boundary), computed as a side effect of an event that was going to fire anyway -- there is no
  background polling "to prove the extension is alive."
- **Account identity**: only ever associated for subscription/entitlement/account-setting purposes,
  through the existing account-bridge (`apps/ftn-scarlett-browser-extension/account-bridge.js`), and
  never automatically joined to the anonymous product-event stream above.
- **Anonymous -> paid conversion** (§8): the one deliberate, narrow, one-way exception, documented
  separately below -- it links a channel touch to a payment order id, never to a durable identity.

## 7. Coarse geography

`country_or_region_coarse` is derived from the request's own `Accept-Language` header's regional
subtag (`en-TT` -> `TT`). **No IP address is read, logged, hashed or stored anywhere in this
pipeline.** This is a real but honestly limited signal: it reflects the visitor's browser/OS locale
setting, not their actual location (a Trinidad-based user with an `en-US` browser locale shows as
`US`). Acceptable for aggregate regional-adoption trends; never presented as a precise location
claim.

## 8. Acquisition attribution

`public.ftn_scarlett_acquisition_attribution` links a channel touch to a conversion, one row per
meaningful touch+conversion, keyed flexibly by `anonymous_install_id` and/or `order_id` -- never by
`user_id` or email. Two real capture points exist today:

1. **Marketing-page UTM/referrer capture**: `/scarlett/` and `/scarlett/pricing/` read
   `utm_source`/`utm_medium`/`utm_campaign`/`utm_content` from the URL and `document.referrer`'s
   hostname (mapped to a closed `referrer_category`, never the full referrer URL) into
   `sessionStorage`, first-touch-wins.
2. **Checkout-time attribution**: when `ftn-scarlett-billing`'s `checkout` action creates a real
   order, it records that touch (source/medium/campaign/referrer category, plus
   `anonymous_install_id` when the click originated from the extension's popup) against the new
   `order_id`. The WAM webhook sets `converted_at`/`converted_tier` on that same row, once, only
   when `converted_at` is still null -- one-way, never overwritten by a later renewal.

**Honest gap**: there is no reliable install-referrer API for an unpacked, not-yet-Chrome-Web-Store
extension (unlike, say, Android's Play Install Referrer API) -- Chrome does not pass any
install-time referrer information into an extension's own JS context, for unpacked or published
extensions alike. This means `acquisition_source` on the extension's own product-usage event stream
(installs, mode usage, etc.) is honestly `unknown` for now; only the checkout/conversion side of
attribution above is real and working today. This is disclosed, not hidden, in
`ftn-owner-control`'s dashboard response and the founder dashboard UI.

## 9. Performance & duration buckets

Six fixed buckets only, never a raw millisecond value: `<50ms · 50-100ms · 100-250ms · 250-500ms ·
500ms-1s · >1s`. `analytics.js` exposes `durationMs`/`performanceMs` convenience props that get
bucketed client-side before ever being queued.

## 10. Extension integration & the analytics preference

`analytics.js` always keeps a **local transparency log** (`scarlettAnalyticsLog`, visible from
Scarlett's popup -> "View local usage log") regardless of the preference, so a user can see exactly
what Scarlett has recorded on their device. Separately, when "Help improve Scarlett with anonymous
product analytics" (default **on**, switchable at any time in the popup) is on, the same sanitized
event is also enqueued into `scarlettTelemetryQueue`. Only `background.js`'s `chrome.alarms` tick
(every 2 minutes) ever flushes that queue over the network, in batches of up to 25 -- content
scripts and the popup only ever enqueue, so a network send happens from exactly one place, on a
bounded schedule, never continuously and never per-content-script.

## 11. Ingestion function

`supabase/functions/ftn-scarlett-telemetry/` (`POST /functions/v1/ftn-scarlett-telemetry`):
validates event name against the allow-list, validates every field's shape/enum, allow-lists
metadata keys (§3.2), rejects a batch over 25 events or a body over 40KB, rate-limits at 120
events/5min per anonymous install id, derives `occurred_at` server-side only, and upserts on the
`event_id` unique index with `ignoreDuplicates: true` so a replayed submission is acknowledged as a
no-op rather than erroring or double-counting. Callers: Scarlett's pinned extension origin
(`chrome-extension://clfkbacenkaicfpgchbmmolfbnanngfe`) and `ftnplatform.org` (forward-compatible,
unused by any page this pass). The extension never receives a service-role credential; only this
function's own server-side client writes to the table.

## 12. RLS / authorization

Both tables: `enable row level security`, `revoke all ... from anon, authenticated`, and an explicit
`using (false) with check (false)` deny-all policy -- identical to `ftn_ibis_mcp_usage_events`'s
own pattern. There is no read path for an ordinary signed-in user at all, paid or free. The only
reader is `ftn-owner-control`'s new `scarlett-analytics` action, reached only after the exact same
founder-identity + operator-role + founder-device-credential chain every other owner-control action
already enforces (Google-identity-bound `ftn_founder_identities`, `ftn_operator_roles.role='owner'`,
a per-device credential issued through the existing enroll/claim-device flow). This action is
strictly read-only.

## 13. Founder dashboard

Route: `https://ftnplatform.org/god-mode/scarlett/` (a `noindex,nofollow` private page, matching
every other `/god-mode/*` page; `robots.txt`'s existing `Disallow: /god-mode/` already covers it).
Linked from the main God Mode console via a small nav-injector script
(`js/god-mode-scarlett-link.js`), mirroring the exact same pattern `js/god-mode-index-link.js`
already uses for FTN Index -- this repo's established way to add a founder feature without editing
the large central `js/god-mode.js` state machine. `js/scarlett-analytics-dashboard.js` calls
`FTN.Auth.ownerAccess()` then `FTN.Auth.ownerInvoke({action:'scarlett-analytics'})` -- the exact
same client helpers `js/god-mode.js` and `js/ftn-index-ops.js` already use, so device enrollment/
approval UX is identical to the rest of God Mode, not a second implementation.

Available: installs, activated installs, DAU/WAU/MAU, D1/D7/D30 retention (methodology below),
free/trial/paid counts, MRR (`Not live yet` when no plan is active -- never fabricated), install
approx paid conversion (with its matched-cohort caveat spelled out), cancellations/expired event
counts, mode/feature usage, Data Faucet/Shield adoption, ibis/Headspace handoff counts, the four
funnels (§14), error rate + per-class breakdown, performance-by-feature, and dimension breakdowns
by day/version/browser/platform/self-reported-tier/acquisition-source/campaign/region.

## 14. Funnels

- **Activation**: install -> onboarding started -> onboarding completed -> first mode used -> second
  session (onboarding steps show 0 with an explicit note -- see §4).
- **Privacy**: Data Faucet opened -> Shield enabled -> Shield retained (enabled minus disabled).
- **Premium**: premium feature encountered (`premium_preview_used`) -> paywall seen -> checkout
  started -> subscription activated.
- **Intelligence**: search -> find -> ibis handoff -> Headspace handoff.

## 15. Retention methodology

Computed in `ftn-owner-control`'s `scarlett-analytics` action, from up to 90 days / 20,000 raw event
rows (the same "aggregate on read from raw rows" approach `ftn_ibis_mcp_usage_events` already
uses) -- documented explicitly, and returned verbatim in the dashboard response's `methodology`
field so the number is never presented without its definition next to it:

- **Timezone basis**: UTC calendar days, not user-local time.
- **Cohort**: an install's cohort day is the UTC calendar day of its first `install` event.
- **Activation**: an install is "activated" once it fires any of
  `mode_used/assist_used/adapt_used/transform_used/compare_used/blend_used/search_used/find_used/data_faucet_opened`.
- **Return**: an install "returns" on `cohort_day + N` if it fired **any** event (not only
  `install`) on that exact UTC day.
- **Denominator**: D1/D7/D30 exclude installs too recent for that offset to have elapsed yet -- a
  3-day-old install is excluded from D7/D30, never counted as "did not return." This is the
  "do not use a misleading denominator" requirement, made concrete.

**Trial -> paid conversion is honestly "not measurable yet"**: `ftn_scarlett_entitlements` stores
current state per `(user_id, plan_id)` (a real `unique` constraint) -- a trial-to-paid transition
would overwrite that same row in place rather than preserving both states, so there is no history to
reconstruct a conversion rate from. The dashboard says so explicitly rather than fabricating a
number; a dedicated entitlement-transition log would be needed to compute this precisely, and isn't
built this pass. `installToPaidApprox` (paid users ÷ total installs) is offered instead, clearly
labeled as an approximation, not a matched cohort (anonymous install identity and FTN account
identity are deliberately not joined).

## 16. Data retention

- Raw product events (`ftn_scarlett_analytics_events`): **90 days**.
- Acquisition attribution (`ftn_scarlett_acquisition_attribution`): **24 months** (low-volume,
  conversion-only rows -- useful for channel-performance trends over a longer horizon).
- Billing/legal records (`ftn_scarlett_payment_orders`/`ftn_scarlett_entitlements`/`ftn_scarlett_payment_events`):
  retained separately, per accounting/legal requirement, not this policy.

**No scheduled cleanup job is created by this migration.** No `pg_cron` usage exists anywhere else
in this repo's migrations to extend, and scheduling one against the live project needs access this
session does not have -- the exact same disclosed gap `20260916120000_ibis_execution_receipts.sql`
already documents for its own retention. The starting-point SQL is left as a comment in the
migration for whoever owns deployment to schedule once `pg_cron` is confirmed available on the live
project.

## 17. Deletion / user control

- **Analytics preference off**: stops all optional product-analytics events immediately (essential
  operational events, §5, continue).
- **"Clear local log"** (popup): clears both the local transparency log and the pending network
  queue (`analytics.js`'s `clearLog()`). It does not reset the anonymous install id itself -- that
  represents "this browser install," not the visible log, and resetting it silently would make
  retention/DAU numbers meaningless without the user asking for that specifically. Not built this
  pass: a separate, explicit "reset my install identity" control, since no user request for it
  exists yet.
- **FTN Account deletion / subscription cancellation**: handled entirely by FTN Account's existing
  deletion path and WAM's own processes respectively -- this pipeline never durably links an
  anonymous install to an FTN Account identity in the first place (§6), so there is no
  identifiable product-telemetry linkage left to clean up as a side effect of either.

## 18. What was verified this session

- `deno check` clean on `ftn-scarlett-telemetry`, `ftn-scarlett-billing`, `ftn-scarlett-wam-webhook`,
  and on the new `scarlett-analytics` action inside `ftn-owner-control` (verified via a temp copy
  with the one pre-existing, unrelated `userPage.data?.total` type error patched around -- that
  error predates this pass and is outside Scarlett's scope).
- `tests/scarlett-analytics-audit.mjs`: cross-layer event-name consistency (migration / ingestion
  function / extension client), RLS/deny-all policy on both tables, replay/rate-limit/oversize/
  metadata-allowlist hardening, founder-dashboard authorization reuse (structural: the action is
  only reachable after the same device-auth chain, and is read-only), essential-vs-optional event
  separation, and public privacy-policy disclosure accuracy.
- `tests/scarlett-audit.mjs` and `tests/scarlett-wam-billing-audit.mjs` re-verified green after the
  analytics rewrite (several assertions there had gone stale against the old local-only
  implementation and were updated to match the new real behavior, not weakened).

**Not live-verified this session** (no live Supabase project access): the migration has not been
applied, the three Edge Functions are not deployed, and no real HTTP round trip against the
ingestion function or the founder dashboard action has been made. This mirrors exactly the same
honest gap already disclosed for Scarlett's WAM billing migration in
`docs/SCARLETT_V2_ACCOUNT_AND_BILLING_ARCHITECTURE.md`.
