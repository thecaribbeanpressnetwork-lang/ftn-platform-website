// FTN Platform — canonical footer data source.
//
// Single source of truth for scripts/sync-footer.mjs. Read GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md's
// footer-consolidation entry for the classification behind this file's two variants before editing.
//
// Two real footer purposes exist on this site, not one -- classified by inspecting every page's
// actual rendered footer before writing this file, not assumed:
//
//   'full'   -- the generic footer (Platform/Company/Legal columns + bottom bar) used by pages that
//               have no reason to curate their own navigation: legal pages, About, Contact,
//               Resources, the Directory, utility/status pages. These 26 pages were meant to share
//               one footer and had drifted into two near-identical, incompletely-overlapping copies
//               (one missing Contact/Trust Centre, the other missing the Resources links) --
//               reconciled here into one canonical version, not redesigned.
//
//   'bottom-only' -- product pages (FTN Screen, FTN TV, FTN ibis, FTN Riddim, FTN Radio, the
//               Kaiso/Display-Network/Events/Opportunities cluster, Clock, Display, Face The
//               Nation, FTN Learn, the homepage) each hand-curate their own footer content columns
//               with page-relevant headings ("Watch", "Creators", "Intelligence") and a deliberately
//               narrow link set -- real, valuable, page-specific navigation, not accidental drift.
//               Per the founder's explicit instruction not to force unlike footers into one layout,
//               these columns are left untouched by the sync script. Only the bottom bar (copyright
//               + Sitemap/Accessibility/Directory/Contact/Trust Centre) is synchronized, since that
//               part -- and specifically the accessibility-critical Contact/Trust Centre links --
//               was inconsistently present or absent across these pages before this pass.
//
// Product names/routes for the 'full' variant's Platform column are looked up live from the
// Product Registry by id at sync time (see scripts/sync-footer.mjs loadRegistry()), not hardcoded
// as label strings -- so a future product rename (e.g. the 2026-08-24 FTN Live migration) updates
// the footer automatically instead of requiring another sitewide text-hunt.

export const BRAND = {
  tagline: 'One Ecosystem. One Mission. Built for the Caribbean.',
  copyright: '© 2026 RealityArtTV Media. All Rights Reserved.',
};

// Present in every footer's bottom bar, both variants -- the actual fix for the accessibility-
// critical link gap this consolidation exists to close (Contact and Trust Centre were missing from
// roughly half the site's footers before this pass).
export const BOTTOM_LINKS = [
  { label: 'Sitemap', href: '/sitemap/' },
  { label: 'Accessibility', href: '/accessibility/' },
  { label: 'FTN Directory', href: '/applications/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'Trust Centre', href: '/trust/' },
];

// 'full' variant only. `registry:'<id>'` entries are resolved against the Product Registry at sync
// time (name + route); plain {label,href} entries are non-product utility pages the registry
// doesn't (and shouldn't) carry.
export const FULL_COLUMNS = [
  {
    heading: 'Platform',
    links: [
      { label: 'About FTN', href: '/about/' },
      { registry: 'community-connect' },
      { registry: 'ftn-live' },
      // 'display' deliberately excluded: it's Display Mode, a capability of 'screen' now (see the
      // 2026-08-24 FTN Live decision), the same as 'tv' -- neither sub-mode gets its own footer
      // link, consistent with each other; FTN Screen's own link covers both.
      { registry: 'scenario-workspace' },
      { registry: 'events' },
      { registry: 'facethenation' },
      { registry: 'ibis-ai' },
      { registry: 'riddim' },
      { registry: 'kaiso' },
      { registry: 'radio' },
      { registry: 'screen' },
      { registry: 'opportunities' },
      { registry: 'display-network' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'FTN Invest-in', href: '/invest/' },
      { label: 'Insights', href: '/insights/' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy-policy/' },
      { label: 'Terms of Service', href: '/legal/terms-of-service/' },
      { label: 'Cookie Policy', href: '/legal/cookie-policy/' },
      { label: 'Data Retention', href: '/legal/data-retention/' },
    ],
  },
];

// Page -> variant. Every page listed here gets its footer region synchronized; a page not listed
// is untouched by scripts/sync-footer.mjs entirely (e.g. private/redirect-stub pages that correctly
// carry no footer at all -- god-mode, mission-control -- are absent on purpose).
export const PAGES = {
  full: [
    '404.html', 'about/index.html', 'accessibility/index.html', 'account/index.html',
    'applications/index.html', 'contact/index.html', 'glossary/index.html', 'govern/index.html',
    'health/index.html', 'insights/index.html', 'invest/index.html',
    'legal/affiliate-disclosure/index.html', 'legal/community-guidelines/index.html',
    'legal/cookie-policy/index.html', 'legal/copyright/index.html', 'legal/data-retention/index.html',
    'legal/privacy-policy/index.html', 'legal/responsible-ai/index.html',
    'legal/terms-of-service/index.html', 'love/index.html', 'observatory/index.html',
    'parliament/index.html', 'resources/index.html', 'scenario-workspace/index.html',
    'sitemap/index.html', 'trust/index.html',
  ],
  'bottom-only': [
    'clock/index.html', 'display/index.html', 'display-network/index.html', 'events/index.html',
    'facethenation/index.html', 'ibis-ai/index.html', 'index.html', 'kaiso/index.html',
    'learn/index.html', 'opportunities/index.html', 'radio/index.html', 'riddim/index.html',
    'screen/index.html', 'tv/index.html',
    // Genuinely thin footers (no content columns at all -- see the ledger's classification) that
    // still need the universal bottom-bar links synced in.
    'community-connect/index.html', 'top-picks/index.html',
    // riddim/fire had a bespoke single-purpose footer missing Privacy/Terms/Contact/Trust entirely;
    // riddim/dj and riddim/daw had no footer at all. All three get a minimal generated bottom bar
    // rather than staying non-compliant -- see sync-footer.mjs's minimal-injection path.
    'riddim/fire/index.html', 'riddim/dj/index.html', 'riddim/daw/index.html',
  ],
};
