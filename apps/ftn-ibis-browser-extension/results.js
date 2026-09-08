import { callIbis, resultRows, sourceLink } from './ibis-api.js';

const params = new URLSearchParams(location.search);
const query = (params.get('q') || '').trim().slice(0, 160);
const title = document.querySelector('#query-title');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
title.textContent = query || 'No selected text';

if (!query) {
  status.textContent = 'Select text on a page, right-click it, and choose “Ask FTN ibis”.';
} else {
  status.textContent = 'Checking the FTN-reviewed registry…';
  callIbis('search', { query, limit: 12 }).then((payload) => {
    const rows = resultRows(payload);
    status.textContent = rows.length
      ? rows.length + ' result' + (rows.length === 1 ? '' : 's') + '. Verify current terms at each original source.'
      : 'No indexed result matched. Open FTN ibis to continue with a broader search.';
    for (const row of rows) {
      const card = document.createElement('article');
      card.className = 'result-card';
      const heading = document.createElement('h2');
      heading.textContent = row.title || row.organization || 'FTN ibis record';
      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = [row.type, row.organization, row.geography].filter(Boolean).join(' · ');
      const summary = document.createElement('p');
      summary.textContent = row.summary || 'Open the original source for details.';
      card.append(heading, meta, summary);
      const href = sourceLink(row.sourceUrl);
      if (href) {
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'Verify original source';
        card.append(link);
      }
      results.append(card);
    }
  }).catch((error) => {
    status.textContent = error instanceof Error ? error.message : 'FTN ibis is temporarily unavailable.';
  });
}
