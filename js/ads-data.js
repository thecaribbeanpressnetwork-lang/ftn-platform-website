// FTN Platform Website — advertisement campaign registry.
// Ads are configurable dashboard panels, not hand-placed page furniture: this
// file is the only place that defines what runs, where, and for how long.
// js/ads.js is the generic renderer — it doesn't know about Face The Nation
// specifically, only how to render whatever campaign object it's given.
(function (global) {
  'use strict';

  var campaigns = [
    {
      id: 'face-the-nation-house-ad',
      sponsorLabel: 'Presented by RealityArtTV Media',
      headline: 'Face The Nation',
      tagline: 'Public affairs. National conversation. Real issues.',
      ctaLabel: 'Learn More',
      ctaHref: '/news/',
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
  global.FTN.ads = campaigns;
  global.FTN.getAdsForPlacement = forPlacement;
})(window);
