// FTN Platform — canonical primary-navigation config.
//
// Phase 3 nav consolidation (see GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md). This is the ONE
// ordered list for the sitewide primary navigation row — both the desktop `.site-nav` and the
// mobile `.mobile-nav__links` panel render from it (js/nav.js's PRIMARY_NAV, generated from this
// file by scripts/sync-nav.mjs), and every page's static/no-JS fallback markup is generated from
// the exact same resolved list, so a no-JS visitor and a JS visitor never see a different set of
// links.
//
// Deliberately curated, not auto-derived from every registry product: the platform has ~28 public
// products and only 8 of them belong in the permanently-visible primary row (the rest stay one
// click away in the "FTN Ecosystem" menu, still built live from the full Product Registry — see
// js/nav.js populateEcosystemMenus()). An entry only belongs here if BOTH are true: this file
// lists it, AND (for a real product) that product's own navPlacement.primary is true in
// js/product-registry-data.js. tests/nav-registry-audit.mjs enforces that the two never drift
// apart — that's the actual "registry-driven" guarantee, not this file acting alone.
//
// Two entry shapes:
//   { registry: '<product id>' } -- label/href/description resolve from the Product Registry
//     entry's name/route/tagline (tagline, not purposeStatement -- the latter is internal
//     governance prose, not user-facing copy). Requires navPlacement.primary === true on that
//     product (enforced by the audit).
//   { label, href, description } -- a literal entry for a real site destination that is not an
//     FTN "product" in the registry sense (FTN Directory/About/Contact: navigational structure,
//     not a bounded product with its own primaryJourney/dataSources/etc).
//
// Order here IS the render order -- there is no separate priority number to keep in sync.
// FTN Consolidation (2026-09-18, see GOVERNANCE/FTN_Consolidation_2026-09-18.md): Parliament, TV,
// Kaiso and Riddim were removed from this row -- each is now a real, still-live capability inside
// its parent CORE_NODE (Parliament -> Govern, TV -> Screen, Kaiso -> FTN Live, Riddim -> ibis),
// not deleted, just no longer presented as a peer top-level product. FTN ibis, FTN Govern and FTN
// Screen were added -- they are the coherent civic/media/intelligence systems those capabilities
// now live inside, and belong in the primary row on their own merits, independent of absorption.
export const PRIMARY_NAV = [
  { registry: 'platform-home' },
  { registry: 'community-connect' },
  { registry: 'ibis-ai' },
  { registry: 'ftn-live' },
  { registry: 'govern' },
  { registry: 'screen' },
  { registry: 'opportunities' },
  { registry: 'invest' },
  { label: 'FTN Directory', href: '/applications/', description: 'Browse FTN products, capabilities and data services' },
  { label: 'About FTN', href: '/about/', description: 'Who FTN is and how the platform works' },
  { label: 'Contact', href: '/contact/', description: 'Reach the FTN team' },
];
