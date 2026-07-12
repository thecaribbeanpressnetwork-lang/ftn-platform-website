// FTN Platform Website — advertisement campaign registry.
// Ads are configurable dashboard panels, not hand-placed page furniture: this
// file is the only place that defines what runs, where, and for how long.
// js/ads.js is the generic renderer — it doesn't know about any specific
// campaign, only how to render whatever campaign object it's given.
(function (global) {
  'use strict';

  // messageType is one of: 'Advertisement' | 'Sponsored' | 'FTN Promotion' |
  // 'Public Service Message' (Phase 3.5 §11) — rendered as the panel's own
  // label rather than every placement hardcoding "Advertisement".
  //
  // The house ad here must only ever promote a real, live FTN product — the
  // original sample campaign promoted "Face The Nation" (not yet a live
  // product), which directly conflicted with the standing founder decision
  // to keep Face The Nation unmentioned anywhere on the public site until it
  // actually launches (CLAUDE.md §4). Replaced with Community Connect, which
  // is real and already the site's own primary download CTA.
  var campaigns = [
    {
      id: 'community-connect-house-ad',
      messageType: 'FTN Promotion',
      sponsorLabel: 'FTN Platform',
      headline: 'Community Connect',
      tagline: 'Report what you see. Track what happens next.',
      ctaLabel: 'Download the App',
      ctaHref: '/community-connect/#download',
      placements: ['rail', 'kiosk'],
      startDate: '2026-01-01',
      endDate: null,
      kioskRotation: true,
      status: 'active',
    },
  ];

  function isActive(campaign, now) {
    if (campaign.status !== 'active') return false;
    var start = campaign.startDate ? new Date(campaign.startDate) : null;
    var end = campaign.endDate ? new Date(campaign.endDate) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  }

  function forPlacement(placement) {
    var now = new Date();
    return campaigns.filter(function (c) {
      return c.placements.indexOf(placement) !== -1 && isActive(c, now);
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.getAdsForPlacement = forPlacement;
})(window);
