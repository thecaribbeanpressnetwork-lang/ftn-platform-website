// FTN Platform Website — Product Registry data.
//
// Single source of truth for FTN ecosystem product identity, routes, visual atmosphere,
// discovery keywords and capability metadata. `status` is an internal routing/governance
// classification only; public product pages do not automatically render it as a badge.
(function (global) {
  'use strict';

  var PRODUCTS = [
    {
      id: 'community-connect',
      name: 'Community Connect',
      tagline: 'See It. Report It. Improve It.',
      description: 'Helping communities turn local observations into visible progress.',
      route: '/community-connect/',
      status: 'available',
      panelAsset: '/assets/panels/01-community-connect.png',
      panelRow: 1,
      atmosphere: { accent: 'var(--color-red)', background: 'photo', motionProfile: 'none', heroStyle: 'photo-real' },
      keywords: ['report', 'issue', 'pothole', 'community', 'neighbourhood', 'infrastructure', 'complaint'],
      capabilities: ['reporting', 'tracking']
    },
    {
      id: 'mission-control',
      name: 'Mission Control',
      tagline: 'Helping Caribbean Governments See the Bigger Picture.',
      description: 'Evidence-based decision support built on the same reports citizens submit.',
      route: '/mission-control/',
      status: 'demonstration',
      panelAsset: '/assets/panels/02-mission-control.png',
      panelRow: 1,
      atmosphere: { accent: 'var(--color-mission-control)', background: 'dark-grid', motionProfile: 'radar-sweep', heroStyle: 'operations-center' },
      keywords: ['government', 'agency', 'dashboard', 'analytics', 'decisions', 'evidence'],
      capabilities: ['analytics', 'decision-support']
    },
    {
      id: 'events',
      name: 'FTN Events',
      tagline: 'Every Event Starts Here.',
      description: 'One prompt. One complete event plan.',
      route: '/events/',
      status: 'available',
      panelAsset: '/assets/panels/03-ftn-events.png',
      panelRow: 1,
      atmosphere: { accent: 'var(--color-events)', background: 'dark-stage', motionProfile: 'spotlight', heroStyle: 'backstage' },
      keywords: ['event', 'concert', 'festival', 'conference', 'wedding', 'plan', 'venue', 'permit'],
      capabilities: ['planning', 'generation', 'export']
    },
    {
      id: 'facethenation',
      name: 'Face The Nation',
      tagline: 'Every Voice. Every Constituency. Every Truth.',
      description: "FTN's flagship public affairs programme, hosted by Ricardo Antoine.",
      route: '/facethenation',
      status: 'available',
      panelAsset: '/assets/panels/04-face-the-nation.png',
      panelRow: 1,
      atmosphere: { accent: 'var(--color-red-on-dark)', background: 'photo', motionProfile: 'none', heroStyle: 'broadcast' },
      keywords: ['interview', 'debate', 'politics', 'public affairs', 'discussion', 'candidate'],
      capabilities: ['broadcast', 'discourse']
    },
    {
      id: 'ibis-ai',
      name: 'ibis.ai',
      tagline: 'Built for the Caribbean.',
      description: 'Understands our people. Understands our communities. Understands our region.',
      route: '/ibis-ai/',
      status: 'available',
      panelAsset: '/assets/panels/05-ibis-ai.png',
      panelRow: 1,
      atmosphere: { accent: 'var(--color-ibis)', background: 'dark-minimal', motionProfile: 'node-pulse', heroStyle: 'calm-focused' },
      keywords: ['help', 'intelligence', 'navigate', 'find', 'assist', 'goal', 'accomplish'],
      capabilities: ['routing', 'intelligence']
    },
    {
      id: 'riddim',
      name: 'FTN Riddim',
      tagline: 'Powering Caribbean Music.',
      description: 'Production, rights, metadata, and music tools built for Caribbean artists.',
      route: '/riddim/',
      status: 'available',
      panelAsset: '/assets/panels/06-ftn-riddim.png',
      panelRow: 2,
      atmosphere: { accent: 'var(--color-riddim)', background: 'dark-studio', motionProfile: 'waveform', heroStyle: 'studio' },
      keywords: ['music', 'artist', 'producer', 'label', 'release', 'track', 'song', 'metadata', 'daw', 'dj'],
      capabilities: ['metadata', 'media', 'audio-processing', 'export']
    },
    {
      id: 'kaiso',
      name: 'FTN Kaiso',
      tagline: 'The Caribbean Newsroom.',
      description: 'News, investigations, and analysis in the public interest.',
      route: '/kaiso/',
      status: 'available',
      panelAsset: '/assets/panels/07-ftn-kaiso.png',
      panelRow: 2,
      atmosphere: { accent: 'var(--color-kaiso)', background: 'dark-editorial', motionProfile: 'none', heroStyle: 'newsroom' },
      keywords: ['news', 'story', 'investigation', 'journalism', 'article', 'tip', 'analysis'],
      capabilities: ['search', 'submission']
    },
    {
      id: 'radio',
      name: 'FTN Radio',
      tagline: 'The Soundtrack of the Caribbean.',
      description: 'Music, talk, and culture across the region.',
      route: '/radio/',
      status: 'available',
      panelAsset: '/assets/panels/08-ftn-radio.png',
      panelRow: 2,
      atmosphere: { accent: 'var(--color-radio)', background: 'dark-warm', motionProfile: 'waveform', heroStyle: 'broadcast-studio' },
      keywords: ['radio', 'music', 'talk', 'culture', 'broadcast', 'segment', 'on-air'],
      capabilities: ['media']
    },
    {
      id: 'screen',
      name: 'FTN Screen',
      tagline: 'Where Caribbean Stories Come Alive.',
      description: 'Local films, Caribbean series, and original programming.',
      route: '/screen/',
      status: 'available',
      panelAsset: '/assets/panels/09-ftn-screen.png',
      panelRow: 2,
      atmosphere: { accent: 'var(--color-screen)', background: 'dark-cinematic', motionProfile: 'none', heroStyle: 'cinematic' },
      keywords: ['film', 'series', 'television', 'creator', 'submission', 'video', 'poster', 'trailer'],
      capabilities: ['metadata', 'media', 'export']
    },
    {
      id: 'opportunities',
      name: 'FTN Opportunities',
      tagline: 'Jobs. Business. Opportunity.',
      description: 'Jobs, grants, procurement, and business opportunities in one place.',
      route: '/opportunities/',
      status: 'available',
      panelAsset: '/assets/panels/10-ftn-opportunities.png',
      panelRow: 2,
      atmosphere: { accent: 'var(--color-opportunities)', background: 'dark-growth', motionProfile: 'rising-line', heroStyle: 'momentum' },
      keywords: ['job', 'grant', 'contract', 'business', 'career', 'procurement', 'funding'],
      capabilities: ['search', 'preferences']
    },
    {
      id: 'love',
      name: 'FTN Love',
      tagline: 'Connecting Hearts Across the Caribbean.',
      description: 'Meaningful connections, built on values, built for us.',
      route: '/love/',
      status: 'available',
      panelAsset: '/assets/panels/11-ftn-love.png',
      panelRow: 3,
      atmosphere: { accent: 'var(--color-love)', background: 'warm', motionProfile: 'heartbeat', heroStyle: 'warm-human' },
      keywords: ['dating', 'relationship', 'connection', 'match', 'compatibility'],
      capabilities: ['preferences']
    },
    {
      id: 'display-network',
      name: 'Display Network',
      tagline: "The Caribbean's Digital Media Network.",
      description: 'Digital displays, public information, and community messaging.',
      route: '/display-network/',
      status: 'initiative',
      panelAsset: '/assets/panels/12-display-network.png',
      panelRow: 3,
      atmosphere: { accent: 'var(--color-display-network)', background: 'dark-infrastructure', motionProfile: 'none', heroStyle: 'infrastructure' },
      keywords: ['signage', 'display', 'advertising', 'deployment', 'venue', 'screen network'],
      capabilities: ['deployment-request']
    },
    {
      id: 'observatory',
      name: 'FTN Live',
      tagline: 'Trinidad & Tobago, live.',
      description: 'National indicators and verified official source links in one view.',
      route: '/observatory/',
      status: 'available',
      panelAsset: null,
      panelRow: null,
      atmosphere: { accent: 'var(--color-red-on-dark)', background: 'dark-grid', motionProfile: 'constellation', heroStyle: 'observatory' },
      keywords: ['indicators', 'data', 'live', 'economy', 'statistics', 'national'],
      capabilities: ['analytics']
    }
  ];

  global.FTN = global.FTN || {};
  global.FTN.ProductRegistryData = PRODUCTS;
})(window);
