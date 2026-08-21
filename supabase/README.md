# FTN Platform — Supabase Backend Source

This directory is the Git-owned source of truth for FTN Platform Supabase Edge Functions used by the public website.

## Project

Supabase project ID: `jshmidfpqrajxtukzges`

The repository stores **source code and public configuration contracts only**. Provider secrets, OAuth credentials, service-role keys and Cloudflare Turnstile secrets belong in the Supabase project secret store and must never be committed here.

## Edge Functions

| Function | Public purpose | JWT | Browser access boundary |
|---|---|---:|---|
| `dj-tube-discovery` | Shared media discovery for FTN Radio, DJ, Screen, TV, Face The Nation, Kaiso and ibis | off | FTN origin allowlist + Supabase publishable key + bounded input |
| `ftn-live-sources` | Official/source-backed FTN Live feeds, currently NOAA GOES-19 Caribbean imagery | off | FTN origin allowlist + publishable key + bounded upstream timeout |
| `ftn-opportunities` | Current official Caribbean opportunity indexing | off | FTN origin allowlist + publishable key |
| `ftn-news-sources` | Kaiso institutional-source radar | off | FTN origin allowlist + publishable key |
| `ftn-transactions` | Consequential FTN transaction escrow and optional founder-review Gmail draft creation | off | production FTN origin + Cloudflare Turnstile + server-side service role |
| `ftn-fire-generate` | Private, authenticated FTN Fire instrumental jobs | on | user JWT + dual server-side generation switches + atomic credits + private output storage |
| `ibis-assistant` | Sitewide persistent ibis widget chat (js/ibis-widget.js), Anthropic-backed | off | FTN origin allowlist + Supabase publishable key + per-IP rate limit; guest-accessible by design so the widget works before sign-in |
| `ibis-text-cloudflare` | The widget's second TEXT route (Cloudflare Workers AI, `@cf/meta/llama-3.1-8b-instruct`) -- real first-provider-redundancy target, see IBIS-MAP.md Phase 3 | off | FTN origin allowlist + Supabase publishable key + per-IP rate limit; fails closed (503) until `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` are set |
| `ibis-image-cloudflare` | ibis Creative Studio's IMAGE_GENERATION route (Cloudflare Workers AI, `@cf/black-forest-labs/flux-1-schnell` primary + `@cf/bytedance/stable-diffusion-xl-lightning` fallback, selected via a fixed allowlist keyed by registry provider id) -- Phase 3B follow-through, see IBIS-MAP.md §0.8/0.9 | off | FTN origin allowlist + Supabase publishable key + per-IP rate limit; fails closed (503) until `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` are set |

`verify_jwt=false` is deliberate for these public-web endpoints. It does **not** mean unrestricted access: each function implements its own origin, client-key, input, workload and/or human-verification boundary appropriate to its purpose.

## Deployment rule

1. Change the function in Git first.
2. Review it through the normal FTN branch/PR process.
3. Deploy the exact reviewed source to Supabase.
4. Verify Supabase reports the function ACTIVE.
5. Run the FTN release gate and inspect Edge Function logs.
6. Record any required secret/config change separately; never paste secrets into GitHub issues or source.

If emergency production repair requires deploying before Git is updated, reconcile the exact deployed source back into this directory immediately afterward. A working backend that exists only in a vendor console is not an FTN-owned, reproducible asset.

## Secrets / environment contract

Supabase-provided runtime values:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEYS`

FTN/provider values used when configured:
- `YOUTUBE_DATA_API_KEY` — optional; media discovery has a bounded public-search fallback.
- `TURNSTILE_SECRET_KEY` — required before consequential web transactions can activate.
- `GMAIL_CLIENT_ID` — future/optional founder-review draft integration.
- `GMAIL_CLIENT_SECRET` — future/optional founder-review draft integration.
- `GMAIL_REFRESH_TOKEN` — future/optional founder-review draft integration; authorize only the FTN mailbox intended to own draft escrow.
- `FTN_REVIEW_CC` — optional non-secret review-copy address; defaults in code to `facethenationtt@gmail.com`.
- `FTN_FIRE_INFERENCE_URL` / `FTN_FIRE_INFERENCE_TOKEN` — FTN-owned private Fire gateway only; never expose a Hugging Face token to a browser.
- `FTN_FIRE_OUTPUT_ALLOWED_HOSTS` — exact comma-separated hosts the gateway may return as completion output URLs.
- `FTN_CREATIVE_GENERATION_ENABLED` and `FTN_FIRE_GENERATION_ENABLED` — both must be exactly `true` before Fire can reserve credits or call its gateway. Keep disabled until the Fire runbook is complete.
- `ANTHROPIC_API_KEY` — required before the sitewide ibis widget (`ibis-assistant`) can answer; until set, the function returns a 503 and the widget shows its normal graceful-error state. `ANTHROPIC_MODEL` — optional override (defaults to `claude-sonnet-4-6`); see the note in `docs/deferred-content.md` about confirming this is a real, currently-available model id before relying on the default.
- `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` — required before `ibis-text-cloudflare` (the widget's second TEXT route, `js/ibis-provider-registry.js` id `cloudflare-workers-ai-text`) can answer; until set, fails 503. Once both are set, also flip that registry entry's `enabled` to `true` and `apiStatus` to `'LIVE'` -- the eligibility engine won't select it while `apiStatus` still starts with `PENDING_`, even with valid secrets. The same two secrets, once set, also unlock `ibis-image-cloudflare` -- flip `cloudflare-workers-ai-image-flux` and/or `cloudflare-workers-ai-image-sdxl` (`js/ibis-provider-registry.js`) to `enabled:true` / `apiStatus:'LIVE'` independently; either, both, or neither can be live at once, and `js/ibis-creative-studio.js`'s "Generate real image" action only appears once at least one is.

For Gmail draft escrow, the OAuth grant should use the narrowest practical scope: `https://www.googleapis.com/auth/gmail.compose`. The function creates a **draft only**; it never calls the Gmail send endpoint.

## POE / transaction invariant

A consequential FTN form must not silently perform an external registration, submission, publication, payment or email send.

The transaction path is:

`validated metadata → human verification → durable FTN transaction ID → founder-review record → optional founder-review Gmail draft → explicit human decision`

The creator/rightsholder remains responsible for ownership, permissions, registrations, contracts and final external submission decisions.
