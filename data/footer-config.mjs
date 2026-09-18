// FTN Platform — canonical footer data source.
// Single source of truth for scripts/sync-footer.mjs.

export const BRAND = {
  tagline: 'One Ecosystem. One Mission. Built for the Caribbean.',
  copyright: '© 2026 FTN Platform. All Rights Reserved. Designed by Boss Consulting.',
};

export const BOTTOM_LINKS = [
  { label: 'Sitemap', href: '/sitemap/' },
  { label: 'Accessibility', href: '/accessibility/' },
  { label: 'FTN Directory', href: '/applications/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'Trust Centre', href: '/trust/' },
];

// FTN Consolidation (2026-09-18): Scenario Workspace, Riddim, Kaiso and Parliament are removed
// from this column -- each is a real, still-live capability of ibis/FTN Live/Govern now, not a
// second, independent product to keep listing as a peer. FTN Govern is added: it was never listed
// here even before consolidation, an existing omission this pass also corrects.
export const FULL_COLUMNS = [
  {
    heading: 'Platform',
    links: [
      { label: 'About FTN', href: '/about/' },
      { registry: 'community-connect' }, { registry: 'ibis-ai' }, { registry: 'ftn-live' },
      { registry: 'govern' }, { registry: 'facethenation' }, { registry: 'events' },
      { registry: 'screen' }, { registry: 'radio' }, { registry: 'opportunities' },
      { registry: 'display-network' }, { registry: 'statistics' },
    ],
  },
  { heading: 'Company', links: [{ label: 'FTN Invest-in', href: '/invest/' }, { label: 'Insights', href: '/insights/' }] },
  { heading: 'Legal', links: [
    { label: 'Privacy Policy', href: '/legal/privacy-policy/' }, { label: 'Terms of Service', href: '/legal/terms-of-service/' },
    { label: 'Cookie Policy', href: '/legal/cookie-policy/' }, { label: 'Data Retention', href: '/legal/data-retention/' },
  ] },
];

export const PAGES = {
  full: [
    '404.html', 'about/index.html', 'accessibility/index.html', 'account/index.html', 'applications/index.html',
    'contact/index.html', 'glossary/index.html', 'govern/index.html', 'health/index.html', 'insights/index.html',
    'invest/index.html', 'legal/affiliate-disclosure/index.html', 'legal/community-guidelines/index.html',
    'legal/cookie-policy/index.html', 'legal/copyright/index.html', 'legal/data-retention/index.html',
    'legal/privacy-policy/index.html', 'legal/responsible-ai/index.html', 'legal/terms-of-service/index.html',
    'love/index.html', 'observatory/index.html', 'parliament/index.html', 'resources/index.html',
    'scenario-workspace/index.html', 'sitemap/index.html', 'statistics/index.html', 'trust/index.html',
    'caribbean-ecosystem-intelligence/index.html',
  ],
  'bottom-only': [
    'clock/index.html', 'display/index.html', 'display-network/index.html', 'events/index.html',
    'facethenation/index.html', 'ibis-ai/index.html', 'index.html', 'kaiso/index.html', 'learn/index.html',
    'opportunities/index.html', 'radio/index.html', 'riddim/index.html', 'screen/index.html', 'tv/index.html',
    'community-connect/index.html', 'top-picks/index.html', 'riddim/fire/index.html', 'riddim/dj/index.html',
    'riddim/daw/index.html',
  ],
};
