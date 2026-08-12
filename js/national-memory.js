// FTN Platform Website — National Memory utility (Phase 4, architecture prep).
//
// Founder direction: "prepare the experience for historical exploration...
// the architecture should naturally accommodate long-term institutional
// memory" — this is preparation, not a historical database. What's real
// today: every indicator's `history` array (js/indicators-data.js) already
// is a short time series, so getHistoricalComparison() works genuinely
// against it now. What's a documented stub: snapshot(), which describes the
// shape a future dated-snapshot API would return without inventing data no
// dated snapshot actually backs yet.
(function (global) {
  'use strict';

  // Compares two points in an indicator's existing history array — real
  // math over real (if illustrative-scoped) data, not a fabricated date-range query.
  // offsetFromEnd: 0 = most recent point, 1 = one period back, etc.
  function getHistoricalComparison(indicatorId, offsetA, offsetB) {
    var ind = global.FTN && global.FTN.getIndicator ? global.FTN.getIndicator(indicatorId) : null;
    if (!ind || !ind.history || ind.history.length <= Math.max(offsetA, offsetB)) return null;
    var len = ind.history.length;
    var a = ind.history[len - 1 - offsetA];
    var b = ind.history[len - 1 - offsetB];
    var delta = a - b;
    var pctChange = b !== 0 ? (delta / Math.abs(b)) * 100 : null;
    return {
      indicatorId: indicatorId,
      pointA: a, pointB: b, delta: Math.round(delta * 100) / 100,
      pctChange: pctChange === null ? null : Math.round(pctChange * 10) / 10,
      periodsApart: Math.abs(offsetA - offsetB),
      note: 'Computed from the ' + len + '-point illustrative history series, not a dated historical benchmark.',
    };
  }

  // Documented future shape — not implemented. A real National Memory would
  // resolve a specific calendar date to whatever was known/true on that
  // date. Calling this now throws on purpose rather than returning a
  // fabricated snapshot, so it can never be silently mistaken for real data.
  function snapshot(dateISO) {
    throw new Error(
      'FTN.NationalMemory.snapshot() is an architectural placeholder (Phase 4). ' +
      'It will resolve a calendar date (' + dateISO + ') to a stored indicator/' +
      'event snapshot once dated historical data exists. Use getHistoricalComparison() ' +
      'for what is genuinely available today.'
    );
  }

  global.FTN = global.FTN || {};
  global.FTN.NationalMemory = { getHistoricalComparison: getHistoricalComparison, snapshot: snapshot };
})(window);
