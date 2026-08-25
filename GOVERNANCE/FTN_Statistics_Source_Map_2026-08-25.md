# FTN Statistics — Source Map (2026-08-25)

Founder-authorized Phase 5A deliverable: "a dedicated FTN Statistics source map." This document is
the official-source inventory, access-method record, and licensing reasoning behind the first FTN
Statistics vertical slice (crime data). It exists so a future contributor extending FTN Statistics
to a new indicator does not have to re-run this research from zero, and so the licensing judgment
call recorded here is auditable rather than silent.

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
(`shares-data-with`, real contract present, not yet an active ibis capability call this phase).
