// FTN Platform Website — Observer source registry.
// One place every Observer category/view reads from — the same "registry, not one-off
// widgets" pattern already used by js/indicators-data.js (see CLAUDE.md §7.1). sourceClass
// values are js/ftn-source-provenance.js's SOURCE_QUALITY vocabulary (OFFICIAL_GOVERNMENT,
// CORPORATE_STATEMENT, PRIMARY_EVIDENCE, ...) — that module classifies external material FTN
// did not produce, which is exactly every Observer source; js/trust-card.js's classification
// list (Official/Sourced/FTN Derived/...) is a deliberately separate vocabulary for FTN's OWN
// indicator claims and is not reused here. embedType controls how observer-console.js renders
// the view: 'live-image' (hotlinked, cache-busted image), 'anchor' (jump to a live view already
// rendered elsewhere on the page), 'iframe' (third party permits framing), or 'external' (FTN
// source card + outbound link — used whenever framing is blocked/unverified or no lawful API
// exists, per the standing "do not fabricate, do not bypass" rule).
(function (global) {
  'use strict';

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
  // synthesis built by observer-console.js from the real-time views tagged nowFeed:true below,
  // plus quick links into every other category (per brief §1: "an operational summary, not
  // another news feed").
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
})(window);
