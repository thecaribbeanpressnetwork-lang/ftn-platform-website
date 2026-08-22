// FTN Learn — real listings and providers only. PROVIDER != COURSE (see product-registry-data.js
// 'learn' entry and CLAUDE.md-equivalent discipline sitewide): a listing is one specific, dated
// opportunity FTN can describe honestly; a provider is a real institution whose current course
// catalogue FTN has not itself indexed, so FTN sends the visitor to look for themselves instead of
// inventing one. Unknown fields stay unknown -- never filled in for visual completeness.
(function (global) {
  'use strict';

  function listing(config) {
    return Object.assign({
      type: 'workshop',
      country: 'Trinidad and Tobago',
      community: null,
      mode: 'in-person',
      startDate: null,
      deadline: null,
      currency: 'TTD',
      registrationFee: null,
      tuition: null,
      materialsIncluded: null,
      credentialType: 'No credential stated',
      credentialIssuer: null,
      accreditationState: 'Not FTN-accredited',
      phone: null,
      whatsapp: null,
      email: null,
      registrationUrl: null,
      sourcePlatform: 'Public Facebook post',
      sourceUrl: null,
      firstDiscovered: '2026-08-21',
      lastChecked: '2026-08-21',
      status: 'UNVERIFIED',
    }, config);
  }

  var LISTINGS = [
    listing({
      id: 'colab-electrical-workshop',
      title: 'Basic & Domestic Electrical Workshop',
      provider: 'Colab Electrical Workshop (ColabTT)',
      track: 'skills',
      category: 'Trades',
      subcategory: 'Electrical',
      tags: ['electrical', 'domestic wiring', 'trades', 'hands-on'],
      summary: 'Hands-on introductory training in practical domestic electrical skills.',
      country: 'Trinidad and Tobago',
      community: 'San Fernando',
      venue: 'Navet Road, San Fernando (registration at ColabTT Media South, 90 Rushworth Street Ext., San Fernando)',
      mode: 'in-person',
      level: 'Beginner',
      registrationFee: 200,
      tuition: 600,
      materialsIncluded: 'A starter kit is reported as included, via Tolsen / CV Electrical — not independently confirmed by FTN.',
      credentialType: 'Certificate of completion (provider-issued)',
      credentialIssuer: 'Colab Electrical Workshop',
      accreditationState: 'Not FTN-accredited; provider accreditation not independently confirmed.',
      whatsapp: '735-2496',
      phone: '267-8300',
      sourcePlatform: 'Public Facebook post',
      status: 'UNVERIFIED',
    }),
  ];

  function provider(config) {
    return Object.assign({ track: 'both', country: 'Trinidad and Tobago' }, config);
  }

  var PROVIDERS = [
    provider({ id: 'ytepp', name: 'YTEPP', description: 'Trinidad & Tobago’s Youth Training and Employment Partnership Programme — vocational and life-skills training.', url: 'https://ytepp.gov.tt/', category: 'Trades, Business, Technology', track: 'skills' }),
    provider({ id: 'uwi-open-campus', name: 'UWI Open Campus', description: 'The University of the West Indies’ distance and continuing-education arm, open across the Caribbean.', url: 'https://www.open.uwi.edu/', category: 'Academic, Professional development', track: 'both' }),
    provider({ id: 'utt', name: 'University of Trinidad and Tobago (UTT)', description: 'Technical and vocational higher education across engineering, energy, business and the arts.', url: 'https://www.utt.edu.tt/', category: 'Technology, Engineering, Business', track: 'skills' }),
    provider({ id: 'lok-jack-gsb', name: 'Arthur Lok Jack Global School of Business', description: 'Executive, professional and postgraduate business education based in Trinidad and Tobago.', url: 'https://www.lokjackgsb.edu.tt/', category: 'Business, Management', track: 'skills' }),
  ];

  var SKILLS_CATEGORIES = ['Trades', 'Technology', 'Business', 'Creative', 'Hospitality & Tourism', 'Agriculture', 'Professional development'];
  var SCHOOL_CATEGORIES = ['SEA', 'CSEC', 'CAPE', 'Mathematics', 'English', 'Sciences', 'Languages', 'Exam preparation'];

  global.FTN = global.FTN || {};
  global.FTN.LearnData = {
    listings: LISTINGS,
    providers: PROVIDERS,
    skillsCategories: SKILLS_CATEGORIES,
    schoolCategories: SCHOOL_CATEGORIES,
  };
})(window);
