// Plain data module (no chrome.* dependency) -- a small, honestly-scoped, disclosed registry of
// well-known third-party domains by category, used by background.js to classify observed network
// activity for Data Faucet and to build Shield's block rules. This is NOT a claim of complete
// tracker coverage -- it is a curated, maintainable starting list. Anything not on it is UNKNOWN,
// never silently assumed safe or unsafe.
(function (scope) {
  'use strict';

  const REGISTRY = [
    // Analytics
    { domain: 'google-analytics.com', category: 'ANALYTICS', purpose: 'Web analytics' },
    { domain: 'googletagmanager.com', category: 'ANALYTICS', purpose: 'Tag management / analytics loader' },
    { domain: 'hotjar.com', category: 'ANALYTICS', purpose: 'Session recording / heatmaps' },
    { domain: 'segment.io', category: 'ANALYTICS', purpose: 'Customer data platform' },
    { domain: 'mixpanel.com', category: 'ANALYTICS', purpose: 'Product analytics' },
    { domain: 'amplitude.com', category: 'ANALYTICS', purpose: 'Product analytics' },
    { domain: 'scorecardresearch.com', category: 'ANALYTICS', purpose: 'Audience measurement' },
    { domain: 'quantserve.com', category: 'ANALYTICS', purpose: 'Audience measurement' },
    { domain: 'quantcount.com', category: 'ANALYTICS', purpose: 'Audience measurement' },
    { domain: 'newrelic.com', category: 'ANALYTICS', purpose: 'Performance monitoring' },
    { domain: 'nr-data.net', category: 'ANALYTICS', purpose: 'Performance monitoring' },
    // Advertising
    { domain: 'doubleclick.net', category: 'ADVERTISING', purpose: 'Ad serving' },
    { domain: 'googlesyndication.com', category: 'ADVERTISING', purpose: 'Ad serving' },
    { domain: 'googleadservices.com', category: 'ADVERTISING', purpose: 'Ad serving / conversion tracking' },
    { domain: 'adnxs.com', category: 'ADVERTISING', purpose: 'Programmatic advertising' },
    { domain: 'criteo.com', category: 'ADVERTISING', purpose: 'Retargeting advertising' },
    { domain: 'criteo.net', category: 'ADVERTISING', purpose: 'Retargeting advertising' },
    { domain: 'taboola.com', category: 'ADVERTISING', purpose: 'Content recommendation advertising' },
    { domain: 'outbrain.com', category: 'ADVERTISING', purpose: 'Content recommendation advertising' },
    { domain: 'pubmatic.com', category: 'ADVERTISING', purpose: 'Programmatic advertising' },
    { domain: 'rubiconproject.com', category: 'ADVERTISING', purpose: 'Programmatic advertising' },
    { domain: 'bidswitch.net', category: 'ADVERTISING', purpose: 'Programmatic advertising exchange' },
    { domain: 'adsrvr.org', category: 'ADVERTISING', purpose: 'Programmatic advertising (The Trade Desk)' },
    // Social
    { domain: 'connect.facebook.net', category: 'SOCIAL', purpose: 'Social plugin / pixel' },
    { domain: 'facebook.com/tr', category: 'SOCIAL', purpose: 'Conversion pixel' },
    { domain: 'platform.twitter.com', category: 'SOCIAL', purpose: 'Social embed' },
    { domain: 'analytics.twitter.com', category: 'SOCIAL', purpose: 'Social analytics' },
    { domain: 'platform.linkedin.com', category: 'SOCIAL', purpose: 'Social embed' },
    { domain: 'px.ads.linkedin.com', category: 'SOCIAL', purpose: 'Conversion pixel' },
    { domain: 'tiktok.com/i18n', category: 'SOCIAL', purpose: 'Social embed' },
    { domain: 'analytics.tiktok.com', category: 'SOCIAL', purpose: 'Conversion pixel' },
    { domain: 'pinterest.com/ct', category: 'SOCIAL', purpose: 'Conversion pixel' },
    // Functionally required (payment, CDN, error monitoring) -- observed and labelled, not blocked
    // by default even with Shield on, since blocking these usually breaks the site outright.
    { domain: 'js.stripe.com', category: 'FUNCTIONALLY_REQUIRED', purpose: 'Payment processing', neverBlock: true },
    { domain: 'checkout.stripe.com', category: 'FUNCTIONALLY_REQUIRED', purpose: 'Payment processing', neverBlock: true },
    { domain: 'js.braintreegateway.com', category: 'FUNCTIONALLY_REQUIRED', purpose: 'Payment processing', neverBlock: true },
    { domain: 'cdnjs.cloudflare.com', category: 'FUNCTIONALLY_REQUIRED', purpose: 'Code delivery network', neverBlock: true },
    { domain: 'cdn.jsdelivr.net', category: 'FUNCTIONALLY_REQUIRED', purpose: 'Code delivery network', neverBlock: true },
    { domain: 'fonts.googleapis.com', category: 'FUNCTIONALLY_REQUIRED', purpose: 'Web fonts', neverBlock: true },
    { domain: 'fonts.gstatic.com', category: 'FUNCTIONALLY_REQUIRED', purpose: 'Web font files', neverBlock: true },
    { domain: 'sentry.io', category: 'FUNCTIONALLY_REQUIRED', purpose: 'Error monitoring', neverBlock: false },
  ];

  const INDEX = new Map(REGISTRY.map((r) => [r.domain, r]));

  function hostMatches(hostname, domain) {
    return hostname === domain || hostname.endsWith('.' + domain);
  }

  // Classifies an observed request hostname. Returns UNKNOWN (not a guess dressed up as a finding)
  // for anything not on the curated list.
  function classify(hostname) {
    hostname = String(hostname || '').toLowerCase();
    for (const entry of REGISTRY) {
      if (hostMatches(hostname, entry.domain)) {
        return { category: entry.category, purpose: entry.purpose, knownTracker: entry.category !== 'FUNCTIONALLY_REQUIRED', neverBlock: !!entry.neverBlock, matchedDomain: entry.domain };
      }
    }
    return { category: 'UNKNOWN', purpose: null, knownTracker: false, neverBlock: false, matchedDomain: null };
  }

  // Domains Shield is allowed to generate block rules for -- excludes anything marked neverBlock
  // (payment/CDN/font infrastructure that would break ordinary site functionality if blocked).
  function blockableDomains() {
    return REGISTRY.filter((r) => !r.neverBlock).map((r) => ({ domain: r.domain, category: r.category }));
  }

  scope.FTN_SCARLETT_TRACKERS = { REGISTRY, classify, blockableDomains, INDEX };
})(typeof self !== 'undefined' ? self : this);
