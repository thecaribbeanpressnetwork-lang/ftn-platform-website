// FTN Platform — ibis persistent assistant widget. Loaded sitewide via js/nav.js's loadOnce().
// Talks only to supabase/functions/ibis-assistant (a narrowly scoped, guest-accessible proxy --
// the Anthropic key stays server-side). Message history lives in memory for this page view only;
// nothing is written to localStorage or sent anywhere else.
(function (global) {
  'use strict';
  if (document.getElementById('ibis-widget-trigger')) return; // already mounted (e.g. double-load)

  var ENDPOINT = 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-assistant';
  var PUBLISHABLE_KEY = 'sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function addStyle() {
    if (document.querySelector('link[data-ibis-widget]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/css/components/ibis-widget.css';
    l.setAttribute('data-ibis-widget', 'true');
    document.head.appendChild(l);
  }

  // A simple purple-only wading-bird silhouette -- deliberately no red/orange anywhere,
  // matching the founder's absolute rule on ibis colour.
  var IBIS_SVG = '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M10 46c6-2 10-7 12-13 1-4 1-9-2-13-2-3-1-7 2-8 4-1 7 3 7 7 0 5-2 9-5 12l18 6c2 1 3 3 2 5-1 2-3 2-5 1L21 37c-2 5-6 9-11 10Z" fill="#a855f7"/>' +
    '<path d="M44 22c3-4 6-9 6-9s0 5-2 9c-1 2-2 3-4 3Z" fill="#c084fc"/>' +
    '<circle cx="46" cy="18" r="2" fill="#0b0b0d"/>' +
    '</svg>';

  var history = [];
  var open = false;
  var lastFocused = null;
  var pending = false;

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'ibis-widget-trigger';
  trigger.className = 'ibis-widget-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', 'Ask ibis, FTN’s Caribbean assistant');
  trigger.innerHTML = '<span class="ibis-widget-trigger__ring" aria-hidden="true"></span>' + IBIS_SVG;

  var panel = document.createElement('section');
  panel.id = 'ibis-widget-panel';
  panel.className = 'ibis-widget-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'ibis-widget-title');
  panel.hidden = true;
  panel.innerHTML =
    '<div class="ibis-widget-panel__head">' + IBIS_SVG +
    '<div><h2 id="ibis-widget-title">Ask ibis</h2><span>FTN’s Caribbean assistant</span></div>' +
    '<button type="button" class="ibis-widget-close" aria-label="Close ibis">&times;</button>' +
    '</div>' +
    '<div class="ibis-widget-messages" id="ibis-widget-messages" role="log" aria-live="polite"></div>' +
    '<form class="ibis-widget-form" id="ibis-widget-form">' +
    '<label class="sr-only" for="ibis-widget-input">Message ibis</label>' +
    '<input class="ibis-widget-input" id="ibis-widget-input" type="text" autocomplete="off" placeholder="Ask about any FTN product…" maxlength="2000">' +
    '<button class="ibis-widget-send" id="ibis-widget-send" type="submit" aria-label="Send">&rarr;</button>' +
    '</form>';

  function mount() {
    addStyle();
    document.body.appendChild(trigger);
    document.body.appendChild(panel);
  }

  function focusableElements() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled; });
  }

  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    var items = focusableElements();
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function onKeydown(event) {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    trapFocus(event);
  }

  function openPanel() {
    if (open) return;
    open = true;
    lastFocused = document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown, true);
    var input = document.getElementById('ibis-widget-input');
    setTimeout(function () { if (input) input.focus(); }, 60);
  }

  function close() {
    if (!open) return;
    open = false;
    panel.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown, true);
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finish = function () { panel.hidden = true; };
    if (reduceMotion) finish(); else setTimeout(finish, 200);
    if (lastFocused && lastFocused.focus) lastFocused.focus(); else trigger.focus();
  }

  function scrollToEnd() {
    var host = document.getElementById('ibis-widget-messages');
    host.scrollTop = host.scrollHeight;
  }

  function appendMessage(role, text) {
    var host = document.getElementById('ibis-widget-messages');
    var bubble = document.createElement('div');
    bubble.className = 'ibis-widget-msg ibis-widget-msg--' + role;
    bubble.textContent = text;
    host.appendChild(bubble);
    scrollToEnd();
    return bubble;
  }

  function appendThinking() {
    var host = document.getElementById('ibis-widget-messages');
    var bubble = document.createElement('div');
    bubble.className = 'ibis-widget-msg ibis-widget-msg--thinking';
    bubble.id = 'ibis-widget-thinking';
    bubble.innerHTML = IBIS_SVG + '<span>ibis is thinking…</span>';
    host.appendChild(bubble);
    scrollToEnd();
  }

  function removeThinking() {
    var el = document.getElementById('ibis-widget-thinking');
    if (el) el.remove();
  }

  function send(event) {
    event.preventDefault();
    if (pending) return;
    var input = document.getElementById('ibis-widget-input');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    appendMessage('user', text);
    history.push({ role: 'user', content: text });
    pending = true;
    document.getElementById('ibis-widget-send').disabled = true;
    appendThinking();
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: PUBLISHABLE_KEY, authorization: 'Bearer ' + PUBLISHABLE_KEY },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (result) {
        removeThinking();
        if (!result.ok || !result.body || !result.body.answer) {
          appendMessage('error', (result.body && result.body.error) || 'ibis is temporarily unavailable. Please try again in a moment.');
          return;
        }
        appendMessage('assistant', result.body.answer);
        history.push({ role: 'assistant', content: result.body.answer });
      })
      .catch(function () {
        removeThinking();
        appendMessage('error', 'ibis could not be reached. Check your connection and try again.');
      })
      .finally(function () {
        pending = false;
        document.getElementById('ibis-widget-send').disabled = false;
      });
  }

  function init() {
    mount();
    trigger.addEventListener('click', function () { if (open) close(); else openPanel(); });
    panel.querySelector('.ibis-widget-close').addEventListener('click', close);
    document.getElementById('ibis-widget-form').addEventListener('submit', send);
    document.addEventListener('click', function (e) {
      if (!open) return;
      if (panel.contains(e.target) || trigger.contains(e.target)) return;
      close();
    });
    appendMessage('assistant', 'Ask me about any FTN product — what it does, where to find it, or what to try next.');
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisWidget = { open: openPanel, close: close };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
