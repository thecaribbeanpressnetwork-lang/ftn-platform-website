# FTN Analytics & Evidence Standard v0.1

**Status:** Working standard, scoped to what Phase 3 actually built (FTN Live indicator
registry, Mission Control demonstration correlations/scenarios). Extend this file as new
analytical capability ships — do not let it grow ahead of the code.

This is an operational rulebook, not a research paper. Every rule here exists to answer one
question consistently: *can someone trust this number, and do they know why or why not?*

---

## 1. Data Classification (mandatory on every value)

Every indicator, correlation, and scenario output must carry exactly one of:

| Classification | Meaning |
|---|---|
| **Official** | From a named authoritative source, unmodified. |
| **Sourced** | From a named external source, lightly processed (e.g. unit conversion). |
| **FTN Derived** | Calculated directly from a known, disclosed rule (e.g. calendar position in a fiscal year). Deterministic, not a model. |
| **FTN Estimated** | A single-point estimate built from assumptions FTN controls (e.g. a daily-births estimate from an annual rate). |
| **FTN Modelled** | An estimate produced by a model with parameters that can drift and need calibration (e.g. the debt clock's interpolation). |
| **Demonstration** | Illustrative only. No live source, no model — a placeholder for a future integration. |

**Rule:** nothing may be labelled Official or Sourced without a live, named, checkable source
attached. As of this phase, `js/indicators-data.js` has zero live integrations — so nothing in
it is classified Official or Sourced. That will change indicator-by-indicator as real feeds are
added, never as a bulk relabel.

## 2. Confidence

Confidence is separate from classification — a Demonstration value can still disclose how
confident *the demonstration* is in its own illustrative relationship (see `js/mission-control-
data.js` correlations, which range High → Low). Confidence must always be paired with a
`limitations` string explaining *why* it isn't higher.

## 3. Correlation Language

- Never state or imply causation from a correlation value alone.
- Every correlation object carries `direction`, `strength`, `confidence`, `sampleSize`,
  `timeCoverage`, `geoCoverage`, `methodology`, and `limitations` — see `MC.correlations` in
  `js/mission-control-data.js` for the canonical shape.
- UI copy near any correlation list must state plainly that correlation ≠ causation (see the
  Correlation Engine panel intro on `/mission-control/demo/`).

## 4. Weighting

Where a composite index combines multiple inputs (e.g. Household Financial Pressure, Scenario
Studio outcomes), the weights must be disclosed, not hidden inside the calculation. Scenario
Studio (`MC.scenarioOutcomes`) uses simple, visible linear weights specifically so the logic is
inspectable — do not replace with an opaque model without a corresponding Trust Card update
explaining the new method.

## 5. Interpolation & Modelled Clocks

Ticking counters (national debt, population, budget-year progress, countdowns) are computed by
`js/live-clocks.js` from:

- a fixed **benchmark** (`baseValue`, anchored to a real timestamp), and
- an assumed **rate** (`ratePerSecond`, `birthsPerYear`, etc.)

Rules:

1. An interpolated value is always classified **FTN Estimated** or **FTN Modelled**, never
   Official — even once a real benchmark feed exists, the *interpolation between* benchmark
   updates is still a model, not a live measurement.
2. The benchmark date and the assumed rate must be visible in the Trust Card.
3. Interpolation must be pausable (`FTN.LiveClocks.pause()`/`resume()`) and must respect
   `prefers-reduced-motion` by slowing its update interval, not by silently changing the
   underlying math.

## 6. Calibration Engine (concept, not yet implemented)

The intended future loop, once real benchmarks exist:

```
FTN estimate → authoritative benchmark → variance → error rate → model review → new model version
```

Rules for when this is built:

- Never silently overwrite an FTN estimate to match a benchmark — log the variance and version
  the model instead.
- Retain raw observations, benchmark values, and every prior model version. A "calibration
  history" is itself evidence and must be inspectable, not discarded on update.
- A model gets a `modelVersion` field the moment it's calibrated for the first time.

## 7. Statistical Methods — when to reach for what

Only use a technique when it changes what a Trust Card can honestly say. In this phase:

- **Simple weighted sums** — Scenario Studio outcomes.
- **Correlation coefficients** (illustrative) — Correlation Engine.
- **Calendar-rule derivation** — fiscal-year/term/hurricane-season progress, countdowns.
- **Linear interpolation over time** — all ticking clocks.

Anything beyond this (regression, Bayesian updating, Monte Carlo, clustering, geospatial
analysis) is **not implemented** and should not be implied by copy anywhere on the site until it
actually exists.

## 8. Missing Data & Uncertainty

Prefer a disclosed range over a fabricated precise number. `registered-migrants` in
`js/indicators-data.js` is the model: `"18,500 – 24,000"` with `confidence: 'Low'`, not a single
false-precision figure.

## 9. Model Expiry & Review

Every `ind()` entry carries `lastUpdated`. A Demonstration/Estimated/Modelled value with a
`lastUpdated` older than 12 months should be treated as stale and flagged for review before the
next phase that touches it — this file doesn't yet enforce that automatically; a future phase
should add an expiry check to the indicator registry itself.

## 10. Ethics, Privacy, Bias

- No indicator may name, imply, or make identifiable an individual person.
- Migration and border-pressure indicators must use neutral language and disclosed ranges — see
  `CLAUDE.md` and the Migration & Border Pressure category in `js/indicators-data.js` for the
  standard this is held to.
- Before any real data source is integrated, check it against this section again — a live feed
  can violate a rule a demonstration value couldn't.

---

*This document governs `js/indicators-data.js`, `js/live-clocks.js`, `js/mission-control-
data.js`, and their renderers. When you add a new indicator, correlation, or scenario, it must
satisfy §1–§5 before it ships.*
