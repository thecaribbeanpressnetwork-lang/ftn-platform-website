// FTN Platform Website — Integration Adapter Layer.
// Shared submission seam. The current website implementation persists workspace records locally.
(function (global) {
  'use strict';
  function storage() { return (global.FTN && global.FTN.storage) || null; }
  function submit(toolId, payload) {
    var s = storage();
    var key = 'ftn-submission-' + toolId;
    var record = { toolId: toolId, submittedAt: new Date().toISOString(), payload: payload };
    if (s) {
      var existing = s.getJSON(key, []);
      existing.push(record);
      s.setJSON(key, existing);
    }
    return Promise.resolve({ ok:true, message:'Saved on this device.', record:record, delivery:'local' });
  }
  function history(toolId) { var s=storage(); return s ? s.getJSON('ftn-submission-' + toolId, []) : []; }
  global.FTN = global.FTN || {};
  global.FTN.IntegrationAdapter = { submit:submit, history:history };
})(window);
