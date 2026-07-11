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

  function render(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;

    function update() {
      var now = new Date();
      var sun = sunTimes(now);
      var moon = moonPhase(now);

      var rows = [
        ['Date', fmtDate(now)],
        ['Local Time (Port of Spain)', fmtTime(now)],
        ['Sunrise', fmtTime(sun.sunrise)],
        ['Sunset', fmtTime(sun.sunset)],
        ['Moon Phase', moon.name + ' (' + moon.illumination + '% illuminated)'],
        ['Season', seasonStatus(now)],
      ];

      var clockIndicators = [
        ['hurricane-season-progress', 'Hurricane Season'],
        ['carnival-countdown', 'Carnival'],
        ['independence-countdown', 'Independence Day'],
        ['republic-day-countdown', 'Republic Day'],
        ['school-term-progress', 'School Term'],
        ['budget-progress', 'Fiscal Year'],
      ];

      var html = '<dl class="today-panel__grid">' + rows.map(function (r) {
        return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
      }).join('') + '</dl>';

      html += '<dl class="today-panel__grid today-panel__grid--calendar">' + clockIndicators.map(function (pair) {
        var ind = global.FTN.getIndicator ? global.FTN.getIndicator(pair[0]) : null;
        if (!ind) return '';
        var val = global.FTN.LiveClocks ? global.FTN.LiveClocks.computeClockValue(ind, now) : ind.value;
        return '<div><dt>' + pair[1] + '</dt><dd data-live-clock="' + pair[0] + '" aria-live="off">' + val + '</dd><dd class="today-panel__unit">' + ind.units + '</dd></div>';
      }).join('') + '</dl>';

      html += '<p class="today-panel__note">Sunrise, sunset, and moon phase are calculated for Port of Spain (10.65°N, 61.4°W) using standard solar/lunar position formulas — not a live feed. Season is a calendar-month convention from TT Met Service climate guidance.</p>';

      mount.innerHTML = html;
    }

    update();
    setInterval(update, 60000);
  }

  global.FTN = global.FTN || {};
  global.FTN.TodayPanel = { render: render, sunTimes: sunTimes, moonPhase: moonPhase };
})(window);
