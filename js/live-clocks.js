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
  };
})(window);
