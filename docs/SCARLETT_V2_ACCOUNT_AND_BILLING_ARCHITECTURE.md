# Scarlett V2.1 — account, entitlement and payment architecture

Date: 2026-09-19
Scope: `apps/ftn-scarlett-browser-extension/account-bridge.js`, `js/ftn-scarlett-bridge.js`,
`supabase/functions/ftn-scarlett-billing/`, `supabase/functions/ftn-scarlett-wam-webhook/`,
`supabase/migrations/20260919120000_ftn_scarlett_wam_billing.sql`,
`scarlett/pricing/`, `js/scarlett-pricing.js`.

## 1. Identity: reused, not duplicated

Scarlett has no sign-in flow of its own. FTN Account (`js/ftn-auth.js`, real Supabase Auth,
magic-link or Google OAuth, `/account/` as the single callback owner) remains the one identity
system. A browser extension runs at a different origin (`chrome-extension://…`) and cannot read
`ftnplatform.org`'s session directly, so a small, standard bridge hands the session across:

```text
User signs in at /account/ (FTN Account, unchanged)
        │
        ▼
js/ftn-scarlett-bridge.js (loaded only on /account/)
   FTN.Auth.getSession() → { access_token, user, expires_at }
        │  chrome.runtime.sendMessage(SCARLETT_EXTENSION_ID, {type:'FTN_SESSION', ...})
        │  (every call wrapped; a missing extension is a silent no-op, never a page error)
        ▼
Scarlett's background service worker (externally_connectable, scoped to
   https://ftnplatform.org/* and https://www.ftnplatform.org/* only)
   account-bridge.js: chrome.runtime.onMessageExternal → verifies sender.origin again
   defensively → caches {accessToken, userId, expiresAt} in chrome.storage.local
```

**Why a pinned extension id**: `chrome.runtime.sendMessage(extensionId, …)` needs a stable target.
Manifest V3 lets an extension pin its own id via a `"key"` field (the base64 SPKI public key) —
Scarlett's manifest carries one generated for this purpose, so the bridge works identically for an
unpacked dev install and a future Web Store install. **The matching private key is not in this
repository** (sent directly to the founder this session — see the completion report) — whoever
packages Scarlett for the Chrome Web Store needs it to keep the same extension id across releases.
Losing it means a future store submission gets a *different* id and the bridge script's hardcoded
id needs updating to match.

## 2. Server truth vs. local cache (§3 of the assignment, made concrete)

`account-bridge.js`'s `resolveEntitlementState()` is the single function everything else calls
through. It is deliberately not "trust whatever is cached":

| Situation | Behavior |
|---|---|
| No session at all | `SIGNED_OUT` |
| Session token itself expired | `SIGNED_OUT` (`reason: token-expired`) — the bridge re-syncs on the next `/account/` visit |
| Fresh cache (< 15 min old) | Cache honored, no server round trip |
| Cache older than 15 min | A real fetch to `ftn-scarlett-billing`'s `status` action, Bearer-authenticated with the cached token, verified server-side against Supabase Auth |
| Fetch fails (offline) but cache is < 3 days old | Last known-good cached state is honored, `source: cache-stale-offline` |
| Fetch fails and cache is ≥ 3 days old | **Forced downgrade to `FREE`**, regardless of what the stale cache says |
| Sign out | Both the session and the entitlement cache are cleared immediately |

Live-verified (Playwright, seeding `chrome.storage.local` directly and calling the real functions
in the real service worker): every row above behaved exactly as specified, including the forced
3-day downgrade — a user cannot keep a paid tier indefinitely by disconnecting network access or
editing local storage, because `resolveEntitlementState()` always re-derives from a real,
timestamped, previously-server-verified fetch, never from an untimestamped or attacker-writable
value alone.

**Required truth states** (`SIGNED_OUT, FREE, TRIAL, SCARLETT_PLUS, FTN_INTELLIGENCE, FTN_PRO,
EXPIRED, PAYMENT_PAST_DUE, CANCELLED`): all nine are real values `stateForTier()` can produce. See
§4 below for the one honest caveat (`PAYMENT_PAST_DUE` has no live trigger yet).

## 3. Reusing FTN's real payment infrastructure — the decision record

**Audited before building anything**: FTN already has a real, integrated payment gateway —
**WAM** (`billing.wam.money` / `staging.billing.wam.money`) — wired for FTN ibis Pro
(`supabase/functions/ftn-ibis-billing/`, `ftn-ibis-wam-webhook/`, `ftn-ibis-pro/`, migration
`20260908220000_ftn_ibis_wam_billing.sql`). It is a real, production-shaped implementation: signed
HMAC payment-intent creation, a hosted checkout redirect (FTN never touches card data), a
signature+timestamp-verified webhook with an idempotency ledger, and amount/currency validated
server-side before any entitlement is written. `tests/ibis-wam-billing-audit.mjs` already holds it
to a real security bar.

**Decision**: `BUILD NOW`, reusing WAM rather than evaluating Stripe/PayPal/WiPay/PayWise from
scratch. Reasoning against the assignment's own evaluation criteria:

| Criterion | WAM (already integrated) |
|---|---|
| Trinidad & Tobago / Caribbean availability | Already live for a Caribbean-facing FTN product |
| USD/TTD | ibis Pro already prices in TTD; Scarlett's plans are configured in USD — WAM's payment-intent payload takes an explicit `currency`, so both work |
| Subscription/recurring billing | **Does not exist yet** — WAM here is a prepaid, fixed-period intent (pay once, get N days), not auto-recurring. See the honest caveat in §4 |
| Webhooks | Real, signed, already proven in production code |
| PCI burden | None on FTN — WAM's hosted checkout owns card entry entirely |
| Vendor lock-in | Already the case for ibis Pro; adding Scarlett doesn't introduce a *new* dependency |
| Execution cost | Near-zero marginal cost: same credentials, same signing scheme, new tables/functions only |

Evaluating a second processor from zero would mean FTN running two vendor integrations for
materially the same problem — the opposite of "avoid duplicate infrastructure." If WAM turns out to
be wrong for Scarlett specifically (e.g., a future need for true recurring billing WAM can't do),
that's a reason to revisit later with real evidence, not a reason to duplicate work now.

**What was NOT done, and why**: no WAM merchant account was created, no credentials were entered,
no real or test charge was created. `WAM_BUSINESS_ID`/`WAM_API_KEY` are read from environment
variables Scarlett's billing function shares the *pattern* for but does not itself possess — this
session has no access to Supabase project secrets. Creating a payment-processor account is
"entering financial credentials / creating accounts," which is outside what this session does
under any circumstance, matching this exact document's own §4 instruction not to connect a live
processor without founder-level access.

## 4. What's real vs. what's the honest gap

**Real, live-verified this session**: the entitlement resolution engine end to end (cache/TTL/
offline/downgrade logic above); the account-bridge's cross-origin message *handler* logic (origin
allow-list, session set/clear); the pinned extension id matching across all three places it's
referenced (manifest `key`, `js/ftn-scarlett-bridge.js`, `ftn-scarlett-billing`'s extension-origin
allowance).

**Not live-verified, and why**: the actual cross-origin `chrome.runtime.sendMessage` handshake from
a real `https://ftnplatform.org/account/` page was not exercised end-to-end this session — doing so
would require either running against the live production site (inappropriate for a test that
writes messages) or the `js/ftn-scarlett-bridge.js` fix already being deployed there (it's
committed source, not live yet, pending FTN's normal deploy pipeline for this repo). The mechanism
itself (`externally_connectable` + `onMessageExternal`) is standard, well-documented Chrome
platform behavior, correctly configured per Chrome's own contract — not a novel or unproven
technique — but "correctly configured" and "observed working against the real site" are different
claims, and only the first one is made here.

**`ftn-scarlett-billing`/`ftn-scarlett-wam-webhook` are not deployed.** They're committed,
`deno check`-clean, and regression-tested against the same static security invariants
`ibis-wam-billing-audit.mjs` holds the ibis functions to (`tests/scarlett-wam-billing-audit.mjs`).
Whether Supabase functions in this repo auto-deploy on merge or require a manual
`supabase functions deploy` was not established this session (no deploy step found in any GitHub
Actions workflow) — this is an open question for whoever owns deployment, not something this
session could resolve without deploy credentials.

**`PAYMENT_PAST_DUE` has no live trigger.** WAM as integrated is pay-per-period, not a recurring
subscription with card-on-file retries, so there is no WAM webhook event that represents a failed
recurring charge. The status value exists in the schema and in `stateForTier()` for forward
compatibility; reaching it today would require direct admin action, not anything the webhook does.
`CANCELLED` has the same honest limitation — there's no auto-renewal to cancel yet, only a
period that expires and can be renewed by starting a new checkout.

## 5. Founder action required to actually take a payment

1. Confirm WAM is the intended processor for Scarlett too (or direct otherwise).
2. Create/confirm the WAM merchant business id and API key (same credentials `ftn-ibis-billing`
   already uses, or a separate WAM sub-account if FTN wants Scarlett's payment volume tracked
   separately at WAM's end — either works with this code unchanged).
3. Set `WAM_SCARLETT_WEBHOOK_SECRET` in the Supabase project's function secrets (deliberately
   separate from ibis's own `WAM_WEBHOOK_SECRET`) and register `ftn-scarlett-wam-webhook`'s URL in
   WAM's dashboard as a webhook destination.
4. Deploy `ftn-scarlett-billing` and `ftn-scarlett-wam-webhook`, and apply migration
   `20260919120000_ftn_scarlett_wam_billing.sql`.
5. Flip `active` to `true` for whichever of the three plans (`scarlett-plus-monthly`,
   `ftn-intelligence-monthly`, `ftn-pro-monthly`) should go live, once the founder confirms real
   pricing (the current prices are the same hypotheses `entitlements.js` already documents as
   `status: 'PLANNED'`).
6. Deploy `js/ftn-scarlett-bridge.js` (already wired into `account/index.html`) so real sessions
   start reaching the extension.

Until all six happen, `ftn-scarlett-billing`'s own `WAM_NOT_CONFIGURED` check makes checkout fail
safely and honestly ("WAM checkout is awaiting merchant connection; no charge was created") rather
than silently pretending to work — the same pattern `ftn-ibis-billing` already uses today.
