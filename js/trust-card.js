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

  function publicCopy(value) {
    return String(value == null ? '' : value)
      .replace(/FTN[ -]Modelled:?/gi, 'FTN calculation:')
      .replace(/FTN[ -]Derived:?/gi, 'FTN calculation:')
      .replace(/FTN[ -]Estimated:?/gi, 'FTN estimate:')
      .replace(/\billustrat(?:ive|ed|ion)\b/gi, 'reference')
      .replace(/\bdemonstration\b/gi, 'preview')
      .replace(/\bmodelled\b/gi, 'calculated')
      .replace(/\bderived\b/gi, 'calculated');
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

  // Public-facing Trust Score. This measures traceability and disclosure, not whether FTN can
  // certify the upstream publisher's collection process. Internal rendering-state labels do not
  // affect the score and are never exposed to visitors.
  function trustScore(data) {
    data = data || {};
    var base = data.sourceId ? 66 : 36;
    var sourcePoints = (data.secondarySourceId ? 7 : 0) + (data.comparisonSourceId ? 4 : 0);
    var methodPoints = data.methodology ? 12 : 0;
    var limitationPoints = data.limitations ? 4 : 0;
    var freshnessPoints = 0;
    if (data.lastUpdated) {
      var updated = new Date(data.lastUpdated);
      if (!isNaN(updated.getTime())) {
        var ageDays = Math.max(0, Math.round((Date.now() - updated.getTime()) / 86400000));
        freshnessPoints = ageDays <= 31 ? 3 : ageDays <= 183 ? 1 : ageDays > 730 ? -6 : -2;
      }
    }
    return Math.max(0, Math.min(99, Math.round(base + sourcePoints + methodPoints + limitationPoints + freshnessPoints)));
  }

  function trustScoreLabel(data) {
    return 'Trust Score ' + trustScore(data) + '/100';
  }

  function trustScoreBadgeClass(data) {
    var score = trustScore(data);
    if (score >= 85) return 'trust-badge--official';
    if (score >= 70) return 'trust-badge--sourced';
    if (score >= 50) return 'trust-badge--estimated';
    return 'trust-badge--demo';
  }

  function trustScoreDetailsHTML(data) {
    return '<details class="trust-card__math"><summary>How this Trust Score is calculated</summary>' +
      '<p><strong>' + trustScoreLabel(data) + '</strong> measures how clearly FTN can trace and explain this figure. It does not certify the upstream publisher\'s collection process.</p>' +
      '<p>Score = identifiable-source base + source-coverage points + freshness adjustment + calculation-disclosure points + limitation-disclosure points, capped from 0 to 99.</p></details>';
  }

  // "What influences it / what it influences" — Phase 4 Relationship Engine
  // linkage. Only renders for objects with a real indicator id; correlation
  // objects opened directly (Mission Control's Correlation Engine) don't
  // recurse into this.
  function relationshipsHTML(data) {
    if (!data.id || !global.FTN.Relationships) return '';
    var Relationships = global.FTN.Relationships;
    var rels = Relationships.forIndicator(data.id);
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
      var evidence = Relationships.evidenceLabel ? publicCopy(Relationships.evidenceLabel(r)) : null;
      return '<li>' + arrow + ' <strong>' + verb + ':</strong> ' + trigger +
        ' <span class="trust-card__rel-meta">(' + r.direction +
        (evidence ? ' · ' + evidence : '') + ')</span></li>';
    }).join('');
    var traceBtn = Relationships.traceEffects
      ? '<button type="button" class="trust-trigger" data-trace-effects="' + data.id + '">Trace the Effects &rarr;</button>'
      : '';
    return '<div class="trust-card__relationships"><p class="trust-card__fields-heading">What this connects to</p><ul>' + rows + '</ul>' + traceBtn + '</div>';
  }

  // "Trace the Effects" — walks the real relationship chain outward from this indicator and
  // shows it as a plain sequence, never presenting correlation as proven causation.
  function traceEffectsHTML(indicatorId) {
    var chain = global.FTN.Relationships.traceEffects(indicatorId, 4);
    if (!chain.length) return '<p class="trust-card__trace-empty">No further connected signal found from here.</p>';
    var steps = [esc(global.FTN.getIndicator ? (global.FTN.getIndicator(indicatorId) || {}).title || indicatorId : indicatorId)];
    chain.forEach(function (r) { steps.push(esc(r.toLabel)); });
    return (
      '<p class="trust-card__fields-heading">Trace the Effects</p>' +
      '<ol class="trust-card__trace">' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
      '<p class="trust-card__trace-note">Each step is a real recorded relationship, shown with its own evidence type — not a confirmed prediction of what will happen next.</p>'
    );
  }

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // "See the Math" — only ever rendered when a real formula exists (data.clock, the same
  // config js/live-clocks.js already computes from). Reads the indicator's own real baseValue/
  // ratePerSecond rather than re-deriving or inventing a formula, so this can never drift from
  // what the visible ticking number actually does. mathContentHTML is exported separately (see
  // global.FTN.TrustCard below) so a page like FTN Display can surface the same real math in its
  // own, more prominent FTN.Sheet entry point instead of only this modal's collapsed <details> —
  // one formula, two presentations, never two derivations.
  function mathContentHTML(data) {
    if (data.formula) {
      return '<p class="trust-card__formula"><strong>' + esc(data.formula) + '</strong></p>' +
        (data.formulaDefinitions ? '<p>' + esc(data.formulaDefinitions) + '</p>' : '') +
        (data.formulaSubstitution ? '<p><strong>Current substitution:</strong> ' + esc(data.formulaSubstitution) + '</p>' : '');
    }
    if (!data.isLiveClock || !data.clock) {
      return '<p class="trust-card__formula"><strong>V<sub>display</sub>(t) = V<sub>source</sub>(t)</strong></p>' +
        '<p>FTN applies no numerical transformation to this value. The displayed figure is the source value at the cited observation time; formatting may change, but magnitude does not.</p>';
    }
    var cfg = data.clock;
    var now = new Date();
    var anchor = new Date('2026-07-01T00:00:00Z');
    var elapsedSeconds = Math.max(0, (now.getTime() - anchor.getTime()) / 1000);
    if (cfg.kind === 'day-counter') {
      var dayFraction = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
      var dayValue = (cfg.perYear || 0) / 365.25 * dayFraction;
      return '<p class="trust-card__formula"><strong>V(t) = round[(A / 365.25) × f<sub>day</sub>(t)]</strong></p>' +
        '<p>A is the disclosed annual benchmark. f<sub>day</sub>(t) = elapsed seconds today / 86,400.</p>' +
        '<p><strong>Current substitution:</strong> V(now) = round[(' + Number(cfg.perYear || 0).toLocaleString() + ' / 365.25) × ' + dayFraction.toFixed(6) + '] = ' + Math.round(dayValue).toLocaleString() + '.</p>';
    }
    if (cfg.kind === 'fiscal-year-progress') {
      var startMonth = cfg.fiscalYearStartMonth == null ? 0 : cfg.fiscalYearStartMonth;
      var year = now.getMonth() >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
      var start = new Date(year, startMonth, 1);
      var progress = Math.max(0, Math.min(100, (now.getTime() - start.getTime()) / (365.25 * 86400000) * 100));
      return '<p class="trust-card__formula"><strong>P(t) = 100 × clamp[(t − t<sub>FY0</sub>) / (365.25 × 86,400,000), 0, 1]</strong></p>' +
        '<p>t<sub>FY0</sub> is the first instant of the disclosed fiscal year; clamp prevents values below 0% or above 100%.</p>' +
        '<p><strong>Current substitution:</strong> P(now) = ' + progress.toFixed(2) + '%, displayed at the configured precision.</p>';
    }
    if (cfg.kind === 'countdown') {
      var occurrence = new Date(now.getFullYear(), Number(cfg.month || 1) - 1, Number(cfg.day || 1));
      if (occurrence < now) occurrence = new Date(now.getFullYear() + 1, Number(cfg.month || 1) - 1, Number(cfg.day || 1));
      var remaining = Math.max(0, Math.ceil((occurrence.getTime() - now.getTime()) / 86400000));
      return '<p class="trust-card__formula"><strong>D(t) = max[0, ceil((t<sub>event</sub> − t) / 86,400,000)]</strong></p>' +
        '<p>The event date is the next disclosed calendar occurrence; ceil counts any partial remaining day as one day.</p>' +
        '<p><strong>Current substitution:</strong> D(now) = ' + remaining + ' days.</p>';
    }
    if (typeof cfg.baseValue !== 'number') {
      return '<p class="trust-card__formula"><strong>V<sub>display</sub>(t) = F<sub>calendar</sub>(t; parameters)</strong></p>' +
        '<p>The displayed value is calculated from the disclosed calendar parameters in the methodology above. No additional statistical coefficient is applied.</p>';
    }
    var rate = cfg.ratePerSecond || 0;
    if (cfg.kind === 'population') rate = ((cfg.birthsPerYear || 0) - (cfg.deathsPerYear || 0) + (cfg.netMigrationPerYear || 0)) / (365.25 * 86400);
    var perDay = (rate * 86400);
    var direction = rate >= 0 ? 'increases' : 'decreases';
    var current = cfg.baseValue + (rate * elapsedSeconds);
    return (
      '<p class="trust-card__formula"><strong>V(t) = round<sub>s</sub>[V<sub>0</sub> + r(t − t<sub>0</sub>)]</strong></p>' +
      '<p><strong>Rate calibration:</strong> r = (V<sub>1</sub> − V<sub>0</sub>) / (t<sub>1</sub> − t<sub>0</sub>). <strong>Calendar position:</strong> p(t) = clamp[(t − t<sub>0</sub>) / (t<sub>1</sub> − t<sub>0</sub>), 0, 1].</p>' +
      '<p>V<sub>0</sub> = ' + cfg.baseValue.toLocaleString() + '; r = ' + rate.toLocaleString() + ' units/second; t<sub>0</sub> = 1 July 2026 UTC; round<sub>s</sub> applies the display precision.</p>' +
      '<p><strong>Current substitution:</strong> V(now) = round<sub>s</sub>[' + cfg.baseValue.toLocaleString() + ' ' + (rate >= 0 ? '+ ' : '− ') + Math.abs(rate).toLocaleString() + ' × ' + Math.round(elapsedSeconds).toLocaleString() + '] = ' + current.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '.</p>' +
      '<p>That ' + direction + ' the displayed estimate by about ' + Math.abs(perDay).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' per day. This is an interpolation between the disclosed benchmark and now — not a second, independently measured figure.</p>'
    );
  }

  function seeTheMathHTML(data) {
    var content = mathContentHTML(data);
    return content ? '<details class="trust-card__math"><summary>See the Math</summary>' + content + '</details>' : '';
  }

  function render(data) {
    var badgeClass = trustScoreBadgeClass(data);
    panel.innerHTML =
      '<button type="button" class="trust-card__close" data-trust-close aria-label="Close">' +
        '<img src="/assets/icons/icon-close.svg" alt="" width="16" height="16">' +
      '</button>' +
      '<span class="trust-badge ' + badgeClass + '">' + trustScoreLabel(data) + '</span>' +
      '<h2 id="trustCardTitle" class="trust-card__title">' + data.title + '</h2>' +
      (data.value ? '<p class="trust-card__value">' + data.value + (data.units ? ' <span>' + data.units + '</span>' : '') + '</p>' : '') +
      (data.whyItMatters || WHY_IT_MATTERS[data.category]
        ? '<p class="trust-card__why">' + publicCopy(data.whyItMatters || WHY_IT_MATTERS[data.category]) + '</p>' : '') +
      '<dl class="trust-card__fields">' +
        fieldRow('Methodology', publicCopy(data.methodology)) +
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
        fieldRow('Limitations', publicCopy(data.limitations)) +
        fieldRow('Contradictory evidence', publicCopy(data.contradictoryEvidence)) +
      '</dl>' +
      trustScoreDetailsHTML(data) +
      seeTheMathHTML(data) +
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
      var traceBtn = e.target.closest('[data-trace-effects]');
      if (traceBtn && global.FTN.Relationships) {
        var mount = panel.querySelector('.trust-card__relationships');
        if (mount) mount.innerHTML = traceEffectsHTML(traceBtn.getAttribute('data-trace-effects'));
      }
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
  global.FTN.TrustCard = {
    open: open,
    close: close,
    classificationBadgeClass: classificationBadgeClass,
    trustScore: trustScore,
    trustScoreLabel: trustScoreLabel,
    trustScoreBadgeClass: trustScoreBadgeClass,
    publicCopy: publicCopy,
    mathContentHTML: mathContentHTML
  };
})(window);
