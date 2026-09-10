// FTN ibis Headspace — public preview handoff guards
//
// This file is intentionally small and side-effect safe. The Headspace preview
// links to it as the public compatibility guard layer for handoffs between the
// investor landing page and the standalone Headspace preview. It must exist in
// the public artifact so release scans never ship a dangling script reference.
(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('ibis-headspace-handoff-guards-ready');

  window.FTN = window.FTN || {};
  window.FTN.IbisHeadspaceHandoffGuards = {
    ready: true,
    version: '20260910.1',
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
