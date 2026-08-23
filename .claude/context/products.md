# Products — names, routes, roles

**Source of truth:** `js/product-registry-data.js`, consumed via `js/product-registry.js`.
Everything below is a snapshot (reconciled 2026-08-23, registry stamped `RELEASE='2.4.0',
VERIFIED='2026-08-19'`) for fast lookup — for exact current taglines, journeys, data sources, legal
notices, keywords, and capabilities, read the registry file directly. It is the single auditable
source for product identity, hierarchy, release state, visibility, access and public claims —
**do not hand-maintain a second copy of its content; update the registry, then this snapshot.**

## Why a registry, not hardcoded nav/copy

Every product is a `product({...})` object with a consistent shape: `id`, `route`, `status`
(`LIVE`/`AVAILABLE`/`PRIVATE`/`ILLUSTRATIVE`/`VAULTED`), `visibility`/`publicVisibility`,
`primaryUser`, `primaryJourney`, `callsToAction`, `dataSources`, `accessRules`, `legalNotices`,
`relatedProducts`, `keywords`, `capabilities`, and an `atmosphere` object (accent color, background
treatment, motion profile) that `workspace-shell.css`/`js/workspace-shell.js` apply automatically —
a product's page never hand-styles its own chrome. `homepagePanels()` feeds the homepage grid;
`search()` (extended with a `scopeProductId` ranking parameter) powers `js/intent-router.js` and
every product's own contextual search. This is why adding a product's discoverability is a data
change, not new component code — the same "build once, reuse everywhere" principle as the shared
engines in [intelligence.md](intelligence.md).

## Live product table

| id | name | route | status | visibility | parent |
|---|---|---|---|---|---|
| `platform-home` | FTN Platform | `/` | LIVE | PUBLIC | — |
| `community-connect` | FTN Community Connect | `/community-connect/` | AVAILABLE | PUBLIC | — |
| `mission-control` | Mission Control | `/mission-control/` | PRIVATE | **PRIVATE** | — |
| `scenario-workspace` | Scenario Workspace | `/scenario-workspace/` | ILLUSTRATIVE | PUBLIC | — |
| `govern` | FTN Govern | `/govern/` | AVAILABLE | PUBLIC | — |
| `ibis-ai` | FTN ibis | `/ibis-ai/` | AVAILABLE | PUBLIC | — |
| `parliament` | FTN Parliament | `/parliament/` | AVAILABLE | PUBLIC | — |
| `facethenation` | FTN Face The Nation | `/facethenation` | AVAILABLE | PUBLIC | — |
| `events` | FTN Events | `/events/` | AVAILABLE | PUBLIC | — |
| `screen` | FTN Screen | `/screen/` | AVAILABLE | PUBLIC | — |
| `tv` | FTN TV | `/tv/` | AVAILABLE | PUBLIC | `screen` |
| `ftn-live` (public name **FTN Observer**) | FTN Observer | `/observatory/` | AVAILABLE | PUBLIC | — |
| `display` | FTN Display | `/display/` | AVAILABLE | PUBLIC | — |
| `learn` | FTN Learn | `/learn/` | AVAILABLE | PUBLIC | — |
| `radio` | FTN Radio | `/radio/` | AVAILABLE | PUBLIC | — |
| `riddim` | FTN Riddim | `/riddim/` | AVAILABLE | PUBLIC | — |
| `ftn-fire` | FTN Fire | `/riddim/fire/` | AVAILABLE | PUBLIC | `riddim` |
| `dj-tube` | FTN DJ Tube | `/riddim/dj/` | AVAILABLE | PUBLIC | `riddim` |
| `daw` | FTN DAW | `/riddim/daw/` | AVAILABLE | PUBLIC | `riddim` |
| `epk` | FTN EPK | `/radio/#ftn-epk` | AVAILABLE | PUBLIC | `riddim` |
| `kaiso` | FTN Kaiso | `/kaiso/` | AVAILABLE | PUBLIC | — |
| `opportunities` | FTN Opportunities | `/opportunities/` | AVAILABLE | PUBLIC | — |
| `love` | FTN Love | `/love/` | **VAULTED** | **PRIVATE** | — |
| `display-network` | FTN Display Network | `/display-network/` | AVAILABLE | PUBLIC | — |
| `invest` | FTN Invest-in | `/invest/` | AVAILABLE | PUBLIC | — |
| `account` | FTN Account | `/account/` | AVAILABLE | PUBLIC | — |
| `health` | FTN Health | `/health/` | **VAULTED** | **PRIVATE** | — |
| `top-picks` | FTN Picks | `/top-picks/` | AVAILABLE | PUBLIC | `invest` |

`legacyIds` exist for two entries — `ftn-live` also answers to `observatory`, `dj-tube` also
answers to `ftn-dj` — keep both when grepping for references.

## Ecosystem groups (registry `ECOSYSTEM_GROUPS`)

- **Civic & public life** — `community-connect`, `govern`, `parliament`, `facethenation`
- **Information & intelligence** — `display`, `ftn-live`, `kaiso`, `ibis-ai`, `scenario-workspace`
- **Media & culture** — `radio`, `screen`, `tv`
- **Music & creation** — `riddim`, `ftn-fire`, `dj-tube`, `daw`, `epk`
- **Opportunities & business** — `opportunities`, `learn`, `invest`, `top-picks`
- **Community & infrastructure** — `events`, `display-network`

## Naming convention

Every public product is branded `FTN <Name>` (FTN Riddim, FTN Kaiso, FTN Radio, FTN Screen, FTN
Display, FTN Learn, FTN Govern, FTN Parliament, FTN Account, FTN Observer, FTN Invest-in, FTN
Picks, FTN Trust Centre, FTN Nexus Command) — do not invent a product name that skips the `FTN`
prefix, and do not rename an existing one without a registry change plus a decisions.md entry.

## Not yet in the registry

`/trust/` (FTN Trust Centre) and `/god-mode/` (FTN Nexus Command, private founder control) are real
live pages not yet expressed as registry entries as of this reconciliation — if you're asked to
extend either, check whether the registry has been updated since this snapshot before assuming it
still needs one.

## Superseded naming, for grep/history purposes only

The pre-2026-08-23 CLAUDE.md called this product line "ibis.ai" and referred to "FTN Live" as the
homepage's ambient indicator wall. Both are superseded: **ibis.ai → FTN ibis** (same route,
`/ibis-ai/`), and **FTN Live's ambient role → FTN Display** (`/display/`), while the old FTN Live
route (`/observatory/`) now carries the deeper-investigation "FTN Observer" identity. See
release-history.md for the full old narrative if historical context is needed.
