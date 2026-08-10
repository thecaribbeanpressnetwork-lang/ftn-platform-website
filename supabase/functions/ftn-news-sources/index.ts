import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED = new Set([
  "https://ftnplatform.org",
  "https://www.ftnplatform.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const SOURCE_URL = "https://caricom.org/category/pressreleases/";

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
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validStoryTitle(title: string) {
  if (title.length < 18 || title.length > 220) return false;
  return (
    !/^(read more|home|about|news|press releases?|media release|contact|search|previous|next|older|newer|caricom|secretariat)$/i.test(title) &&
    !/cookie|privacy|facebook|twitter|instagram|youtube|linkedin|skip to/i.test(title)
  );
}

function dateNear(html: string, index: number) {
  const from = Math.max(0, index - 900);
  const to = Math.min(html.length, index + 1100);
  const near = clean(html.slice(from, to));
  return (
    near.match(
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i,
    ) || []
  )[0] || null;
}

function excerptNear(html: string, index: number, title: string) {
  const from = Math.max(0, index - 250);
  const to = Math.min(html.length, index + 1800);
  return clean(html.slice(from, to)).replace(title, "").trim().slice(0, 420);
}

function parse(html: string) {
  const items: any[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;

    let url: string;
    try {
      url = new URL(href, SOURCE_URL).href;
    } catch {
      continue;
    }

    if (!/^https?:\/\/(?:www\.)?caricom\.org\//i.test(url)) continue;
    if (/\/category\/|\/tag\/|\/author\/|\/page\/\d+\/?$|\/wp-content\/|\/feed\/?$|\/search\//i.test(url)) continue;

    const title = clean(match[2]);
    if (!validStoryTitle(title) || seen.has(url)) continue;
    seen.add(url);

    items.push({
      title,
      url,
      publisher: "CARICOM",
      publishedAt: dateNear(html, match.index || 0),
      excerpt: excerptNear(html, match.index || 0, title),
      classification: "Official institutional release",
      verificationState: "Source identified; editorial verification still required",
    });
    if (items.length >= 30) break;
  }
  return items;
}

Deno.serve(async (req) => {
  const allowedOrigin = origin(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: allowedOrigin ? 204 : 403, headers: headers(allowedOrigin) });
  }
  if (req.method !== "GET") return json(req, { error: "GET required" }, 405);
  if (!allowedOrigin) return json(req, { error: "Origin not allowed" }, 403);
  if (!validKey(req)) return json(req, { error: "Invalid FTN client key" }, 401);

  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 FTN-Kaiso/1.0 (+https://ftnplatform.org/kaiso/)",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!upstream.ok) throw new Error(`CARICOM ${upstream.status}`);
    const html = await upstream.text();
    const items = parse(html);

    return json(req, {
      items,
      source: { name: "CARICOM Press Releases", url: SOURCE_URL },
      fetchedAt: new Date().toISOString(),
      notice:
        "Source radar metadata is for newsroom discovery. Publication by FTN requires independent editorial verification and source review.",
      parserState: items.length ? "ok" : "source-returned-no-items",
    });
  } catch (error) {
    return json(
      req,
      {
        error: error instanceof Error ? error.message : String(error),
        source: { name: "CARICOM Press Releases", url: SOURCE_URL },
      },
      502,
    );
  }
});
