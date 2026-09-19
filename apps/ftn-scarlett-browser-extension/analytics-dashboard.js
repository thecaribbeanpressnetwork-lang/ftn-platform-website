(async () => {
  'use strict';
  const statsEl = document.querySelector('#stats');
  const modeTableEl = document.querySelector('#mode-table');
  const eventTableEl = document.querySelector('#event-table');

  function stat(n, l) {
    const div = document.createElement('div'); div.className = 'stat';
    const nEl = document.createElement('div'); nEl.className = 'n'; nEl.textContent = n;
    const lEl = document.createElement('div'); lEl.className = 'l'; lEl.textContent = l;
    div.append(nEl, lEl);
    return div;
  }

  async function render() {
    const log = await window.FTN_SCARLETT_ANALYTICS.readLog();
    statsEl.replaceChildren();
    modeTableEl.replaceChildren();
    eventTableEl.replaceChildren();

    if (!log.length) {
      statsEl.appendChild(stat(0, 'Events logged'));
      eventTableEl.appendChild(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'No events yet -- use Scarlett on a page, then reopen this page.' }));
      return;
    }

    const byName = {};
    for (const e of log) byName[e.name] = (byName[e.name] || 0) + 1;

    statsEl.appendChild(stat(log.length, 'Events logged'));
    statsEl.appendChild(stat(byName.transform_used || 0, 'Transform used'));
    statsEl.appendChild(stat(byName.compare_used || 0, 'Compare used'));
    statsEl.appendChild(stat(byName.blend_used || 0, 'Blend used'));
    statsEl.appendChild(stat((byName.search_used || 0) + (byName.find_used || 0), 'Search/Find used'));
    statsEl.appendChild(stat(byName.shield_enabled || 0, 'Shield enabled'));
    statsEl.appendChild(stat((byName.ibis_handoff || 0) + (byName.headspace_handoff || 0), 'ibis/Headspace handoffs'));
    statsEl.appendChild(stat(byName.paywall_impression || 0, 'Paywall impressions'));
    statsEl.appendChild(stat(byName.error || 0, 'Errors'));

    const modeEvents = log.filter((e) => e.name === 'mode_applied');
    const byMode = {};
    for (const e of modeEvents) byMode[e.props.mode] = (byMode[e.props.mode] || 0) + 1;
    if (Object.keys(byMode).length) {
      const table = document.createElement('table');
      const thead = document.createElement('tr');
      ['Mode', 'Count', 'Share'].forEach((h) => { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); });
      table.appendChild(thead);
      for (const [mode, count] of Object.entries(byMode).sort((a, b) => b[1] - a[1])) {
        const row = document.createElement('tr');
        row.appendChild(Object.assign(document.createElement('td'), { textContent: mode }));
        row.appendChild(Object.assign(document.createElement('td'), { textContent: count }));
        row.appendChild(Object.assign(document.createElement('td'), { textContent: Math.round((count / modeEvents.length) * 100) + '%' }));
        table.appendChild(row);
      }
      modeTableEl.appendChild(table);
    } else {
      modeTableEl.appendChild(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'No mode-usage events yet.' }));
    }

    const table = document.createElement('table');
    const thead = document.createElement('tr');
    ['Time', 'Event', 'Properties'].forEach((h) => { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); });
    table.appendChild(thead);
    for (const e of log.slice(-40).reverse()) {
      const row = document.createElement('tr');
      row.appendChild(Object.assign(document.createElement('td'), { textContent: new Date(e.ts).toLocaleTimeString() }));
      row.appendChild(Object.assign(document.createElement('td'), { textContent: e.name }));
      row.appendChild(Object.assign(document.createElement('td'), { textContent: JSON.stringify(e.props) }));
      table.appendChild(row);
    }
    eventTableEl.appendChild(table);
  }

  document.querySelector('#clear').addEventListener('click', async () => {
    await window.FTN_SCARLETT_ANALYTICS.clearLog();
    render();
  });

  render();
})();
