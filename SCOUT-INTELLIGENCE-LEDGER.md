# FTN Scout Intelligence Ledger — Pass 15

**Status:** Pass 15 research pass (2026-08-21). Governed by the same standards as
`CARIBBEAN-LEDGER.md` and `IBIS-MAP.md`: no fabricated results, no claimed integration without a
real, tested implementation, licenses evaluated per-candidate directly against a primary source
(the project's own repository/README/LICENSE), never assumed from a description or a third-party
aggregator's summary. **No candidate below was installed, run, deployed, or given any FTN
credential this pass.** Every "EXPERIMENT NOW" decision names what would still need to happen
before real experimentation, per this pass's explicit least-privilege security addendum.

## Why this pass exists

Prior passes (Phase 13's `CARIBBEAN-LEDGER.md`, the Phase 6+ sections of `IBIS-MAP.md`) built real
FTN-owned capability and researched AI-provider infrastructure. This pass asked a different
question: **is FTN about to build something that already exists as real, licensable open-source
infrastructure, and is there emerging agent/research capability FTN should track even without a
current ticket for it?** That's the three-lane model below.

## The three lanes

1. **Lane 1 — Problem Scout.** Research tied to a real, existing FTN area/ticket. This is the
   original (and only) mode `scripts/ftn-open-source-scout.mjs` shipped with — unchanged this pass,
   still runs weekly via `.github/workflows/open-source-scout.yml`.
2. **Lane 2 — Capability Scout.** Emerging open-source capability that could materially increase
   what FTN can do, evaluated even without an open ticket for it — deliberately not ranked
   primarily by GitHub star count, since star count measures popularity, not fit or safety.
3. **Lane 3 — Architecture Scout.** Infrastructure that could replace a planned build or become
   shared FTN infrastructure — "what are we about to build that already exists?"

Implemented as an additive extension of the existing Scout (`data/open-source-scout-queries.json`
now carries a `lane` per query area; `scripts/ftn-open-source-scout.mjs` groups its markdown report
by lane), not a new system. An area with no `lane` field defaults to `PROBLEM` — the original,
backward-compatible behavior.

## How to read the Decision column

Same recommendation vocabulary as `CARIBBEAN-LEDGER.md`, plus the specific states this pass's
directive pre-assigned as a starting lean for each primary candidate (confirmed or reconsidered
below against real evidence, never rubber-stamped):

- **BUILD NOW** — ready for real, low-risk implementation today.
- **PREPARE NOW** — real and valuable, but blocked on an infrastructure decision; do design/schema
  thinking now, not the infrastructure itself.
- **EXPERIMENT NOW** — safe to trial in an isolated, credential-free sandbox; real deployment still
  needs a separate, later decision (compute host, accounts, etc.).
- **SANDBOX / SECURITY AUDIT / SELECTIVE ADOPTION** — real value, but only part of the surface is
  safe to touch without additional approvals.
- **BORROW ARCHITECTURE** — the pattern is worth reusing; the actual project is not being installed.
- **BENCHMARK / WATCH** — real, credible, worth tracking; not actively pursued.
- **NOT LOCATED** — no confident match found; recorded honestly rather than guessed.
- **DEFER / REJECT** — real and possibly eligible, but blocked or ruled out, with the reason stated.

---

## 1. Primary candidates

### Hermes Agent
- **Repository:** `github.com/NousResearch/hermes-agent` — verified directly via WebFetch, 2026-08-21.
- **What it is:** An open-source AI agent runtime (Nous Research) with persistent memory, a
  self-improving skill system, cron scheduling, and multi-platform messaging bridges (Telegram,
  Discord, etc.). Works with any LLM provider — bring-your-own-keys, no mandatory cloud account.
- **License: MIT.**
- **Self-hosting:** Explicitly self-hostable ("run it on a $5 VPS, a GPU cluster, or serverless
  infrastructure"). No mandatory cloud runtime to evaluate the codebase itself.
- **FTN relevance:** A real candidate for an agent-runtime/orchestration layer *underneath* ibis —
  never a replacement for ibis's own product identity, per this pass's explicit constraint.
- **Founder's pre-assigned lean: EXPERIMENT NOW — confirmed, with one real caveat.** The license
  and self-hosting story are clean. But "experiment" still implies running the thing somewhere:
  even a $5 VPS is new infrastructure and a real recurring cost this repo has never carried before
  (it is a static site plus Supabase Edge Functions, no compute host of any kind). Per this pass's
  own economic-discipline precedent (`IBIS-MAP.md`), that decision belongs to the founder, not this
  pass. **Recommendation: EXPERIMENT NOW, scoped to local/dev evaluation only, until a founder
  approves a specific, budgeted compute host for anything beyond that.**
- **Security boundary (this pass's addendum, applied):** no Supabase service-role, Cloudflare, or
  founder Gmail credentials; no unrestricted filesystem/subprocess access; never renamed to imply
  it *is* ibis or exposed as a public-facing product.

### Agent Reach
- **Repository:** `github.com/Panniantong/Agent-Reach` — verified directly via WebFetch, 2026-08-21.
- **What it is:** A source-access adapter giving an agent read-only research access to Twitter/X,
  Reddit, YouTube, GitHub, Bilibili, XiaoHongShu, Facebook/Instagram and others, aiming for "zero
  API fees."
- **License: MIT.**
- **Access method by platform, verified from the project's own README:**

  | Platform | Requirement |
  |---|---|
  | YouTube | No login needed |
  | GitHub (public repos) | No login needed |
  | Bilibili | No login for basic search/info |
  | Twitter/X | Cookies (manual export via Cookie-Editor) |
  | Reddit | Login credentials/session |
  | XiaoHongShu | Cookies or browser session |
  | Facebook/Instagram | Browser login session |

- **Account actions:** Read-only research/retrieval only — no publishing or commenting capability
  found in the project itself.
- **Real security finding, from the project's own README:** it explicitly warns of platform
  account-restriction risk from cookie login and recommends **disposable, non-primary accounts** —
  the exact risk this pass's security addendum requires guarding against ("no founder personal
  cookies or accounts").
- **Founder's pre-assigned lean: SANDBOX / SECURITY AUDIT / SELECTIVE ADOPTION — confirmed exactly
  as pre-assigned, evidence strongly supports the caution.** **Recommendation:** the no-login
  platforms (YouTube, public GitHub, Bilibili) are safe to sandbox today with zero credential risk.
  The cookie/login-gated platforms (X, Reddit, XHS, Facebook/Instagram) stay explicitly out of
  scope unless a separately-approved, non-founder, disposable account is provisioned and the
  founder signs off on that specific account-restriction risk — never founder personal accounts.

### last30days
- **Repository:** `github.com/mvanhorn/last30days-skill` — verified directly via WebFetch,
  2026-08-21.
- **What it is:** Not a standalone agent — an installable **skill/plugin** for an existing coding
  agent (Claude Code, Cursor, Codex, Gemini CLI, 50+ supported hosts). Researches a topic across
  Reddit, X, YouTube, Hacker News, GitHub, arXiv, Polymarket and more, keeping only the last 30
  days, scored by real engagement rather than SEO, synthesized into one cited brief.
- **License: MIT.**
- **Credential/cost surface, verified from the project's own README:** Reddit, HN, GitHub, arXiv —
  nothing required. X/Twitter and several video/social platforms need either browser cookies (free)
  or a paid key (ScrapeCreators: 10,000 free calls, then pay-as-you-go).
- **Real security finding:** it executes real subprocesses (`yt-dlp`, `arxiv-cli`, `techmeme-cli`)
  and extracts browser cookies from installed browsers (Chrome/Firefox/Brave/Edge/Safari) for some
  paid-tier platform access — both require the least-privilege sandbox boundary from this pass's
  addendum (allowlisted subprocesses and paths, never unrestricted).
- **Founder's pre-assigned lean: EXPERIMENT NOW — confirmed, scoped to the free/no-cookie data
  paths first.** Reddit, Hacker News, GitHub and arXiv access needs no credentials, no cookies, no
  paid key, and no subprocess beyond what the skill installs itself — genuinely safe to trial in an
  isolated context today. The cookie-dependent and paid-key platforms are a separate, later
  decision, same boundary as Agent Reach above.

### Graphiti
- **Repository:** `github.com/getzep/graphiti` — verified directly via WebFetch, 2026-08-21.
- **What it is:** A temporal knowledge graph framework for AI-agent memory (the open-source core of
  Zep's context infrastructure). Tracks how facts change over time with real provenance to source
  data, hybrid semantic + BM25 search, and both prescribed and learned ontology.
- **License: Apache-2.0.**
- **Infrastructure requirement, verified directly:** requires a real graph database server — Neo4j
  5.26+, FalkorDB 1.1.2+, or Amazon Neptune (plus, for Neptune, a separate OpenSearch Serverless
  collection for full-text search) — and an LLM API key (defaults to OpenAI; Anthropic/Gemini/Groq
  also supported). Python 3.10+. **No lightweight or serverless deployment option exists.**
- **Fit against FTN's actual infrastructure:** this repository is a static site plus Supabase Edge
  Functions — no database server, no Python runtime, no graph store of any kind. Running Graphiti
  for real means provisioning genuinely new backend infrastructure, which is a real STOP CONDITION
  from this pass's own directive (infrastructure this repo doesn't have, requiring a founder
  decision before proceeding).
- **Founder's pre-assigned lean: PREPARE NOW / EXPERIMENT — resolved to PREPARE NOW.** The
  architecture — temporal facts, provenance, evolving relationships — is exactly the right future
  shape for ibis's institutional memory, and is worth designing toward now (see `js/ftn-source-
  provenance.js` below, whose provenance/freshness fields are deliberately compatible with a future
  Graphiti-backed memory layer). But actually running Graphiti requires a graph-database
  infrastructure decision this pass correctly declines to make unilaterally. **No graph database
  was provisioned. No Graphiti code was installed.**

### Shandu
- **Repository:** `github.com/jolovicdev/shandu` — verified directly via WebFetch, 2026-08-21.
- **What it is:** A Python deep-research agent (LangChain/LangGraph-based): plans research loops,
  scrapes and extracts pages/documents via a three-layer pipeline (trafilatura → readability-lxml →
  BS4, no headless browser), scores every source with a `credibility_score` and `source_class`
  label (primary, peer-reviewed, journalism, blog, etc.), and writes a citation-backed report that
  explicitly downgrades claims supported only by weak sources.
- **License: MIT.**
- **LLM requirement:** any LiteLLM-compatible provider (DeepSeek, OpenRouter, Anthropic, OpenAI,
  local endpoints) via an API key — no bundled free tier.
- **Founder's pre-assigned lean: EXPERIMENT / BORROW ARCHITECTURE — resolved to BORROW ARCHITECTURE
  only.** Shandu itself is Python, `pip`/`pipx`-installed, and needs an LLM API key with real per-
  call cost — installing and running it would be new infrastructure and new recurring spend for a
  pattern this pass can implement natively instead. **What was actually taken: the credibility-
  score / source-class / confidence-separation pattern**, reimplemented as a small, dependency-free
  FTN-owned JS module — see "What was implemented this pass" below. Shandu was not installed, run,
  or given any credential.

---

## 2. Secondary candidates — benchmarked only where they add real, distinct capability

Per this pass's own scope: benchmark the 7 named secondary candidates (nanobot, Webwright,
Crawl4AI, Radar Intelligence, Prismis, Harken, Pith) only if they provide something the primary 4 +
existing FTN infrastructure don't already cover — otherwise do not spend significant research depth
on them.

### Webwright (Microsoft) — WATCH
- **Repository:** `github.com/microsoft/webwright` — found via WebSearch, 2026-08-21 (not
  independently WebFetch-verified this pass; recorded as search-sourced, not primary-source-
  confirmed).
- **License: MIT** (per search results — not independently re-verified against the repo directly).
- **Real, distinct capability:** a browser agent that writes and executes real Playwright scripts
  instead of predicting clicks from screenshots — genuinely different from anything in the primary
  4. Potentially relevant to a future Walkthrough rendering pipeline, but that pipeline is
  explicitly out of scope for this pass (deferred per this pass's own scope constraints).
- **Recommendation: WATCH.** Not evaluated further this pass; flagged for the Walkthrough-rendering
  gate when that work is actually greenlit.

### Crawl4AI — WATCH
- **Repository:** `github.com/unclecode/crawl4ai` — found via WebSearch, 2026-08-21 (not
  independently WebFetch-verified this pass).
- **License: Apache-2.0** (per search results — not independently re-verified against the repo
  directly).
- **Real, distinct capability:** a mature, popular LLM-ready web crawler that turns arbitrary public
  pages into clean Markdown for RAG/agent consumption — genuinely different from Agent Reach in one
  specific way: it needs no cookies or login for the public web content it covers, where Agent
  Reach's real value is specifically the login-gated platforms Crawl4AI doesn't touch. The two are
  complementary, not redundant, if either is ever adopted.
- **Recommendation: WATCH.**

### nanobot (HKUDS) — REFERENCE, not separately pursued
- **Repository:** `github.com/HKUDS/nanobot` — found via WebSearch, 2026-08-21. **Note:** a
  differently-owned, differently-licensed project also uses the name "nanobot"
  (`github.com/nanobot-ai/nanobot`, a Go MCP host) — these are two unrelated projects; this entry
  is specifically about the HKUDS Python agent framework.
- **License:** not independently verified this pass — recorded as `UNVERIFIED`, not assumed.
- **Finding:** a real, ultra-lightweight self-hosted Python agent framework. Its capability
  materially overlaps Hermes Agent's role (agent runtime/orchestration) without a clearly distinct
  advantage found in this pass's research depth.
- **Recommendation: REFERENCE.** Not pursued as a separate candidate for the same architectural
  slot Hermes Agent already fills — evaluating two candidates for one slot without a clear
  differentiator would be redundant research spend.

### Radar Intelligence, Prismis, Harken, Pith — NOT LOCATED
No confident, specific public repository matching these names in a research/reconnaissance-agent
context was found. Search results for "Radar Intelligence" returned only unrelated,
generically-named "radar"-themed AI projects (an LLMOps radar, an agentic-security scanner) with no
clear connection. "Prismis" returned a similarly-named but distinct project
(`precious112/prism-ai-deep-research`) that was deliberately **not** treated as a match — recording
an unverified guess as the intended candidate would misattribute findings to the wrong project,
exactly the mistake `CARIBBEAN-LEDGER.md`'s "Isla AI" entry already established the discipline
against. "Harken" returned no relevant result at all. "Pith" returned only `mlc-ai/pith-train`, a
Mixture-of-Experts model **training** system — an unrelated domain, not a research/intelligence
agent, and not recorded as a match. Per this pass's own instruction ("do not spend significant
credits investigating" a secondary candidate without a clear lead), no further search depth was
spent on these four.

---

## 3. Architecture decisions this pass actually made

### FTN Source Gateway abstraction — priority order applied, no new subsystem built
This pass's directive asked to evaluate a minimal "FTN Source Gateway" abstraction with a stated
priority order: REUSE → EXTEND → ADAPTER → SMALL SHARED SERVICE → NEW SUBSYSTEM. Applying that
order against what this repo already has: `js/source-registry.js` already owns "where does a real
external URL for an indicator come from" (REUSE candidate); `js/ibis-provider-registry.js` +
`js/ibis-eligibility.js` already own "register a capability, gate it on real credentials, fail
closed until deployed" (EXTEND candidate — the exact pattern any future Source Gateway provider
would follow, the same way `cloudflare-workers-ai-text` was added in `IBIS-MAP.md` §0.75). No new
subsystem was justified this pass, because nothing researched above is actually being deployed yet
— building Source Gateway plumbing ahead of a real, credentialed provider to plug into it would be
exactly the "meaningless scaffolding" `IBIS-MAP.md` has repeatedly and correctly declined to do.
**Recommendation for the next gate that deploys a real source-access provider:** register it in
`js/ibis-provider-registry.js` exactly like every other provider (`enabled:false` until real
credentials exist), with its capability drawn from a new `RESEARCH` group added to
`js/ibis-capability-taxonomy.js` only at that time — not speculatively added now.

### What was implemented this pass: `js/ftn-source-provenance.js`

The one piece of infrastructure this pass could honestly build without installing anything: the
minimum provenance and source-quality data shape, reusing existing FTN patterns rather than
inventing new ones.

- **Reuses, doesn't duplicate, `js/trust-card.js`'s classification vocabulary.** Trust Card's
  `Official`/`Sourced`/`FTN Derived`/`FTN Estimated`/`FTN Modelled`/`Demonstration` list answers "how
  should FTN classify its own claim about an indicator?" — a different question from "how credible
  is this external source FTN is reading?" Conflating the two would misuse a vocabulary built for a
  different purpose, so `SOURCE_QUALITY` is a deliberately separate list, sized to the taxonomy this
  pass's own directive named: `PRIMARY_EVIDENCE`, `OFFICIAL_GOVERNMENT`, `LEGISLATION_PUBLIC_RECORD`,
  `ACADEMIC`, `REPUTABLE_JOURNALISM`, `CORPORATE_STATEMENT`, `COMMUNITY_DISCUSSION`,
  `CREATOR_SOCIAL`, `PERSONAL_COMMENTARY`, `MARKETING_ADVOCACY`, `UNKNOWN`.
- **`sourceRecord()`** is the minimum real record shape (source/platform/sourceClass/owner/url/
  author/timestamps/retrievalMethod/contentHash/geographicRelevance/permissions/consumingProducts),
  fails closed on an unrecognized `sourceClass`/`retrievalMethod` the same way `js/ibis-
  eligibility.js` fails closed on an unrecognized cost classification.
  `permissions` defaults to `READ_ONLY_RESEARCH` — never a write/publish default, matching this
  pass's explicit separate-research-from-account-actions requirement.
- **`claimConfidence()` implements the one rule this pass's directive stated explicitly and
  emphatically: source credibility and claim confidence are never the same number, and a pile of
  low-quality sources cannot manufacture high confidence by repeating each other.** Verified by a
  real test (`tests/ftn-source-provenance-audit.mjs`): ten independent `MARKETING_ADVOCACY` sources
  stay `LOW` confidence; a single `OFFICIAL_GOVERNMENT` source alone is `HIGH`; two independent
  `ACADEMIC`/`REPUTABLE_JOURNALISM` sources reach `HIGH` together where either alone would only be
  `MODERATE`; two records from the *same* owner correctly count as one independent source, not two.
- **Deliberately not wired into any FTN node's UI this pass** — same discipline already established
  for `js/ftn-walkthrough.js` and `ibis-local-dsp` before it: a real, tested, reusable capability
  shipped now; the concrete first consumer (the eventual Source Gateway provider, or a Trust-Card-
  adjacent "external source" panel) is a flagged next step, not built speculatively.

### Scout upgraded to three lanes, using existing infrastructure only

`scripts/ftn-open-source-scout.mjs` and `data/open-source-scout-queries.json` were extended, not
replaced. Two new query areas were added: one `CAPABILITY`-lane area ("Emerging agent & research
capability" — the kind of scan that found Hermes/Agent Reach/last30days/Shandu-shaped candidates in
this pass, run automatically going forward) and one `ARCHITECTURE`-lane area ("Planned build vs.
existing infrastructure" — the Graphiti/video-rendering-shaped "what already exists" check). The
existing 4 `PROBLEM`-lane areas are unchanged. The weekly cron
(`.github/workflows/open-source-scout.yml`, unchanged) now produces a report grouped by lane with
zero new API calls beyond the two new query areas' own terms — no material increase in registry
query volume, no new source integrations.

### Candidate registry — a JSON file, not a database

`data/ftn-scout-tracked-candidates.json` (new) is the lightweight registry this pass's directive
asked for: one JSON file, versioned in git exactly like `data/open-source-scout-queries.json`,
seeded with the 5 primary + secondary candidates found this pass (license, decision, summary,
security notes, status, lastVerified). `scripts/ftn-scout-candidate-tracker.mjs` (new) implements
real diffing logic (`diffCandidate()`) against the six outcomes this pass's directive named — NEW,
LICENSE_CHANGE, SECURITY_CHANGE, RECOMMENDATION_CHANGE, MATERIALLY_CHANGED, ARCHIVED — plus
UNCHANGED, proven with real tests (`tests/ftn-scout-candidate-tracker-audit.mjs`).
**Not yet wired into the weekly cron** — that's a real, flagged next step (calling `diffAll()` from
inside `open-source-scout.yml` and only surfacing changed candidates in the founder email), left
undone this pass to avoid bundling automation-wiring risk into a research pass whose own scope was
already large.

---

## 4. Summary table

| Candidate | Lane | License | Decision |
|---|---|---|---|
| Hermes Agent | Capability | MIT | EXPERIMENT NOW (local/dev only until a compute host is founder-approved) |
| Agent Reach | Architecture | MIT | SANDBOX / SECURITY AUDIT / SELECTIVE ADOPTION (no-login platforms only for now) |
| last30days | Capability | MIT | EXPERIMENT NOW (free/no-cookie data paths only for now) |
| Graphiti | Architecture | Apache-2.0 | PREPARE NOW (schema-compatible design only; no graph DB provisioned) |
| Shandu | Problem | MIT | BORROW ARCHITECTURE (pattern reimplemented natively; project not installed) |
| Webwright | Architecture | MIT (search-sourced) | WATCH |
| Crawl4AI | Architecture | Apache-2.0 (search-sourced) | WATCH |
| nanobot (HKUDS) | Capability | Unverified | REFERENCE (overlaps Hermes's slot) |
| Radar Intelligence | Capability | — | NOT LOCATED |
| Prismis | Capability | — | NOT LOCATED |
| Harken | Capability | — | NOT LOCATED |
| Pith | Capability | — | NOT LOCATED (only match found is an unrelated ML-training project) |
| **`js/ftn-source-provenance.js` (FTN-native)** | — | N/A — FTN-owned | **IMPLEMENTED** |
