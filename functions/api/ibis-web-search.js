// FTN Platform — IBIS owned web-search retrieval gateway.
// Retrieval only: no LLM synthesis and no secrets. This gives IBIS a same-origin search path that
// can fail over across public search surfaces without coupling reasoning/provenance to one vendor.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36';

function text(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveDdg(raw) {
  try {
    const u = new URL(raw.startsWith('//') ? `https:${raw}` : raw, 'https://html.duckduckgo.com');
    const target = u.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : u.href;
  } catch { return raw; }
}

function decodeBing(raw) {
  try {
    const u = new URL(raw, 'https://www.bing.com');
    const encoded = u.searchParams.get('u');
    if (!encoded) return u.href;
    if (/^a1/i.test(encoded)) {
      let b64 = encoded.slice(2).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const decoded = atob(b64);
      if (/^https?:\/\//i.test(decoded)) return decoded;
    }
    return u.href;
  } catch { return raw; }
}

async function bing(q) {
  try {
    const r = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(q)}&count=12`, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    });
    if (!r.ok) return [];
    const html = await r.text();
    const blocks = html.match(/<li[^>]+class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>[\s\S]*?<\/li>/gi) || [];
    const out = [];
    for (const block of blocks.slice(0, 12)) {
      const a = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i);
      if (!a) continue;
      const p = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const url = decodeBing(text(a[1]));
      if (/^https?:\/\//i.test(url)) out.push({ title: text(a[2]), url, snippet: text(p?.[1] || ''), engine: 'bing' });
    }
    return out;
  } catch { return []; }
}

async function searx(q) {
  try {
    const base = 'https://search.inetol.net';
    const r = await fetch(`${base}/search?q=${encodeURIComponent(q)}`, { headers: { 'user-agent': UA, accept: 'text/html' } });
    if (!r.ok) return [];
    const html = await r.text();
    const articles = html.match(/<article\b[\s\S]*?<\/article>/gi) || [];
    const out = [];
    for (const article of articles.slice(0, 12)) {
      const a = article.match(/<h3[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i);
      if (!a) continue;
      let url = text(a[1]);
      try { url = new URL(url, base).href; } catch {}
      if (!/^https?:\/\//i.test(url) || url.startsWith(base)) continue;
      const p = article.match(/<p[^>]+class=["'][^"']*(?:content|result-content)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || article.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      out.push({ title: text(a[2]), url, snippet: text(p?.[1] || ''), engine: 'searxng' });
    }
    return out;
  } catch { return []; }
}

async function ddg(q) {
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: { 'user-agent': UA, accept: 'text/html' } });
    if (!r.ok) return [];
    const html = await r.text();
    const blocks = html.match(/<div[^>]+class="[^"]*result[^"]*results_links[^"]*"[\s\S]*?(?=<div[^>]+class="[^"]*result[^"]*results_links|<div id="links"|$)/gi) || [];
    const out = [];
    for (const block of blocks.slice(0, 10)) {
      const a = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!a) continue;
      const sn = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const url = resolveDdg(text(a[1]));
      if (/^https?:\/\//i.test(url)) out.push({ title: text(a[2]), url, snippet: text(sn?.[1] || ''), engine: 'duckduckgo' });
    }
    return out;
  } catch { return []; }
}

function dedupe(items) {
  const seen = new Set(), out = [];
  for (const item of items) {
    let key = item.url;
    try { const u = new URL(item.url); u.hash = ''; key = `${u.hostname}${u.pathname}`.toLowerCase(); } catch {}
    if (!item.title || !item.url || seen.has(key)) continue;
    seen.add(key); out.push(item);
  }
  return out;
}

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 500);
  if (!q) return Response.json({ error: 'q required', results: [] }, { status: 400, headers: { 'cache-control': 'no-store' } });
  const [b, s, d] = await Promise.all([bing(q), searx(q), ddg(q)]);
  const results = dedupe([...s, ...b, ...d]).slice(0, 20);
  return Response.json({ query: q, results, engines: { searxng: s.length, bing: b.length, duckduckgo: d.length }, retrievedAt: new Date().toISOString() }, {
    headers: { 'cache-control': 'public, max-age=60', 'x-robots-tag': 'noindex' },
  });
}
