# Scarlett V1 — repository audit and build plan

Date: 2026-09-19  
Decision: **BUILD NOW**, on a fresh branch from current `main`.

## 1. Existing Scarlett work

Historical branch: `scarlett-foundation-2026-09-10`.

Files found there:

- `.github/workflows/scarlett-release-gate.yml`
- `css/components/scarlett.css`
- `data/scarlett-evidence-registry.json`
- `docs/scarlett-architecture.md`
- `extensions/scarlett/content.js`
- `extensions/scarlett/manifest.json`
- `extensions/scarlett/popup.html`
- `extensions/scarlett/popup.js`
- `js/scarlett-engine.js`
- `js/scarlett-page.js`
- `scarlett/index.html`
- `tests/scarlett-release.mjs`

The historical branch is **18 commits ahead but 188 commits behind current main** and is therefore reference material, not a safe base.

## 2. Reusable browser-extension infrastructure

Current ibis extension: `apps/ftn-ibis-browser-extension/`.

Reusable patterns:

- Manifest V3.
- explicit active-tab capture;
- `chrome.scripting.executeScript`;
- no cookie/history access;
- bounded visible-context extraction;
- dedicated static release test;
- FTN-owned endpoint allow-listing;
- privacy copy that explains what leaves the browser.

Scarlett remains a separate extension because its purpose, permissions, UI and store story differ from ibis.

## 3. Reusable ibis components

Scarlett must not create another intelligence brain.

Canonical reusable server/runtime assets include:

- `supabase/functions/ibis-assistant/index.ts`;
- `supabase/functions/_shared/ibis-canonical-brain.ts`;
- canonical RequestFrame / EvidenceContract / EvidencePacket / ClaimsLedger architecture;
- `js/ibis-permission-ledger.js`;
- `js/ibis-connection-fabric.js`;
- provider/evidence/release-validator layers.

V1 handoff is review-before-send and does not automatically upload a page.

## 4. Reusable Headspace components

Headspace remains the escalation workspace, not Scarlett's renderer.

Useful design/interaction references:

- `js/ibis-headspace-window-manager.js`;
- Headspace spatial continuity;
- reduced-motion handling;
- focus/resize/snap interaction discipline;
- handoff guards.

Do **not** embed Headspace window management into the Scarlett page overlay.

## 5. Current permission/security architecture

Reusable governance principles:

- explicit ALLOW / ASK / DENY from `ibis-permission-ledger.js`;
- Connection Fabric discovery never implies execution;
- Direct → MCP → Activepieces → Nango → REST execution preference;
- credentials stay in provider/gateway vaults;
- browser extension must not read cookies/history;
- FTN browser context uses bounded content and strips sensitive URL credentials/tokens.

Scarlett V1 requests only `activeTab`, `scripting`, and `storage`, plus a host allow-list limited to the FTN ibis page for local handoff injection.

## 6. Architectural conflicts found

### Conflict A — stale foundation

The historical Scarlett branch predates the current canonical ibis architecture by 188 main-branch commits.

Resolution: do not merge it wholesale.

### Conflict B — historical replacement view

The old foundation emphasized a high-intensity replacement layer and opacity crossover. Current product direction says V1 should prove Original / Assist / Adapt first.

Resolution: retain only local-first, reversible and source-truth principles. Do not port the full replacement renderer.

### Conflict C — page-type intelligence vs second brain

Scarlett needs local classification but ibis owns semantic reasoning.

Resolution: local deterministic page/risk classification only. External reasoning is a deliberate handoff to ibis.

## 7. Recommended V1 structure

`apps/ftn-scarlett-browser-extension/`

- `manifest.json` — minimal MV3 shell
- `page-understanding.js` — local page/app/risk/site-DNA facts
- `transformation-policy.js` — least-invasive mode selection
- `content.js` — reversible Assist/Adapt renderer and ledger
- `popup.html/css/js` — explicit user control
- `background.js` — FTN ibis launcher only
- `ibis-handoff.js` — review-before-insert bridge on FTN ibis
- `README.md`

## 8. Files/modules to create

The V1 files listed above, plus:

- `tests/scarlett-v1-audit.mjs`
- `.github/workflows/scarlett-v1-gate.yml`

Later, after browser proof:

- Product Registry entry;
- shared Scarlett visual tokens;
- governed server-side Scarlett context adapter if direct canonical ibis submission is justified;
- Headspace handoff contract.

## 9. Files/modules to reuse

Reuse concepts and contracts from:

- ibis browser extension active-tab capture;
- Permission Ledger;
- Connection Fabric;
- canonical ibis architecture;
- Headspace motion/reduced-motion discipline;
- FTN token and Product Registry governance.

## 10. What should NOT be reused

Do not reuse:

- the historical full-screen replacement layer;
- opacity blending as V1's core interaction;
- any page-wide pointer disabling;
- fixed site archetype templates;
- duplicated ibis provider/reasoning code;
- Headspace's freeform window manager inside normal pages;
- broad host permissions;
- automatic full-page transmission.

## 11. Privacy design

Default local-only:

- DOM analysis;
- page/app classification;
- sensitivity classification;
- site-DNA extraction;
- transformation;
- preferences/state.

No browsing-history collection.  
No cookie access.  
No automatic network call.  
No full-page upload.

The deliberate ibis handoff stores a minimized package in extension session storage, opens FTN ibis, shows a review boundary, and inserts the context only after the user chooses **Insert into ibis**.

## 12. Transformation-state design

Modes in V1:

- `ORIGINAL`
- `ASSIST`
- `ADAPT`

State is page-local. Presentation mutations use a ledger recording prior attribute state. Original removes the Scarlett panel/control/styles and restores recorded source attributes.

Reload naturally restores the untouched site.

## 13. Initial UI control

Signature control:

`Original ⇄ Scarlett`

One compact pill sits at the edge of the page. Advanced V1 modes are progressively disclosed behind the same control:

- Assist
- Adapt

Scarlett red is used only for the Scarlett boundary/state. Host-site accent is sampled locally and can influence secondary hover/detail treatment.

## 14. Google Apps approach

Known adapters identify:

- Google Docs
- Google Sheets
- Gmail
- Google Calendar

They default to **ASSIST**.

V1 deliberately does not reorganize the editor/grid/mail/calendar workspace. The side assistance surface and selection handoff remain available without changing native editing behavior.

## 15. Test plan

Automated gate verifies:

- MV3;
- minimal permissions;
- no history/cookie permissions;
- no network call from page understanding or renderer;
- Google app detection;
- sensitive-page downgrade;
- Original/Assist/Adapt only;
- reversible ledger;
- session-only ibis handoff;
- review-before-send wording.

Browser QA still required for:

- article;
- commercial/listing;
- government information page;
- Google Docs;
- Google Sheets;
- forms/links/keyboard;
- console/runtime errors;
- performance and reload restore.

## 16. Build sequence

1. Audit — complete.
2. Extension shell — implemented.
3. Transformation state — implemented.
4. Generic page understanding — implemented.
5. Assist — implemented.
6. Adapt — implemented conservatively.
7. Original restore — implemented.
8. ibis handoff — implemented as review-before-send local bridge.
9. Google app proof — policy implemented; browser QA pending.
10. browser tests — next gate.
11. visual QA — after functional browser proof.
12. investor demo proof — after four-surface QA.

## V1 product boundary

Scarlett changes presentation.  
ibis reasons.  
Headspace hosts complex work.  
Connection Fabric executes governed actions.

That separation should remain explicit in code, UX and product messaging.
