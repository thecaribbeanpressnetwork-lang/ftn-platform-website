// FTN Platform Website — Display Configuration data.
//
// Shared across any future "display" surface (FTN Live web, FTN Display
// Network kiosks, embeddable widgets) — this is deliberately not
// Observatory-specific. A venue preset just pre-fills a DisplayConfig
// object; the object itself is what every renderer (today: observatory.js)
// actually reads.
(function (global) {
  'use strict';

  var INDICATOR_COUNTS = [5, 8, 10, 13, 20, 34, 50, 55, 89, 100];

  var DENSITY_MODES = {
    executive: { label: 'Executive', description: 'Few indicators, large type — built for a glance from across a room.' },
    balanced: { label: 'Balanced', description: 'A working mix of headline numbers and supporting detail.' },
    observatory: { label: 'Observatory', description: 'Maximum indicator density for dedicated viewing.' },
  };

  var VENUE_PRESETS = {
    bank: { label: 'Bank', indicatorCount: 20, density: 'balanced', categories: ['National Economy', 'Energy & Commodities', 'International Context'], adLevel: 'sponsored' },
    bar: { label: 'Bar', indicatorCount: 13, density: 'executive', categories: ['Tourism', 'Weather & Environment', 'Community'], adLevel: 'free' },
    restaurant: { label: 'Restaurant', indicatorCount: 13, density: 'executive', categories: ['Tourism', 'Weather & Environment', 'Public Sector & National Life'], adLevel: 'sponsored' },
    university: { label: 'University', indicatorCount: 34, density: 'observatory', categories: ['National Economy', 'Population & Life', 'International Context', 'Energy & Commodities'], adLevel: 'standard' },
    school: { label: 'School', indicatorCount: 10, density: 'executive', categories: ['Weather & Environment', 'Public Sector & National Life', 'Community'], adLevel: 'free' },
    'government-office': { label: 'Government Office', indicatorCount: 50, density: 'observatory', categories: null, adLevel: 'enterprise' },
    'medical-waiting-room': { label: 'Medical Waiting Room', indicatorCount: 8, density: 'executive', categories: ['Weather & Environment', 'Community', 'Public Sector & National Life'], adLevel: 'premium' },
    'insurance-office': { label: 'Insurance Office', indicatorCount: 13, density: 'balanced', categories: ['National Economy', 'Weather & Environment', 'Infrastructure & Services'], adLevel: 'standard' },
    hotel: { label: 'Hotel', indicatorCount: 13, density: 'executive', categories: ['Tourism', 'Weather & Environment', 'International Context'], adLevel: 'premium' },
    airport: { label: 'Airport', indicatorCount: 20, density: 'balanced', categories: ['Tourism', 'Weather & Environment', 'International Context', 'National Economy'], adLevel: 'sponsored' },
    'corporate-lobby': { label: 'Corporate Lobby', indicatorCount: 13, density: 'executive', categories: ['National Economy', 'International Context'], adLevel: 'premium' },
    newsroom: { label: 'Newsroom', indicatorCount: 55, density: 'observatory', categories: null, adLevel: 'ad-free' },
    'retail-store': { label: 'Retail Store', indicatorCount: 8, density: 'executive', categories: ['Tourism', 'Weather & Environment', 'Community'], adLevel: 'free' },
    custom: { label: 'Custom', indicatorCount: 20, density: 'balanced', categories: null, adLevel: 'standard' },
  };

  function defaultConfig() {
    return {
      screenName: 'FTN Live Display',
      venue: 'custom',
      indicatorCount: 20,
      density: 'balanced',
      categories: null, // null = all categories
      adLevel: 'standard',
      rotation: false,
      savedAt: null,
    };
  }

  function applyPreset(venueKey) {
    var preset = VENUE_PRESETS[venueKey] || VENUE_PRESETS.custom;
    var cfg = defaultConfig();
    cfg.venue = venueKey;
    cfg.indicatorCount = preset.indicatorCount;
    cfg.density = preset.density;
    cfg.categories = preset.categories;
    cfg.adLevel = preset.adLevel;
    return cfg;
  }

  global.FTN = global.FTN || {};
  global.FTN.DisplayConfigData = {
    INDICATOR_COUNTS: INDICATOR_COUNTS,
    DENSITY_MODES: DENSITY_MODES,
    VENUE_PRESETS: VENUE_PRESETS,
    defaultConfig: defaultConfig,
    applyPreset: applyPreset,
  };
})(window);
