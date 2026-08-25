// FTN Platform — ibis persistent assistant widget. Loaded sitewide via js/nav.js's loadOnce().
// Phase 5: talks to IBIS through js/ibis-client.js, the universal node -> IBIS -> capability ->
// provider -> result entry point, instead of maintaining its own copy of the TEXT-calling logic
// (that logic now lives once, in ibis-client.js, reused by any future node too -- "no duplicate
// AI brains"). No nodeId is passed: this widget is genuinely sitewide with no reliable
// page-to-node mapping today, and gating it per-page was not asked for and risks silently
// breaking it on pages whose node record doesn't cleanly match "this page." Message history lives
// in memory for this page view only; nothing is written to localStorage or sent anywhere else.
(function (global) {
  'use strict';
  if (document.getElementById('ibis-widget-trigger')) return; // already mounted (e.g. double-load)

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
    if (document.querySelector('link[data-ibis-widget-visual-state]')) return;
    var vs = document.createElement('link');
    vs.rel = 'stylesheet';
    vs.href = '/css/components/ibis-visual-state.css';
    vs.setAttribute('data-ibis-widget-visual-state', 'true');
    document.head.appendChild(vs);
  }

  // Optional presentation layer (see js/ibis-visual-state.js) -- the widget works identically if
  // this never loads or the script 404s; setStatus() below no-ops when FTN.IbisVisualState is
  // absent, matching the master directive's own "IBIS must work without the visualizer" rule.
  function ensureVisualState() {
    if (global.FTN && global.FTN.IbisVisualState) return Promise.resolve();
    return loadScriptOnce('/js/ibis-visual-state.js', 'data-ibis-widget-visual-state-js');
  }
  function setStatus(state) {
    var host = document.getElementById('ibis-widget-status');
    if (!host || !global.FTN || !global.FTN.IbisVisualState) return;
    global.FTN.IbisVisualState.set(host, state);
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
  trigger.setAttribute('aria-label', 'Ask FTN ibis — Ai powered by Caribbean intelligence');
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
    '<div><h2 id="ibis-widget-title">Ask FTN ibis</h2><span id="ibis-widget-subtitle">Ai powered by Caribbean intelligence.</span><span id="ibis-widget-status"></span></div>' +
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
    ensureVisualState().then(function () { setStatus('idle'); });
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

  // Zero-cost, deterministic first pass: reuse the existing Product Registry + Intent Router
  // (js/product-registry-data.js, js/product-registry.js, js/intent-router.js) instead of
  // duplicating product knowledge in this widget's own system prompt. Lazily loaded because most
  // pages don't otherwise load them -- mirrors js/platform-foundation.js's ensureRegistry() pattern
  // rather than inventing a second one.
  function loadScriptOnce(src, marker) {
    return new Promise(function (resolve) {
      if (document.querySelector('script[' + marker + ']')) { waitFor(function () { return true; }, resolve); return; }
      var s = document.createElement('script');
      s.src = src; s.async = false; s.setAttribute(marker, 'true');
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
  }
  function waitFor(check, done, tries) {
    tries = tries || 0;
    if (check() || tries > 80) { done(); return; }
    setTimeout(function () { waitFor(check, done, tries + 1); }, 25);
  }
  function ensureIntentRouter() {
    if (global.FTN && global.FTN.IntentRouter) return Promise.resolve();
    return loadScriptOnce('/js/product-registry-data.js', 'data-ibis-widget-registry-data')
      .then(function () { return loadScriptOnce('/js/product-registry.js', 'data-ibis-widget-registry'); })
      .then(function () { return loadScriptOnce('/js/intent-router.js', 'data-ibis-widget-intent-router'); });
  }
  // The universal fabric: js/ibis-provider-registry.js (provider records) +
  // js/ibis-eligibility.js (fail-closed eligibility engine, real observed health, and real
  // ranked failover) + js/ibis-capability-taxonomy.js (capability recognition) +
  // js/ibis-client.js (the entry point that composes all three). As of Phase 3 there are two
  // registered TEXT providers; the underlying attemptInOrder() tries the healthier one first and
  // falls back automatically -- this widget no longer calls that directly, see callAssistant().
  function ensureIbisClient() {
    if (global.FTN && global.FTN.IbisClient) return Promise.resolve();
    return loadScriptOnce('/js/ibis-provider-registry.js', 'data-ibis-widget-provider-registry')
      .then(function () { return loadScriptOnce('/js/ibis-eligibility.js', 'data-ibis-widget-eligibility'); })
      .then(function () { return loadScriptOnce('/js/ibis-capability-taxonomy.js', 'data-ibis-widget-taxonomy'); })
      .then(function () { return loadScriptOnce('/js/ibis-provenance.js', 'data-ibis-widget-provenance'); })
      .then(function () { return loadScriptOnce('/js/ibis-client.js', 'data-ibis-widget-client'); });
  }
  // FTN Account pass: the strongest genuinely available authenticated context today is the
  // user's own browser-local FTN.Save list. Answered entirely client-side -- explicit
  // authenticated user only, never sent to a TEXT provider, so no personal data reaches a model
  // prompt for a question the client can already answer honestly by itself.
  var SAVED_ITEMS_PATTERN = /\b(my saved|what did i save|show my saves?|saved items|things i('ve)? saved)\b/i;
  function ensureSavedItemsContext() {
    return loadScriptOnce('/js/storage.js', 'data-ibis-widget-storage')
      .then(function () { return loadScriptOnce('/js/ftn-save.js', 'data-ibis-widget-save'); })
      .then(function () { return loadScriptOnce('/js/ftn-auth.js', 'data-ibis-widget-auth'); });
  }
  function trySavedItemsRoute(text) {
    if (!SAVED_ITEMS_PATTERN.test(text)) return Promise.resolve(null);
    return ensureSavedItemsContext().then(function () {
      if (!global.FTN || !global.FTN.Auth || !global.FTN.Save) return null;
      return global.FTN.Auth.getVerifiedUser().then(function (user) {
        if (!user) return { needsAuth: true };
        return { items: global.FTN.Save.list() };
      }).catch(function () { return null; });
    });
  }
  function appendSavedItemsAnswer(result) {
    var text;
    if (result.needsAuth) {
      text = 'Sign in to your FTN Account to see your saved items — nothing is saved to this browser until then.';
    } else if (!result.items.length) {
      text = 'You don’t have any saved FTN items yet. Look for the ☆ Save control on pages like FTN Live.';
    } else {
      text = 'Your saved FTN items:\n' + result.items.map(function (i) { return '• ' + i.title; }).join('\n');
    }
    appendMessage('assistant', text);
    history.push({ role: 'assistant', content: text });
  }
  // A confident match requires at least one of the query's real words to be a product's own
  // registered keyword (not just an incidental word overlap in its name/tagline/description) --
  // the same bar js/intent-router.js already documents as its honest-match standard.
  // scope: 'ecosystem' -- this widget is sitewide with no reliable page-to-product mapping (see
  // the file header), so it deliberately passes a scope that matches no real product id/
  // shortName in js/product-registry-data.js. That's the honest "no priority bias" scope for a
  // context-free caller, as opposed to a page-scoped caller (e.g. js/learn-workspace.js passing
  // 'learn') which genuinely wants its own product's matches ranked first when relevant.
  function tryDeterministicRoute(text) {
    if (!global.FTN || !global.FTN.IntentRouter) return null;
    var results = global.FTN.IntentRouter.route(text, { scopeProductId: 'ecosystem' }).filter(function (r) { return r.matchedKeywords.length > 0; });
    if (!results.length) return null;
    return results.slice(0, 3);
  }
  function appendRouteSuggestion(matches) {
    var host = document.getElementById('ibis-widget-messages');
    var bubble = document.createElement('div');
    bubble.className = 'ibis-widget-msg ibis-widget-msg--assistant';
    var intro = document.createElement('p');
    intro.textContent = matches.length === 1 ? 'This sounds like what you need:' : 'A few FTN products match that:';
    bubble.appendChild(intro);
    var list = document.createElement('ul');
    list.className = 'ibis-widget-route-list';
    matches.forEach(function (m) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'ibis-widget-route-link';
      a.href = m.product.route;
      a.textContent = m.product.name + ' — ' + m.product.tagline;
      li.appendChild(a);
      list.appendChild(li);
    });
    bubble.appendChild(list);
    host.appendChild(bubble);
    scrollToEnd();
    return matches.map(function (m) { return m.product.name + ' (' + m.product.route + ')'; }).join(', ');
  }

  function appendThinking() {
    var host = document.getElementById('ibis-widget-messages');
    var bubble = document.createElement('div');
    bubble.className = 'ibis-widget-msg ibis-widget-msg--thinking';
    bubble.id = 'ibis-widget-thinking';
    bubble.innerHTML = IBIS_SVG + '<span>ibis is thinking…</span>';
    host.appendChild(bubble);
    scrollToEnd();
    setStatus('thinking');
  }

  function removeThinking() {
    var el = document.getElementById('ibis-widget-thinking');
    if (el) el.remove();
    setStatus('idle');
  }

  function productSummaryForServer() {
    if (!global.FTN || !global.FTN.ProductRegistry) return [];
    return global.FTN.ProductRegistry.publicProducts().map(function (p) {
      return { name: p.name, route: p.route, tagline: p.tagline };
    });
  }

  function callAssistant() {
    return ensureIbisClient().then(function () {
      var IbisClient = global.FTN && global.FTN.IbisClient;
      if (!IbisClient) {
        appendMessage('error', 'ibis can’t answer that right now.');
        return null;
      }
      appendThinking();
      return IbisClient.request({
        capability: 'TEXT',
        context: { authenticated: false },
        payload: { messages: history, products: productSummaryForServer() },
      }).then(function (outcome) {
        removeThinking();
        if (outcome.success) {
          appendMessage('assistant', outcome.result.answer);
          history.push({ role: 'assistant', content: outcome.result.answer });
          return;
        }
        // Honest per-situation messaging instead of a generic network-failure message: no
        // eligible provider at all is a very different situation from every eligible provider
        // failing this specific call.
        var attempts = (outcome.provenance && outcome.provenance.attempts) || [];
        var message = !attempts.length
          ? 'ibis’s conversational answers aren’t turned on yet. Try rephrasing to name an FTN product directly, or check the Directory.'
          : 'ibis is temporarily unavailable. Please try again in a moment.';
        appendMessage('error', message);
      });
    });
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
    // Zero-cost route first: the same deterministic, no-hallucination product match used on
    // /ibis-ai/ (js/intent-router.js). Only calls the paid Anthropic backend when that doesn't
    // confidently answer the question -- see IBIS-MAP.md for why this consolidation is scoped
    // this way rather than merging into the existing authenticated ibis-query function.
    trySavedItemsRoute(text)
      .then(function (savedResult) {
        if (savedResult) { appendSavedItemsAnswer(savedResult); return null; }
        return ensureIntentRouter().then(function () {
          var matches = tryDeterministicRoute(text);
          if (matches) {
            var summary = appendRouteSuggestion(matches);
            history.push({ role: 'assistant', content: 'Suggested: ' + summary });
            return null;
          }
          return callAssistant();
        });
      })
      .catch(function () {
        return callAssistant();
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
