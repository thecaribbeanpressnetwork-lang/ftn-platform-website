(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT_DECK__) return;

  // Pure DOM renderer: given a RepresentationSpec (representation-engine.js) it builds real,
  // interactive DOM into a container Scarlett owns. It never touches the ledger and never touches
  // any element outside the container it is given -- content.js is solely responsible for hiding
  // the original region and mounting/unmounting this container, so restore stays centralized in
  // one place. No innerHTML anywhere; every node is created and text-assigned explicitly.

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderSection(section, bindings, onAction) {
    const card = el('section', 'sc-deck-card');
    const heading = el('h3', 'sc-deck-card__title', section.title);
    card.appendChild(heading);
    const body = el('div', 'sc-deck-card__body');

    for (const bindingId of section.bindingIds) {
      const binding = bindings[bindingId];
      if (!binding) continue;
      if (binding.text) {
        const p = el('p', null, binding.text);
        body.appendChild(p);
      }
      if (Array.isArray(binding.list) && binding.list.length) {
        const ul = el('ul');
        for (const item of binding.list) ul.appendChild(el('li', null, item));
        body.appendChild(ul);
      }
      if (Array.isArray(binding.facts) && binding.facts.length) {
        const dl = el('dl', 'sc-deck-facts');
        for (const f of binding.facts) {
          dl.appendChild(el('dt', null, f.label));
          dl.appendChild(el('dd', null, f.value));
        }
        body.appendChild(dl);
      }
      if (Array.isArray(binding.links) && binding.links.length) {
        const ul = el('ul', 'sc-deck-links');
        for (const link of binding.links) ul.appendChild(el('li', null, link.label));
        body.appendChild(ul);
      }
      if (Array.isArray(binding.actions) && binding.actions.length) {
        const row = el('div', 'sc-deck-actions');
        for (const action of binding.actions) {
          const btn = el('button', null, action.label);
          btn.type = 'button';
          btn.disabled = true; // native source actions are informational in the deck view -- the
          // real, functioning control remains on the (hidden but restorable) source page; Scarlett
          // never re-implements a foreign site's submit/purchase/contact action itself.
          btn.title = 'This mirrors a control on the original page. Use Original to interact with it directly.';
          row.appendChild(btn);
        }
        body.appendChild(row);
      }
    }
    if (!body.childNodes.length) body.appendChild(el('p', 'sc-deck-empty', 'Nothing grounded to show for this section.'));
    card.appendChild(body);
    return card;
  }

  function render(spec, container, onAction) {
    container.replaceChildren();
    container.classList.add('sc-deck', 'sc-deck--' + spec.representationType);
    const tabs = el('div', 'sc-deck-tabs');
    const panels = el('div', 'sc-deck-panels');

    spec.sections.forEach((section, i) => {
      const tab = el('button', 'sc-deck-tab', section.title);
      tab.type = 'button';
      tab.setAttribute('aria-selected', String(i === 0));
      const panel = renderSection(section, spec.sourceBindings, onAction);
      panel.hidden = i !== 0;
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.sc-deck-tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
        panels.querySelectorAll('.sc-deck-card').forEach((p) => { p.hidden = true; });
        tab.setAttribute('aria-selected', 'true');
        panel.hidden = false;
      });
      tabs.appendChild(tab);
      panels.appendChild(panel);
    });

    const actionRow = el('div', 'sc-deck-footer');
    for (const action of spec.actions) {
      if (action.kind === 'restore') continue; // Original already has its own control in the panel/toggle
      const btn = el('button', 'sc-deck-footer__btn', action.label);
      btn.type = 'button';
      btn.addEventListener('click', () => onAction?.(action));
      actionRow.appendChild(btn);
    }

    const confidence = el('div', 'sc-deck-confidence', 'Grounded from this page · confidence: ' + spec.confidence.toLowerCase());

    container.append(tabs, panels, actionRow, confidence);
    return container;
  }

  globalThis.__FTN_SCARLETT_DECK__ = { render };
})();
