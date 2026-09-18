# FTN / IBIS — Search Quality Gate Pass

Mission date: 2026-09-18, same day as (and reopening one section of) `FTN_Quality_Pass_2026-09-18.md`.
Baseline commit `a6bad84`. Final commit for this pass: `0298f69` (implementation at `9c20135`, a
follow-up doc-only correction at `0298f69`).

This document exists because the prior pass's "Priority 1 — Search reliability: closed" verdict was
wrong in a specific, provable way, and this pass is the correction — not a rewrite of what happened,
but a real fix, deployed and live-verified, on top of it.

## 1. What was wrong

The prior pass measured search reliability as: does the cascade return `status: "OK"` with
`sources.length > 0`? It improved that metric from a 46% zero-result rate to 0%, which was real
work and a real improvement — but it was the wrong metric. In production, the founder asked ibis
*"What changed in Trinidad and Tobago this week?"* and got an answer grounded in an irrelevant
2018/2019 UWI Faculty Report, followed by a claim that no current information could be found. That
request would have scored a "pass" under the old metric: SearXNG returned real titles and URLs.
Nothing checked whether those URLs were *usable evidence* for a freshness-required question.

## 2. Live verification before writing any code

Before changing anything, this pass called the live `ibis-provider-health-preview` endpoint
directly to confirm the founder's reported credential fix, rather than taking the report on faith:

```
{"capability":"MODEL_PROVIDER_HEALTH","healthyCount":1,"providers":[
  {"provider":"Anthropic","state":"HEALTHY","configuredModel":"claude-sonnet-4-6","configuredModelVisible":true,"modelCount":11},
  {"provider":"Gemini","state":"UNHEALTHY","httpStatus":401}
]}
```

Confirmed: Anthropic is healthy, `claude-sonnet-4-6` is a real, visible model id on the account's
own `/v1/models` list. Every prior-pass and code comment claiming `claude-sonnet-4-6` "was never a
real Anthropic model" was wrong and has been corrected in place (not deleted — the historical record
of what was believed at the time is kept, with a dated correction alongside it) in:
`ibis-claude-search-adapter.ts`, `ibis-assistant/index.ts`, `ibis-browser-context/index.ts`,
`ibis-provider-health-preview/index.ts`, `supabase/README.md`, `docs/deferred-content.md`, and
`FTN_Quality_Pass_2026-09-18.md`. **No model IDs, credentials, or provider-health code were changed**
— only comments and prose, per the explicit instruction driving this pass.

## 3. The fix — `evaluateSearchResultQuality()`

New module: `supabase/functions/_shared/ibis-search-quality-gate.ts`.

A provider-independent, pure function called after a provider (SearXNG, Claude Web Search, or
Brave) returns `status: "OK"` sources, and before the cascade accepts that as final success:

```
evaluateSearchResultQuality({ userQuery, normalizedQuery, queryClass, freshnessRequired, sources })
  -> { acceptable, score, reasons, freshnessMatch, topicalMatch, entityMatch, usableSourceCount }
```

**Scoped deliberately narrow**: the gate is a no-op (`acceptable: true` unconditionally) unless
`freshnessRequired` is true — the same flag `ibis-canonical-brain.ts` already computes from
`queryClass === "CURRENT_WEB_RESEARCH"`. The live-caught bug was specific to freshness-required
questions; this pass does not touch, gate, or risk regressing any other query class.

**Probabilistic, not one brittle rule**, per the mission's explicit instruction. Each source is
scored on combined signals:
- Structured `publishedAt`/`updatedAt` age (bonus within 14/60 days, penalty beyond 2 years).
- Relative recency language ("3 days ago") and vague current-event language ("today", "this week",
  "breaking").
- Month/year mentions in the title or snippet, weighted by distance from the current month.
- Archival/academic document markers ("annual report", "faculty report", "thesis", "working paper")
  — a direct, explicit guard against the exact live-caught bug shape.
- Topical word overlap with the user's own question.
- Region/entity match against the query's named region (Trinidad/Tobago/Caribbean), including real
  abbreviations ("T&T", "Trinbago") so a legitimate headline is never wrongly flagged.
- A known Caribbean news/government domain bonus.

**Two calibration decisions, made only after the first implementation broke 3 real regression tests
against realistic fixtures** (see §4): a **neutral baseline credit** applies when no negative
staleness/archival signal fires at all, so an undated-but-legitimate primary source (a government
grant page, a Parliament notice with no explicit date) is never penalized merely for weak metadata —
directly implementing the mission's explicit "do not discard good primary sources merely for weak
date metadata" instruction. And **entity/region mismatch is a hard ceiling**, not a small additive
penalty — evidence about the wrong country is a categorical failure, not a matter of degree,
regardless of how "fresh" that unrelated evidence looks.

Wired into `ibis-search-adapter.ts`'s cascade: the SearXNG fanout re-checks quality on every
retrieval-language variant before accepting it (a LOW_QUALITY variant does not stop the fanout early
— the next variant, or ultimately the next provider, gets a real chance); Claude Web Search and
Brave results are gated the same way. A LOW_QUALITY verdict is reported as the same
`SEARCH_UNAVAILABLE` shape a genuine provider failure produces, so the existing "not OK → try next
provider" control flow handles it with zero special-casing. `freshnessRequired` is folded into the
search cache key so a cached result is never served across a different freshness requirement.
`ibis-canonical-brain.ts` passes `freshnessRequired`/`queryClass`/the user's own original text
through to the search call so the gate judges evidence against the real question, never the
disambiguated provider string.

`ibis-search-query-normalizer.ts`'s internal retrieval-language boost for current-events queries was
upgraded from year-level (`"...2026"`) to month-level (`"...September 2026"`) context — narrower,
internal-only, and never visible to the user; the user-facing question is untouched.

## 4. A real calibration bug, caught and fixed before merging

The first version of the gate broke 3 existing `ibis-canonical-brain.test.ts` tests that use
realistic-but-undated fixtures (a Tobago business-support government page, a bare USD-rate source
with no snippet, a "T&T economy update" headline). The initial scoring required a *positive*
freshness signal to clear the acceptance threshold, which wrongly penalized legitimate,
on-topic-but-undated reference content — exactly the false-negative failure mode the mission warned
against. Fixed with the neutral-baseline-credit and entity-mismatch-cap redesign in §3, then
re-verified: **all 259 shared Deno tests pass**, including the 7 new quality-gate tests and every
pre-existing search/canonical-brain test, with zero tests weakened or skipped to make this pass.

## 5. Framework-leak fix (a second real bug, found while investigating the mission's answer-quality requirement)

The mission also reported ordinary (non-adversarial) answers surfacing text like *"Based on the
provided evidence and Caribbean lens..."*. Investigation traced this to a real gap: the existing
instruction in `ibis-reasoning-synthesis.ts`'s `buildReasoningSynthesisBlock()` and
`ibis-assistant/index.ts`'s `FOUNDER_REASONING_INSTRUCTION` only forbade printing internal lens/
engine labels **as headings** — it never covered a label named conversationally, inside an ordinary
sentence. Both instructions were broadened to cover any grammatical position. This was done
carefully to avoid reintroducing a worse, already-documented failure mode: an earlier version of
this exact instruction *named* the forbidden labels ("Truthmode", "Red Team", "FutureYou") in its
own "never print these" sentence, and a smaller model (Cloudflare Workers AI's Llama 3.1 8B) took
that as a template and printed them as literal headings on an unrelated answer
(`tests/ibis-founder-reasoning-instruction-audit.mjs`'s own `FORBIDDEN_LENS_LABELS` regression
guard exists because of that incident). The first draft of this pass's fix repeated that exact
mistake by naming the labels again; caught before commit and rewritten to describe the prohibition
structurally, matching the codebase's own established lesson. The existing regression test still
passes unchanged.

## 6. Deployment

Commits `9c20135` (implementation) then `0298f69` (one missed doc correction in
`supabase/README.md`), both pushed to `main`. CI, both commits:

| Workflow | Result |
|---|---|
| Deploy and verify ibis assistant gateway | success |
| ibis Browser Search Context Release | success |
| FTN Index Release Gate | success |
| FTN Production Identity Gate | success |
| ibis Intelligence Core Gate | success |
| IBIS Behavioral UX Gate | success |
| FTN UX Guardian Hard Gate | success |
| FTN Browser Link Click Audit | success |
| FTN Functional Release Gate | success |
| Deploy static site to GitHub Pages | success |

Post-deploy, `ibis-provider-health-preview` was called again directly and still reports Anthropic
`HEALTHY`.

## 7. Live acceptance test

The mission's exact required query, run against live production after deployment:

**"What changed in Trinidad and Tobago this week?"**
- `evidenceState`: `SEARCH_GROUNDED`
- Accepted provider: `searxng`
- 8 real sources, including AP News, Rio Times, Yahoo News, BBC — all reporting Trinidad and
  Tobago's state of emergency ending after 199 days, a genuinely current (this-week) story.
- Answer: *"Trinidad and Tobago ended a lengthy state of emergency on Thursday. The government had
  declared the state of emergency to combat crime, but it has now expired after 199 days."*
- No 2018/2019 evidence. No "I couldn't find current information" claim. No internal framework/lens
  wording. **PASS.**

This is a direct, live repeat of the exact question the founder used to catch the original bug, and
it now returns genuinely current, correctly-sourced evidence instead of a stale academic report.

The 5 additional required queries, run immediately after against the same live deployment (full
detail: `GOVERNANCE/benchmarks/search-quality-gate-2026-09-18T14-18-19-941Z/`):

| Query | Accepted provider | Evidence state | Sources | Stale-year flag | "No current info" claim | Framework leak | Pass |
|---|---|---|---|---|---|---|---|
| What is happening in Trinidad and Tobago today? | searxng | SEARCH_GROUNDED | 8 | no | no | no | PASS |
| What changed in Tobago tourism this week? | searxng | SEARCH_GROUNDED | 8 | no | no | no | PASS |
| What happened in Trinidad politics this week? | searxng | SEARCH_GROUNDED | 8 | no | no | no | PASS |
| What major business news happened in Trinidad and Tobago this week? | searxng | SEARCH_GROUNDED | 8 | no | no | no | PASS |
| What changed at Trinidad and Tobago Parliament this week? | searxng | SEARCH_GROUNDED | 8 | no | no | no | PASS |

**6/6 PASS.** Answers covered: the state-of-emergency story, Tobago tourism/Carnival sea-bridge
coverage, over 5,800 arrests during the state of emergency, a T&T crypto-sector/US$5B investment
story, and Parliament's reopening with a live-broadcast sitting — all genuinely current, all
correctly sourced, none stale, none framework-leaking.

## 8. Disclosed limitation — the Claude Web Search fallback leg

The mission asked for explicit proof that "SearXNG → rejected LOW_QUALITY → Claude Web Search →
SEARCH_GROUNDED" executes live, not just in a test. This pass could not force that exact path live:
every query attempted against production this session — including several deliberately obscure or
partly-fictional ones, intended specifically to make every SearXNG fanout variant fail — was still
answered successfully by SearXNG's fanout (the prior pass's own fix), because the normalizer's
broader fallback attempts reliably find *something* current about Trinidad and Tobago even when the
literal query does not. This is a genuinely positive result (SearXNG is working robustly right now)
but it means the Claude leg was never actually exercised by live traffic during this verification
window, and this session has no access to Supabase's edge-function log tail to search for an
organic occurrence.

What **is** verified, directly:
1. The credential authenticates against Anthropic's real API (`ibis-provider-health-preview`,
   confirmed twice, before and after deploy).
2. The cascade's control flow — SearXNG not-OK → try Claude Web Search → not-OK → try Brave — is
   proven by the existing deterministic `CASCADE: Claude Web Search sits between SearXNG and Brave`
   Deno test, unchanged and still passing.
3. This pass's own gate correctly converts a LOW_QUALITY SearXNG result into the same
   `SEARCH_UNAVAILABLE` shape that a genuine provider failure produces (`applyQualityGate()`,
   directly unit-tested), which is what feeds that exact cascade control flow — the mechanism
   connecting "quality rejection" to "try Claude next" is proven at the unit level even though it was
   not organically triggered by a live request this session.

What is **not** claimed: a live request in production this session where SearXNG was rejected for
LOW_QUALITY and Claude Web Search then supplied the accepted evidence. That specific end-to-end live
occurrence remains unobserved. Recommended next step: watch production traffic (or Supabase's own
function logs, once session access allows it) for a real `providerPath` entry showing
`claude-web-search`, or re-run this pass's live probe periodically until SearXNG genuinely misses on
a real query.

## 9. Revised classification

**FTN / IBIS SEARCH QUALITY GATE: IMPLEMENTED, DEPLOYED, LIVE-VERIFIED ON THE MISSION'S EXACT
ACCEPTANCE QUERY AND ITS 5 FOLLOW-UPS (6/6 PASS) — WITH ONE DISCLOSED, NAMED LIMITATION (§8).**

Priority 1 (search reliability) is corrected to close on evidence quality, not merely on
`status: OK`, per the reopening in `FTN_Quality_Pass_2026-09-18.md`'s top-of-document notice. The
live-caught 2018/2019-report failure mode is directly guarded against (unit tests reproduce it
exactly) and directly disproven live on the same question that caught it. The one honestly disclosed
gap is narrow and named: the Claude Web Search fallback leg is proven correct at the code/test level
but not yet organically observed live, because the primary provider is currently performing well
enough that it was never needed during this verification window.
