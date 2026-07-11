// FTN Platform Website — live-clock interpolation engine.
//
// Powers the "ticking" demonstration indicators (debt, population, budget
// progress, countdowns). Every value produced here is explicitly an FTN
// Estimate/Model, never presented as a live official measurement — see
// ANALYTICS_STANDARD.md §5 (Interpolation & Modelled Clocks).
//
// Elements opt in with: <span data-live-clock="debt-to-gdp"></span>
// aria-live is intentionally "off" on ticking elements — the number changes
// every second and auto-announcing that to screen readers would be unusable.
// The value remains real, readable text; the Trust Card gives the static
// benchmark, methodology, and last-updated date for anyone who needs it.
(function (global) {
  'use strict';

  var ANCHOR = new Date('2026-07-01T00:00:00Z').getTime();
  var YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
  var DAY_MS = 24 * 60 * 60 * 1000;

  function fmtNumber(n, decimals) {
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 });
  }

  function startOfDay(d) {
    var s = new Date(d);
    s.setHours(0, 0, 0, 0);
    return s.getTime();
  }

  function nextOccurrence(now, month1, day) {
    // month1 is 1-indexed (1 = January)
    var year = now.getFullYear();
    var candidate = new Date(year, month1 - 1, day, 0, 0, 0);
    if (candidate.getTime() < now.getTime()) {
      candidate = new Date(year + 1, month1 - 1, day, 0, 0, 0);
    }
    return candidate;
  }

  function computeClockValue(indicator, now) {
    var cfg = indicator.clock || {};
    var elapsedSec = (now.getTime() - ANCHOR) / 1000;

    switch (cfg.kind) {
      case 'currency':
        return fmtNumber(Math.max(0, cfg.baseValue + cfg.ratePerSecond * elapsedSec), 0);

      case 'debt-to-gdp':
        return (cfg.baseValue + cfg.ratePerSecond * elapsedSec).toFixed(1);

      case 'population': {
        var perYearChange = (cfg.birthsPerYear || 0) - (cfg.deathsPerYear || 0) + (cfg.netMigrationPerYear || 0);
        var ratePerMs = perYearChange / YEAR_MS;
        return fmtNumber(Math.round(cfg.baseValue + ratePerMs * (now.getTime() - ANCHOR)), 0);
      }

      case 'day-counter': {
        var dailyRate = (cfg.perYear || 0) / 365.25;
        var fractionOfDay = (now.getTime() - startOfDay(now)) / DAY_MS;
        return fmtNumber(Math.round(dailyRate * fractionOfDay), 0);
      }

      case 'fiscal-year-progress': {
        var startMonth = cfg.fiscalYearStartMonth != null ? cfg.fiscalYearStartMonth : 0; // 0-indexed (9 = October)
        var y = now.getMonth() >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
        var fyStart = new Date(y, startMonth, 1).getTime();
        var pct = ((now.getTime() - fyStart) / YEAR_MS) * 100;
        return Math.max(0, Math.min(100, pct)).toFixed(0);
      }

      case 'term-progress': {
        // Academic year approximated Sep 1 – Jul 15 for demonstration purposes.
        var termStart = new Date(now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1, 8, 1).getTime();
        var termEnd = termStart + 318 * DAY_MS; // ~ Sep 1 to Jul 15
        var termPct = ((now.getTime() - termStart) / (termEnd - termStart)) * 100;
        return Math.max(0, Math.min(100, termPct)).toFixed(0);
      }

      case 'countdown': {
        var target = nextOccurrence(now, cfg.month, cfg.day);
        var days = Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
        return String(days);
      }

      default:
        return indicator.value;
    }
  }

  // ---------------------------------------------------------- Fast Counter Engine
  // Normalizes whatever clock config an indicator has into a single
  // per-second rate, then derives every other useful time unit from it.
  // Only "accumulating count" clock kinds (currency, population, day-counter)
  // produce a rate — progress/countdown kinds correctly return null so no
  // false "how fast" line gets attached to a static-feeling value.
  var DAY_SECONDS = 24 * 60 * 60;

  function getPerSecondRate(indicator) {
    var cfg = indicator.clock;
    if (!cfg) return null;
    switch (cfg.kind) {
      case 'currency':
        return cfg.ratePerSecond || 0;
      case 'population': {
        var perYearChange = (cfg.birthsPerYear || 0) - (cfg.deathsPerYear || 0) + (cfg.netMigrationPerYear || 0);
        return perYearChange / YEAR_MS * 1000;
      }
      case 'day-counter':
        return (cfg.perYear || 0) / 365.25 / DAY_SECONDS;
      default:
        return null;
    }
  }

  function getRateBreakdown(indicator) {
    var perSecond = getPerSecondRate(indicator);
    if (perSecond === null || !isFinite(perSecond) || perSecond === 0) return null;
    return {
      perSecond: perSecond,
      perMinute: perSecond * 60,
      perHour: perSecond * 3600,
      perDay: perSecond * DAY_SECONDS,
      perWeek: perSecond * DAY_SECONDS * 7,
      perMonth: perSecond * DAY_SECONDS * 30.44,
      perYear: perSecond * DAY_SECONDS * 365.25,
      secondsPerEvent: Math.abs(1 / perSecond),
    };
  }

  function fmtRate(n) {
    var abs = Math.abs(n);
    if (abs >= 100) return Math.round(n).toLocaleString('en-US');
    if (abs >= 1) return (Math.round(n * 10) / 10).toString();
    return (Math.round(n * 100) / 100).toString();
  }

  // Units that are represented with a prefix (TT$620) rather than a trailing
  // unit word, so they shouldn't also be echoed as a suffix.
  var BARE_COUNT_UNITS = { 'TTD': true };

  function paceAmount(n, indicator) {
    var unit = indicator.paceUnitLabel || indicator.units;
    if (unit === 'people' && Math.round(n) === 1) unit = 'person';
    var isCurrency = unit === 'TTD';
    var prefix = isCurrency ? 'TT$' : '';
    var suffix = BARE_COUNT_UNITS[unit] ? '' : ' ' + unit;
    return prefix + fmtRate(n) + suffix;
  }

  // Produces a short, human, kiosk-readable line like "About 1 every 3
  // seconds" or "About TT$620 every second" — or null when the indicator
  // doesn't meaningfully accumulate (per Phase 3.5 founder direction §7:
  // never fabricate a rate line for a static percentage or index).
  function getPaceLine(indicator) {
    var rate = getRateBreakdown(indicator);
    if (!rate) return null;

    if (rate.secondsPerEvent <= 1) {
      return 'About ' + paceAmount(rate.perSecond, indicator) + ' every second';
    }
    if (rate.secondsPerEvent <= 90) {
      return 'About ' + paceAmount(1, indicator) + ' every ' + Math.round(rate.secondsPerEvent) + ' seconds';
    }
    if (rate.perMinute >= 1) {
      return 'About ' + paceAmount(rate.perMinute, indicator) + ' per minute';
    }
    if (rate.perHour >= 1) {
      return 'About ' + paceAmount(rate.perHour, indicator) + ' per hour';
    }
    if (rate.perDay >= 1) {
      return 'About ' + paceAmount(rate.perDay, indicator) + ' per day';
    }
    var secondsPerEvent = rate.secondsPerEvent;
    if (secondsPerEvent <= 3600 * 24) {
      return 'About ' + paceAmount(1, indicator) + ' every ' + Math.round(secondsPerEvent / 60) + ' minutes';
    }
    if (secondsPerEvent <= 3600 * 24 * 14) {
      return 'About ' + paceAmount(1, indicator) + ' every ' + Math.round(secondsPerEvent / 3600) + ' hours';
    }
    return 'About ' + paceAmount(1, indicator) + ' every ' + Math.round(secondsPerEvent / (3600 * 24)) + ' days';
  }

  var paused = false;

  function tick() {
    if (paused) return;
    var now = new Date();
    var els = document.querySelectorAll('[data-live-clock]');
    els.forEach(function (el) {
      var id = el.getAttribute('data-live-clock');
      var indicator = global.FTN && global.FTN.getIndicator ? global.FTN.getIndicator(id) : null;
      if (!indicator || !indicator.isLiveClock) return;
      el.textContent = computeClockValue(indicator, now);
    });
  }

  function start() {
    var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    tick();
    setInterval(tick, reduceMotion ? 5000 : 1000);

    // Browsers throttle/suspend timers on a hidden or sleeping tab. Because
    // every value here is recomputed from (benchmark + elapsed-real-time ×
    // rate) rather than incremented per tick, the math itself never drifts —
    // but the *displayed* text can go stale until the next tick fires. Force
    // an immediate recalculation the moment the tab is visible again so a
    // resumed kiosk display snaps straight to the correct value.
    if (document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) tick();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  global.FTN = global.FTN || {};
  global.FTN.LiveClocks = {
    computeClockValue: computeClockValue,
    tick: tick,
    pause: function () { paused = true; },
    resume: function () { paused = false; tick(); },
    isPaused: function () { return paused; },
    getRateBreakdown: getRateBreakdown,
    getPaceLine: getPaceLine,
  };
})(window);
