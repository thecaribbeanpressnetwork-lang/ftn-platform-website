import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED = new Set([
  "https://ftnplatform.org",
  "https://www.ftnplatform.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

type Source = {
  id: string;
  name: string;
  url: string;
  host: string;
  classification: string;
  local: boolean;
  parser: "articles" | "links";
  accepts: (url: URL) => boolean;
};

const SOURCES: Source[] = [
  {
    id: "caricom",
    name: "CARICOM Press Releases",
    url: "https://caricom.org/category/pressreleases/",
    host: "caricom.org",
    classification: "Official institutional release",
    local: false,
    parser: "articles",
    accepts: (url) => !/\/category\/|\/tag\/|\/author\/|\/page\/\d+\/?$|\/wp-content\/|\/feed\/?$|\/search\/|\/member-states|\/about|\/contact/i.test(url.pathname),
  },
  {
    id: "guardian-tt",
    name: "Trinidad & Tobago Guardian",
    url: "https://www.guardian.co.tt/news-6.12.0.4f1749cb44",
    host: "guardian.co.tt",
    classification: "Publisher headline",
    local: true,
    parser: "links",
    accepts: (url) => /^\/news\/[a-z0-9][^/]*-6\.[0-9]/i.test(url.pathname),
  },
  {
    id: "express-tt",
    name: "Trinidad Express",
    url: "https://trinidadexpress.com/news/local/",
    host: "trinidadexpress.com",
    classification: "Publisher headline",
    local: true,
    parser: "links",
    accepts: (url) => /^\/news\/local\/[a-z0-9][^/]*\/article_[a-z0-9-]+\.html$/i.test(url.pathname),
  },
];

function origin(req: Request) {
  const direct = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  if (direct && ALLOWED.has(direct)) return direct;
  for (const allowed of ALLOWED) {
    if (referer.startsWith(allowed + "/")) return allowed;
  }
  return "";
}

function validKey(req: Request) {
  const supplied = req.headers.get("apikey") || "";
  try {
    return !!supplied && Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}")).includes(supplied);
  } catch {
    return false;
  }
}

function headers(allowedOrigin: string) {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": allowedOrigin || "https://ftnplatform.org",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "apikey,content-type",
    "vary": "Origin",
    "cache-control": "public, max-age=600, stale-while-revalidate=1200",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin(req)) });
}

function clean(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&amp;|&#038;/gi, "&")
    .replace(/&lsquo;|&rsquo;/gi, "’")
    .replace(/&ndash;/gi, "–")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validStoryTitle(title: string) {
  if (title.length < 18 || title.length > 220) return false;
  return !/^(read more|home|about|news|latest news|sports|business|features|opinion|press releases?|media release|contact|search|previous|next|older|newer|caricom|secretariat|share news with us|posts pagination)$/i.test(title) &&
    !/cookie|privacy|facebook|twitter|instagram|youtube|linkedin|skip to|subscribe|sign up|log in/i.test(title);
}

function normalizeDate(value: string | null) {
  if (!value) return null;
  let candidate = value.trim();
  if (/^\d{8}$/.test(candidate)) candidate = `${candidate.slice(0, 4)}-${candidate.slice(4, 6)}-${candidate.slice(6, 8)}`;
  const parsed = new Date(candidate);
  const year = parsed.getUTCFullYear();
  if (Number.isNaN(parsed.getTime()) || year < 2000 || year > new Date().getUTCFullYear() + 1) return null;
  return candidate;
}

function dateNear(html: string, index: number) {
  const near = clean(html.slice(Math.max(0, index - 900), Math.min(html.length, index + 1100)));
  return normalizeDate((near.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i) ||
    near.match(/\b\d{4}-\d{2}-\d{2}\b/) ||
    near.match(/\b\d{8}\b/) || [])[0] || null);
}

function excerptNear(html: string, index: number, title: string) {
  return clean(html.slice(Math.max(0, index - 250), Math.min(html.length, index + 1800))).replace(title, "").trim().slice(0, 420);
}

function itemFromAnchor(html: string, source: Source, match: RegExpExecArray, seen: Set<string>) {
  const href = match[1];
  if (!href || href.startsWith("#") || /^(mailto|javascript):/i.test(href)) return null;
  let url: URL;
  try {
    url = new URL(href, source.url);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname.replace(/^www\./, "") !== source.host || !source.accepts(url)) return null;
  url.hash = "";
  const normalized = url.href;
  const heading = match[2].match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i);
  const title = clean(heading?.[1] || match[2]);
  if (!validStoryTitle(title) || seen.has(normalized)) return null;
  const publishedAt = dateNear(html, match.index || 0);
  if (!publishedAt) return null;
  seen.add(normalized);
  const item: Record<string, unknown> = {
    title,
    url: normalized,
    publisher: source.name,
    sourceId: source.id,
    sourcePage: source.url,
    publishedAt,
    classification: source.classification,
    verificationState: source.local ? "Attributed publisher headline; FTN has not reproduced or independently verified the report" : "Official source identified; editorial verification still required",
  };
  if (!source.local) item.excerpt = excerptNear(html, match.index || 0, title);
  return item;
}

function parseLinks(html: string, source: Source) {
  const items: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html))) {
    const item = itemFromAnchor(html, source, match, seen);
    if (item) items.push(item);
    if (items.length >= (source.local ? 12 : 30)) break;
  }
  return items;
}

function parseArticles(html: string, source: Source) {
  const items: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const articlePattern = /<article\b[^>]*>[\s\S]*?<\/article>/gi;
  let article: RegExpExecArray | null;
  while ((article = articlePattern.exec(html))) {
    const block = article[0];
    const heading = /<h[1-4]\b[^>]*>[\s\S]*?<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-4]>/i.exec(block) ||
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!heading) continue;
    heading.index = article.index + (heading.index || 0);
    const item = itemFromAnchor(html, source, heading, seen);
    if (item) items.push(item);
    if (items.length >= 30) break;
  }
  return items;
}

function parse(html: string, source: Source) {
  return source.parser === "articles" ? parseArticles(html, source) : parseLinks(html, source);
}

async function collect(source: Source) {
  const upstream = await fetch(source.url, {
    headers: {
      "user-agent": "Mozilla/5.0 FTN-Kaiso/2.0 (+https://ftnplatform.org/kaiso/)",
      "accept-language": "en-TT,en;q=0.9",
    },
    signal: AbortSignal.timeout(9000),
  });
  if (!upstream.ok) throw new Error(`${source.name} returned ${upstream.status}`);
  return parse(await upstream.text(), source);
}

Deno.serve(async (req) => {
  const allowedOrigin = origin(req);
  if (req.method === "OPTIONS") return new Response(null, { status: allowedOrigin ? 204 : 403, headers: headers(allowedOrigin) });
  if (req.method !== "GET") return json(req, { error: "GET required" }, 405);
  if (!allowedOrigin) return json(req, { error: "Origin not allowed" }, 403);
  if (!validKey(req)) return json(req, { error: "Invalid FTN client key" }, 401);

  const results = await Promise.all(SOURCES.map(async (source) => {
    try {
      return { source, items: await collect(source), error: "" };
    } catch (error) {
      return { source, items: [] as Record<string, unknown>[], error: error instanceof Error ? error.message : String(error) };
    }
  }));
  const institutional = results.filter((result) => !result.source.local).flatMap((result) => result.items);
  const localItems = results.filter((result) => result.source.local).flatMap((result) => result.items);
  const warnings = results.filter((result) => result.error).map((result) => result.error);

  return json(req, {
    items: institutional,
    localItems,
    sources: SOURCES.map(({ id, name, url, classification, local }) => ({ id, name, url, classification, local })),
    source: { name: "CARICOM Press Releases", url: SOURCES[0].url },
    fetchedAt: new Date().toISOString(),
    warnings,
    notice: "Headline metadata is for current-source discovery. Publisher reporting remains at the original source. FTN publication requires independent editorial verification and source review.",
    parserState: institutional.length || localItems.length ? "ok" : "sources-returned-no-items",
  });
});
