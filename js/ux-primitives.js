// FTN Platform Website — shared UX primitives.
// Small, reusable site-wide improvements: ibis access, local drafts, page save/share,
// offline state, external-link cues, Atlantic-time helpers and Smart Export compatibility.
(function (global) {
  'use strict';

  var FTN = global.FTN = global.FTN || {};
  var ATLANTIC_TZ = 'America/Port_of_Spain';

  function injectStyles() {
    if (document.getElementById('ftn-ux-primitives-style')) return;
    var style = document.createElement('style');
    style.id = 'ftn-ux-primitives-style';
    style.textContent =
      '.ftn-ibis-dock{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:1090;font-family:Inter,system-ui,sans-serif}' +
      '.ftn-ibis-trigger{display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(11,11,11,.88);color:#fff;padding:9px 12px;box-shadow:0 10px 28px rgba(0,0,0,.25);backdrop-filter:blur(10px);cursor:pointer}' +
      '.ftn-ibis-trigger__bird{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.24);color:#e94750;font-weight:800}.ftn-ibis-trigger__label{font-size:12px;font-weight:800}' +
      '.ftn-ibis-panel{position:absolute;left:0;bottom:48px;width:min(360px,calc(100vw - 24px));padding:14px;border:1px solid #303238;border-radius:16px;background:#0d0f13;color:#fff;box-shadow:0 20px 55px rgba(0,0,0,.42)}.ftn-ibis-panel[hidden]{display:none}' +
      '.ftn-ibis-panel h2{margin:0 0 5px;font:800 17px/1.2 Montserrat,Inter,sans-serif}.ftn-ibis-panel p{margin:0 0 10px;color:#a1a1a1;font-size:12px;line-height:1.45}.ftn-ibis-panel textarea{width:100%;min-height:82px;box-sizing:border-box;border:1px solid #3c4148;border-radius:10px;background:#15171b;color:#fff;padding:10px;font:inherit;resize:vertical}.ftn-ibis-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.ftn-ibis-actions button,.ftn-ibis-actions a{border:1px solid #3c4148;border-radius:8px;background:#191c21;color:#fff;padding:8px 10px;text-decoration:none;font-size:11px;font-weight:800;cursor:pointer}.ftn-ibis-actions .is-primary{background:#e10613;border-color:#e10613}' +
      '.ftn-offline-bar{position:fixed;top:0;left:0;right:0;z-index:2000;padding:7px 14px;background:#0b0b0b;color:#fff;text-align:center;font:700 12px/1.4 Inter,system-ui,sans-serif;border-bottom:1px solid #444}.ftn-offline-bar[hidden]{display:none}' +
      '.ftn-draft-note{display:inline-block;margin-top:7px;color:#7f8790;font-size:11px}.ftn-external-link[data-ftn-external="true"]{text-decoration-thickness:.08em;text-underline-offset:.15em}' +
      '@media(max-width:640px){.ftn-ibis-trigger__label{display:none}.ftn-ibis-trigger{padding:8px}.ftn-ibis-panel{bottom:46px}}';
    document.head.appendChild(style);
  }

  function pageKey(suffix) { return 'ftn:' + location.pathname + ':' + suffix; }

  function decorateExternalLinks(root) {
    (root || document).querySelectorAll('a[href^="http"]').forEach(function (a) {
      try {
        var url = new URL(a.href, location.href);
        if (url.origin === location.origin) return;
        a.dataset.ftnExternal = 'true';
        a.classList.add('ftn-external-link');
        if (!a.getAttribute('rel')) a.setAttribute('rel', 'noopener noreferrer');
        if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', (a.textContent.trim() || url.hostname) + ' — external site');
      } catch (e) {}
    });
  }

  function observeDraftForm(form) {
    if (!form || form.dataset.ftnDraftReady === 'true' || form.dataset.ftnNoDraft === 'true') return;
    if (!form.closest('.workspace') && form.dataset.ftnDraft !== 'true') return;
    form.dataset.ftnDraftReady = 'true';
    var id = form.id || Array.prototype.indexOf.call(document.forms, form);
    var key = pageKey('draft:' + id);
    var note = document.createElement('span');
    note.className = 'ftn-draft-note';
    note.textContent = 'Draft stays on this device.';
    form.appendChild(note);

    function serialize() {
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'file' || el.type === 'password' || el.disabled) return;
        if (el.type === 'checkbox' || el.type === 'radio') data[el.name] = el.checked;
        else data[el.name] = el.value;
      });
      try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), values: data })); note.textContent = 'Draft saved on this device.'; } catch (e) {}
    }

    try {
      var saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && saved.values) {
        Object.keys(saved.values).forEach(function (name) {
          var el = form.elements[name]; if (!el) return;
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!saved.values[name];
          else if (!el.value) el.value = saved.values[name];
        });
        note.textContent = 'Draft restored from this device.';
      }
    } catch (e) {}

    var timer;
    form.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(serialize, 300); });
    form.addEventListener('change', function () { clearTimeout(timer); timer = setTimeout(serialize, 100); });
    form.addEventListener('submit', function () { try { localStorage.removeItem(key); } catch (e) {} });
  }

  function scanForms(root) { (root || document).querySelectorAll('form').forEach(observeDraftForm); }

  function mountOfflineState() {
    var bar = document.createElement('div');
    bar.className = 'ftn-offline-bar';
    bar.hidden = navigator.onLine;
    bar.setAttribute('role', 'status');
    bar.textContent = 'You are offline. Saved drafts on this device remain available.';
    document.body.appendChild(bar);
    global.addEventListener('online', function () { bar.hidden = true; });
    global.addEventListener('offline', function () { bar.hidden = false; });
  }

  function mountIbisDock() {
    if (document.querySelector('.ftn-ibis-dock')) return;
    var dock = document.createElement('div');
    dock.className = 'ftn-ibis-dock';
    dock.innerHTML = '<button type="button" class="ftn-ibis-trigger" aria-expanded="false"><span class="ftn-ibis-trigger__bird" aria-hidden="true">i</span><span class="ftn-ibis-trigger__label">Ask ibis</span></button>' +
      '<section class="ftn-ibis-panel" hidden aria-label="Ask ibis"><h2>What are you trying to do?</h2><p>Describe it in your own words. ibis will open with this page as context.</p><textarea aria-label="Your goal" placeholder="I want to..."></textarea><div class="ftn-ibis-actions"><button type="button" class="is-primary" data-ftn-ask>Ask ibis</button><button type="button" data-ftn-save-page>Save page</button><button type="button" data-ftn-share-page>Share page</button><a data-ftn-feedback href="/contact/#feedback">Something wrong?</a></div></section>';
    document.body.appendChild(dock);
    var trigger = dock.querySelector('.ftn-ibis-trigger');
    var panel = dock.querySelector('.ftn-ibis-panel');
    var textarea = dock.querySelector('textarea');
    trigger.addEventListener('click', function () { var open = panel.hidden; panel.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) textarea.focus(); });
    dock.querySelector('[data-ftn-ask]').addEventListener('click', function () {
      var q = textarea.value.trim();
      var params = new URLSearchParams(); if (q) params.set('q', q); params.set('from', location.pathname);
      location.href = '/ibis-ai/?' + params.toString();
    });
    dock.querySelector('[data-ftn-save-page]').addEventListener('click', function (e) {
      try { var key = 'ftn:saved-pages:v1'; var rows = JSON.parse(localStorage.getItem(key) || '[]'); if (!rows.some(function (r) { return r.url === location.href; })) rows.unshift({ title:document.title, url:location.href, savedAt:new Date().toISOString() }); localStorage.setItem(key, JSON.stringify(rows.slice(0,100))); e.currentTarget.textContent = 'Saved'; } catch (err) {}
    });
    dock.querySelector('[data-ftn-share-page]').addEventListener('click', function () { if (navigator.share) navigator.share({ title:document.title, url:location.href }).catch(function () {}); else location.href = 'mailto:?subject=' + encodeURIComponent(document.title) + '&body=' + encodeURIComponent(location.href); });
    var feedback = dock.querySelector('[data-ftn-feedback]');
    feedback.href = '/contact/?page=' + encodeURIComponent(location.pathname) + '#feedback';
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; trigger.setAttribute('aria-expanded','false'); trigger.focus(); } });
  }

  function installSmartExportCompatibility() {
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      var smart = FTN.SmartExport;
      if (smart && smart.registerArtifact) {
        if (!smart.register) {
          smart.register = function (legacy) {
            var formats = [];
            Object.keys(legacy.formats || {}).forEach(function (id) {
              var maker = legacy.formats[id];
              if (typeof maker !== 'function') return;
              formats.push({ id:id, label:id.toUpperCase(), filename:(legacy.title || legacy.artifactId || 'ftn-export') + '.' + id, makeFile:maker });
            });
            return smart.registerArtifact({ id:legacy.artifactId || legacy.id, productId:legacy.productId, label:legacy.title || legacy.label, description:legacy.description || '', formats:formats });
          };
        }
        clearInterval(timer);
      } else if (tries > 40) clearInterval(timer);
    }, 100);
  }

  function formatAtlantic(date, options) {
    return new Intl.DateTimeFormat('en-TT', Object.assign({ timeZone:ATLANTIC_TZ, dateStyle:'medium', timeStyle:'short' }, options || {})).format(date instanceof Date ? date : new Date(date));
  }

  function init() {
    injectStyles(); mountOfflineState(); mountIbisDock(); decorateExternalLinks(document); scanForms(document); installSmartExportCompatibility();
    var observer = new MutationObserver(function (mutations) { mutations.forEach(function (m) { m.addedNodes.forEach(function (node) { if (node.nodeType !== 1) return; decorateExternalLinks(node); scanForms(node); }); }); });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  FTN.UX = { formatAtlantic:formatAtlantic, decorateExternalLinks:decorateExternalLinks, scanForms:scanForms, atlanticTimeZone:ATLANTIC_TZ };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
