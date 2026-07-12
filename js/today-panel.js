// FTN Platform Website — "Today in Trinidad & Tobago" panel.
//
// Sunrise/sunset use the standard NOAA/Wikipedia sunrise equation for
// Port of Spain's coordinates (10.65°N, -61.4°W) — real solar-position
// mathematics, not a guessed or hardcoded time. Moon phase uses a known
// reference new moon and the synodic month length. Local time uses the
// Intl API's real America/Port_of_Spain time zone data rather than a
// manually hardcoded UTC-4 offset (which would silently break if the
// zone's rules ever changed). Wet/dry season status is a calendar-month
// rule disclosed as such — see the Trust Card-style methodology note
// rendered alongside it — not a live meteorological reading.
(function (global) {
  'use strict';

  var LAT = 10.65;
  var LNG = -61.4;
  var RAD = Math.PI / 180;

  function julianFromDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function dateFromJulian(J) {
    return new Date((J - 2440587.5) * 86400000);
  }

  // Standard sunrise equation (NOAA / Wikipedia "Sunrise equation").
  function sunTimes(date) {
    var J = julianFromDate(date);
    var n = Math.floor(J - 2451545.0 + 0.0008);
    var Jstar = n - LNG / 360;
    var M = (357.5291 + 0.98560028 * Jstar) % 360;
    var Mrad = M * RAD;
    var C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);
    var lambda = (M + 102.9372 + C + 180) % 360;
    var lambdaRad = lambda * RAD;
    var Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);
    var sinDelta = Math.sin(lambdaRad) * Math.sin(23.44 * RAD);
    var delta = Math.asin(sinDelta);
    var latRad = LAT * RAD;
    var cosOmega = (Math.sin(-0.83 * RAD) - Math.sin(latRad) * sinDelta) / (Math.cos(latRad) * Math.cos(delta));
    cosOmega = Math.max(-1, Math.min(1, cosOmega));
    var omega0 = Math.acos(cosOmega) / RAD;
    return {
      sunrise: dateFromJulian(Jtransit - omega0 / 360),
      sunset: dateFromJulian(Jtransit + omega0 / 360),
    };
  }

  // Known reference new moon (2000-01-06 18:14 UTC) + synodic month length.
  function moonPhase(date) {
    var synodicDays = 29.53058867;
    var knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
    var days = (date.getTime() - knownNewMoon) / 86400000;
    var age = ((days % synodicDays) + synodicDays) % synodicDays;
    var fraction = age / synodicDays;
    var names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    var idx = Math.round(fraction * 8) % 8;
    var illumination = Math.round((1 - Math.cos(fraction * 2 * Math.PI)) / 2 * 100);
    return { name: names[idx], illumination: illumination, ageDays: Math.round(age * 10) / 10 };
  }

  function seasonStatus(date) {
    // Trinidad's conventional wet season is June-December; dry season
    // January-May — a disclosed calendar rule (TT Met Service climate
    // overview), not a live rainfall reading.
    var month = date.getMonth(); // 0-indexed
    return (month >= 5) ? 'Wet Season' : 'Dry Season';
  }

  function fmtTime(date) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Port_of_Spain', hour: '2-digit', minute: '2-digit',
    }).format(date);
  }

  function fmtDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Port_of_Spain', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(date);
  }

  // The three countdown indicators (Carnival, Independence Day, Republic Day)
  // are day-counts to a fixed annual date, not naturally a 0-100 quantity —
  // normalizing them into a ring would misrepresent them, so only the three
  // genuine progress-through-a-known-period indicators get a ring gauge;
  // the three countdowns get a plain big-number treatment instead. Forcing
  // every metric into one visual would read as decoration, not clarity.
  var RING_INDICATORS = [
    ['hurricane-season-progress', 'Hurricane Season'],
    ['school-term-progress', 'School Term'],
    ['budget-progress', 'Fiscal Year'],
  ];
  var COUNTDOWN_INDICATORS = [
    ['carnival-countdown', 'Carnival'],
    ['independence-countdown', 'Independence Day'],
    ['republic-day-countdown', 'Republic Day'],
  ];

  function render(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;

    function update() {
      var now = new Date();
      var sun = sunTimes(now);
      var moon = moonPhase(now);

      var conditions = [
        ['Sunrise', fmtTime(sun.sunrise)],
        ['Sunset', fmtTime(sun.sunset)],
        ['Moon Phase', moon.name],
        ['Season', seasonStatus(now)],
      ];

      var html = '<div class="today-snapshot">';

      html += '<div class="today-snapshot__now">' +
        '<p class="today-snapshot__label"><span class="today-snapshot__dot" aria-hidden="true"></span>Live</p>' +
        '<p class="today-snapshot__time">' + fmtTime(now) + '</p>' +
        '<p class="today-snapshot__date">' + fmtDate(now) + ' &middot; Port of Spain</p>' +
      '</div>';

      html += '<div class="today-conditions">' + conditions.map(function (c) {
        return '<div class="today-conditions__item"><p class="today-conditions__label">' + c[0] + '</p><p class="today-conditions__value">' + c[1] + '</p></div>';
      }).join('') + '</div>';

      html += '<div class="today-metrics">';

      html += RING_INDICATORS.map(function (pair) {
        var ind = global.FTN.getIndicator ? global.FTN.getIndicator(pair[0]) : null;
        if (!ind) return '';
        var val = global.FTN.LiveClocks ? global.FTN.LiveClocks.computeClockValue(ind, now) : ind.value;
        var pct = parseFloat(val) || 0;
        var ring = global.FTN.Charts ? global.FTN.Charts.gauge(pct, { size: 84, stroke: 7, ariaLabel: pair[1] + ': ' + val + '%' }).outerHTML : '';
        return '<div class="today-ring">' +
          '<div class="today-ring__graphic">' + ring + '<span class="today-ring__value" data-live-clock="' + pair[0] + '" aria-live="off">' + val + '</span></div>' +
          '<p class="today-ring__label">' + pair[1] + '</p>' +
        '</div>';
      }).join('');

      html += COUNTDOWN_INDICATORS.map(function (pair) {
        var ind = global.FTN.getIndicator ? global.FTN.getIndicator(pair[0]) : null;
        if (!ind) return '';
        var val = global.FTN.LiveClocks ? global.FTN.LiveClocks.computeClockValue(ind, now) : ind.value;
        return '<div class="today-countdown">' +
          '<p class="today-countdown__value" data-live-clock="' + pair[0] + '" aria-live="off">' + val + '</p>' +
          '<p class="today-countdown__label">' + ind.units + ' to ' + pair[1] + '</p>' +
        '</div>';
      }).join('');

      html += '</div>';

      html += '<p class="today-panel__note">Sunrise, sunset, and moon phase are calculated for Port of Spain (10.65°N, 61.4°W) using standard solar/lunar position formulas — not a live feed. Season is a calendar-month convention from TT Met Service climate guidance.</p>';

      html += '</div>';

      mount.innerHTML = html;
    }

    update();
    setInterval(update, 60000);
  }

  global.FTN = global.FTN || {};
  global.FTN.TodayPanel = { render: render, sunTimes: sunTimes, moonPhase: moonPhase };
})(window);
