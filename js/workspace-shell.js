// FTN Platform Website — shared product workspace shell.
(function (global) {
  'use strict';

  var MOTION_SVG = {
    none: '',
    spotlight: '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      '<g stroke="currentColor" stroke-width="1"><path d="M1100,0 L950,500"/><path d="M1100,0 L1250,500"/><path d="M1100,0 L1100,500"/></g>' +
      '<g stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 6"><circle cx="1100" cy="500" r="120"/><circle cx="1100" cy="500" r="220"/></g></svg>',
    'node-pulse': '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      '<g stroke="currentColor" class="hl-pulse"><circle cx="1100" cy="250" r="10" fill="currentColor" fill-opacity=".2"/><circle cx="1100" cy="250" r="62"/><circle cx="1100" cy="250" r="116"/></g>' +
      '<g stroke="currentColor" stroke-width=".75"><path d="M1100 134V86M1100 366v48M984 250h-48M1216 250h48"/>' +
      '<path d="M1020 170l-48-40M1180 170l48-40M1020 330l-48 40M1180 330l48 40"/></g></svg>',
    waveform: '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      '<g stroke="currentColor" stroke-width="1.5" class="hl-drift"><path d="M880 250h34l12-54 18 118 18-166 18 204 18-116 18 58 18-44h282"/></g>' +
      '<g stroke="currentColor" stroke-width=".5" stroke-dasharray="2 7"><path d="M880 150h430M880 250h430M880 350h430"/></g></svg>',
    'rising-line': '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      '<g stroke="currentColor" stroke-width=".55" stroke-dasharray="2 8"><path d="M900 390h430M900 300h430M900 210h430M900 120h430"/></g>' +
      '<path d="M930 382C982 350 1008 312 1048 322s56 42 96 10 70-108 126-164" stroke="currentColor" stroke-width="2"/>' +
      '<g fill="currentColor"><circle cx="930" cy="382" r="5"/><circle cx="1048" cy="322" r="5"/><circle cx="1144" cy="332" r="5"/><circle cx="1270" cy="168" r="7"/></g>' +
      '<g stroke="currentColor" class="hl-pulse"><circle cx="1270" cy="168" r="28"/><circle cx="1270" cy="168" r="56"/></g></svg>',
    heartbeat: '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      '<g stroke="currentColor" stroke-width="1.2" class="hl-pulse"><ellipse cx="1050" cy="250" rx="128" ry="84" transform="rotate(-18 1050 250)"/><ellipse cx="1160" cy="250" rx="128" ry="84" transform="rotate(18 1160 250)"/></g>' +
      '<circle cx="1105" cy="250" r="9" fill="currentColor" fill-opacity=".28"/>' +
      '<g fill="currentColor"><circle cx="955" cy="220" r="5"/><circle cx="1255" cy="220" r="5"/></g></svg>',
    'radar-sweep': '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      '<g stroke="currentColor"><circle cx="1100" cy="250" r="58"/><circle cx="1100" cy="250" r="116"/><circle cx="1100" cy="250" r="174"/><path d="M1100 250l150-95"/></g></svg>',
    'display-grid': '<svg viewBox="0 0 1400 500" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      '<g stroke="currentColor" stroke-width=".7"><rect x="930" y="96" width="138" height="88" rx="5"/><rect x="1092" y="96" width="206" height="88" rx="5"/><rect x="930" y="208" width="206" height="126" rx="5"/><rect x="1160" y="208" width="138" height="126" rx="5"/></g>' +
      '<g stroke="currentColor" stroke-width="1.5" class="hl-pulse"><path d="M999 184v28M1195 184v24M1033 334v40M1229 334v40"/><path d="M962 374h332"/></g>' +
      '<circle cx="1294" cy="374" r="7" fill="currentColor"/></svg>'
  };

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function statusLabelFor(status) {
    switch (status) {
      case 'live': return 'Live';
      case 'production-foundation': return 'Production Foundation';
      case 'demonstration': return 'Interactive Demonstration';
      case 'strategic-initiative': return 'Strategic Initiative';
      default: return 'In Development';
    }
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
      style: '--workspace-accent: ' + (atmo.accent || 'var(--color-red-on-dark)') +
        (config.accentSmallVar ? '; --workspace-accent-small: var(' + config.accentSmallVar + ')' : '')
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
    if (config.statusLabel !== false) identity.appendChild(el('span', { class: 'workspace__status' }, config.statusLabel || statusLabelFor(product.status)));
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

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
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
      '<button type="button" class="btn btn-primary btn-sm" id="' + saveId + '">' + escapeHtml(saveLabel) + '</button></div>';
  }

  function wireExportButtons(container, opts) {
    container.querySelectorAll('[data-export]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var format = btn.getAttribute('data-export');
        var source = format === 'txt' ? opts.txtBody : opts.richBody;
        global.FTN.ExportFramework.export(format, { title: opts.title, body: typeof source === 'function' ? source() : source });
      });
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.WorkspaceShell = { init: init, escapeHtml: escapeHtml, renderErrorsHTML: renderErrorsHTML, exportRowHTML: exportRowHTML, wireExportButtons: wireExportButtons };
})(window);
