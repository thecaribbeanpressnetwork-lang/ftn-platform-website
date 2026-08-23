// FTN Partner & Resource Registry — the single source of truth for every external business,
// resource, or FTN house brand that an FTN page links a visitor out to. Distinct from
// js/product-registry-data.js (FTN's own products) and js/ibis-provider-registry.js (AI/media-
// generation providers IBIS calls itself, server-side) -- this registry is about real, external,
// human-facing businesses and services FTN links TO, never something FTN calls on a visitor's
// behalf. Extends, not duplicates, the existing js/ftn-house-brands.js roster: that file's own
// API is untouched and remains the live source for its one existing caller
// (js/riddim-studio-search.js) -- house-brand ids below are kept identical to that file's ids by
// convention (matching ids, not a shared object reference) so the two stay in sync without risking
// that caller. No affiliate relationship, partnership, or commission is ever recorded here as
// 'confirmed' by an AI session -- only a human founder decision may set affiliate_status to
// 'confirmed'. affiliate_available describes whether the OUTSIDE COMPANY runs a program of its own
// at all; affiliate_status describes FTN's own (non-)participation in it. Fields:
//   id, name, official_url, category, products (related FTN product ids), house_brand (bool),
//   partner_status ('RESOURCE' | 'HOUSE BRAND' | 'FEATURED' | 'AFFILIATE' | 'PARTNER' |
//   'INTEGRATED PROVIDER'), affiliate_available (bool), affiliate_url, affiliate_status
//   ('none' | 'unverified' | 'confirmed'), api_available (bool), source, last_verified (ISO date),
//   notes.
(function (global) {
  'use strict';

  var PARTNERS = [
    // --- FTN house brands (migrated from js/ftn-house-brands.js; that file's own HouseBrands API
    // is unchanged and remains what js/riddim-studio-search.js actually calls) ---
    { id: 'colab-music', name: 'Colab Music', official_url: null, category: 'Recording / Studio', products: ['riddim'], house_brand: true, partner_status: 'HOUSE BRAND', affiliate_available: false, affiliate_url: null, affiliate_status: 'none', api_available: false, source: 'FTN founder-defined house brand roster (js/ftn-house-brands.js)', last_verified: '2026-08-22', notes: 'Recording / Studio, related to FTN Riddim. No public URL recorded for this brand yet -- do not fabricate one.' },
    { id: 'rickboss-recordz', name: 'RickBossRecordz', official_url: null, category: 'Recording / Record Label', products: ['riddim'], house_brand: true, partner_status: 'HOUSE BRAND', affiliate_available: false, affiliate_url: null, affiliate_status: 'none', api_available: false, source: 'FTN founder-defined house brand roster (js/ftn-house-brands.js)', last_verified: '2026-08-22', notes: 'Recording / Record Label, related to FTN Riddim. No public URL recorded for this brand yet -- do not fabricate one.' },
    { id: 'boss-distribution', name: 'BossDistribution', official_url: null, category: 'Music Distribution', products: ['riddim'], house_brand: true, partner_status: 'HOUSE BRAND', affiliate_available: false, affiliate_url: null, affiliate_status: 'none', api_available: false, source: 'FTN founder-defined house brand roster (js/ftn-house-brands.js)', last_verified: '2026-08-22', notes: 'Music Distribution, related to FTN Riddim. No public URL recorded for this brand yet -- do not fabricate one.' },
    { id: 'boss-entertainment', name: 'BossEntertainment', official_url: null, category: 'Events', products: ['events'], house_brand: true, partner_status: 'HOUSE BRAND', affiliate_available: false, affiliate_url: null, affiliate_status: 'none', api_available: false, source: 'FTN founder-defined house brand roster (js/ftn-house-brands.js)', last_verified: '2026-08-22', notes: 'Events, related to FTN Events. No public URL recorded for this brand yet -- do not fabricate one.' },
    { id: 'realityarttv', name: 'RealityArtTV', official_url: null, category: 'Media / Video Production', products: ['screen'], house_brand: true, partner_status: 'HOUSE BRAND', affiliate_available: false, affiliate_url: null, affiliate_status: 'none', api_available: false, source: 'FTN founder-defined house brand roster (js/ftn-house-brands.js)', last_verified: '2026-08-22', notes: 'Media / Video Production, related to FTN Screen. RealityArtTV Media is also this repository\'s own publisher of record (CLAUDE.md Sec 1) -- same name, recorded here only in its house-brand role, not re-litigating that fact.' },
    { id: 'rick-boss', name: 'Rick Boss', official_url: null, category: 'Executive Producer', products: [], house_brand: true, partner_status: 'HOUSE BRAND', affiliate_available: false, affiliate_url: null, affiliate_status: 'none', api_available: false, source: 'FTN founder-defined house brand roster (js/ftn-house-brands.js)', last_verified: '2026-08-22', notes: 'Executive Producer, not tied to a single product.' },

    // --- Real, WebFetch/WebSearch-verified external resources for the Riddim creator journey
    // (Create -> Record -> Distribute -> Promote -> Perform), verified 2026-08-22. None of these
    // are FTN partnerships, affiliate relationships, or API integrations unless explicitly marked
    // otherwise below -- honestly-labeled outbound links to real companies' own official sites. ---
    {
      id: 'distrokid', name: 'DistroKid', official_url: 'https://distrokid.com/', category: 'Music Distribution',
      products: ['riddim'], house_brand: false, partner_status: 'RESOURCE',
      affiliate_available: true, affiliate_url: 'https://distrokid.com/product/partners', affiliate_status: 'unverified',
      api_available: false,
      source: 'WebFetch against distrokid.com/product/partners, 2026-08-22 (the bare homepage returned HTTP 403 to WebFetch but is independently confirmed live and current via WebSearch); WebSearch corroboration for the wider program landscape',
      last_verified: '2026-08-22',
      notes: 'Independent digital music distribution (Spotify/Apple Music/TikTok/etc.). A real, currently-live official Affiliate Program (application via https://app.impact.com/campaign-campaign-info-v2/DistroKid.brand) and a separate Influencer Program (via https://app.creator.co/campaign/distribute-your-music-w-distrokid) both exist on DistroKid\'s own /product/partners page -- confirmed by direct fetch, not assumed. FTN has not applied to or enrolled in either. affiliate_status is deliberately \'unverified\', never \'confirmed\' -- only a founder decision to actually apply and a real approved relationship may change that. /* TODO(founder): review DistroKid\'s Affiliate/Influencer programs above and decide whether to apply -- do not enable without a real approved account. */'
    },
    {
      id: 'onerpm', name: 'ONErpm', official_url: 'https://onerpm.com/', category: 'Music Distribution & Label Services',
      products: ['riddim'], house_brand: false, partner_status: 'RESOURCE',
      affiliate_available: false, affiliate_url: null, affiliate_status: 'none',
      api_available: false,
      source: 'WebFetch against onerpm.com and onerpm.com/distribution-partners/, 2026-08-22',
      last_verified: '2026-08-22',
      notes: 'Music distribution and artist-services company. Its own "Distribution Partners" page is a showcase of the streaming platforms ONErpm delivers to (Spotify, Apple Music, TikTok, etc.), not an affiliate/referral/reseller program for outside businesses -- no genuine affiliate program page was found this pass.'
    },
    {
      id: 'flow-music', name: 'Flow Music (formerly Producer.ai)', official_url: 'https://www.flowmusic.app/', category: 'AI Music Production',
      products: ['riddim', 'ftn-fire'], house_brand: false, partner_status: 'RESOURCE',
      affiliate_available: false, affiliate_url: null, affiliate_status: 'none',
      api_available: false,
      source: 'WebFetch confirmed producer.ai issues a live HTTP 301 redirect to https://www.flowmusic.app/, 2026-08-22; the destination itself returned HTTP 403 to WebFetch, so its identity is corroborated via WebSearch across multiple independent descriptions (e.g. musicmaker.im, tad.ai) naming it "Google Flow Music, formerly ProducerAI" -- not verified by a direct page fetch, flagged honestly rather than assumed',
      last_verified: '2026-08-22',
      notes: 'producer.ai (the name given in this brief) no longer resolves as an independent product -- it now redirects to Google\'s Flow Music at flowmusic.app. This is the same "Flow Music" hand-off FTN Fire\'s own page copy already references (riddim/index.html: "open Flow Music with a copied instrumental-only producer prompt") -- so this resource was already an informal part of the FTN Riddim journey before this registry existed; this record makes it an honest, tracked fact instead of an untracked assumption. Do not confuse this with the separate third-party "MusicAPI Producer / Lyria 3 Pro" API wrapper already recorded in js/ibis-provider-registry.js (id \'musicapi-producer\') -- that is a different company\'s API product, not this one. /* TODO(founder): js/ibis-provider-registry.js\'s own \'producer-ai\' entry still lists website: \'https://producer.ai/\' unchanged since it was first recorded -- worth updating to reflect the flowmusic.app rebrand in a future pass; deliberately not edited here to stay within this task\'s scope. */'
    }
  ];

  function forProduct(productId) {
    return PARTNERS.filter(function (p) { return p.products.indexOf(productId) !== -1; });
  }

  function byStatus(status) {
    return PARTNERS.filter(function (p) { return p.partner_status === status; });
  }

  function get(id) {
    var match = PARTNERS.filter(function (p) { return p.id === id; });
    return match.length ? match[0] : null;
  }

  global.FTN = global.FTN || {};
  global.FTN.PartnerRegistry = { all: PARTNERS, forProduct: forProduct, byStatus: byStatus, get: get };
})(window);
