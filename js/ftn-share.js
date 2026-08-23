// FTN Platform Website — one shared Share primitive.
//
// Before this, radio-player.js had its own private share handler (Web Share API, falling back to
// a mailto link) and nothing else on the site shared it. This is the ONE reusable version: prefers
// the native Web Share API on supporting devices (mobile), and falls back to the shared FTN Sheet
// foundation (js/ftn-sheet.js) on desktop/unsupported devices, prioritizing WhatsApp and Facebook
// (the founder's stated priority channels for Trinidad & Tobago), then Copy Link. No product
// builds its own second sharing mechanism — call global.FTN.Share.open({title, text, url}) from
// anywhere.
(function (global) {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function whatsappUrl(text, url) { return 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text ? (text + ' ' + url) : url); }
  function facebookUrl(url) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url); }

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

  function openSheet(title, text, url) {
    var Sheet = global.FTN && global.FTN.Sheet;
    if (!Sheet) return;
    Sheet.open({
      id: 'ftn-share-sheet',
      labelledBy: 'ftn-share-title',
      render: function (panel) {
        panel.innerHTML =
          '<button type="button" class="ftn-sheet__close" data-share-close aria-label="Close share panel">&times;</button>' +
          '<p class="ftn-share-dialog__eyebrow">SHARE</p>' +
          '<h2 id="ftn-share-title" class="ftn-share-dialog__title">' + esc(title) + '</h2>' +
          '<p class="ftn-share-dialog__text">' + esc(text) + '</p>' +
          '<div class="ftn-share-dialog__actions">' +
            '<a class="ftn-share-dialog__option ftn-share-dialog__option--whatsapp" href="' + esc(whatsappUrl(text || title, url)) + '" target="_blank" rel="noopener noreferrer"><span>WhatsApp</span></a>' +
            '<a class="ftn-share-dialog__option ftn-share-dialog__option--facebook" href="' + esc(facebookUrl(url)) + '" target="_blank" rel="noopener noreferrer"><span>Facebook</span></a>' +
            '<button type="button" class="ftn-share-dialog__option ftn-share-dialog__option--copy" data-share-copy><span>Copy Link</span></button>' +
          '</div>' +
          '<p class="ftn-share-dialog__status" role="status" aria-live="polite"></p>';
        panel.querySelector('[data-share-close]').addEventListener('click', function () { Sheet.close(); });
        var status = panel.querySelector('.ftn-share-dialog__status');
        panel.querySelector('[data-share-copy]').addEventListener('click', function () {
          copyLink(url).then(function (ok) {
            status.textContent = ok ? 'Link copied.' : 'Could not copy — copy the address bar instead.';
          });
        });
      }
    });
  }

  // data: { title, text, url }. url defaults to the current page.
  function open(data) {
    data = data || {};
    var title = data.title || 'FTN Platform';
    var text = data.text || '';
    var url = data.url || global.location.href;
    // Prefer the native Web Share API, but never let a broken/incomplete implementation leave
    // the button doing nothing. Some browser contexts (headless/automated/some restricted
    // embeds) expose navigator.share as a function that either rejects unpredictably or never
    // settles its promise at all -- there's no reliable way to feature-detect that in advance.
    // A generous timeout race guards against exactly that: if navigator.share() hasn't settled
    // within a few seconds (real users deciding in a genuine native sheet almost always resolve
    // well inside that window), fall back to the shared sheet rather than leaving Share silently
    // inert. If navigator.share() does settle afterward, the `settled` flag stops it from also
    // triggering the fallback on top of whatever the user already did.
    if (global.navigator && navigator.share) {
      var settled = false;
      navigator.share({ title: title, text: text, url: url }).then(function () {
        settled = true;
      }).catch(function () {
        if (!settled) { settled = true; openSheet(title, text, url); }
      });
      setTimeout(function () {
        if (!settled) { settled = true; openSheet(title, text, url); }
      }, 2500);
      return;
    }
    openSheet(title, text, url);
  }

  global.FTN = global.FTN || {};
  global.FTN.Share = { open: open };
})(window);
