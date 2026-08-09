// FTN Platform Website — FTN Events planning engine.
// Deterministic, inspectable planning logic. This is not presented as generative AI.
(function (global) {
  'use strict';

  var EVENT_TYPES = ['Concert', 'Festival', 'Conference', 'Wedding', 'Corporate', 'Community', 'Carnival / Fete', 'Sports', 'Fundraiser', 'Other'];
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
    if (!input.country || !String(input.country).trim()) errors.push('Country is required.');
    return { valid: errors.length === 0, errors: errors };
  }

  function addIf(list, condition, text) { if (condition) list.push(text); }

  function generate(input) {
    var guestCount = Number(input.guestCount);
    var type = input.type;
    var venueType = input.venueType;
    var budgetTier = input.budgetTier;
    var country = String(input.country || '').trim();
    var city = String(input.city || '').trim();
    var locationLabel = city ? city + ', ' + country : country;
    var sections = [];

    var executive = [
      'Event type: ' + type + '.',
      'Expected attendance: ' + guestCount + '.',
      'Venue format: ' + venueType + '.',
      'Planning location: ' + locationLabel + '.',
      'Budget tier: ' + budgetTier + '.',
    ];
    if (input.date) executive.push('Target date: ' + input.date + '.');
    if (input.goal) executive.push('Primary objective: ' + String(input.goal).trim() + '.');
    sections.push({ heading: 'Event Brief', items: executive });

    var permits = ['Confirm venue booking terms, insurance requirements and cancellation policy.'];
    addIf(permits, venueType === 'Outdoor' || venueType === 'Hybrid', 'Confirm public-space, outdoor-event and temporary-structure approvals required by the relevant authority.');
    addIf(permits, venueType === 'Outdoor' || venueType === 'Hybrid', 'Confirm noise restrictions, curfew requirements and a weather contingency plan.');
    addIf(permits, type === 'Concert' || type === 'Festival' || type === 'Carnival / Fete', 'Confirm entertainment, amplified-sound, performer and music-licensing obligations that apply in the event jurisdiction.');
    addIf(permits, guestCount > 500, 'Prepare a documented crowd-management and emergency-access plan for authority/venue review.');
    addIf(permits, type === 'Wedding', 'Confirm marriage-officiant and ceremony-document requirements where applicable.');
    permits.push('Verify all permit requirements directly with the relevant local authority before relying on this checklist.');
    sections.push({ heading: 'Permits, Legal & Compliance', items: permits });

    var logistics = [
      'Confirm venue safe capacity supports ' + guestCount + ' attendees plus staff, performers and vendors.',
      'Create a scaled site/room layout covering entrances, exits, stage/program area, vendors, toilets and emergency routes.',
      'Prepare load-in, setup, doors-open, event, breakdown and venue-return times.',
      'Confirm accessible entrances, circulation routes, toilets and viewing/seating areas.',
    ];
    addIf(logistics, guestCount > 200, 'Plan parking, rideshare, shuttle or public-transport flow and a dedicated drop-off/pick-up zone.');
    addIf(logistics, venueType === 'Indoor', 'Confirm HVAC, electrical capacity and occupancy/fire-safety limits.');
    addIf(logistics, venueType !== 'Indoor', 'Plan temporary power, cable protection, lighting, drainage and weather protection.');
    sections.push({ heading: 'Venue & Logistics', items: logistics });

    var production = ['Build a technical requirements list for audio, lighting, power, staging, screens and communications.'];
    addIf(production, type === 'Concert' || type === 'Festival' || type === 'Carnival / Fete', 'Create artist/DJ performance schedule, changeover plan, stage plot and technical rider tracker.');
    addIf(production, type === 'Conference' || type === 'Corporate', 'Create speaker/session schedule, presentation ingest process and room-change plan.');
    addIf(production, budgetTier === 'Flagship', 'Assign production manager, stage manager and technical leads with named escalation paths.');
    production.push('Run a pre-event technical rehearsal or systems check appropriate to the event complexity.');
    sections.push({ heading: 'Production & Programme', items: production });

    var safety = [
      'Document emergency exits, assembly points, incident escalation and evacuation procedure.',
      'Provide first-aid capability appropriate to attendance and event risk.',
      'Brief staff on safeguarding, lost-person, medical and severe-weather procedures.',
    ];
    addIf(safety, guestCount > 500 || ['Concert','Festival','Carnival / Fete','Sports'].indexOf(type) !== -1, 'Create a security deployment plan covering entrances, perimeter, stage/program zones and crowd-pressure points.');
    addIf(safety, guestCount > 1000, 'Establish an event control point with radio communications, incident log and agency/venue liaison contacts.');
    sections.push({ heading: 'Safety, Security & Accessibility', items: safety });

    var vendors = [
      'Create a vendor register with contact, scope, arrival time, power/water needs, payment status and required documents.',
      'Confirm catering, sanitation, waste and cleanup responsibilities.',
    ];
    addIf(vendors, budgetTier !== 'Grassroots', 'Set milestone payment dates and written acceptance criteria for major suppliers.');
    addIf(vendors, budgetTier === 'Flagship', 'Assign a dedicated vendor/partner liaison and maintain a live supplier escalation list.');
    sections.push({ heading: 'Vendors, Partners & Procurement', items: vendors });

    var marketing = [
      'Define target audience, value proposition and the primary call to action: ticket, RSVP, attendance, donation or registration.',
      'Build a content calendar covering announcement, information, reminders, day-of updates and post-event follow-up.',
      'Prepare an owned-channel plan across relevant FTN products and the event organizer\'s channels.',
    ];
    addIf(marketing, budgetTier !== 'Grassroots', 'Create a paid-promotion budget, audience plan and conversion-tracking approach.');
    addIf(marketing, type === 'Concert' || type === 'Festival' || type === 'Carnival / Fete', 'Prepare artist/DJ announcement assets, schedule and approved sponsor/partner placements.');
    sections.push({ heading: 'Marketing, Ticketing & Communications', items: marketing });

    var finance = [
      'Create one budget ledger with planned, committed and paid amounts.',
      'Reserve a contingency allocation for unforeseen costs.',
      'Track ticket/registration/sponsorship assumptions separately from confirmed revenue.',
    ];
    addIf(finance, input.budgetAmount, 'Working budget entered: ' + String(input.budgetAmount).trim() + '. Treat as planning input, not verified available funds.');
    sections.push({ heading: 'Budget & Commercial Control', items: finance });

    var countdown = [
      'T-8+ weeks: lock concept, budget owner, target date, venue shortlist and approval path.',
      'T-6 weeks: confirm venue and major suppliers; start permits, ticketing/registration and campaign production.',
      'T-4 weeks: lock programme, vendor list, floor/site plan, safety plan and staffing model.',
      'T-2 weeks: confirm run-of-show, supplier timings, communications tree, guest information and contingency triggers.',
      'T-72 hours: final confirmations, weather/risk review, production checks and staff briefing.',
      'Event day: operate from one current run-of-show and incident/escalation log.',
      'T+1 to 7 days: reconcile finances, capture lessons, settle outstanding suppliers and produce post-event report.',
    ];
    sections.push({ heading: 'Planning Timeline', items: countdown });

    var dayOf = [
      'Assign one event director / decision owner for the day.',
      'Publish one controlled run-of-show with version/time stamp.',
      'Confirm opening checks before admitting guests.',
      'Record incidents, major operational decisions and programme deviations as they happen.',
      'Complete shutdown, cleanup, asset return and venue handback before closing the event file.',
    ];
    sections.push({ heading: 'Day-Of Operations', items: dayOf });

    return {
      title: String(input.name).trim() + ' — FTN Event Plan',
      sections: sections,
      meta: {
        type: type,
        guestCount: guestCount,
        venueType: venueType,
        budgetTier: budgetTier,
        country: country,
        city: city,
        date: input.date || '',
        goal: input.goal || '',
        budgetAmount: input.budgetAmount || '',
        generatedAt: new Date().toISOString(),
        engine: 'FTN deterministic planning rules v2',
      },
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.EventsGenerator = { validate: validate, generate: generate };
})(window);
