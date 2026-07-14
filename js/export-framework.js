// FTN Platform Website — Export Framework (Sprint 1, Wave 1).
//
// Owns export behavior platform-wide via a registered-handler map, so a future format (PDF, CSV,
// Markdown) plugs in by registering a new handler, never by touching a product's own code.
// Sprint 1 ships three real, working handlers: txt, json, print.
(function (global) {
  'use strict';

  var HANDLERS = {};

  function registerHandler(format, handler) {
    HANDLERS[format] = handler;
  }

  function availableFormats() {
    return Object.keys(HANDLERS);
  }

  // data: { title, body } where body is either a string (txt) or a plain object (json/print).
  function exportAs(format, data) {
    var handler = HANDLERS[format];
    if (!handler) throw new Error('Export Framework: no handler registered for "' + format + '"');
    return handler(data);
  }

  function downloadBlob(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  registerHandler('txt', function (data) {
    var filename = slugify(data.title) + '.txt';
    downloadBlob(filename, typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2), 'text/plain');
    return { format: 'txt', filename: filename };
  });

  registerHandler('json', function (data) {
    var filename = slugify(data.title) + '.json';
    downloadBlob(filename, JSON.stringify(data.body, null, 2), 'application/json');
    return { format: 'json', filename: filename };
  });

  registerHandler('print', function (data) {
    var win = window.open('', '_blank');
    if (!win) return { format: 'print', filename: null, blocked: true };
    var bodyHtml = typeof data.body === 'string'
      ? '<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;">' + escapeHtml(data.body) + '</pre>'
      : '<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;">' + escapeHtml(JSON.stringify(data.body, null, 2)) + '</pre>';
    win.document.write(
      '<!doctype html><html><head><title>' + escapeHtml(data.title) + '</title>' +
      '<style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;padding:32px;color:#0B0B0B;}h1{font-size:1.25rem;}</style>' +
      '</head><body><h1>' + escapeHtml(data.title) + '</h1>' + bodyHtml + '</body></html>'
    );
    win.document.close();
    win.focus();
    win.print();
    return { format: 'print', filename: null };
  });

  function slugify(text) {
    return String(text || 'ftn-export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.ExportFramework = {
    registerHandler: registerHandler,
    availableFormats: availableFormats,
    export: exportAs,
  };
})(window);
