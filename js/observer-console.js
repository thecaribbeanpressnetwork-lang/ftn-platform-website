// FTN Platform Website — Observer Console.
//
// Everything Observer-specific lives in this one file (source registry, correlation engine,
// console renderer) to keep /observatory/'s script-tag count inside FTN's owned performance
// budget (tests/performance-budget.mjs) — three separate files would each need their own
// <script> tag for no real architectural benefit, since only this page ever loads any of them.
// js/ftn-source-provenance.js stays a separate, shared script because it's genuinely reused
// infrastructure (also loaded standalone by tests/ftn-source-provenance-audit.mjs) — merging it
// in here would duplicate a dependency other consumers already share.
//
// Three sections below, in dependency order:
//   1. SOURCE REGISTRY — one place every Observer category/view reads from, the same
//      "registry, not one-off widgets" pattern already used by js/indicators-data.js (CLAUDE.md
//      §7.1). sourceClass values are js/ftn-source-provenance.js's SOURCE_QUALITY vocabulary
//      (OFFICIAL_GOVERNMENT, CORPORATE_STATEMENT, PRIMARY_EVIDENCE, ...) — that module
//      classifies external material FTN did not produce, which is exactly every Observer
//      source; js/trust-card.js's classification list (Official/Sourced/FTN Derived/...) is a
//      deliberately separate vocabulary for FTN's OWN indicator claims and is not reused here.
//   2. CORRELATION ENGINE — a real, bounded rule-based engine, not a speculative one: it
//      evaluates a fixed, documented set of domain relationships (heavy rain can produce
//      flooding, which can disrupt roads/ferries/power) and is explicit about which of those it
//      can actually verify right now versus which it cannot. Extends the existing shared
//      Relationship Engine (js/relationships-data.js) rather than forking a second registry
//      (CLAUDE.md §7.3, "the pattern to extend, never fork"). Confidence is computed with
//      js/ftn-source-provenance.js's claimConfidence() — a chain is only as confident as its
//      weakest, least-corroborated real signal, never inflated by rule count.
//   3. CONSOLE RENDERER — the primary Trinidad & Tobago observation canvas: compact category
//      nav (NOW/WEATHER/TRANSPORT/MARINE/EARTH/ENVIRONMENT/SAFETY/INFRASTRUCTURE/CIVIC) plus a
//      content canvas beneath it. Category switching is hash-routed (#observer/<category>) so a
//      link into a specific category is shareable and degrades to the NOW view with JS disabled.
(function (global) {
  'use strict';

  // ============================================================ 1. SOURCE REGISTRY

  var CATEGORIES = [
    { id: 'now', label: 'Now', eyebrow: 'Default view' },
    { id: 'weather', label: 'Weather', eyebrow: 'Radar · satellite · lightning · warnings' },
    { id: 'transport', label: 'Transport', eyebrow: 'Airports · airbridge · ferry · roads' },
    { id: 'marine', label: 'Marine', eyebrow: 'Vessels · conditions · advisories' },
    { id: 'earth', label: 'Earth', eyebrow: 'Earthquakes · volcanoes · tsunami' },
    { id: 'environment', label: 'Environment', eyebrow: 'Air quality' },
    { id: 'safety', label: 'Safety', eyebrow: 'Crime stats · public safety · alerts' },
    { id: 'infrastructure', label: 'Infrastructure', eyebrow: 'Power · roads · disruptions' },
    { id: 'civic', label: 'Civic', eyebrow: 'Parliament · official notices' }
  ];

  // Views, grouped by category. "now" has no views of its own — the NOW canvas is a live
  // synthesis built below from the real-time views tagged nowFeed:true, plus quick links into
  // every other category (per brief: "an operational summary, not another news feed").
  //
  // embedType controls how the renderer draws the view: 'live-image' (hotlinked, cache-busted
  // image), 'anchor' (jump to a live view already rendered elsewhere on the page), 'iframe'
  // (third party permits framing), or 'external' (FTN source card + outbound link — used
  // whenever framing is blocked/unverified or no lawful API exists).
  var VIEWS = [
    // ---------------------------------------------------------------- WEATHER
    {
      id: 'weather-radar', category: 'weather', title: 'Rainfall Radar', signal: 'RADAR',
      embedType: 'live-image',
      imageUrl: 'https://www.metoffice.gov.tt/media/radar/400km/ppi/ppi1.png',
      authority: 'Trinidad and Tobago Meteorological Service', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.metoffice.gov.tt/observations/radar-imagery',
      description: 'Latest published 400km-range rainfall reflectivity frame from the Piarco weather radar.',
      status: 'CURRENT', nowFeed: false
    },
    {
      id: 'weather-satellite', category: 'weather', title: 'Satellite (GOES-19)', signal: 'SAT',
      embedType: 'anchor', anchorSelector: '.ftn-sat',
      authority: 'NOAA / NESDIS / STAR', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=car&src=nav',
      description: 'Current GOES-19 GeoColor Caribbean view — already live at the top of this page.',
      status: 'LIVE', nowFeed: false
    },
    {
      id: 'weather-lightning', category: 'weather', title: 'Lightning', signal: 'LTG',
      embedType: 'iframe',
      iframeUrl: 'https://map.blitzortung.org/#5.5/10.6/-61.3',
      authority: 'Blitzortung.org community lightning network', sourceClass: 'PRIMARY_EVIDENCE',
      sourceUrl: 'https://www.lightningmaps.org/',
      description: 'Community-network lightning strike detections, centered on Trinidad & Tobago. Coverage and detection density are not guaranteed by FTN.',
      status: 'LIVE', nowFeed: true, nowLabel: 'Lightning network'
    },
    {
      id: 'weather-warnings', category: 'weather', title: 'Warnings', signal: 'WARN',
      embedType: 'external',
      authority: 'Trinidad and Tobago Meteorological Service', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.metoffice.gov.tt/',
      description: 'Official weather warnings and advisories. FTN does not parse or restate warning text — open the source for the current bulletin.',
      status: 'EXTERNAL', nowFeed: true, nowLabel: 'Weather warnings'
    },
    {
      id: 'weather-flood', category: 'weather', title: 'Flood / Landslide', signal: 'FLD',
      embedType: 'external',
      authority: 'Office of Disaster Preparedness and Management (ODPM)', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://odpm.gov.tt/',
      description: 'Flood and landslide bulletins, when published.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'weather-marine', category: 'weather', title: 'Marine Weather', signal: 'MWX',
      embedType: 'external',
      authority: 'Trinidad and Tobago Meteorological Service', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.metoffice.gov.tt/',
      description: 'Marine forecast and sea-state guidance. See Marine → Marine Conditions for the coastal-advisory view.',
      status: 'EXTERNAL', nowFeed: false
    },

    // ---------------------------------------------------------------- TRANSPORT
    {
      id: 'transport-piarco', category: 'transport', title: 'Piarco International Airport', signal: 'POS',
      embedType: 'external',
      authority: 'Airports Authority of Trinidad and Tobago / Flightradar24', sourceClass: 'CORPORATE_STATEMENT',
      sourceUrl: 'https://www.flightradar24.com/data/airports/pos',
      description: 'No verified public real-time arrivals/departures API was found for Piarco. Open the live Flightradar24 airport view for current movements.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'transport-anr', category: 'transport', title: 'A.N.R. Robinson International Airport', signal: 'TAB',
      embedType: 'external',
      authority: 'Airports Authority of Trinidad and Tobago / Flightradar24', sourceClass: 'CORPORATE_STATEMENT',
      sourceUrl: 'https://www.flightradar24.com/data/airports/tab',
      description: 'No verified public real-time arrivals/departures API was found for Tobago. Open the live Flightradar24 airport view for current movements.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'transport-airbridge', category: 'transport', title: 'Airbridge (Trinidad ↔ Tobago)', signal: 'AIR',
      embedType: 'external',
      authority: 'Caribbean Airlines', sourceClass: 'CORPORATE_STATEMENT',
      sourceUrl: 'https://www.caribbean-airlines.com/',
      description: 'No live inter-island flight-status feed is published for FTN to connect to. Book or check schedules directly with Caribbean Airlines.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'transport-ferry', category: 'transport', title: 'Ferry (Port of Spain ↔ Scarborough)', signal: 'SEA',
      embedType: 'external',
      authority: 'Port Authority of Trinidad and Tobago (T&T Inter-Island Ferry Service)', sourceClass: 'CORPORATE_STATEMENT',
      sourceUrl: 'https://www.patnt.com/',
      description: 'No live vessel-status feed is published for FTN to connect to. Check current schedule, delay or cancellation notices directly with the Port Authority.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'transport-flightradar', category: 'transport', title: 'Flight Radar', signal: 'FR24',
      embedType: 'external', framingBlocked: true,
      authority: 'Flightradar24', sourceClass: 'CORPORATE_STATEMENT',
      sourceUrl: 'https://www.flightradar24.com/10.5,-61.0/8',
      description: 'Flightradar24 sends X-Frame-Options: SAMEORIGIN — it does not permit embedding. Opens the live Trinidad & Tobago-centered public view.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'transport-notams', category: 'transport', title: 'Aviation Notices', signal: 'NOTAM',
      embedType: 'external',
      authority: 'Trinidad and Tobago Civil Aviation Authority', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.ttcaa.gov.tt/',
      description: 'Official aviation operational notices, kept distinct from aircraft tracking above.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'transport-roads', category: 'transport', title: 'Roads / Traffic', signal: 'ROAD',
      embedType: 'external',
      authority: 'Ministry of Works and Transport', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.mowt.gov.tt/Divisions/Highways-Division/Notices',
      description: 'Published road closures, disruptions and condition notices. FTN does not claim any live traffic-camera feed.',
      status: 'EXTERNAL', nowFeed: true, nowLabel: 'Roads'
    },

    // ---------------------------------------------------------------- MARINE
    {
      id: 'marine-vessels', category: 'marine', title: 'Vessels', signal: 'AIS',
      embedType: 'external', framingBlocked: true,
      authority: 'MarineTraffic', sourceClass: 'CORPORATE_STATEMENT',
      sourceUrl: 'https://www.marinetraffic.com/en/ais/home/centerx:-61.0/centery:10.5/zoom:7',
      description: 'MarineTraffic sends X-Frame-Options: SAMEORIGIN — it does not permit embedding. Opens the live Trinidad & Tobago-centered public AIS view.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'marine-conditions', category: 'marine', title: 'Marine Conditions', signal: 'SEA',
      embedType: 'external',
      authority: 'Trinidad and Tobago Meteorological Service', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.metoffice.gov.tt/',
      description: 'Sea state, marine forecast and coastal conditions.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'marine-advisories', category: 'marine', title: 'Small Craft / Coastal Advisories', signal: 'ADV',
      embedType: 'external',
      authority: 'Office of Disaster Preparedness and Management (ODPM)', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://odpm.gov.tt/',
      description: 'Small-craft and coastal advisories, when published.',
      status: 'EXTERNAL', nowFeed: false
    },

    // ---------------------------------------------------------------- EARTH
    {
      id: 'earth-earthquakes', category: 'earth', title: 'Earthquakes', signal: 'EQ',
      embedType: 'external',
      authority: 'UWI Seismic Research Centre', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://uwiseismic.com/earthquakes/recent-earthquakes/',
      description: 'Recent seismic events for Trinidad & Tobago and the Eastern Caribbean.',
      status: 'EXTERNAL', nowFeed: true, nowLabel: 'Seismic activity'
    },
    {
      id: 'earth-volcanoes', category: 'earth', title: 'Volcanoes', signal: 'VOL',
      embedType: 'external',
      authority: 'UWI Seismic Research Centre', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://uwiseismic.com/',
      description: 'Regional volcanic monitoring and status. Coverage of the wider Eastern Caribbean does not imply activity in Trinidad itself.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'earth-tsunami', category: 'earth', title: 'Tsunami', signal: 'TSU',
      embedType: 'external',
      authority: 'UWI Seismic Research Centre / Pacific Tsunami Warning Center (Caribbean)', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://uwiseismic.com/',
      description: 'Current tsunami advisories are distinct from historical information — check the source for present status before relying on this card’s age.',
      status: 'HISTORICAL', nowFeed: false
    },

    // ---------------------------------------------------------------- ENVIRONMENT
    {
      id: 'environment-air-quality', category: 'environment', title: 'Air Quality', signal: 'AQI',
      embedType: 'external', framingBlocked: true,
      authority: 'Environmental Management Authority (EMA)', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://ei.weblakes.com/RTTPublic/DshBrdAQI',
      description: 'Station-level air quality monitoring. The dashboard sends X-Frame-Options: SAMEORIGIN. FTN does not synthesize a national AQI from individual stations.',
      status: 'EXTERNAL', nowFeed: false
    },

    // ---------------------------------------------------------------- SAFETY
    {
      id: 'safety-crime-stats', category: 'safety', title: 'Crime Statistics', signal: 'STAT',
      embedType: 'external',
      authority: 'Trinidad and Tobago Police Service', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.ttps.gov.tt/',
      description: 'Historical published crime statistics. This is not a live incident feed — never treated as one.',
      status: 'HISTORICAL', nowFeed: false
    },
    {
      id: 'safety-public-safety', category: 'safety', title: 'Public Safety', signal: 'TTPS',
      embedType: 'external',
      authority: 'TTPS · Fire Service · ODPM · Ministry of Homeland Security', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.ttps.gov.tt/media-notices/',
      description: 'Verified public information from official emergency agencies.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'safety-alerts', category: 'safety', title: 'Official Alerts', signal: 'ALERT',
      embedType: 'external',
      authority: 'Office of Disaster Preparedness and Management (ODPM)', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://odpm.gov.tt/',
      description: 'Official public-safety alerts and advisories.',
      status: 'EXTERNAL', nowFeed: true, nowLabel: 'Public safety'
    },

    // ---------------------------------------------------------------- INFRASTRUCTURE
    {
      id: 'infra-power', category: 'infrastructure', title: 'Power (T&TEC)', signal: 'PWR',
      embedType: 'external',
      authority: 'Trinidad and Tobago Electricity Commission (T&TEC)', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://ttec.co.tt/',
      description: 'Scheduled interruptions and service notices. FTN does not represent a live national grid map.',
      status: 'EXTERNAL', nowFeed: true, nowLabel: 'Power notices'
    },
    {
      id: 'infra-roads', category: 'infrastructure', title: 'Roads / Traffic', signal: 'ROAD',
      embedType: 'external',
      authority: 'Ministry of Works and Transport', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.mowt.gov.tt/Divisions/Highways-Division/Notices',
      description: 'Same source as Transport → Roads / Traffic, shown here for the infrastructure view.',
      status: 'EXTERNAL', nowFeed: false
    },
    {
      id: 'infra-disruptions', category: 'infrastructure', title: 'Service Disruptions', signal: 'SVC',
      embedType: 'external',
      authority: 'Trinidad and Tobago Electricity Commission (T&TEC)', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://ttec.co.tt/',
      description: 'Service-disruption notices as published.',
      status: 'EXTERNAL', nowFeed: false
    },

    // ---------------------------------------------------------------- CIVIC
    {
      id: 'civic-parliament', category: 'civic', title: 'Parliament', signal: 'PARL',
      embedType: 'external',
      authority: 'Parliament of the Republic of Trinidad and Tobago', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.ttparliament.org/',
      description: 'Current, next and latest verified sitting status. FTN never simulates a live sitting — see Face The Nation for civic-discourse programming.',
      status: 'EXTERNAL', nowFeed: true, nowLabel: 'Parliament'
    },
    {
      id: 'civic-notices', category: 'civic', title: 'Government Notices', signal: 'GOV',
      embedType: 'external',
      authority: 'Government of the Republic of Trinidad and Tobago', sourceClass: 'OFFICIAL_GOVERNMENT',
      sourceUrl: 'https://www.news.gov.tt/',
      description: 'High-value current public notices. FTN Directory covers the full government/ecosystem directory role — this is not that.',
      status: 'EXTERNAL', nowFeed: false
    }
  ];

  function viewsFor(categoryId) {
    return VIEWS.filter(function (v) { return v.category === categoryId; });
  }

  function nowFeeds() {
    return VIEWS.filter(function (v) { return v.nowFeed; });
  }

  global.FTN = global.FTN || {};
  global.FTN.Observer = {
    categories: CATEGORIES,
    views: VIEWS,
    viewsFor: viewsFor,
    nowFeeds: nowFeeds,
    // The date every external-link source in this registry was last confirmed to be the
    // correct, current, lawfully-linkable authoritative page (not a claim that the page's own
    // content is unchanged since then — see js/ftn-source-provenance.js freshnessDays()).
    lastVerified: '2026-08-21'
  };

  // ============================================================ 2. CORRELATION ENGINE

  var CORRELATION_EDGES = [
    {
      id: 'observer-rain-to-downstream', title: 'Heavy Rainfall → Downstream Disruption Risk', type: 'influence',
      fromIndicatorId: 'rainfall', fromLabel: 'Rainfall (30-day)', fromObserverViewId: 'weather-radar',
      toIndicatorId: 'flood-alerts', toLabel: 'Flood Warning Risk', toObserverViewId: 'weather-flood',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented meteorological relationship (sustained heavy rainfall raises flood risk) — not a statistically fitted coefficient for Trinidad & Tobago.',
      limitations: 'This is domain knowledge, not a live-fitted model. Whether current rainfall is actually producing flood conditions is decided by the Met Office/ODPM sources, not by FTN.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-flood-to-roads', title: 'Flood Warning → Road Disruption', type: 'influence',
      fromIndicatorId: 'flood-alerts', fromLabel: 'Flood Warning Risk', fromObserverViewId: 'weather-flood',
      toIndicatorId: 'road-condition-reports', toLabel: 'Road Disruption', toObserverViewId: 'transport-roads',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented relationship — active flooding commonly closes or degrades roads in low-lying areas.',
      limitations: 'Not evaluated against real current road-closure data; the Ministry of Works and Transport is the authority on actual closures.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-flood-to-ferry', title: 'Flood / Severe Weather → Ferry Disruption', type: 'influence',
      fromIndicatorId: 'flood-alerts', fromLabel: 'Flood Warning Risk', fromObserverViewId: 'weather-flood',
      toIndicatorId: null, toLabel: 'Ferry Disruption', toObserverViewId: 'transport-ferry',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented relationship — the same severe-weather conditions that cause flooding (heavy swell, poor visibility, high wind) can also disrupt the Port of Spain ↔ Scarborough ferry.',
      limitations: 'Not a claim of a direct flood-causes-ferry-delay mechanism; both share a common severe-weather cause. The Port Authority is the authority on actual sailing status.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-flood-to-power', title: 'Flood / Severe Weather → Power Interruption', type: 'influence',
      fromIndicatorId: 'flood-alerts', fromLabel: 'Flood Warning Risk', fromObserverViewId: 'weather-flood',
      toIndicatorId: null, toLabel: 'Power Interruption', toObserverViewId: 'infra-power',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented relationship — severe weather (wind, flooding, lightning) is a common cause of unplanned T&TEC service interruptions.',
      limitations: 'Not evaluated against real current outage data. T&TEC is the authority on actual interruptions.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-disruption-to-reports', title: 'Visible Disruption → Community Connect Reports', type: 'influence',
      fromIndicatorId: 'road-condition-reports', fromLabel: 'Road / Service Disruption', fromObserverViewId: 'transport-roads',
      toIndicatorId: null, toLabel: 'Community Connect Reports', toObserverViewId: null,
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented pattern — visible disruption (flooding, road closures, outages) typically increases citizen reporting volume in a reporting app.',
      limitations: 'FTN Observer has no live connection to Community Connect report volume in this pass — this is the documented future integration point, not a live count.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    },
    {
      id: 'observer-reports-to-response', title: 'Community Connect Reports → Official Response', type: 'dependency',
      fromIndicatorId: null, fromLabel: 'Community Connect Reports', fromObserverViewId: null,
      toIndicatorId: null, toLabel: 'Official Response', toObserverViewId: 'civic-notices',
      direction: 'positive', confidence: 'Low', classification: 'Illustrative',
      methodology: 'Documented civic pattern — reported issues are the input official agencies (T&TEC, MOWT, ODPM) act on and publish notices about.',
      limitations: 'FTN does not track whether a specific report produced a specific official notice — this states the general dependency, not a verified case.',
      sampleSize: null, timeCoverage: null, geoCoverage: 'National', strength: null, value: 'rule', units: ''
    }
  ];

  function registerCorrelationEdgesIntoRelationshipEngine() {
    var Rel = global.FTN && global.FTN.Relationships;
    if (!Rel || !Array.isArray(Rel.all)) return;
    var existingIds = {};
    Rel.all.forEach(function (r) { existingIds[r.id] = true; });
    CORRELATION_EDGES.forEach(function (e) { if (!existingIds[e.id]) Rel.all.push(e); });
  }
  registerCorrelationEdgesIntoRelationshipEngine();

  // The one real, currently-live signal available to this engine: current Port of Spain
  // precipitation from the same Open-Meteo fetch the NOW view already performs. A rate above
  // this threshold is what "watching" means below — an explicit, documented number, not a
  // hidden one. Everything downstream of it is honestly reported as not-monitored, because FTN
  // has no live parser for flood/road/ferry/power status.
  var HEAVY_RAIN_MM = 4;

  function evaluateCorrelation(currentPrecipitationMm) {
    var Prov = global.FTN && global.FTN.SourceProvenance;
    var rainActive = Number.isFinite(currentPrecipitationMm) && currentPrecipitationMm >= HEAVY_RAIN_MM;
    var rainRecord = Prov ? Prov.sourceRecord({
      sourceId: 'open-meteo-precipitation', owner: 'Open-Meteo', sourceClass: 'CORPORATE_STATEMENT',
      url: 'https://open-meteo.com/', retrievedAt: new Date().toISOString(), retrievalMethod: 'DIRECT_FETCH',
      geographicRelevance: 'Port of Spain', consumingProducts: ['FTN Observer Correlation Engine']
    }) : null;
    var confidence = Prov && rainRecord ? Prov.claimConfidence([rainRecord]) : { confidence: 'UNSUPPORTED', ceilingQuality: null, corroboration: 0 };

    var chain = CORRELATION_EDGES.map(function (edge, i) {
      var status;
      if (i === 0) {
        status = Number.isFinite(currentPrecipitationMm)
          ? (rainActive ? 'WATCHING' : 'NO SIGNAL')
          : 'UNKNOWN';
      } else {
        status = 'NOT MONITORED';
      }
      return {
        id: edge.id, title: edge.title, toLabel: edge.toLabel,
        toObserverViewId: edge.toObserverViewId, methodology: edge.methodology, status: status
      };
    });

    return {
      chain: chain,
      rainfall: { mm: Number.isFinite(currentPrecipitationMm) ? currentPrecipitationMm : null, thresholdMm: HEAVY_RAIN_MM, active: rainActive },
      overallConfidence: confidence.confidence,
      confidenceCeiling: confidence.ceilingQuality,
      explanation: rainActive
        ? 'Current rainfall meets the documented "heavy rainfall" threshold — the chain below shows which downstream categories that historically affects. FTN has not verified that any of them are actually disrupted right now; open each category for its official source.'
        : 'Current rainfall is below the documented "heavy rainfall" threshold, so this chain has no active trigger right now. The relationships themselves remain documented for reference.',
      generatedAt: new Date().toISOString()
    };
  }

  global.FTN.ObserverCorrelation = { edges: CORRELATION_EDGES.slice(), evaluate: evaluateCorrelation, HEAVY_RAIN_MM: HEAVY_RAIN_MM };

  // ============================================================ 3. CONSOLE RENDERER

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var QUALITY_BADGE_CLASS = {
    PRIMARY_EVIDENCE: 'trust-badge--official',
    OFFICIAL_GOVERNMENT: 'trust-badge--official',
    LEGISLATION_PUBLIC_RECORD: 'trust-badge--official',
    ACADEMIC: 'trust-badge--sourced',
    REPUTABLE_JOURNALISM: 'trust-badge--sourced',
    CORPORATE_STATEMENT: 'trust-badge--sourced',
    COMMUNITY_DISCUSSION: 'trust-badge--estimated',
    CREATOR_SOCIAL: 'trust-badge--estimated',
    PERSONAL_COMMENTARY: 'trust-badge--demo',
    MARKETING_ADVOCACY: 'trust-badge--demo',
    UNKNOWN: 'trust-badge--demo'
  };

  function qualityLabel(quality) {
    return String(quality || 'UNKNOWN').replace(/_/g, ' ');
  }

  function badgeClass(sourceQuality) {
    return QUALITY_BADGE_CLASS[sourceQuality] || 'trust-badge--demo';
  }

  function retrievalMethodFor(embedType) {
    if (embedType === 'live-image' || embedType === 'anchor') return 'DIRECT_FETCH';
    if (embedType === 'iframe') return 'THIRD_PARTY_AGGREGATOR';
    return 'MANUAL_ENTRY';
  }

  function provenanceOf(view) {
    var Prov = global.FTN && global.FTN.SourceProvenance;
    if (!Prov) return null;
    var isLive = view.embedType === 'live-image' || view.embedType === 'iframe' || view.embedType === 'anchor';
    var retrievedAt = isLive ? new Date().toISOString() : ((global.FTN.Observer && global.FTN.Observer.lastVerified) + 'T00:00:00Z');
    return Prov.sourceRecord({
      sourceId: view.id,
      owner: view.authority,
      sourceClass: view.sourceClass,
      url: view.sourceUrl,
      retrievedAt: retrievedAt,
      retrievalMethod: retrievalMethodFor(view.embedType),
      geographicRelevance: 'Trinidad and Tobago',
      consumingProducts: ['FTN Observer']
    });
  }

  function freshnessLine(view) {
    var Prov = global.FTN && global.FTN.SourceProvenance;
    var record = provenanceOf(view);
    if (!Prov || !record) return '';
    var isLive = view.embedType === 'live-image' || view.embedType === 'iframe' || view.embedType === 'anchor';
    if (isLive) return '<span class="observer-card__freshness">Retrieved just now</span>';
    var days = Prov.freshnessDays(record);
    if (days == null) return '';
    var text = days <= 0 ? 'Source last verified today' : ('Source last verified ' + days + (days === 1 ? ' day ago' : ' days ago'));
    return '<span class="observer-card__freshness">' + esc(text) + '</span>';
  }

  function statusPillClass(status) {
    var map = {
      LIVE: 'observer-status--live',
      CURRENT: 'observer-status--current',
      DELAYED: 'observer-status--delayed',
      SCHEDULED: 'observer-status--scheduled',
      HISTORICAL: 'observer-status--historical',
      ARCHIVED: 'observer-status--historical',
      EXTERNAL: 'observer-status--external'
    };
    return map[status] || 'observer-status--external';
  }

  function sourceCard(view) {
    var blockedNote = view.framingBlocked
      ? '<p class="observer-card__blocked">Embedding is blocked by the provider — FTN does not bypass X-Frame-Options/CSP.</p>'
      : '';
    return '' +
      '<article class="observer-card" data-view="' + esc(view.id) + '">' +
        '<div class="observer-card__top">' +
          '<span class="observer-card__signal" aria-hidden="true">' + esc(view.signal || '') + '</span>' +
          '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '</div>' +
        '<h3 class="observer-card__title">' + esc(view.title) + '</h3>' +
        '<p class="observer-card__desc">' + esc(view.description) + '</p>' +
        blockedNote +
        '<div class="observer-card__meta">' +
          '<span class="trust-badge ' + badgeClass(view.sourceClass) + '">' + esc(qualityLabel(view.sourceClass)) + '</span>' +
          '<span class="observer-card__authority">' + esc(view.authority) + '</span>' +
          freshnessLine(view) +
        '</div>' +
        '<a class="btn btn-outline btn-sm observer-card__action" href="' + esc(view.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' +
          (view.framingBlocked ? 'Open live view →' : 'Open original source →') +
        '</a>' +
      '</article>';
  }

  function imageCard(view) {
    var cacheBust = 'ftn=' + Date.now();
    var src = view.imageUrl + (view.imageUrl.indexOf('?') === -1 ? '?' : '&') + cacheBust;
    return '' +
      '<article class="observer-card observer-card--media" data-view="' + esc(view.id) + '">' +
        '<div class="observer-card__top">' +
          '<span class="observer-card__signal" aria-hidden="true">' + esc(view.signal || '') + '</span>' +
          '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '</div>' +
        '<h3 class="observer-card__title">' + esc(view.title) + '</h3>' +
        '<div class="observer-card__frame observer-card__frame--image">' +
          '<img src="' + esc(src) + '" alt="' + esc(view.title) + ' — latest published image from ' + esc(view.authority) + '" loading="lazy">' +
        '</div>' +
        '<p class="observer-card__desc">' + esc(view.description) + '</p>' +
        '<div class="observer-card__meta">' +
          '<span class="trust-badge ' + badgeClass(view.sourceClass) + '">' + esc(qualityLabel(view.sourceClass)) + '</span>' +
          '<span class="observer-card__authority">' + esc(view.authority) + '</span>' +
          freshnessLine(view) +
        '</div>' +
        '<button type="button" class="btn btn-outline btn-sm observer-card__refresh" data-refresh-image>Refresh image</button> ' +
        '<a class="btn btn-outline btn-sm observer-card__action" href="' + esc(view.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open original source →</a>' +
      '</article>';
  }

  function iframeCard(view) {
    return '' +
      '<article class="observer-card observer-card--media" data-view="' + esc(view.id) + '">' +
        '<div class="observer-card__top">' +
          '<span class="observer-card__signal" aria-hidden="true">' + esc(view.signal || '') + '</span>' +
          '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '</div>' +
        '<h3 class="observer-card__title">' + esc(view.title) + '</h3>' +
        '<div class="observer-card__frame observer-card__frame--iframe">' +
          '<iframe src="' + esc(view.iframeUrl) + '" title="' + esc(view.title) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
        '</div>' +
        '<p class="observer-card__desc">' + esc(view.description) + '</p>' +
        '<div class="observer-card__meta">' +
          '<span class="trust-badge ' + badgeClass(view.sourceClass) + '">' + esc(qualityLabel(view.sourceClass)) + '</span>' +
          '<span class="observer-card__authority">' + esc(view.authority) + '</span>' +
          freshnessLine(view) +
        '</div>' +
        '<a class="btn btn-outline btn-sm observer-card__action" href="' + esc(view.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open live map →</a>' +
      '</article>';
  }

  function anchorCard(view) {
    return '' +
      '<article class="observer-card observer-card--anchor" data-view="' + esc(view.id) + '">' +
        '<div class="observer-card__top">' +
          '<span class="observer-card__signal" aria-hidden="true">' + esc(view.signal || '') + '</span>' +
          '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '</div>' +
        '<h3 class="observer-card__title">' + esc(view.title) + '</h3>' +
        '<p class="observer-card__desc">' + esc(view.description) + '</p>' +
        '<button type="button" class="btn btn-primary btn-sm observer-card__action" data-jump-anchor="' + esc(view.anchorSelector) + '">Jump to live satellite view ↑</button>' +
      '</article>';
  }

  function renderView(view) {
    if (view.embedType === 'live-image') return imageCard(view);
    if (view.embedType === 'iframe') return iframeCard(view);
    if (view.embedType === 'anchor') return anchorCard(view);
    return sourceCard(view);
  }

  function renderCategory(categoryId) {
    var Observer = global.FTN.Observer;
    var views = Observer.viewsFor(categoryId);
    if (!views.length) return '<p class="observer-empty">No views registered for this category yet.</p>';
    return '<div class="observer-grid">' + views.map(renderView).join('') + '</div>';
  }

  function nowStatusRow(view) {
    return '' +
      '<li class="observer-now__row">' +
        '<span class="observer-status ' + statusPillClass(view.status) + '">' + esc(view.status) + '</span>' +
        '<span class="observer-now__label">' + esc(view.nowLabel || view.title) + '</span>' +
        '<a href="#observer/' + esc(view.category) + '" data-observer-tab="' + esc(view.category) + '">View →</a>' +
      '</li>';
  }

  function renderNow() {
    var Observer = global.FTN.Observer;
    var feeds = Observer.nowFeeds();
    var weatherHtml = '<p class="observer-now__loading">Connecting to current weather…</p>';
    var html = '' +
      '<div class="observer-now">' +
        '<div class="observer-now__weather" id="observer-now-weather">' + weatherHtml + '</div>' +
        '<div class="observer-now__status">' +
          '<p class="observer-now__heading">Status across every connected category</p>' +
          '<ul class="observer-now__list">' + feeds.map(nowStatusRow).join('') + '</ul>' +
          '<p class="observer-now__note">Only sources FTN can actually verify are listed here. No active-emergency state is asserted — open any row for the official source.</p>' +
        '</div>' +
      '</div>' +
      '<div class="observer-correlation" id="observer-correlation">' +
        '<p class="observer-now__loading">Loading correlation engine…</p>' +
      '</div>';
    return html;
  }

  function correlationRow(node) {
    var statusMap = {
      'WATCHING': 'observer-status--delayed',
      'NO SIGNAL': 'observer-status--historical',
      'NOT MONITORED': 'observer-status--external',
      'UNKNOWN': 'observer-status--external'
    };
    var matchView = global.FTN.Observer.views.filter(function (v) { return v.id === node.toObserverViewId; })[0];
    var link = node.toObserverViewId && matchView
      ? '<a href="#observer/' + esc(matchView.category) + '" data-observer-tab="' + esc(matchView.category) + '">Open →</a>'
      : '';
    return '' +
      '<li class="observer-correlation__row">' +
        '<span class="observer-status ' + (statusMap[node.status] || 'observer-status--external') + '">' + esc(node.status) + '</span>' +
        '<span class="observer-correlation__label">' + esc(node.title) + '</span>' +
        link +
      '</li>';
  }

  function renderCorrelation(result) {
    var host = $('#observer-correlation');
    if (!host) return;
    host.innerHTML = '' +
      '<p class="observer-now__heading">Correlation engine — rule-based, not live-fitted</p>' +
      '<p class="observer-correlation__explain">' + esc(result.explanation) + '</p>' +
      '<ul class="observer-correlation__list">' + result.chain.map(correlationRow).join('') + '</ul>' +
      '<p class="observer-correlation__confidence">Chain confidence: <strong>' + esc(result.overallConfidence) + '</strong> — capped by its weakest evidence, not by how many rules reference it.</p>';
  }

  function fmt(v, d) { return Number.isFinite(v) ? v.toFixed(d == null ? 1 : d) : '—'; }

  function loadNowWeather() {
    var host = $('#observer-now-weather');
    if (!host) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=10.6667&longitude=-61.5167&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=America%2FPort_of_Spain';
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 10000) : 0;
    fetch(url, { signal: controller ? controller.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('Weather ' + r.status); return r.json(); })
      .then(function (data) {
        if (timer) clearTimeout(timer);
        var c = data.current || {};
        host.innerHTML = '' +
          '<div class="observer-now__weather-top">' +
            '<span class="observer-status observer-status--live">LIVE</span>' +
            '<span class="observer-now__weather-time">Port of Spain · ' + esc(c.time || '') + '</span>' +
          '</div>' +
          '<p class="observer-now__weather-value">' + fmt(c.temperature_2m, 1) + '°C</p>' +
          '<p class="observer-now__weather-sub">Feels ' + fmt(c.apparent_temperature, 1) + '°C · Wind ' + fmt(c.wind_speed_10m, 0) + ' km/h · Humidity ' + fmt(c.relative_humidity_2m, 0) + '% · Precip ' + fmt(c.precipitation, 1) + ' mm</p>' +
          '<a class="observer-now__weather-link" href="#observer/weather" data-observer-tab="weather">Full weather view →</a>';
        renderCorrelation(evaluateCorrelation(c.precipitation));
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        host.innerHTML = '<span class="observer-status observer-status--external">EXTERNAL</span><p class="observer-now__weather-sub">Live weather connection unavailable right now. <a href="#observer/weather" data-observer-tab="weather">Open Weather view →</a></p>';
        renderCorrelation(evaluateCorrelation(null));
      });
  }

  function activateCategory(categoryId, root) {
    var Observer = global.FTN.Observer;
    var valid = Observer.categories.some(function (c) { return c.id === categoryId; });
    if (!valid) categoryId = 'now';

    var tabs = root.querySelectorAll('[data-observer-nav-item]');
    for (var i = 0; i < tabs.length; i++) {
      var isActive = tabs[i].getAttribute('data-observer-nav-item') === categoryId;
      tabs[i].classList.toggle('is-active', isActive);
      tabs[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    var canvas = $('#observer-canvas', root);
    if (!canvas) return;
    canvas.setAttribute('aria-labelledby', 'observer-tab-' + categoryId);
    if (categoryId === 'now') {
      canvas.innerHTML = renderNow();
      loadNowWeather();
    } else {
      canvas.innerHTML = renderCategory(categoryId);
    }
    canvas.setAttribute('data-active-category', categoryId);
  }

  function categoryFromHash() {
    var h = global.location.hash || '';
    var m = h.match(/^#observer\/([a-z-]+)/i);
    return m ? m[1] : 'now';
  }

  function wireInteractions(root) {
    // Image 'error' events don't bubble, so this listener runs in the capture phase to catch
    // a failed radar-image load anywhere inside the canvas without an inline onerror attribute.
    root.addEventListener('error', function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG') return;
      var frame = img.closest && img.closest('.observer-card__frame');
      if (frame) frame.innerHTML = '<p class="observer-card__error">Image temporarily unavailable — use the source link below.</p>';
    }, true);

    root.addEventListener('click', function (e) {
      var navItem = e.target.closest && e.target.closest('[data-observer-nav-item]');
      if (navItem) {
        global.location.hash = 'observer/' + navItem.getAttribute('data-observer-nav-item');
        return;
      }
      var jump = e.target.closest && e.target.closest('[data-jump-anchor]');
      if (jump) {
        var target = document.querySelector(jump.getAttribute('data-jump-anchor'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      var refresh = e.target.closest && e.target.closest('[data-refresh-image]');
      if (refresh) {
        var img = refresh.closest('.observer-card').querySelector('img');
        if (img) {
          var base = img.src.split('?')[0];
          img.src = base + '?ftn=' + Date.now();
        }
      }
    });

    document.addEventListener('click', function (e) {
      var tab = e.target.closest && e.target.closest('[data-observer-tab]');
      if (!tab) return;
      var cat = tab.getAttribute('data-observer-tab');
      global.location.hash = 'observer/' + cat;
    });

    global.addEventListener('hashchange', function () {
      activateCategory(categoryFromHash(), root);
    });
  }

  function buildNav(root) {
    var Observer = global.FTN.Observer;
    var nav = $('#observer-nav', root);
    if (!nav) return;
    nav.innerHTML = Observer.categories.map(function (c) {
      return '<button type="button" class="observer-nav__item" role="tab" id="observer-tab-' + esc(c.id) + '" data-observer-nav-item="' + esc(c.id) + '" aria-selected="false" aria-controls="observer-canvas">' +
        '<span class="observer-nav__label">' + esc(c.label) + '</span>' +
      '</button>';
    }).join('');
  }

  function init() {
    var root = $('#observer-console');
    if (!root || !global.FTN || !global.FTN.Observer) return;
    buildNav(root);
    wireInteractions(root);
    activateCategory(categoryFromHash(), root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
