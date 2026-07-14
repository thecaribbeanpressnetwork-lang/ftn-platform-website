// FTN Platform Website — Integration Adapter Layer (Sprint 1, Wave 1).
//
// A documented convention, not a UI feature. Every new intake tool's submit action calls
// IntegrationAdapter.submit(toolId, payload) instead of writing its own localStorage/confirmation
// logic. Today this is the entire implementation: save locally, return a resolved promise with an
// honest confirmation message. This is the one place a real backend gets wired in later -- when
// FTN has a real API for a given toolId, only this function's internals change; every product
// calling it is unaffected. Extends the same seam already proven by v1.8.0's data-sign-in-entry
// hook, generalized from "one button" to "every intake tool platform-wide."
(function (global) {
  'use strict';

  function storage() {
    return (global.FTN && global.FTN.storage) || null;
  }

  function submit(toolId, payload) {
    var s = storage();
    var key = 'ftn-submission-' + toolId;
    var record = { toolId: toolId, submittedAt: new Date().toISOString(), payload: payload };
    if (s) {
      var existing = s.getJSON(key, []);
      existing.push(record);
      s.setJSON(key, existing);
    }
    // A real network call belongs here once a real backend exists for this toolId -- until then,
    // this resolves immediately and honestly: the data is saved in this browser, nothing more.
    return Promise.resolve({
      ok: true,
      message: 'Saved in this browser. A real submission pipeline will connect here once it exists.',
      record: record,
    });
  }

  function history(toolId) {
    var s = storage();
    if (!s) return [];
    return s.getJSON('ftn-submission-' + toolId, []);
  }

  global.FTN = global.FTN || {};
  global.FTN.IntegrationAdapter = { submit: submit, history: history };
})(window);
