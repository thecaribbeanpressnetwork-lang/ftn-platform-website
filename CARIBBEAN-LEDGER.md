# FTN Platform — Caribbean Resource Ledger

**Status:** Phase 13 research pass (2026-08-21). This is a research ledger, not a promise —
entries here are candidates evaluated against real primary sources, not commitments to build.
Governed by the same standards as `IBIS-MAP.md`: no fabricated results, no claimed integration
without a real, tested implementation, licenses evaluated per-resource (code, dataset, model and
API terms are separate questions, never assumed to share one license).

Every row below was verified by directly fetching the named repository/page and, where a license
file exists, reading it directly — not inferred from a description or assumed from "open source"
framing. See each entry's Verification note for what was actually checked.

## How to read the Recommendation column

- **INTEGRATE** — license-cleared and technically eligible on this infrastructure today.
- **ADAPT** — license-cleared, but requires build work (not a drop-in) before any real use.
- **REFERENCE** — real, credible, worth knowing about; not planned for direct use.
- **RESEARCH-ONLY** — real, but not actionable yet (unclear licensing, unpublished code, etc.).
- **DEFER** — real and potentially eligible, but blocked on infrastructure this repo doesn't have.
- **REJECT** — evaluated and ruled out, with the specific reason recorded.

---

## 1. The four named leads

### CreoleVal
- **Repository:** `github.com/hclent/CreoleVal`
- **Creator:** Heather Lent and collaborators; accepted to TACL 2024 (peer-reviewed).
- **What it is:** A multilingual benchmarking suite for Creole NLU/NLG — 24+ Creole languages,
  176,821 sentences / ~2M words across tasks (machine comprehension, POS tagging, NER, NLI,
  sentiment analysis, machine translation, and more), including the MIT-Haiti Corpus.
- **Languages covered:** Haitian Creole, Jamaican Patois, Nigerian Pidgin, Mauritian Creole, and
  others. **Trinidadian Creole is not covered.**
- **License:** Mixed, per-dataset — CC0, CC 4.0, MIT, Apache 2.0, Microsoft License; religious
  translation data is separately copyrighted. Code license and dataset license are genuinely
  different questions here, exactly the case this ledger's own license-firewall rule anticipates.
- **Commercial use:** Depends entirely on which specific sub-dataset — some are permissive
  (CC0/MIT/Apache 2.0), some are not (the copyrighted religious MT data).
- **Hardware/execution:** Would require Python + a real ML runtime to use any of the trained
  models; this repo has neither today.
- **FTN relevance:** Real and credible, but no Trinidad-specific coverage, and any actual use
  would need per-sub-dataset license review plus infrastructure this repo doesn't have.
- **Recommendation: RESEARCH-ONLY.** Worth revisiting if FTN ever pursues Jamaican Patois
  specifically and has GPU/Python infrastructure — not actionable today.
- **Verification:** Fetched the repository directly (README) via WebFetch, 2026-08-21.

### Sankofa
- **Repository:** `github.com/Jeremiah-Sakuda/Sankofa`
- **What it is:** An AI-powered family-heritage storytelling application (oral-history-style
  narration, AI-generated period imagery, ambient audio) built on Next.js/React + FastAPI +
  Google's Gemini models and Agent Development Kit. Not a language-technology project.
- **License:** **GNU Affero General Public License v3.0 (AGPL-3.0)** — confirmed via the
  repository's own description of its licensing terms.
- **Caribbean relevance:** Mentions Jamaica, Haiti, and Trinidad & Tobago only as example diaspora
  regions its storytelling covers — it is not a Trinidad/Caribbean language or NLP resource at
  all.
- **Recommendation: REJECT** — on two independent grounds: (1) AGPLv3 makes any code reuse
  incompatible with FTN's proprietary commercial product (the network-use clause would require
  publishing FTN's own modified source), and (2) it isn't actually a language-technology or
  Caribbean-linguistics resource regardless of licensing.
- **Verification:** Fetched the repository directly via WebFetch, 2026-08-21.

### Isla AI (Mindy Mohammed / `mindy001`)
- **Person:** `github.com/mindy001` — a real, active GitHub profile (Fazeeia Mohammed), 31
  repositories, self-described as "Originally from the Caribbean," with real published work
  including "Bilingual NLP Models for the Caribbean" (ICACECS 2023) and a described hackathon
  project, "Isla AI — Caribbean Creole Voice Transcription," aimed at "accent-robust ASR models
  for Caribbean dialects."
- **Repository status: NOT LOCATED.** The profile's bio/README page describes Isla AI, but a
  direct fetch of the account's repositories tab did not list a matching repository, and a
  targeted web search for "Isla AI Caribbean Creole voice transcription github" found no public
  repository under that name. This may mean the code lives in a team/hackathon-org repository
  under a different name, is private, or is not yet published — genuinely unclear, not assumed
  either way.
- **Recommendation: RESEARCH-ONLY (unverified).** The person and the described project are real;
  the actual code was not found and nothing was assumed about its license or content. Do not cite
  this as an available integration path until a real, public repository is located.
- **Verification:** Fetched the GitHub profile page and the repositories tab separately via
  WebFetch, plus two WebSearch queries, 2026-08-21. Explicitly did not fabricate repository
  details that could not be confirmed.

### open-hub (soynade-research)
- **Repository:** `github.com/soynade-research/open-hub`
- **What it is:** An index/documentation hub coordinating AI and NLP tool development for
  under-resourced languages — audio preprocessing, dataset creation, model training, and an
  "nlp4all" tutorial repository meant to let other communities replicate the methodology for their
  own languages.
- **Language focus:** Fula (West African) — **not Caribbean.**
- **License:** Primarily AGPL-3.0 at the hub level; individual member repositories vary (some
  MIT/Apache 2.0, not independently verified per-repository this pass).
- **FTN relevance:** The *methodology* (how to bootstrap NLP tooling for an under-resourced
  language community) is transferable in principle to Trinidad Creole — but nothing here is a
  Caribbean resource directly, and the hub's own license is AGPL.
- **Recommendation: REFERENCE.** Worth reading the `nlp4all` tutorial for methodology if FTN ever
  invests in building real Trinidad Creole NLP tooling from scratch — not a source of any code or
  data to incorporate.
- **Verification:** Fetched the repository directly via WebFetch, 2026-08-21.

---

## 2. Additional real candidates found during this pass

### GuyLingo (Caribbean-Creole-Languages-Translation)
- **Repository:** `github.com/ChrisIsKing/Caribbean-Creole-Languages-Translation`
- **Creators:** University of Michigan (Christopher Clarke, Roland Daynauth, Dr. Jason Mars) with
  the University of Guyana's Guyanese Languages Unit (Charlene Wilkinson, Prof. Hubert Devonish).
  Published as a NAACL '24 paper.
- **What it is:** A real Guyanese Creole ↔ English sentence dataset plus V1 translation models
  (hosted on Hugging Face).
- **License: MIT.** No commercial-use restriction stated.
- **Country:** Guyana (priority #4 on this ledger's regional scope).
- **Hardware/execution:** The models are Hugging Face transformer checkpoints — running real
  inference needs Python + a real ML runtime, which this repository does not have today.
- **Recommendation: DEFER.** The most commercially clean real Caribbean-language resource found
  this pass (peer-reviewed provenance, real university-backed dataset, genuinely permissive
  license) — but blocked on this machine's confirmed lack of Python/GPU, the same infrastructure
  blocker as every video/lip-sync candidate in `IBIS-MAP.md`. Revisit first if/when FTN ever
  provisions real ML infrastructure.
- **Verification:** Fetched the repository directly via WebFetch, 2026-08-21.

### Haitian Creole ASR (limited-labeled-data)
- **Repository:** `github.com/KerlinMichel/Haitian-Creole-Automatic-Speech-Recognition-with-Limited-Labeled-Data`
- **What it is:** A real Haitian Creole ASR research project. License and current activity not
  independently verified this pass (found via search, not directly fetched) — recorded for
  completeness, not evaluated in depth.
- **Recommendation: RESEARCH-ONLY** — real lead, needs its own license/activity check before any
  further evaluation.

### TRIDENT (Caribbean-accented emergency speech triage)
- **Source:** arXiv preprint (`arxiv.org/pdf/2512.10741`), code at `github.com/smg-labs/project-filter`.
- **What it is:** A described "redundant architecture for Caribbean-accented emergency speech
  triage." The repository's own description states its code is "to be made public upon
  acceptance" — i.e., **not currently publicly available.**
- **Recommendation: RESEARCH-ONLY (blocked-unpublished).** Real, credible, academically framed —
  but there is nothing to evaluate or use yet since the code isn't public.

---

## 3. What was implemented this pass

**`CARIBBEAN_LANGUAGE_ID`** (`js/ibis-caribbean-language-id.js`, provider
`ibis-local-caribbean-language-id`) — the only candidate in this entire research pass that needed
no license firewall decision, no GPU, no Python, and no external credential: a small (7-term),
explicitly-cited, deterministic lexical-marker detector for Trinidad English/Creole vocabulary,
entirely FTN-authored. Every marker is sourced directly from two real, cited Wikipedia articles
(`Trinidadian_Creole`, `Trinidadian_and_Tobagonian_English`), fetched and quoted during this pass,
not invented. It only ever analyzes text supplied by a caller — it never generates or inserts
Trinidadian expressions, and it degrades honestly to `INSUFFICIENT_EVIDENCE` rather than guessing
when no marker is found. Real, tested (`tests/ibis-caribbean-language-id-audit.mjs`): positive
detection, case/variant-insensitivity, a real word-boundary false-positive guard ("sublime" does
not trigger "lime"), and honest degrade on plain Standard English and empty/null input.

Registered `lifecycleState:'ELIGIBLE'`, `enabled:true` — genuinely live today, same as
`ibis-local-dsp`. Deliberately **not yet wired into any specific FTN node UI** this pass — a real
candidate integration point (e.g. `/facethenation/`'s topic/guest suggestion forms, or the ibis
widget's own language handling) exists, but wiring it in without a concrete product decision would
be scope creep beyond this ledger's own research-then-implement-the-smallest-eligible-thing
mandate.

## 4. Summary table

| Resource | Country/Region | License | Recommendation |
|---|---|---|---|
| CreoleVal | Multi-Creole (no Trinidad) | Mixed, per-dataset | RESEARCH-ONLY |
| Sankofa | N/A (not a language resource) | AGPL-3.0 | REJECT |
| Isla AI | Trinidad & Tobago (described) | Unknown — repo not located | RESEARCH-ONLY (unverified) |
| open-hub | Fula (West Africa) | AGPL-3.0 (hub) | REFERENCE |
| GuyLingo | Guyana | MIT | DEFER (hardware-blocked) |
| Haitian Creole ASR (KerlinMichel) | Haiti | Not verified | RESEARCH-ONLY |
| TRIDENT | Caribbean (general) | N/A — code unpublished | RESEARCH-ONLY (blocked-unpublished) |
| **`CARIBBEAN_LANGUAGE_ID` (FTN-native)** | Trinidad & Tobago | N/A — FTN-owned | **IMPLEMENTED** |
