// FTN Platform Website — FTN Events generator definition (Sprint 1, Wave 2).
//
// The Generator Engine's first real consumer: validated input -> deterministic event-planning
// logic -> a generated checklist. Every line item below is produced by a real rule (event type,
// guest count, venue type, budget tier), not a fixed template and not a fabricated AI response --
// see js/generator-engine.js for the engine this plugs into.
(function (global) {
  'use strict';

  var EVENT_TYPES = ['Concert', 'Festival', 'Conference', 'Wedding', 'Corporate', 'Community', 'Other'];
  var VENUE_TYPES = ['Indoor', 'Outdoor', 'Hybrid'];
  var BUDGET_TIERS = ['Grassroots', 'Standard', 'Flagship'];

  function validate(input) {
    var errors = [];
    if (!input.name || !String(input.name).trim()) errors.push('Event name is required.');
    if (EVENT_TYPES.indexOf(input.type) === -1) errors.push('Choose an event type.');
    var guestCount = Number(input.guestCount);
    if (!input.guestCount || isNaN(guestCount) || guestCount <= 0) errors.push('Expected guest count must be a positive number.');
    if (VENUE_TYPES.indexOf(input.venueType) === -1) errors.push('Choose a venue type.');
    if (BUDGET_TIERS.indexOf(input.budgetTier) === -1) errors.push('Choose a budget tier.');
    return { valid: errors.length === 0, errors: errors };
  }

  function generate(input) {
    var guestCount = Number(input.guestCount);
    var type = input.type, venueType = input.venueType, budgetTier = input.budgetTier;
    var sections = [];

    var permits = ['Confirm venue booking contract and insurance requirements.'];
    if (venueType === 'Outdoor' || venueType === 'Hybrid') {
      permits.push('Apply for an outdoor event / public space permit.');
      permits.push('Arrange noise ordinance clearance with local authorities.');
      permits.push('Prepare a weather contingency plan (backup date or covered area).');
    }
    if (type === 'Concert' || type === 'Festival') {
      permits.push('Confirm sound permit / decibel limit compliance.');
      permits.push('Verify artist and performer contracts and riders.');
    }
    if (guestCount > 500) {
      permits.push('File a crowd management plan with local authorities.');
      permits.push('Arrange licensed security personnel.');
    }
    if (type === 'Wedding') {
      permits.push('Confirm marriage officiant credentials and paperwork.');
    }
    sections.push({ heading: 'Permits & Compliance', items: permits });

    var logistics = [
      'Confirm venue capacity matches the expected guest count (' + guestCount + ').',
      'Plan the layout: seating or standing, stage, entrances, exits.',
      'Confirm restroom facilities are sufficient for the guest count.',
    ];
    if (guestCount > 200) logistics.push('Arrange additional parking or a shuttle service.');
    if (venueType === 'Indoor') logistics.push('Confirm HVAC/ventilation capacity for the guest count.');
    if (venueType === 'Outdoor' || venueType === 'Hybrid') logistics.push('Arrange power generators and cabling.');
    sections.push({ heading: 'Venue & Logistics', items: logistics });

    var safety = ['Post emergency exits and an evacuation plan.', 'Arrange a first aid station.'];
    if (guestCount > 500 || type === 'Concert' || type === 'Festival') {
      safety.push('Coordinate with local police/EMS for large-crowd coverage.');
    }
    sections.push({ heading: 'Safety & Security', items: safety });

    var vendors = ['Confirm catering/vendor arrival times and load-in schedule.'];
    if (budgetTier === 'Flagship') {
      vendors.push('Assign a dedicated vendor liaison for the event day.');
      vendors.push('Confirm the AV/production vendor technical rider.');
    }
    sections.push({ heading: 'Vendor Coordination', items: vendors });

    var marketing = [
      'Announce the event across FTN Radio, FTN Kaiso, and social channels.',
      'Set up ticketing or RSVP tracking.',
    ];
    if (budgetTier !== 'Grassroots') marketing.push('Plan a paid promotion budget and schedule.');
    sections.push({ heading: 'Marketing & Promotion', items: marketing });

    sections.push({
      heading: 'Day-Of Operations',
      items: [
        'Assign a point-of-contact / event lead for the day.',
        'Prepare a run-of-show timeline.',
        'Confirm the cleanup and venue-return checklist.',
      ],
    });

    return {
      title: input.name + ' — Event Plan',
      sections: sections,
      meta: {
        type: type,
        guestCount: guestCount,
        venueType: venueType,
        budgetTier: budgetTier,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.EventsGenerator = { validate: validate, generate: generate };
})(window);
