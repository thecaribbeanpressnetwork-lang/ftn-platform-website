// FTN Platform Website — Workspace Shell.
// Standard chrome for FTN product workspaces. Product status is internal registry metadata and
// is not rendered publicly unless a product explicitly supplies a useful statusLabel.
(function (global) {
  'use strict';

  var MOTION_SVG = {
    none: '',
    spotlight: '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><g stroke="currentColor" stroke-width="1"><path d="M1100,0 L950,500" /><path d="M1100,0 L1250,500" /><path d="M1100,0 L1100,500" /></g><g stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 6"><circle cx="1100" cy="500" r="120" /><circle cx="1100" cy="500" r="220" /></g></svg>',
    'node-pulse': '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><g stroke="currentColor" stroke-width="1" class="hl-pulse"><circle cx="1100" cy="250" r="12" /><circle cx="1100" cy="250" r="60" /><circle cx="1100" cy="250" r="110" /></g><g stroke="currentColor" stroke-width="0.75"><line x1="1100" y1="140" x2="1100" y2="90" /><line x1="1100" y1="360" x2="1100" y2="410" /><line x1="990" y1="250" x2="940" y2="250" /><line x1="1210" y1="250" x2="1260" y2="250" /></g></svg>',
    waveform: '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><g stroke="currentColor" stroke-width="1.5" class="hl-drift"><path d="M900,250 L920,250 L930,180 L945,320 L960,150 L975,350 L990,220 L1005,280 L1020,250 L1300,250" /></g><g stroke="currentColor" stroke-width="0.75" stroke-dasharray="2 6"><path d="M900,150 L1300,150" /><path d="M900,350 L1300,350" /></g></svg>',
    'rising-line': '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><g stroke="currentColor" stroke-width="1.5"><path d="M930,370 L1010,300 L1070,340 L1180,220 L1270,140" /><path d="M1210,140 L1270,140 L1270,200" /></g><g stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 6"><line x1="930" y1="180" x2="1300" y2="180" /><line x1="930" y1="270" x2="1300" y2="270" /><line x1="930" y1="370" x2="1300" y2="370" /></g></svg>',
    heartbeat: '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><g stroke="currentColor" stroke-width="1" class="hl-pulse"><path d="M1150,180 C1130,150 1080,150 1070,190 C1060,150 1010,150 990,180 C970,215 990,250 1070,320 C1150,250 1170,215 1150,180 Z" /></g></svg>',
    'radar-sweep': '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><g stroke="currentColor" stroke-width="1"><circle cx="1100" cy="250" r="60" /><circle cx="1100" cy="250" r="120" /><circle cx="1100" cy="250" r="180" /></g></svg>'
  };

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function init(config) {
    var Registry = global.FTN && global.FTN.ProductRegistry;
    if (!Registry) throw new Error('WorkspaceShell requires FTN.ProductRegistry to be loaded first');
    var product = Registry.get(config.productId);
    if (!product) throw new Error('WorkspaceShell: unknown productId "' + config.productId + '"');
    var mount = document.getElementById(config.mountId || 'workspace-root');
    if (!mount) throw new Error('WorkspaceShell: mount element not found');

    var atmo = product.atmosphere || {};
    var workspace = el('div', {
      class: 'workspace',
      'data-workspace-bg': atmo.background || 'dark-minimal',
      'data-workspace-motion': atmo.motionProfile || 'none',
      style: '--workspace-accent: ' + (atmo.accent || 'var(--color-red-on-dark)') + (config.accentSmallVar ? '; --workspace-accent-small: var(' + config.accentSmallVar + ')' : '')
    });

    var motionSvg = MOTION_SVG[atmo.motionProfile] || '';
    if (motionSvg) workspace.appendChild(el('div', { class: 'workspace__atmosphere', 'aria-hidden': 'true' }, motionSvg));

    var header = el('header', { class: 'workspace__header' });
    var headerTop = el('div', { class: 'workspace__header-top' });
    headerTop.appendChild(el('a', { class: 'workspace__back', href: '/' }, '&larr; FTN Platform'));
    header.appendChild(headerTop);

    var identity = el('div', { class: 'workspace__identity' });
    identity.appendChild(el('span', { class: 'workspace__eyebrow' }, product.name));
    identity.appendChild(el('h1', { class: 'workspace__title' }, config.title || product.tagline));
    identity.appendChild(el('p', { class: 'workspace__tagline' }, config.lede || product.description));
    if (typeof config.statusLabel === 'string' && config.statusLabel.trim()) {
      identity.appendChild(el('span', { class: 'workspace__status' }, config.statusLabel.trim()));
    }
    header.appendChild(identity);

    var notification = el('div', { class: 'workspace__notification', id: 'workspace-notification', role: 'status', hidden: 'hidden' });
    header.appendChild(notification);
    workspace.appendChild(header);

    if (config.toolbar && config.toolbar.length) {
      var toolbar = el('nav', { class: 'workspace__toolbar', id: 'workspace-toolbar', 'aria-label': product.name + ' sections' });
      config.toolbar.forEach(function (item) {
        var btn = el('button', { type: 'button', class: 'workspace__toolbar-item', 'data-toolbar-id': item.id }, item.label);
        if (item.current) btn.setAttribute('aria-current', 'true');
        toolbar.appendChild(btn);
      });
      workspace.appendChild(toolbar);
    }

    var content = el('main', { class: 'workspace__content', id: 'workspace-content', tabindex: '-1' });
    workspace.appendChild(content);
    workspace.appendChild(el('footer', { class: 'workspace__footer' }, product.name + ' is part of the FTN Platform ecosystem. <a href="/">Explore all products &rarr;</a>'));
    mount.appendChild(workspace);

    var api = {
      product: product,
      contentEl: content,
      notify: function (message, tone) {
        notification.textContent = message;
        notification.hidden = false;
        if (tone) notification.setAttribute('data-tone', tone); else notification.removeAttribute('data-tone');
      }
    };

    if (typeof config.build === 'function') config.build(content, api);
    return api;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderErrorsHTML(errors) {
    return '<div class="workspace-output"><h3>Fix the following</h3><ul>' + errors.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join('') + '</ul></div>';
  }

  function exportRowHTML(saveId, saveLabel) {
    return '<div class="workspace-export-row">' +
      '<button type="button" class="btn btn-outline btn-sm" data-export="txt">Download as TXT</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-export="json">Download as JSON</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-export="print">Print / Save as PDF</button>' +
      '<button type="button" class="btn btn-primary btn-sm" id="' + saveId + '">' + escapeHtml(saveLabel) + '</button>' +
      '</div>';
  }

  function wireExportButtons(container, opts) {
    container.querySelectorAll('[data-export]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var format = btn.getAttribute('data-export');
        var bodySource = format === 'txt' ? opts.txtBody : opts.richBody;
        var body = typeof bodySource === 'function' ? bodySource() : bodySource;
        global.FTN.ExportFramework.export(format, { title: opts.title, body: body });
      });
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.WorkspaceShell = {
    init: init,
    escapeHtml: escapeHtml,
    renderErrorsHTML: renderErrorsHTML,
    exportRowHTML: exportRowHTML,
    wireExportButtons: wireExportButtons
  };
})(window);
