// FTN Platform Website — Source Registry.
//
// Real, checkable source references for FTN Live indicators. This registry
// does NOT fetch live data — it exists so every Trust Card can point at a
// genuine authoritative page instead of a generic placeholder. Indicator
// *values* remain demonstration/calculated until a benchmark-ingestion
// pipeline exists (see js/benchmarks-data.js and ANALYTICS_STANDARD.md §5-6).
//
// Every URL below is an authoritative landing/subject page actually named in
// founder direction — none are invented. Where only a subject page (not a
// direct dataset URL) is known, that subject page is used deliberately
// rather than fabricating a deeper link.
(function (global) {
  'use strict';

  var sources = {
    'tt-cso-main': {
      name: 'Central Statistical Office of Trinidad and Tobago',
      url: 'https://cso.gov.tt/',
      org: 'Government of the Republic of Trinidad and Tobago',
    },
    'tt-cso-glance': {
      name: 'CSO — Trinidad and Tobago at a Glance',
      url: 'https://cso.gov.tt/tt-at-a-glance/',
      org: 'Central Statistical Office',
    },
    'tt-cso-rpi': {
      name: 'CSO — Retail Price Index',
      url: 'https://cso.gov.tt/subjects/economic-indicators/retail-price-index-rpi/',
      org: 'Central Statistical Office',
    },
    'tt-cso-crime': {
      name: 'CSO — Crime Statistics',
      url: 'https://cso.gov.tt/subjects/population-and-vital-statistics/crime-statistics/',
      org: 'Central Statistical Office',
    },
    'tt-cso-tourism': {
      name: 'CSO — Tourism Statistics',
      url: 'https://cso.gov.tt/subjects/travel-and-tourism/tourism-statistics/',
      org: 'Central Statistical Office',
    },
    'tt-cso-travel': {
      name: 'CSO — Travel Statistics',
      url: 'https://cso.gov.tt/subjects/travel-and-tourism/travel-statistics/',
      org: 'Central Statistical Office',
    },
    'tt-cbtt': {
      name: 'Central Bank of Trinidad and Tobago',
      url: 'https://www.central-bank.org.tt/',
      org: 'Central Bank of Trinidad and Tobago',
    },
    'tt-cbtt-data': {
      name: 'Central Bank — Data Centre',
      url: 'https://www.central-bank.org.tt/statistics/data-centre-old/',
      org: 'Central Bank of Trinidad and Tobago',
    },
    'tt-cbtt-egdds': {
      name: 'Central Bank — e-GDDS',
      url: 'https://www.central-bank.org.tt/statistics/e-gdds/',
      org: 'Central Bank of Trinidad and Tobago',
    },
    'tt-cbtt-glossary': {
      name: 'Central Bank — Data Definitions',
      url: 'https://www.central-bank.org.tt/statistics/data-center-glossary-of-terms/',
      org: 'Central Bank of Trinidad and Tobago',
    },
    'tt-mof': {
      name: 'Ministry of Finance, Trinidad and Tobago',
      url: 'https://www.finance.gov.tt/',
      org: 'Government of the Republic of Trinidad and Tobago',
    },
    'tt-mof-roe-2025': {
      name: 'Ministry of Finance — Review of the Economy 2025',
      url: 'https://www.finance.gov.tt/wp-content/uploads/2025/08/WEB-%E2%80%A2-REVIEW-OF-THE-ECONOMY-2025.pdf',
      org: 'Ministry of Finance',
    },
    'tt-mof-assessment': {
      name: 'Ministry of Finance — Economic Assessment',
      url: 'https://www.finance.gov.tt/economic-assessment/',
      org: 'Ministry of Finance',
    },
    'tt-meei': {
      name: 'Ministry of Energy and Energy Industries',
      url: 'https://www.energy.gov.tt/',
      org: 'Government of the Republic of Trinidad and Tobago',
    },
    'tt-meei-production': {
      name: 'MEEI — Historical Oil and Gas Production Data',
      url: 'https://www.energy.gov.tt/data/historical-oil-and-gas-production-data/',
      org: 'Ministry of Energy and Energy Industries',
    },
    'tt-meei-oil-gas': {
      name: 'MEEI — Oil and Gas Industry',
      url: 'https://www.energy.gov.tt/our-business/oil-and-gas-industry/',
      org: 'Ministry of Energy and Energy Industries',
    },
    'tt-meei-lng': {
      name: 'MEEI — LNG and Petrochemicals',
      url: 'https://www.energy.gov.tt/our-business/lng-petrochemicals/',
      org: 'Ministry of Energy and Energy Industries',
    },
    'tt-met': {
      name: 'Trinidad and Tobago Meteorological Service',
      url: 'https://www.metoffice.gov.tt/',
      org: 'TT Meteorological Service',
    },
    'tt-met-forecast': {
      name: 'TT Met Service — Weather Forecast',
      url: 'https://www.metoffice.gov.tt/forecast',
      org: 'TT Meteorological Service',
    },
    'tt-met-climate-data': {
      name: 'TT Met Service — Climate Data',
      url: 'https://www.metoffice.gov.tt/our-services/climate-data',
      org: 'TT Meteorological Service',
    },
    'tt-met-climate': {
      name: 'TT Met Service — Climate Overview',
      url: 'https://www.metoffice.gov.tt/climate',
      org: 'TT Meteorological Service',
    },
    'tt-met-drought': {
      name: 'TT Met Service — Drought Monitor',
      url: 'https://www.metoffice.gov.tt/our-services/dryness-drought-indicator-monitor-and-outlook',
      org: 'TT Meteorological Service',
    },
    'tt-met-outlook': {
      name: 'TT Met Service — Rainfall &amp; Temperature Outlook',
      url: 'https://www.metoffice.gov.tt/our-services/rainfall-and-temperature-outlook-update',
      org: 'TT Meteorological Service',
    },
    'tt-met-enso': {
      name: 'TT Met Service — ENSO Monitor',
      url: 'https://www.metoffice.gov.tt/our-services/enso-monitor-update',
      org: 'TT Meteorological Service',
    },
    'tt-ttps': {
      name: 'Trinidad and Tobago Police Service',
      url: 'https://www.ttps.gov.tt/',
      org: 'TT Police Service',
    },
    'worldbank-tt': {
      name: 'World Bank Data — Trinidad and Tobago',
      url: 'https://data.worldbank.org/country/trinidad-and-tobago',
      org: 'World Bank',
    },
    'worldbank-tt-life-expectancy': {
      name: 'World Bank — Life Expectancy (T&amp;T)',
      url: 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=TT',
      org: 'World Bank',
    },
    'worldbank-tt-death-rate': {
      name: 'World Bank — Death Rate (T&amp;T)',
      url: 'https://data.worldbank.org/indicator/SP.DYN.CDRT.IN?locations=TT',
      org: 'World Bank',
    },
    'worldbank-tt-infant-mortality': {
      name: 'World Bank — Infant Mortality (T&amp;T)',
      url: 'https://data.worldbank.org/indicator/SP.DYN.IMRT.IN?locations=TT',
      org: 'World Bank',
    },
    'worldbank-tt-gdp-capita': {
      name: 'World Bank — GDP per Capita (T&amp;T)',
      url: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=TT',
      org: 'World Bank',
    },
    'who-tt': {
      name: 'World Health Organization — Trinidad and Tobago',
      url: 'https://data.who.int/countries/780',
      org: 'World Health Organization',
    },
    'owid-tt-demography': {
      name: 'Our World in Data — T&amp;T Population &amp; Demography',
      url: 'https://ourworldindata.org/profile/population-demography/trinidad-and-tobago',
      org: 'Our World in Data',
    },
    'worldometer-tt-population': {
      name: 'Worldometer — Trinidad and Tobago Population',
      url: 'https://www.worldometers.info/world-population/trinidad-and-tobago-population/',
      org: 'Worldometer',
    },
    'visit-trinidad': {
      name: 'Visit Trinidad',
      url: 'https://visittrinidad.tt/',
      org: 'Trinidad and Tobago Tourism Industry Development Company',
    },
    'ftn-demo': {
      name: 'FTN demonstration dataset',
      url: '',
      org: 'RealityArtTV Media / FTN Platform',
    },
  };

  function get(id) {
    return sources[id] || sources['ftn-demo'];
  }

  global.FTN = global.FTN || {};
  global.FTN.Sources = { all: sources, get: get };
})(window);
