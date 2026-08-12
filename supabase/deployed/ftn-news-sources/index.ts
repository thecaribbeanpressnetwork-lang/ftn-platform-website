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
    accepts: (url) => !/\/category\/|\/tag\/|\/author\/|\/page\/\d+\/?$|\/wp-content\/|\/feed\/?$|\/search\//i.test(url.pathname),
  },
  {
    id: "guardian-tt",
    name: "Trinidad & Tobago Guardian",
    url: "https://www.guardian.co.tt/news",
    host: "guardian.co.tt",
    classification: "Publisher headline",
    local: true,
    accepts: (url) => /^\/news\/[a-z0-9][^/]*-6\.[0-9]/i.test(url.pathname),
  },
  {
    id: "newsday-tt",
    name: "Trinidad and Tobago Newsday",
    url: "https://newsday.co.tt/category/news/",
    host: "newsday.co.tt",
    classification: "Publisher headline",
    local: true,
    accepts: (url) => /^\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9]/i.test(url.pathname),
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
    .replace(/&amp;|&#038;/g, "&")
    .replace(/&#8217;|&rsquo;|&#39;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validStoryTitle(title: string) {
  if (title.length < 18 || title.length > 220) return false;
  return !/^(read more|home|about|news|latest news|sports|business|features|opinion|press releases?|media release|contact|search|previous|next|older|newer|caricom|secretariat|share news with us|posts pagination)$/i.test(title) &&
    !/cookie|privacy|facebook|twitter|instagram|youtube|linkedin|skip to|subscribe|sign up|log in/i.test(title);
}

function dateNear(html: string, index: number) {
  const near = clean(html.slice(Math.max(0, index - 900), Math.min(html.length, index + 1100)));
  return (near.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i) ||
    near.match(/\b\d{4}-\d{2}-\d{2}\b/) ||
    near.match(/\b\d{8}\b/) || [])[0] || null;
}

function excerptNear(html: string, index: number, title: string) {
  return clean(html.slice(Math.max(0, index - 250), Math.min(html.length, index + 1800))).replace(title, "").trim().slice(0, 420);
}

function parse(html: string, source: Source) {
  const items: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("#") || /^(mailto|javascript):/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(href, source.url);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, "") !== source.host || !source.accepts(url)) continue;
    url.hash = "";
    const normalized = url.href;
    const title = clean(match[2]);
    if (!validStoryTitle(title) || seen.has(normalized)) continue;
    seen.add(normalized);
    const item: Record<string, unknown> = {
      title,
      url: normalized,
      publisher: source.name,
      sourceId: source.id,
      sourcePage: source.url,
      publishedAt: dateNear(html, match.index || 0),
      classification: source.classification,
      verificationState: source.local ? "Attributed publisher headline; FTN has not reproduced or independently verified the report" : "Source identified; editorial verification still required",
    };
    if (!source.local) item.excerpt = excerptNear(html, match.index || 0, title);
    items.push(item);
    if (items.length >= (source.local ? 12 : 30)) break;
  }
  return items;
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
