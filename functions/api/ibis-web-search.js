// FTN Platform — IBIS owned web-search retrieval gateway.
// Retrieval only: no LLM synthesis and no secrets. This gives IBIS a same-origin search path that
// can fail over across public search surfaces without coupling reasoning/provenance to one vendor.
// FTN-owned verified datasets and governed official-source seeds are injected ahead of general web
// results when they directly answer a query. They remain labelled with source and evidence limits.
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

async function governedNewsFacts(request, q) {
  if (!/\b(?:news|latest|today|headline|headlines|happening)\b/i.test(q) || !/\b(?:trinidad|tobago|san fernando)\b/i.test(q)) return [];
  try {
    const runtime = await fetch(new URL('/config/public-runtime.json', request.url), { headers: { accept: 'application/json' } }).then((r) => r.ok ? r.json() : null);
    const key = runtime?.supabase?.publishableKey;
    const base = runtime?.supabase?.url;
    if (!key || !base) return [];
    const origin = new URL(request.url).origin;
    const upstream = await fetch(`${base}/functions/v1/ftn-news-sources`, {
      headers: { apikey: key, origin, accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return [];
    const data = await upstream.json().catch(() => ({}));
    const rows = Array.isArray(data?.localItems) ? data.localItems : [];
    const wantsSanFernando = /\bsan fernando\b/i.test(q);
    return rows.filter((item) => {
      if (!item?.title || !item?.url) return false;
      if (!wantsSanFernando) return true;
      return /\bsan fernando\b/i.test(`${item.title || ''} ${item.excerpt || ''}`);
    }).slice(0, 12).map((item) => ({
      title: `${item.publisher || 'Trinidad & Tobago publisher'} — ${item.title}`,
      url: item.url,
      snippet: `${item.publishedAt ? `Published ${item.publishedAt}. ` : ''}${item.verificationState || 'Publisher-attributed headline; review the source for full context.'}`,
      engine: 'ftn-governed-news',
    }));
  } catch { return []; }
}

async function verifiedFtnFacts(request, q) {
  const out = [...await governedNewsFacts(request, q)];
  const fxIntent = /\b(?:usd|us dollar|u\.s\. dollar|foreign exchange|forex|fx)\b/i.test(q) && /\b(?:rate|selling|buying|exchange|ttd|tt\$)\b/i.test(q);
  if (fxIntent) {
    try {
      const dataUrl = new URL('/data/fx-usd-ttd.json', request.url);
      const r = await fetch(dataUrl, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data = await r.json();
        const rows = Array.isArray(data?.monthly) ? data.monthly.filter((x) => x && typeof x.usdSelling === 'number') : [];
        const latest = rows[rows.length - 1];
        if (latest) {
          out.push({
            title: `Central Bank of Trinidad and Tobago — USD/TTD monthly exchange-rate snapshot (${latest.period})`,
            url: data?.source?.url || 'https://www.central-bank.org.tt/exchange-rates-monthly/',
            snippet: `Official CBTT monthly series. Latest observation in the FTN verified dataset: ${latest.period}; USD buying ${latest.usdBuying} TTD and USD selling ${latest.usdSelling} TTD per USD. Dataset retrieved ${data?.source?.retrieved || 'date unavailable'}. This is a monthly official statistical observation, not necessarily a bank's live retail counter/card rate today.`,
            engine: 'ftn-verified-statistics',
          });
        }
      }
    } catch {}
  }
  const fundingIntent = /\b(?:grant|grants|funding|funded|finance|financing)\b/i.test(q) && /\b(?:trinidad|tobago|small business|sme|micro business|entrepreneur)\b/i.test(q);
  if (fundingIntent) {
    out.push({
      title: 'Ministry of Trade, Investment & Tourism — Grant Fund Facility',
      url: 'https://tradeind.gov.tt/grant-fund-facility/',
      snippet: 'Official Trinidad and Tobago Ministry source describing the Grant Fund Facility for eligible SMEs, administered through exporTT. Open the official page to verify current intake, eligible sectors, matching-fund requirements and application instructions before applying.',
      engine: 'ftn-governed-official-source',
    });
    out.push({
      title: 'NEDCO — Grants & Programmes / Micro and Small Business Grant',
      url: 'https://nedco.gov.tt/grants-programmes',
      snippet: 'Official NEDCO source for Trinidad and Tobago grants and programmes, including the Micro and Small Business Grant. Open the source to verify whether applications are currently being accepted, current eligibility, required documents and any programme changes.',
      engine: 'ftn-governed-official-source',
    });
  }
  return out;
}

function localityRelevant(q, item) {
  const query = String(q || '').toLowerCase();
  if (!query.includes('san fernando')) return true;
  let host = '';
  try { host = new URL(item.url).hostname.toLowerCase(); } catch {}
  const hay = `${item.title || ''} ${item.snippet || ''} ${host}`.toLowerCase();
  const trinidadSource = /\.tt$/.test(host) || /guardian\.co\.tt|newsday\.co\.tt|trinidadexpress\.com|loopnews\.com/.test(host);
  return trinidadSource || /\btrinidad\b|\btobago\b|\btrinbago\b/.test(hay);
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

function personIdentity(q) {
  const raw = String(q || '').trim();
  const name = raw.replace(/^['"“”]+|['"“”]+$/g, '').trim();
  const words = name.split(/\s+/).filter(Boolean);
  const nameLike = words.length >= 2 && words.length <= 6 && words.every((word) => /^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*$/.test(word));
  return nameLike ? { name, words: words.map((word) => word.toLowerCase()) } : null;
}

function personRelevant(identity, item) {
  if (!identity) return true;
  const hay = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`.toLowerCase();
  const full = identity.name.toLowerCase();
  if (hay.includes(full)) return true;
  return identity.words.every((word) => hay.includes(word));
}

const RELEVANCE_STOPWORDS = new Set(['about','after','again','available','best','could','find','from','give','have','latest','news','small','tell','that','their','there','these','this','today','what','when','where','which','with','would']);
function evidenceRelevant(q, item, governedEvidencePresent) {
  if (!governedEvidencePresent || String(item.engine || '').startsWith('ftn-')) return true;
  const hay = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`.toLowerCase();
  const terms = Array.from(new Set(String(q || '').toLowerCase().match(/[a-z0-9]+/g) || []))
    .filter((term) => term.length >= 4 && !RELEVANCE_STOPWORDS.has(term));
  if (!terms.length) return false;
  let hits = 0;
  for (const term of terms) if (hay.includes(term)) hits += 1;
  return hits >= Math.min(2, terms.length);
}

function searchPlans(q) {
  const raw = String(q || '').trim();
  const identity = personIdentity(raw);
  if (identity) {
    const name = identity.name;
    return Array.from(new Set([
      `"${name}"`,
      `"${name}" Trinidad Tobago`,
      `"${name}" Caribbean`,
      `"${name}" biography profile credits`,
    ]));
  }
  if (/\bsan fernando\b/i.test(raw)) {
    return Array.from(new Set([
      raw,
      `"San Fernando" Trinidad site:newsday.co.tt`,
      `"San Fernando" Trinidad site:guardian.co.tt`,
      `"San Fernando" Trinidad site:trinidadexpress.com`,
      `"San Fernando" Trinidad site:loopnews.com`,
    ]));
  }
  return [raw];
}

async function multiSearch(q) {
  const plans = searchPlans(q);
  const batches = await Promise.all(plans.map(async (plan) => {
    const [b, s, d] = await Promise.all([bing(plan), searx(plan), ddg(plan)]);
    return { b, s, d };
  }));
  return {
    bing: dedupe(batches.flatMap((x) => x.b)),
    searx: dedupe(batches.flatMap((x) => x.s)),
    ddg: dedupe(batches.flatMap((x) => x.d)),
    plans,
  };
}

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 500);
  if (!q) return Response.json({ error: 'q required', results: [] }, { status: 400, headers: { 'cache-control': 'no-store' } });
  const identity = personIdentity(q);
  const [facts, web] = await Promise.all([verifiedFtnFacts(request, q), multiSearch(q)]);
  const raw = dedupe([...facts, ...web.searx, ...web.bing, ...web.ddg]);
  const results = raw.filter((item) => localityRelevant(q, item) && personRelevant(identity, item) && evidenceRelevant(q, item, facts.length > 0)).slice(0, 30);
  const rejectedIrrelevant = raw.length - results.length;
  return Response.json({ query: q, results, queryPlans: web.plans, engines: { ftnVerified: facts.length, searxng: web.searx.length, bing: web.bing.length, duckduckgo: web.ddg.length }, rejectedIrrelevant, retrievedAt: new Date().toISOString() }, {
    headers: { 'cache-control': 'public, max-age=60', 'x-robots-tag': 'noindex' },
  });
}
