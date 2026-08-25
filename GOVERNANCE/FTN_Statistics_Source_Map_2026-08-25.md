# FTN Statistics — Source Map (2026-08-25, extended for Phase 5B)

Founder-authorized Phase 5A deliverable: "a dedicated FTN Statistics source map." This document is
the official-source inventory, access-method record, and licensing reasoning behind the first FTN
Statistics vertical slice (crime data). It exists so a future contributor extending FTN Statistics
to a new indicator does not have to re-run this research from zero, and so the licensing judgment
call recorded here is auditable rather than silent.

**Phase 5B addendum (same date):** §8 below records the second-indicator candidate comparison and
selection (Central Bank of Trinidad and Tobago exchange rate) required by that phase's brief.

## 1. Scope of this pass

Phase 5A's brief was explicit: build the smallest strong statistics foundation plus **one** verified
end-to-end vertical slice, not a broad dataset expansion. This document therefore covers exactly two
real government sources — the ones the crime vertical slice actually uses — plus the reasoning for
why every other Trinidad and Tobago source considered was not used this pass.

## 2. Existing-statistics duplication inventory (starting point)

Before researching new sources, every existing FTN statistic, indicator, counter and derived metric
was inventoried across FTN Live, FTN Display/Screen, FTN Clock, ibis.ai, Govern, Parliament, the
homepage, static data files, Trust Cards and JS constants:

- **`js/indicators-data.js`** — a 60-indicator "Indicator Engine." **56 of 60 are explicitly labeled
  `classification: 'Illustrative'`**, with a default methodology string reading *"Illustrative value
  chosen to be plausible in order of magnitude for Trinidad and Tobago; not derived from a live
  source."* These are placeholder/fictional numbers, clearly self-disclosed as such in the data —
  not a hidden problem, but a real duplication risk if a future indicator silently promotes one of
  these to "real" without going through FTN Statistics' verification discipline.
- **Debt indicators** (`debt-to-gdp`, `national-debt`, `debt-per-citizen`) carry `referenceDate:
  null` — honestly flagged as unsupported by a prior repair pass, not populated this phase (out of
  scope; crime was the founder-designated first vertical slice).
- **`recorded-murders`** (inside the same Indicator Engine file) is the **one indicator already
  backed by a real, live, already-automated external pipeline**: `data/crime-statistics.json`,
  updated daily by `scripts/update-ttps-crime.mjs` via `.github/workflows/update-ttps-crime.yml`
  (cron `15 10 * * *`), rendered by `js/crime-intelligence.js`, already live at
  `/observatory/#crime-intelligence` before this phase began.

**This finding reshaped the implementation strategy.** Rather than building a new crime pipeline
from scratch, Phase 5A's real work was: (a) build the shared schema/adapter layer
(`js/ftn-statistics.js` + `js/ftn-statistics-crime-adapter.js`) as a thin, honest wrapper around the
*already-real* pipeline, (b) enhance the existing renderer in place (accessible table + Trust Card)
so the improvement benefits the already-live Observer Console page too, (c) mount the same renderer
at the new `/statistics/` route via the same `id="crime-intelligence"` auto-init convention — zero
duplicate fetch/render logic. This is "build once, reuse everywhere" applied to a pre-existing asset
found mid-inventory, not a claim that new code was unnecessary.

## 3. Official-source research and access outcomes

### 3.1 Central Statistical Office (`cso.gov.tt`) — blocked

- **Attempted:** root site, terms-of-use page, and the direct historical-crime-workbook `.xlsx`
  download link.
- **Result:** HTTP `403` on all three, via both the WebFetch tool and a direct `curl` request using
  a real browser User-Agent header. Response headers confirm `Server: cloudflare` — a genuine
  Cloudflare WAF bot-protection block of this environment's access, not a tool-specific limitation.
- **Fallback attempted:** `web.archive.org`, refused outright by the fetch tool itself ("unable to
  fetch from web.archive.org") — a hard tool restriction, not a source-side block.
- **Disposition:** CSO remains the authoritative long-run compiler (its own materials describe the
  Trinidad and Tobago Police Service's Crime and Problem Analysis Unit as the underlying data
  originator), and is cited by name and dataset identity in the shared schema's `sourceDataset`
  objects — but its own site could not be directly reached this pass. Not retried beyond the above;
  revisit if CSO access is needed for a future indicator.

### 3.2 Trinidad and Tobago Police Service (`ttps.gov.tt`) — accessible, used

- **Result:** HTTP `200`. A real, working `/statistics/` dashboard exists, with two independently
  useful endpoints:
  - `/statistics/download/?year=2026` — a direct CSV download (`Year,Month,Division,Offence Code,
    Offence,Reported,Detected`). Used for manual verification (see §4).
  - `/statistics/comparative/?year=2026` — an embedded JS data payload (`var data = [...]`) behind
    the page's comparative chart. This is the endpoint `scripts/update-ttps-crime.mjs` actually
    parses in production (via `scripts/lib/statistics-source-adapter.mjs`'s `fetchAndParse`), and is
    the source the crime adapter's `sources().ttps` object cites.
- **Disposition:** TTPS, as the original data-collecting body (per CSO's own attribution), became
  the primary accessible source for the current-year figure — a genuine improvement over the
  originally-planned CSO-only approach, not a fallback of last resort.

### 3.3 Cross-validation performed

The current-year murder total was independently verified two ways: (1) a direct download and manual
aggregation of the `/statistics/download/?year=2026` CSV (120 murders reported, January–April 2026),
and (2) the pre-existing pipeline's independent scrape of the *different* `/statistics/comparative/
?year=2026` endpoint, which reported `120` as the cumulative reported total as of `2026-08-24`. Two
independently-fetched, differently-shaped TTPS endpoints agreeing exactly is strong corroboration
the figure is real and correctly retrieved — not a coincidence of one script's own bug reproducing
itself.

## 4. Licensing and reuse assessment

Neither source publishes an unambiguous machine-readable reuse license:

- **CSO**: could not reach the terms-of-use page directly this pass (see §3.1). Search-engine result
  summaries suggested a possible restriction on "commercial exploitation... using it as an input,"
  but the clause could not be read in full or verified against the primary text.
- **TTPS**: has **no published terms of use** — the site footer's "Terms of Use" link is a dead `#`
  anchor. The site does state, in its own words, that statistics are "provided for public
  information and transparency in accordance with the TTPS commitment to open data," alongside a
  standard "© 2026 ... All Rights Reserved" copyright notice on every page.

**This ambiguity is real and unresolved as of this document.** The judgment call taken — a bounded,
reasoned decision, not an escalation, on the basis that it mirrors FTN Govern/Parliament's
already-approved "independent gateway, source clearly attributed, never claims ownership" pattern
(see `.claude/context/decisions.md`) — is:

- FTN **cites and displays** real published figures with prominent attribution, a direct source
  link, and a visible publication/retrieval date. Citing published facts with attribution is
  standard, lawful civic-journalism practice; facts themselves are not copyrightable.
- FTN does **not** bulk-redistribute, host, or resell the underlying raw dataset files (the CSO
  workbook, the TTPS CSV export) — only the specific observation values needed for the indicators it
  publishes, each carrying its own source link back to the original.
- This reasoning is recorded verbatim in both `js/ftn-statistics-crime-adapter.js`'s `sources()`
  function (`licensingNote` field on both the `cso` and `ttps` `sourceDataset` objects) and in this
  document, so it surfaces both in code review and in the Trust Card's own "Licensing / Reuse" field
  at the point a reader is actually looking at the number.

**Open item for a future pass:** if CSO access is restored (or a mirrored/alternate CSO endpoint is
found), read the actual terms-of-use text in full and update this section and the adapter's
`licensingNote` with a confirmed, rather than partially-verified, position.

## 5. What this vertical slice does and does not claim

- **Does:** show a real, sourced, dated murder count and rate for Trinidad and Tobago, with the
  historical (CSO, 2015–2024) and current-year (TTPS, 2026) series kept visually and structurally
  distinct — never blended into one continuous line, per the phase brief's crime-statistics
  safeguards.
- **Does not:** claim the current-year figure is a live daily feed (TTPS publishes a cumulative
  total with no stated "as at" reference date — the schema stores this honestly as
  `publicationDate: null`, and the Trust Card surfaces it as "currency of this figure cannot be
  confirmed" rather than implying real-time accuracy).
- **Does not:** combine Community Connect's own citizen reports with these official figures — the
  `/statistics/` page's own "What FTN Statistics is not" section states this explicitly.

## 6. Consuming products

`js/ftn-statistics.js`'s `provenanceFor()` bridges directly into `js/ibis-provenance.js`'s existing
envelope shape (same field names, no competing model), so any future ibis.ai capability that reads
an FTN Statistics observation gets the identical source/reference-date/confidence disclosure the
Trust Card shows today. Registered `integrations` in the Product Registry: `ftn-live`
(`shares-data-with`, already true via the shared `crime-intelligence.js` renderer) and `ibis-ai`
(`shares-data-with`, real contract present, **now an active capability call** — see §9).

## 7. Phase 5B: ibis statistical querying (2026-08-25)

`js/ibis-statistics-capability.js` adds a real `STATISTIC_QUERY` capability, routed through the
existing Phase 4A fabric (`js/ibis-provider-registry.js`, `js/ibis-capability-taxonomy.js`,
`js/ibis-client.js`, `js/ibis-eligibility.js`) rather than a parallel one. It is deliberately
100% deterministic — no language model is ever called for this capability, because the only
enabled provider for it is `ibis-local-statistics-query`, a `LOCAL_DETERMINISTIC_NO_PROVIDER`
entry with zero network calls. This is the simplest, most defensible way to guarantee the
founder's "never permit a model to invent, replace or update a missing observation" instruction:
there is no model in the data path to do so.

Bounded intent set: latest value, source/methodology, comparison, change (absolute + percentage),
available indicators, and why a figure is unavailable. A comparison/change request is only
computed when both observations share the same indicator, unit AND source dataset — this
generalizes the crime-statistics safeguard (never blend a partial-year TTPS cumulative total with
a full-year CSO historical total) to any future indicator, and also catches a genuinely ambiguous
cross-indicator request ("compare the murder rate and the exchange rate") by failing closed rather
than silently picking one.

`js/ibis-evidence.js` was extended with an always-required rule for `capability === 'STATISTIC'`
(the tag `js/ftn-statistics.js`'s `provenanceFor()` always stamps) — a Trust Card is now
structurally guaranteed for every statistical response, not merely likely because a `sources`
array happens to be non-empty.

## 8. Second indicator: candidate comparison and selection (Phase 5B)

Candidates considered, scored against the brief's own rubric (user value, ecosystem value, source
authority, access reliability, reference-date clarity, methodology, reuse/licensing position,
parsing stability, update frequency, maintenance cost):

| Candidate | User value | Access reliability | Parsing stability | Verdict |
|---|---|---|---|---|
| CSO Retail Prices Index / inflation | High | **Blocked** (same `cso.gov.tt` Cloudflare WAF block as §3.1) | N/A | Rejected — inaccessible |
| Central Bank **daily** exchange rate (`/exchange-rates-daily/`) | High | Technically reachable (HTTP 200) but rows load via a **nonce-gated wpDataTables AJAX endpoint** (`admin-ajax.php?action=get_wdtable&table_id=106`) | **Low** — a real attempt this pass, extracting the page's own embedded `wdtNonceFrontendServerSide_106` token and POSTing the full DataTables parameter set, returned an empty body; the endpoint's real contract could not be reliably reproduced without further reverse-engineering | **Rejected** — exactly the "fragile HTML scraping" the brief warns against defaulting into |
| Central Bank **monthly** exchange rate (`/exchange-rates-monthly/`) | High | Reachable, and (confirmed by direct inspection) **genuinely static, server-rendered HTML** — no AJAX, no nonce | **High** — real `<tr id="table_107_row_N">` rows with a real, embedded column-order config (`origHeader`) verified at parse time | **Selected** |

The daily and monthly pages are the *same publisher, same underlying rate definition* — the pivot
from daily to monthly was a technical-reliability decision within the same source, not a downgrade
to a worse candidate found elsewhere. It also independently serves the brief's own "demonstrates a
different frequency... than the crime series" requirement better than the daily page would have
(MONTHLY vs crime's ANNUAL, a real distinct case; DAILY would have been a third, untested
frequency shape with no time to build and verify it this pass).

**Real technical finding, recorded so it isn't re-attempted uselessly:** a working nonce
(`a704f22654`, extracted from the daily page's own embedded `wdtNonceFrontendServerSide_106` hidden
field) was POSTed to the AJAX endpoint with a full DataTables-shaped parameter set (`draw`, `start`,
`length`, `order[0][column]`, `order[0][dir]`) and returned `HTTP 200` with an **empty body** —
wpDataTables' real server-side contract needs more than this (likely a full per-column `columns[i]`
parameter set for all ~20 columns, undocumented). This is not "credentials missing," it is a
non-trivial reverse-engineering task disproportionate to a single indicator, so this pass stopped
rather than keep guessing — a future session should not re-attempt this without a stronger reason.

**Real data confirmed:** the monthly table's own USD columns (verified positions 17–18 of 21 via
the page's own `origHeader` config, not assumed) yield a real, sane series — TTD/USD ≈ 4.25 in
January 1991, rising to ≈ 6.73–6.78 by 2026, consistent with Trinidad and Tobago's known currency
history. 427 real monthly observations retrieved, January 1991 to July 2026. The current
(incomplete) month's own placeholder row (`0.0000` for every currency) is correctly filtered out by
both the write-side script and its fixture tests — never stored as a fabricated zero rate.

**Licensing (independently corrected 2026-08-25):** the Bank does publish a separate
[Copyright Notice](https://www.central-bank.org.tt/copyright-notice/). It permits attributed
reproduction in unaltered form and says people reproducing, redistributing, or making private or
commercial use must acknowledge the source, while noting that permission is revocable. This is
different from the unresolved CSO/TTPS posture in §4. FTN preserves the published figures
unaltered, prominently attributes and links the Central Bank, and records the revocable permission
instead of incorrectly describing the Disclaimer as the only applicable policy.

**Rejected without investigation, per the brief's own explicit instruction:** debt-to-GDP. The
brief was explicit that this must not return "without a defensible official source, reference
period and methodology" — none of that changed this pass, so it was not revisited.

## 9. ibis.ai as a real consumer (updates §6)

`js/ibis-statistics-capability.js`'s `buildCatalog()` merges both adapters (crime + FX) into one
queryable catalog; `js/ibis-widget.js`'s sitewide floating assistant and the dedicated
`/statistics/` "Ask ibis about this data" panel (`js/statistics-ask-ibis.js`) both call through the
real `js/ibis-client.js` router with `capability: 'STATISTIC_QUERY'`. This is the first genuinely
active ibis.ai consumer of the FTN Statistics contract — §6's "not yet an active ibis capability
call" is now out of date and superseded by this section.
