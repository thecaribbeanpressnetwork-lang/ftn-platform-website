## ibis persistent assistant widget — deployment and open items (added later on 2026-08-19)

- **Needs manual Supabase deployment before it will work live.** Per `supabase/README.md`'s own
  documented deployment rule, nothing in `supabase/functions/` auto-deploys from Git — a human
  must deploy `ibis-assistant` via the Supabase CLI/dashboard and set the `ANTHROPIC_API_KEY`
  secret (optionally `ANTHROPIC_MODEL`). Until then the function returns 503 and the widget shows
  its normal graceful-error bubble — this is the same fail-closed pattern every other paid/AI
  function in this repo already uses (see `FTN_CREATIVE_GENERATION_ENABLED`,
  `FTN_FIRE_GENERATION_ENABLED`), not a bug.
- **Model id needs confirming.** The founder brief specified `claude-sonnet-4-6` as the model.
  I don't have a way to verify that id is currently valid on the Anthropic API from here — it's
  wired as an env-overridable default (`ANTHROPIC_MODEL`) specifically so it can be corrected
  without a code change if it turns out to be wrong.
- **Not gated behind Community-Connect-style auth**, unlike the existing `ibis-query` function —
  deliberate, since the ask was for the widget to be usable on every page without friction. It is
  rate-limited per IP (24 requests / 5 minutes, matching `ibis-query`'s existing limit) as the
  narrow abuse safeguard instead.
- **`riddim/fire/`, `riddim/dj/`, `riddim/daw/`** were the only real, current pages missing
  `nav.js` (and therefore the widget) entirely — added it there. Left `dj-tube-prototype/`
  untouched: it's embedded via `<iframe>` inside `/riddim/dj/`, not browsed directly, so a second
  floating widget inside the iframe would just duplicate the parent page's own. Also left
  `god-mode/`, `mission-control/`, `mission-control/demo/` untouched (explicitly out of scope),
  and `offline/` untouched (PWA offline fallback — a live AI widget needs the network it doesn't
  have). `news/index.html` is a real public page missing `nav.js` too, but that looks like a
  pre-existing, unrelated gap rather than something introduced by this pass — flagging rather than
  fixing it here to stay scoped to what was asked.

## ibis colour — one real discrepancy found, not yet fixed

`assets/panels/05-ibis-ai.png` is fully purple, no issue. `assets/home/ftn-approved-caribbean-
ecosystem.png` (the homepage hero) shows a warm pink/salmon tint on the ibis's beak and legs,
distinct from the purple body/wings — a real, visible departure from "purple only." Not edited:
this exact file was hash-verified as founder-approved on 2026-08-19 itself (see
`RELEASE_NOTES_FTN_SURFACE_REPAIR_2026-08-19.md`), and a precise pixel-level recolor of only the
beak/leg region isn't something I can do reliably without an actual image-editing tool to preview
against — a blunt scripted hue-shift risks damaging an already-approved, locked brand asset for
the sake of fixing a small region of it. Needs either a real design tool or explicit founder
sign-off on the specific replacement colour before touching the pixels.

# Deferred content and scope notes — 2026-08-19 surface repair

Record of what this repair pass did and, per CLAUDE.md's own conventions, what it
deliberately left alone rather than silently invented or expanded. Written for the
"shared shell, Directory fallback, Riddim and Opportunities content, ecosystem CTA" fix.

## Header systems: two exist; only `.site-header` was unified

The repo has two separate header/footer component families:

- `.site-header` / `.site-nav` / `.site-footer` — the main content/product pages (home,
  about, riddim, opportunities, community-connect, events, kaiso, radio, screen,
  ibis-ai, observatory, facethenation, contact, insights, resources, about,
  accessibility, display-network, top-picks, tv, scenario-workspace, dj-tube).
  This is the family FIX 1/FIX 6 targeted: nav links (already normalized by `nav.js`),
  Sign In routing (now `/account/` everywhere, both raw HTML and JS), header color
  (now black on desktop and mobile sitewide), and footer (now a canonical
  Platform / Company / Legal structure with social icons normalized in everywhere).
- `.nexus-header` / `.nexus-nav` / `.nexus-footer` — a separate, intentionally distinct
  light-themed "Nexus" utility template (its own `nexus-page.css`) used by 11
  institutional/utility pages: Trust, Sitemap, Parliament, Now, Love, Invest, Health,
  Govern, Glossary, Applications (FTN Directory), Account. This is a different design
  system built for a different purpose (it also hosts the private God Mode command
  console), not a second copy of the same header that drifted. Sign In routing was
  fixed here too (nav.js's normalizer runs on both families), but the header was **not**
  restyled to black — doing so would have meant a partial re-theme of a page family
  whose whole light/white design (`nexus-card`, `nexus-section`, etc.) assumes a light
  sticky header, which is a bigger, unrequested redesign. Flagging this rather than
  merging the two systems or silently leaving it inconsistent.

## Directory (`/applications/`) — real static content

The page previously shipped only `<p>Loading the FTN Directory…</p>` with zero
server-rendered content — not crawlable, blank with JS disabled. It now ships the full,
real product list (21 products across 6 groups, sourced directly from
`js/product-registry-data.js`, plus the FTN Account utility entry) as static HTML that
exactly matches the markup `js/ftn-directory.js`'s `mount()` already produces, so
JS-enabled visitors see no visual change — JS just re-attaches the Copy link/Share
button handlers. `js/ftn-directory.js` now also has a genuine error/retry state: if
`FTN.ProductRegistry` isn't available ~1.5s after load (script failure, not just a slow
defer), a "Retry" notice appears above the still-visible static list rather than the
page silently staying on a spinner.

The homepage's own directory reveal (`/#ecosystem-reveal`, `data-ftn-directory="ecosystem"`)
was **not** given the same static-content treatment — it's the same underlying
mechanism and now benefits from the same retry banner, but it's hidden by default
behind the "Explore the Ecosystem" button and wasn't named in the fix list. If SEO
crawlability of that specific section matters, it can be given the same treatment
using the same registry data.

## Riddim and Opportunities — real static fallback content

Both pages previously rendered **nothing** without JavaScript — `<main>` contained only
an empty `<div id="workspace-root">`; the entire hero, title, description and tool were
built by `WorkspaceShell.init()` via `document.createElement` calls. Both pages now
carry a real, server-rendered `#workspace-fallback` block (hero, title, tagline,
description, and the requested content) using the exact product data already in
`js/product-registry-data.js` — nothing was invented. `js/workspace-shell.js` now hides
`#workspace-fallback` once the real interactive workspace successfully mounts, so
JS-enabled visitors see the richer interactive tool and no duplicate content.

- **Riddim**: the four real pathways from the registry — FTN Fire (`/riddim/fire/`),
  FTN DJ Tube (`/riddim/dj/`), FTN DAW (`/riddim/daw/`), FTN EPK (`/radio/#ftn-epk`) —
  each with its real registry description. Uses the already-approved
  `assets/heroes/ftn-riddim-studio.webp` hero photograph (no interface-led substitute
  needed; the approved image already exists).
- **Opportunities**: the three real pathways from `js/opportunities-workspace.js`
  itself (Jobs and careers / Grants, calls and funding / Business and partnership —
  read directly from that file's own `opp-path` buttons, not invented), plus the real
  official-source links the live tool already surfaces (CARICOM vacancies, CDB
  procurement notices, the SMERGERS Trinidad marketplace with its existing disclaimer)
  as genuine no-JS access points, since the live search itself is API-backed and has no
  static equivalent. Uses the already-approved
  `assets/heroes/ftn-opportunities-port.webp` hero photograph.

No placeholder, mock listing, or fabricated statistic was added anywhere in either
fallback.

## Explore the Ecosystem button (FIX 5)

Verified, not modified: `<button data-ecosystem-toggle aria-expanded aria-controls>` is
a real native `<button>` wired via `js/ecosystem-homepage.js`'s `click` listener, which
fires identically from mouse, keyboard (Enter/Space on a native button), and touch. It
unhides `#ecosystem-reveal`, scrolls to it (respecting `prefers-reduced-motion`), and
moves focus to the revealed heading. No defect found; no change made.

## Not touched, per explicit instruction

Supabase, authentication, God Mode, Mission Control, and Community Connect app logic
were not modified. The two vaulted products (`FTN Love`, `FTN Health`) were left out of
the Directory listing, matching their `VAULTED` registry status — not an oversight.
