// FTN Platform Website — one shared Share primitive.
//
// Before this, radio-player.js had its own private share handler (Web Share API, falling back to
// a mailto link) and nothing else on the site shared it. This is the ONE reusable version: prefers
// the native Web Share API on supporting devices (mobile), and falls back to a small on-page sheet
// prioritizing WhatsApp and Facebook (the founder's stated priority channels for Trinidad &
// Tobago), then Copy Link. No product builds its own second sharing mechanism — call
// global.FTN.Share.open({title, text, url}) from anywhere.
(function (global) {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function whatsappUrl(text, url) { return 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text ? (text + ' ' + url) : url); }
  function facebookUrl(url) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url); }

  var dialog = null;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('div');
    dialog.className = 'ftn-share-dialog';
    dialog.innerHTML =
      '<div class="ftn-share-dialog__backdrop" data-share-close></div>' +
      '<div class="ftn-share-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="ftn-share-title">' +
        '<button type="button" class="ftn-share-dialog__close" data-share-close aria-label="Close share panel">&times;</button>' +
        '<p class="ftn-share-dialog__eyebrow">SHARE</p>' +
        '<h2 id="ftn-share-title" class="ftn-share-dialog__title"></h2>' +
        '<p class="ftn-share-dialog__text"></p>' +
        '<div class="ftn-share-dialog__actions">' +
          '<a class="ftn-share-dialog__option ftn-share-dialog__option--whatsapp" target="_blank" rel="noopener noreferrer">' +
            '<span>WhatsApp</span></a>' +
          '<a class="ftn-share-dialog__option ftn-share-dialog__option--facebook" target="_blank" rel="noopener noreferrer">' +
            '<span>Facebook</span></a>' +
          '<button type="button" class="ftn-share-dialog__option ftn-share-dialog__option--copy" data-share-copy>' +
            '<span>Copy Link</span></button>' +
        '</div>' +
        '<p class="ftn-share-dialog__status" role="status" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(dialog);
    dialog.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-share-close')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dialog.classList.contains('is-open')) close();
    });
    return dialog;
  }

  function close() {
    if (dialog) dialog.classList.remove('is-open');
    document.body.classList.remove('ftn-share-open');
  }

  function openSheet(title, text, url) {
    var el = ensureDialog();
    el.querySelector('.ftn-share-dialog__title').textContent = title;
    el.querySelector('.ftn-share-dialog__text').textContent = text;
    var wa = el.querySelector('.ftn-share-dialog__option--whatsapp');
    wa.href = whatsappUrl(text || title, url);
    var fb = el.querySelector('.ftn-share-dialog__option--facebook');
    fb.href = facebookUrl(url);
    var status = el.querySelector('.ftn-share-dialog__status');
    status.textContent = '';
    var copyBtn = el.querySelector('[data-share-copy]');
    copyBtn.onclick = function () {
      copyLink(url).then(function (ok) {
        status.textContent = ok ? 'Link copied.' : 'Could not copy — copy the address bar instead.';
      });
    };
    el.classList.add('is-open');
    document.body.classList.add('ftn-share-open');
  }

  function copyLink(url) {
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url).then(function () { return true; }).catch(function () { return false; });
    }
    try {
      var input = document.createElement('input');
      input.value = url; input.style.position = 'fixed'; input.style.opacity = '0';
      document.body.appendChild(input); input.select();
      var ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(input);
      return Promise.resolve(!!ok);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  // data: { title, text, url }. url defaults to the current page.
  function open(data) {
    data = data || {};
    var title = data.title || 'FTN Platform';
    var text = data.text || '';
    var url = data.url || global.location.href;
    if (global.navigator && navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function (e) {
        if (e && e.name !== 'AbortError') openSheet(title, text, url);
      });
      return;
    }
    openSheet(title, text, url);
  }

  global.FTN = global.FTN || {};
  global.FTN.Share = { open: open };
})(window);
