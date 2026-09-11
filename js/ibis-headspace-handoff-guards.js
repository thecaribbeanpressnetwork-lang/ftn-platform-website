// FTN ibis Headspace — public preview handoff and investor-state guards
(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('ibis-headspace-handoff-guards-ready');

  function card(name) {
    return document.querySelector('[data-thought="' + name + '"]');
  }

  function isPlaceholderGraph(node) {
    return !!(node && node.querySelector('.graph') && /sample signal/i.test(node.textContent || ''));
  }

  function enforceGraphTruth() {
    const graph = card('graph');
    if (!graph) return;
    if (isPlaceholderGraph(graph)) {
      graph.classList.add('dematerialized');
      graph.setAttribute('aria-hidden', 'true');
    } else if (graph.querySelector('.ibis-viz-host,[data-viz-mount],.ibis-correlation-viz')) {
      graph.removeAttribute('aria-hidden');
    }
  }

  function prepareInitialInvestorState() {
    // Headspace must open as a workspace, not as a page full of sample conclusions. Only neutral
    // surfaces stay visible before the user supplies an objective. Evidence-driven surfaces
    // materialize later when a real handler has data for them.
    ['graph', 'media', 'opportunity'].forEach(function (name) {
      const node = card(name);
      if (node) node.classList.add('dematerialized');
    });
    const answer = card('answer');
    if (answer) {
      const h2 = answer.querySelector('h2');
      const p = answer.querySelector('p');
      if (h2 && /Caribbean context is first-class infrastructure/i.test(h2.textContent || '')) h2.textContent = 'What do you need?';
      if (p && /Ask IBIS about a Caribbean business/i.test(p.textContent || '')) p.textContent = 'Tell ibis the objective. Headspace will materialize only the answer, evidence, tools and actions that the request actually supports.';
    }
    enforceGraphTruth();

    // Keep the command orbit available without letting it visually consume the working surface.
    if (!document.getElementById('ibis-headspace-investor-guard-style')) {
      const style = document.createElement('style');
      style.id = 'ibis-headspace-investor-guard-style';
      style.textContent = '.headspace-head{margin-bottom:18px!important}.field{margin-top:0!important;padding-bottom:120px!important}.input-orbit{box-shadow:0 14px 45px rgba(0,0,0,.5)}.command-hint{bottom:94px!important;left:50%!important;right:auto!important;transform:translateX(-50%);width:min(1040px,calc(100vw - 48px));text-align:center;opacity:.72}';
      document.head.appendChild(style);
    }
  }

  const observer = new MutationObserver(function () { enforceGraphTruth(); });
  const graph = card('graph');
  if (graph) observer.observe(graph, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  prepareInitialInvestorState();

  window.FTN = window.FTN || {};
  window.FTN.IbisHeadspaceHandoffGuards = {
    ready: true,
    version: '20260911.3',
    enforceGraphTruth: enforceGraphTruth,
    prepareInitialInvestorState: prepareInitialInvestorState,
    requireSameOrigin(url) {
      try {
        const resolved = new URL(String(url || ''), window.location.href);
        return resolved.origin === window.location.origin;
      } catch (_) {
        return false;
      }
    },
    markReturnPoint(label) {
      try {
        sessionStorage.setItem('ftn:ibis:headspace:return', String(label || window.location.pathname));
        return true;
      } catch (_) {
        return false;
      }
    }
  };
}());
