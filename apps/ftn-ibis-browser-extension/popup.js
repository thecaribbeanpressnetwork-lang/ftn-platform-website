import { callIbis, resultRows, sourceLink } from './ibis-api.js';

const form = document.querySelector('#ask-form');
const queryField = document.querySelector('#query');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
let selectedTool = 'search';

form.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-tool]');
  if (button) selectedTool = button.dataset.tool;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = queryField.value.trim();
  if (!query) {
    status.textContent = 'Enter a Caribbean topic, organization or opportunity.';
    queryField.focus();
    return;
  }
  status.textContent = 'Checking the FTN-reviewed registry…';
  results.replaceChildren();
  try {
    const payload = await callIbis(selectedTool, { query, limit: 8 });
    renderRows(resultRows(payload));
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'FTN ibis is temporarily unavailable.';
  }
});

function renderRows(rows) {
  status.textContent = rows.length
    ? rows.length + ' source-backed result' + (rows.length === 1 ? '' : 's') + '. Verify current terms at the original source.'
    : 'No indexed result matched yet. Try broader Caribbean keywords.';
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
}
