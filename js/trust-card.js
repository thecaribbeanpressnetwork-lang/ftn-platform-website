// FTN Platform Website — shared Trust Card modal.
// Any page that includes this script gets a single accessible dialog that
// renders classification/methodology/confidence metadata for an indicator or
// an arbitrary evidence object. Opened via FTN.TrustCard.open(dataOrId).
(function (global) {
  'use strict';

  var dialog, backdrop, panel, lastFocused;

  // Plain-language "why does this matter" — one per category, not per
  // indicator, so this stays maintainable as the registry grows. An
  // indicator can still override with its own `whyItMatters` field.
  var WHY_IT_MATTERS = {
    'National Economy': 'These numbers shape government spending power, borrowing costs, and the prices citizens pay day to day.',
    'Energy & Commodities': 'Energy is the largest single driver of government revenue and the cost of everything that has to be shipped, powered, or fuelled.',
    'Population & Life': 'Population and household indicators show who the country is planning services, schools, and infrastructure for.',
    'Migration & Border Pressure': 'Migration shapes demand on schools, healthcare, and housing well before it shows up in national statistics.',
    'Infrastructure & Services': 'Infrastructure condition is usually the first thing a community actually experiences — before it becomes a budget line.',
    'Community': 'This is the direct signal from citizens through Community Connect — the closest thing to ground truth this platform has.',
    'Weather & Environment': 'Weather and climate patterns drive flooding, agriculture, and infrastructure stress well in advance of the events themselves.',
    'Tourism': 'Tourism is a direct, fast-moving read on regional employment and foreign-exchange earnings.',
    'Public Sector & National Life': 'These track the institutional calendar — budget cycles, terms, and national dates that set the rhythm for everything else.',
    'International Context': 'Trinidad and Tobago is a small, trade-exposed economy — external shocks here usually arrive before they show up domestically.',
  };

  function freshness(lastUpdated) {
    if (!lastUpdated) return '';
    var then = new Date(lastUpdated);
    if (isNaN(then.getTime())) return lastUpdated;
    var days = Math.round((Date.now() - then.getTime()) / 86400000);
    var age = days <= 0 ? 'today' : days === 1 ? '1 day ago' : days < 60 ? days + ' days ago' : Math.round(days / 30) + ' months ago';
    return lastUpdated + ' (' + age + ')';
  }

  function fieldRow(label, value) {
    if (value === undefined || value === null || value === '') return '';
    return '<div class="trust-card__row"><dt>' + label + '</dt><dd>' + value + '</dd></div>';
  }

  // Renders a source as a real clickable link when a Source Registry entry
  // exists (js/source-registry.js); falls back to plain text otherwise.
  // roleLabel distinguishes a primary benchmark source from a secondary
  // comparison-only source (e.g. Worldometer is never primary — see
  // ANALYTICS_STANDARD.md and Phase 3.5 founder direction §4).
  function sourceLinkRow(label, sourceId, roleLabel) {
    if (!sourceId) return '';
    var src = global.FTN && global.FTN.Sources ? global.FTN.Sources.get(sourceId) : null;
    if (!src) return '';
    var roleNote = roleLabel ? ' <span class="trust-card__source-role">(' + roleLabel + ')</span>' : '';
    var value = src.url
      ? '<a href="' + src.url + '" target="_blank" rel="noopener noreferrer">' + src.name + '</a>' + roleNote
      : src.name + roleNote;
    return fieldRow(label, value);
  }

  function classificationBadgeClass(classification) {
    var map = {
      'Official': 'trust-badge--official',
      'Sourced': 'trust-badge--sourced',
      'FTN Derived': 'trust-badge--derived',
      'FTN Estimated': 'trust-badge--estimated',
      'FTN Modelled': 'trust-badge--modelled',
      'Illustrative': 'trust-badge--demo',
    };
    return map[classification] || 'trust-badge--demo';
  }

  // "What influences it / what it influences" — Phase 4 Relationship Engine
  // linkage. Only renders for objects with a real indicator id; correlation
  // objects opened directly (Mission Control's Correlation Engine) don't
  // recurse into this.
  function relationshipsHTML(data) {
    if (!data.id || !global.FTN.Relationships) return '';
    var rels = global.FTN.Relationships.forIndicator(data.id);
    if (!rels.length) return '';
    var rows = rels.map(function (r) {
      var isSource = r.fromIndicatorId === data.id;
      var otherId = isSource ? r.toIndicatorId : r.fromIndicatorId;
      var otherLabel = isSource ? r.toLabel : r.fromLabel;
      var verb = isSource ? 'Influences' : 'Influenced by';
      var arrow = isSource ? '&rarr;' : '&larr;';
      var trigger = otherId
        ? '<button type="button" class="trust-trigger" data-trust-card="' + otherId + '">' + otherLabel + '</button>'
        : '<span>' + otherLabel + '</span>';
      return '<li>' + arrow + ' <strong>' + verb + ':</strong> ' + trigger +
        ' <span class="trust-card__rel-meta">(' + r.direction + ', ' + r.confidence.toLowerCase() + ' confidence)</span></li>';
    }).join('');
    return '<div class="trust-card__relationships"><p class="trust-card__fields-heading">What this connects to</p><ul>' + rows + '</ul></div>';
  }

  function render(data) {
    var badgeClass = classificationBadgeClass(data.classification);
    panel.innerHTML =
      '<button type="button" class="trust-card__close" data-trust-close aria-label="Close">' +
        '<img src="/assets/icons/icon-close.svg" alt="" width="16" height="16">' +
      '</button>' +
      '<span class="trust-badge ' + badgeClass + '">' + (data.classification || 'Illustrative') + '</span>' +
      '<h2 id="trustCardTitle" class="trust-card__title">' + data.title + '</h2>' +
      (data.value ? '<p class="trust-card__value">' + data.value + (data.units ? ' <span>' + data.units + '</span>' : '') + '</p>' : '') +
      (data.whyItMatters || WHY_IT_MATTERS[data.category]
        ? '<p class="trust-card__why">' + (data.whyItMatters || WHY_IT_MATTERS[data.category]) + '</p>' : '') +
      '<dl class="trust-card__fields">' +
        fieldRow('Confidence', data.confidence) +
        fieldRow('Methodology', data.methodology) +
        (data.sourceId
          ? sourceLinkRow('Primary source', data.sourceId, 'primary benchmark source')
          : fieldRow('Source', data.sourceName)) +
        (data.secondarySourceId ? sourceLinkRow('Secondary source', data.secondarySourceId, null) : '') +
        (data.comparisonSourceId ? sourceLinkRow('Comparison source', data.comparisonSourceId, 'comparison, not primary') : '') +
        fieldRow('Update frequency', data.updateFrequency) +
        fieldRow('Last updated', freshness(data.lastUpdated)) +
        fieldRow('Time coverage', data.timeCoverage) +
        fieldRow('Geographic coverage', data.geoCoverage) +
        fieldRow('Sample size', data.sampleSize) +
        fieldRow('Limitations', data.limitations) +
        fieldRow('Contradictory evidence', data.contradictoryEvidence) +
      '</dl>' +
      relationshipsHTML(data);
  }

  function open(dataOrId) {
    var data = typeof dataOrId === 'string' ? (global.FTN.getIndicator ? global.FTN.getIndicator(dataOrId) : null) : dataOrId;
    if (!data) return;
    // Live-clock indicators store a static placeholder in .value (sometimes
    // literally "—", since the real number only exists once computed) --
    // the indicator wall ticks it live via data-live-clock bindings, but
    // this modal never did, so opening a live-clock indicator's Trust Card
    // showed a frozen or blank number instead of the same figure the card
    // itself displays. Compute it the same way the wall does, on a copy so
    // the shared indicator object itself is never mutated.
    if (data.isLiveClock && global.FTN.LiveClocks) {
      data = Object.assign({}, data, { value: global.FTN.LiveClocks.computeClockValue(data, new Date()) });
    }
    render(data);
    lastFocused = document.activeElement;
    dialog.classList.add('is-open');
    document.body.classList.add('trust-card-open');
    panel.querySelector('[data-trust-close]').focus();
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    dialog.classList.remove('is-open');
    document.body.classList.remove('trust-card-open');
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      var focusable = panel.querySelectorAll('button, a[href]');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }

  function init() {
    dialog = document.createElement('div');
    dialog.className = 'trust-card-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'trustCardTitle');

    backdrop = document.createElement('div');
    backdrop.className = 'trust-card-dialog__backdrop';
    backdrop.addEventListener('click', close);

    panel = document.createElement('div');
    panel.className = 'trust-card-dialog__panel';

    dialog.appendChild(backdrop);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function (e) {
      if (e.target.closest('[data-trust-close]')) close();
    });

    // Delegate: any element with data-trust-card="<indicator-id>" opens that card.
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-trust-card]');
      if (trigger) {
        e.preventDefault();
        open(trigger.getAttribute('data-trust-card'));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.FTN = global.FTN || {};
  global.FTN.TrustCard = { open: open, close: close, classificationBadgeClass: classificationBadgeClass };
})(window);
