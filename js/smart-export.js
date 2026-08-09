// FTN Platform — Smart Export / Share layer.
// One platform-wide overlay. Products register only the artifacts they can genuinely produce.
// No persistent device fingerprinting and no contact detail collection in this client layer.
(function (global) {
  'use strict';

  var artifacts = [];
  var telemetryHandler = null;
  var trigger = null;
  var dialog = null;

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function safeName(name) {
    return String(name || 'ftn-export').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'ftn-export';
  }

  function injectStyles() {
    if (document.getElementById('ftn-smart-export-style')) return;
    var style = document.createElement('style');
    style.id = 'ftn-smart-export-style';
    style.textContent =
      '.ftn-smart-export-trigger{position:fixed;right:18px;bottom:18px;z-index:1100;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:#0b0b0b;color:#fff;padding:11px 16px;font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:.03em;box-shadow:0 10px 32px rgba(0,0,0,.28);cursor:pointer}' +
      '.ftn-smart-export-trigger[hidden]{display:none}.ftn-smart-export-trigger:hover{border-color:#e10613}' +
      '.ftn-smart-export-backdrop{position:fixed;inset:0;z-index:1200;display:grid;place-items:end center;padding:18px;background:rgba(0,0,0,.58);backdrop-filter:blur(7px)}' +
      '.ftn-smart-export-backdrop[hidden]{display:none}.ftn-smart-export-panel{width:min(680px,100%);max-height:min(82vh,760px);overflow:auto;border:1px solid #303238;border-radius:20px;background:#0d0f13;color:#fff;box-shadow:0 24px 80px rgba(0,0,0,.52)}' +
      '.ftn-smart-export-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px;border-bottom:1px solid #292d34}.ftn-smart-export-head h2{margin:3px 0 5px;font:800 22px/1.1 Montserrat,Inter,sans-serif}.ftn-smart-export-head p{margin:0;color:#9fa7b3;font-size:12px;line-height:1.5}.ftn-smart-export-close{border:1px solid #3b414a;background:#171a20;color:#fff;border-radius:8px;padding:7px 10px;cursor:pointer}' +
      '.ftn-smart-export-body{padding:14px}.ftn-smart-export-artifact{padding:14px;border:1px solid #292e36;border-radius:14px;background:#12151a;margin-bottom:10px}.ftn-smart-export-artifact h3{margin:0 0 5px;font-size:15px}.ftn-smart-export-artifact p{margin:0 0 12px;color:#9099a7;font-size:11px;line-height:1.45}.ftn-smart-export-actions{display:flex;gap:7px;flex-wrap:wrap}.ftn-smart-export-action{border:1px solid #3b424d;background:#1a1e25;color:#fff;border-radius:8px;padding:8px 10px;font-weight:800;font-size:11px;cursor:pointer}.ftn-smart-export-action--primary{background:#e10613;border-color:#e10613}.ftn-smart-export-note{padding:0 14px 16px;color:#8d95a1;font-size:10px;line-height:1.55}' +
      '@media(max-width:640px){.ftn-smart-export-trigger{right:12px;bottom:12px}.ftn-smart-export-backdrop{padding:0;place-items:end stretch}.ftn-smart-export-panel{width:100%;border-radius:20px 20px 0 0;max-height:88vh}}';
    document.head.appendChild(style);
  }

  function defaultTelemetry(event) {
    try {
      var key = 'ftn-smart-export-events-v1';
      var rows = JSON.parse(localStorage.getItem(key) || '[]');
      rows.push(event);
      localStorage.setItem(key, JSON.stringify(rows.slice(-100)));
    } catch (e) { /* telemetry must never block export */ }
  }

  function track(event) {
    var record = Object.assign({ occurredAt: new Date().toISOString(), path: location.pathname }, event || {});
    try {
      var handler = telemetryHandler || defaultTelemetry;
      var result = handler(record);
      if (result && typeof result.catch === 'function') result.catch(function () {});
    } catch (e) { /* telemetry must never block export */ }
  }

  function normalizeFile(result, format) {
    if (!result) throw new Error('No export file was produced.');
    if (result instanceof File) return result;
    if (result instanceof Blob) return new File([result], safeName(format.filename || 'ftn-export'), { type: result.type || format.mime || 'application/octet-stream' });
    if (result.blob instanceof Blob) return new File([result.blob], safeName(result.filename || format.filename || 'ftn-export'), { type: result.blob.type || result.mime || format.mime || 'application/octet-stream' });
    throw new Error('Unsupported export result.');
  }

  function downloadFile(file) {
    var url = URL.createObjectURL(file);
    var a = document.createElement('a');
    a.href = url;
    a.download = safeName(file.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  async function makeFile(artifact, format) {
    if (!format || typeof format.makeFile !== 'function') throw new Error('This format is not available yet.');
    return normalizeFile(await format.makeFile(), format);
  }

  async function runAction(artifactId, formatId, action) {
    var artifact = artifacts.find(function (a) { return a.id === artifactId; });
    if (!artifact) return;
    var format = (artifact.formats || []).find(function (f) { return f.id === formatId; });
    if (!format) return;
    var button = dialog && dialog.querySelector('[data-artifact="' + CSS.escape(artifactId) + '"][data-format="' + CSS.escape(formatId) + '"][data-action="' + action + '"]');
    if (button) button.disabled = true;
    try {
      var file = await makeFile(artifact, format);
      if (action === 'share' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: artifact.label || file.name, text: artifact.shareText || '' });
      } else {
        downloadFile(file);
        action = 'download';
      }
      track({ productId: artifact.productId || '', artifactId: artifact.id, format: format.id, action: action });
    } catch (error) {
      console.error('FTN Smart Export:', error);
      alert(error && error.message ? error.message : 'FTN could not prepare that export.');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function render() {
    if (!trigger || !dialog) return;
    trigger.hidden = artifacts.length === 0;
    if (!artifacts.length) return;
    var body = dialog.querySelector('.ftn-smart-export-body');
    body.innerHTML = artifacts.map(function (artifact) {
      var formats = (artifact.formats || []).filter(function (f) { return f && f.id && typeof f.makeFile === 'function'; });
      if (!formats.length) return '';
      var actions = formats.map(function (format) {
        return '<button type="button" class="ftn-smart-export-action ftn-smart-export-action--primary" data-artifact="' + escapeHtml(artifact.id) + '" data-format="' + escapeHtml(format.id) + '" data-action="download">' + escapeHtml(format.label || format.id.toUpperCase()) + '</button>' +
          '<button type="button" class="ftn-smart-export-action" data-artifact="' + escapeHtml(artifact.id) + '" data-format="' + escapeHtml(format.id) + '" data-action="share">Share</button>';
      }).join('');
      return '<article class="ftn-smart-export-artifact"><h3>' + escapeHtml(artifact.label || artifact.id) + '</h3><p>' + escapeHtml(artifact.description || '') + '</p><div class="ftn-smart-export-actions">' + actions + '</div></article>';
    }).join('');
  }

  function mount() {
    injectStyles();
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'ftn-smart-export-trigger';
      trigger.textContent = 'Download / Share';
      trigger.hidden = true;
      document.body.appendChild(trigger);
    }
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.className = 'ftn-smart-export-backdrop';
      dialog.hidden = true;
      dialog.innerHTML = '<section class="ftn-smart-export-panel" role="dialog" aria-modal="true" aria-labelledby="ftn-smart-export-title"><div class="ftn-smart-export-head"><div><p>FTN SMART EXPORT</p><h2 id="ftn-smart-export-title">Take your work with you.</h2><p>Only formats this page can genuinely produce are shown.</p></div><button type="button" class="ftn-smart-export-close" aria-label="Close">Close</button></div><div class="ftn-smart-export-body"></div><div class="ftn-smart-export-note">Download events may be recorded to improve FTN products. Contact details are not collected by this export layer. Direct email or WhatsApp delivery, if added later, must request the needed contact detail and purpose-specific consent.</div></section>';
      document.body.appendChild(dialog);
      dialog.addEventListener('click', function (event) {
        var action = event.target.closest('[data-action]');
        if (action) runAction(action.getAttribute('data-artifact'), action.getAttribute('data-format'), action.getAttribute('data-action'));
        if (event.target === dialog || event.target.closest('.ftn-smart-export-close')) dialog.hidden = true;
      });
    }
    trigger.onclick = function () { render(); dialog.hidden = false; };
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && dialog && !dialog.hidden) dialog.hidden = true; });
    render();
  }

  function registerArtifact(artifact) {
    if (!artifact || !artifact.id) throw new Error('Smart Export artifact requires an id.');
    var index = artifacts.findIndex(function (item) { return item.id === artifact.id; });
    if (index >= 0) artifacts[index] = artifact; else artifacts.push(artifact);
    mount();
    render();
    return artifact.id;
  }

  function unregisterArtifact(id) {
    artifacts = artifacts.filter(function (item) { return item.id !== id; });
    render();
  }

  function setTelemetryHandler(handler) {
    telemetryHandler = typeof handler === 'function' ? handler : null;
  }

  global.FTN = global.FTN || {};
  global.FTN.SmartExport = {
    registerArtifact: registerArtifact,
    unregisterArtifact: unregisterArtifact,
    setTelemetryHandler: setTelemetryHandler,
    listArtifacts: function () { return artifacts.slice(); }
  };

  mount();
  var queued = global.FTN_SMART_EXPORT_QUEUE || [];
  queued.forEach(registerArtifact);
  global.FTN_SMART_EXPORT_QUEUE = { push: registerArtifact };
})(window);
