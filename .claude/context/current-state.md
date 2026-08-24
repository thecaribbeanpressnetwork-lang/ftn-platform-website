# Current State (reconciled against the live repository)

**Reconciliation date:** 2026-08-23, performed by direct inspection of `VERSION.md`, `git log`,
`js/product-registry-data.js`, the actual page/JS inventory, `tests/`, and `.github/workflows/` —
not by trusting the old CLAUDE.md narrative. That narrative (Phases 1–4, RC1–RC3, Versions
1.2–1.10) is preserved as history in [release-history.md](release-history.md) but **must not be
read as current** — the repository moved substantially past it before this reconciliation.

## The verified-production gap

- `git log -1`: local `main` HEAD = `7de24b4` (2026-08-23), in sync with `origin/main`, clean tree.
- `VERSION.md`'s own "verified production baseline" commit is `3b5394c` (2026-08-19) — release
  `v2.3.1`, shell namespace `ftn-public-v2.3.1`, domain **`ftnplatform.org`** (this is the real,
  confirmed production domain now — the RC1-era "placeholder domain" note in release-history.md is
  obsolete).
- **HEAD is 63 commits ahead of that verified-production commit.** Real, substantial feature work
  sits on `main` that `VERSION.md` has not yet certified as deployed: FTN Account (Supabase auth),
  the FTN ibis rebrand + IBIS Client capability fabric, FTN Scout, FTN Node Registry, FTN
  Walkthrough Engine, an ecosystem-nav rebuild, FTN Display + FTN Learn, the Observer console
  rebuild, and the two most recent commits (FTN Clock / Ambient Utility work, plus a same-day CI
  bugfix).
- **Per this repo's own release rule** (`VERSION.md`, verbatim): *"Git history and the verified
  production response are the final evidence for a live release. Source presence or a passing
  static audit alone must never be described as deployed functionality."* Treat the 63-commit gap
  accordingly — it is real source, not yet a certified live release. Do not describe unreleased
  work on `main` as "in production."
- `js/product-registry-data.js` stamps itself `RELEASE='2.4.0', VERIFIED='2026-08-19'` — one day
  ahead of `VERSION.md`'s last verified commit stamp in version number but same verification date;
  treat the Product Registry file itself as the live source of truth for product state (see
  [products.md](products.md)), not a copy in this or any other doc.
- `GOVERNANCE/` contains no release report past `v1.9.0` by filename, but does contain several
  **undated-by-name, date-prefixed 2026-08-10 files** (`FTN_Master_Build_Baseline_2026-08-10.md`,
  `FTN_Master_Build_Execution_Ledger_2026-08-10.md`, `FTN_Master_Build_RC1_Verification_2026-08-10.md`,
  `FTN_Functional_Ecosystem_Architecture_2026-08-10.md`, `FTN_Cross_Product_Data_Map_2026-08-10.md`,
  `FTN_Release_Operations_Runbook_2026-08-10.md`) plus `FTN_Nexus_Operating_Set.md` and
  `FTN_Open_Source_Adoption_Policy.md` (undated). These are the most likely authoritative source for
  the v2.x-era rebuild's own architecture/governance — **not read in full during this bounded
  reconciliation.** Read them directly before making a v2.x-architecture claim more specific than
  what's recorded here.

## What's actually live right now (per the Product Registry, not narrative)

The full, authoritative product table (26 registry entries, statuses, visibility, parent/child
relationships) lives in [products.md](products.md) — not duplicated here. Headline facts worth
keeping in this snapshot: `mission-control` is now **PRIVATE** (no public marketing page, no CTAs);
`love` and `health` are **VAULTED** (page routes exist, `publicVisibility:false`, pending safety/
governance gates); `ftn-live` is **FTN Live** again as of a 2026-08-24 founder decision (see
products.md's "FTN Live is canonical again" section) — canonical public umbrella, FTN NOW its
default view, Observer Console its advanced interface, same `/observatory/` route; `display` is
now consolidated into `screen` as Display Mode (`parentProduct:'screen'`), still served at its own
`/display/` route; `invest` is a real dedicated product page now, not just a Contact category (see
"Resolved" below).

Additional live routes not (yet) in the Product Registry as of this check: `/trust/` ("FTN Trust
Centre — Sources, privacy and product states"), `/god-mode/` ("FTN Nexus Command — Private founder
control" — private admin surface), `/sitemap/`, `/support/`, `/glossary/`, `/offline/`,
`/accessibility/`, `/resources/`, `/insights/`, `/news/`, `/contact/`, `/about/`, legal pages.

## Resolved during reconciliation (do not re-flag these as open questions)

- **`/invest/` and the old "no investor page" rule are not in conflict.** The old charter's §4
  Founder Decision banned fundraising/projection language and initially banned even an "Investors"
  nav entry (later relaxed to route to a Contact category — see decisions.md). The *current*
  `/invest/` product ("FTN Invest-in") carries explicit registry-level `legalNotices`: `'No public
  investment solicitation'`, `'No financial advice'`, `'No trades or custody'`. It frames itself as
  a partnership/sponsorship conversation surface plus a directory of official third-party financial
  sources (Ministry of Finance, Central Bank, TTSE) — consistent with, not a violation of, the
  underlying founder rule. `/investor-room/` is a legacy URL that 1-line-redirects to `/invest/`
  (`js/redirect-invest.js`). Treat this as resolved, current, compliant state.
- **`js/ftn-auth.js` embeds a Supabase URL and a key literally named `sb_publishable_...`.** This is
  Supabase's newer public/publishable key convention (the client-safe equivalent of the old "anon"
  key) — intended to ship in frontend code, same pattern as a Firebase web config object. Not a
  leaked secret; no action needed. Real authorization stays server-side in RLS/RPC per the file's
  own header comment.
- **Turnstile (`js/turnstile-gate.js`, `tests/turnstile-release.mjs`) is live bot-protection**, not
  analytics/tracking — doesn't contradict the "no analytics/tracking" claim in the old Technical
  Compliance Audit, but that audit is old-narrative and should be re-verified rather than cited if
  a privacy-policy-accuracy question ever comes up again.

## Still genuinely open (flagged, not guessed)

- No GOVERNANCE release report was found naming `v2.3.0`/`v2.3.1`/`v2.4.0` specifically — the
  `2026-08-10`-dated Master Build files are the likely source but weren't read in full this pass.
- Whether every one of the 26 registry products has a fully wired, defect-free page was not
  re-verified here (bounded reconciliation, not a new QA pass) — `tests/all-public-routes.mjs`,
  `tests/product-registry-audit.mjs`, and `tests/functional-release.mjs` are the repo's own way of
  checking this; run them rather than assuming.
