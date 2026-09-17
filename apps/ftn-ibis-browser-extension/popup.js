import { analyzeBrowserSearch, callIbis, resultRows, sourceLink } from './ibis-api.js';

const form = document.querySelector('#ask-form');
const queryField = document.querySelector('#query');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const captureButton = document.querySelector('#include-browser-search');
const contextChip = document.querySelector('#browser-context-chip');
let selectedTool = 'search';
let browserContext = null;

form.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-tool]');
  if (button) selectedTool = button.dataset.tool;
});

captureButton.addEventListener('click', async () => {
  status.textContent = 'Reading the visible search-result cards from this tab…';
  results.replaceChildren();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active browser tab is available.');
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractSearchContextFromPage,
    });
    if (!result?.results?.length) {
      throw new Error(result?.error || 'Open a Google, Bing or DuckDuckGo results page, then try again.');
    }
    browserContext = result;
    if (!queryField.value.trim() && result.query) queryField.value = result.query;
    contextChip.hidden = false;
    contextChip.replaceChildren();
    const label = document.createElement('span');
    label.textContent = `${engineLabel(result.engine)} · ${result.results.length} visible result${result.results.length === 1 ? '' : 's'} · captured now`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'context-chip__remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', clearBrowserContext);
    contextChip.append(label, remove);
    status.textContent = 'Browser search included. Ask ibis what you want to know; it will reason over these snippets and cite them.';
    queryField.focus();
  } catch (error) {
    browserContext = null;
    contextChip.hidden = true;
    contextChip.replaceChildren();
    status.textContent = error instanceof Error ? error.message : 'Could not read this search page.';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = queryField.value.trim();
  if (!query) {
    status.textContent = browserContext?.query
      ? 'Tell ibis what you want it to work out from these search results.'
      : 'Enter a Caribbean topic, organization, opportunity or research question.';
    queryField.focus();
    return;
  }
  results.replaceChildren();
  try {
    if (browserContext) {
      status.textContent = `Reasoning over ${browserContext.results.length} browser-search result${browserContext.results.length === 1 ? '' : 's'}…`;
      const payload = await analyzeBrowserSearch(query, browserContext);
      renderBrowserAnalysis(payload);
      return;
    }
    status.textContent = 'Checking the FTN-reviewed registry…';
    const payload = await callIbis(selectedTool, { query, limit: 8 });
    renderRows(resultRows(payload));
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'FTN ibis is temporarily unavailable.';
  }
});

function clearBrowserContext() {
  browserContext = null;
  contextChip.hidden = true;
  contextChip.replaceChildren();
  status.textContent = 'Browser search removed. ibis will use its normal FTN research routes.';
}

function engineLabel(engine) {
  if (engine === 'google') return 'Google';
  if (engine === 'bing') return 'Bing';
  if (engine === 'duckduckgo') return 'DuckDuckGo';
  return 'Browser search';
}

function renderBrowserAnalysis(payload) {
  const answer = document.createElement('article');
  answer.className = 'result-card analysis-card';
  const heading = document.createElement('h2');
  heading.textContent = 'ibis analysis';
  const body = document.createElement('p');
  body.className = 'analysis-answer';
  body.textContent = payload.answer || 'ibis did not return an answer.';
  answer.append(heading, body);
  results.append(answer);

  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  for (let index = 0; index < sources.length; index += 1) {
    const row = sources[index];
    const card = document.createElement('article');
    card.className = 'result-card source-card';
    const h = document.createElement('h2');
    h.textContent = `[${index + 1}] ${row.title || 'Search result'}`;
    const summary = document.createElement('p');
    summary.textContent = row.snippet || 'No search snippet was captured.';
    card.append(h, summary);
    const href = sourceLink(row.url);
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Open source';
      card.append(link);
    }
    results.append(card);
  }
  const provider = payload.provider ? ` via ${payload.provider}` : '';
  status.textContent = `Analyzed ${sources.length} user-supplied browser result${sources.length === 1 ? '' : 's'}${provider}. Snippets are evidence leads, not full-page verification.`;
}

function renderRows(rows) {
  status.textContent = rows.length
    ? rows.length + ' source-backed result' + (rows.length === 1 ? '' : 's') + '. Verify current terms at the original source.'
    : 'No indexed result matched yet. Try broader Caribbean keywords or include your browser search.';
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

function extractSearchContextFromPage() {
  const pageUrl = new URL(location.href);
  const hostname = pageUrl.hostname.toLowerCase();
  const engine = hostname.includes('google.')
    ? 'google'
    : hostname === 'bing.com' || hostname.endsWith('.bing.com')
      ? 'bing'
      : hostname === 'duckduckgo.com' || hostname.endsWith('.duckduckgo.com')
        ? 'duckduckgo'
        : 'other';

  if (engine === 'other') {
    return { error: 'This tab is not a supported search-results page. Search with Google, Bing or DuckDuckGo first.' };
  }

  const query = (pageUrl.searchParams.get('q') || pageUrl.searchParams.get('query') || '').trim().slice(0, 220) || null;
  const source = new URL(pageUrl.origin + pageUrl.pathname);
  if (query) source.searchParams.set('q', query);

  // Confirmed live against real bing.com results (independent audit, 2026-09-17): every organic
  // result anchor is now wrapped in a https://www.bing.com/ck/a?...&u=a1<base64url>&... click-
  // tracking redirect. Before this fix, the plain "any bing.com URL is internal, discard" rule
  // below silently dropped EVERY Bing result -- Bing capture returned zero results in practice,
  // not merely degraded. The "a1" is a two-character format-version prefix Bing prepends before
  // standard base64url (no padding); this decodes it the same way Google's /url and DuckDuckGo's
  // uddg wrappers are already unwrapped just below.
  function decodeBingRedirect(uParam) {
    if (!uParam || !uParam.startsWith('a1')) return null;
    try {
      let b64 = uParam.slice(2).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return atob(b64);
    } catch {
      return null;
    }
  }
  function normalizedDestination(raw) {
    try {
      let url = new URL(raw, location.href);
      if (engine === 'google' && url.hostname.includes('google.') && url.pathname === '/url') {
        const nested = url.searchParams.get('q') || url.searchParams.get('url');
        if (nested) url = new URL(nested);
      }
      if (engine === 'bing' && (url.hostname === 'bing.com' || url.hostname.endsWith('.bing.com')) && url.pathname === '/ck/a') {
        const decoded = decodeBingRedirect(url.searchParams.get('u'));
        if (decoded) url = new URL(decoded);
      }
      if (url.protocol !== 'https:') return '';
      if (engine === 'google' && url.hostname.includes('google.')) return '';
      if (engine === 'bing' && (url.hostname === 'bing.com' || url.hostname.endsWith('.bing.com'))) return '';
      if (engine === 'duckduckgo' && (url.hostname === 'duckduckgo.com' || url.hostname.endsWith('.duckduckgo.com'))) {
        const nested = url.searchParams.get('uddg');
        if (!nested) return '';
        url = new URL(nested);
      }
      url.username = '';
      url.password = '';
      url.hash = '';
      for (const key of ['token', 'access_token', 'auth', 'authorization', 'code', 'key', 'api_key', 'password', 'session', 'sid']) {
        url.searchParams.delete(key);
      }
      return url.href.slice(0, 1200);
    } catch {
      return '';
    }
  }

  function resultContainer(heading) {
    return heading.closest('div.MjjYud, div.g, li.b_algo, [data-testid="result"], article, .result')
      || heading.parentElement?.parentElement
      || heading.parentElement;
  }

  function snippetFor(container, title) {
    if (!container) return null;
    const preferred = container.querySelector('.VwiC3b, .IsZvec, [data-sncf], .b_caption p, [data-result="snippet"], .result__snippet');
    let value = preferred?.textContent || '';
    if (!value) {
      const paragraphs = Array.from(container.querySelectorAll('p, span, div'))
        .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((text) => text.length >= 40 && text !== title)
        .sort((a, b) => b.length - a.length);
      value = paragraphs[0] || '';
    }
    value = value.replace(/\s+/g, ' ').trim();
    if (value.startsWith(title)) value = value.slice(title.length).trim();
    return value ? value.slice(0, 650) : null;
  }

  const seen = new Set();
  const results = [];
  const headings = Array.from(document.querySelectorAll('h3, h2'));
  for (const heading of headings) {
    const title = (heading.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (!title || title.length < 3) continue;
    const container = resultContainer(heading);
    const anchor = heading.closest('a[href]') || container?.querySelector('a[href]');
    const url = normalizedDestination(anchor?.href || '');
    if (!url || seen.has(url)) continue;
    seen.add(url);
    results.push({
      rank: results.length + 1,
      title,
      url,
      snippet: snippetFor(container, title),
    });
    if (results.length >= 10) break;
  }

  return {
    engine,
    query,
    sourceUrl: source.href,
    capturedAt: new Date().toISOString(),
    captureMode: 'USER_BROWSER',
    results,
    error: results.length ? null : 'No visible organic search results were detected on this page.',
  };
}
