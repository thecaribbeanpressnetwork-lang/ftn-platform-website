import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://ftnplatform.org",
  "https://www.ftnplatform.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const NOAA_CARIBBEAN = "https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=car&src=nav";

function originAllowed(req: Request) {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  if (origin && ALLOWED_ORIGINS.has(origin)) return origin;
  for (const allowed of ALLOWED_ORIGINS) {
    if (referer.startsWith(allowed + "/")) return allowed;
  }
  return "";
}

function validKey(req: Request) {
  const supplied = req.headers.get("apikey") || "";
  if (!supplied) return false;
  try {
    const all = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    return Object.values(all).some((value) => value === supplied);
  } catch {
    return false;
  }
}

function headers(origin: string) {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin || "https://ftnplatform.org",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "apikey,content-type",
    "vary": "Origin",
    "cache-control": "public, max-age=300, stale-while-revalidate=600",
  };
}

function response(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(originAllowed(req)) });
}

function absolute(url: string) {
  return url.startsWith("http") ? url : "https://cdn.star.nesdis.noaa.gov" + url;
}

Deno.serve(async (req) => {
  const origin = originAllowed(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: origin ? 204 : 403, headers: headers(origin) });
  }
  if (req.method !== "GET") return response(req, { error: "GET required" }, 405);
  if (!origin) return response(req, { error: "Origin not allowed" }, 403);
  if (!validKey(req)) return response(req, { error: "Invalid FTN client key" }, 401);

  try {
    const upstream = await fetch(NOAA_CARIBBEAN, {
      headers: { "user-agent": "FTN Platform/1.0 public satellite viewer" },
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) throw new Error(`NOAA ${upstream.status}`);
    const html = await upstream.text();

    const geo = (
      html.match(/https:\/\/cdn\.star\.nesdis\.noaa\.gov\/GOES19\/ABI\/SECTOR\/car\/GEOCOLOR\/[^\"']+1000x1000\.jpg/i) ||
      html.match(/\/GOES19\/ABI\/SECTOR\/car\/GEOCOLOR\/[^\"']+1000x1000\.jpg/i) ||
      []
    )[0] || "";
    const loop = (
      html.match(/https:\/\/cdn\.star\.nesdis\.noaa\.gov\/GOES19\/ABI\/SECTOR\/car\/GEOCOLOR\/[^\"']+1000x1000\.gif/i) ||
      html.match(/\/GOES19\/ABI\/SECTOR\/car\/GEOCOLOR\/[^\"']+1000x1000\.gif/i) ||
      []
    )[0] || "";
    const stamp = (
      html.match(/GeoColor[\s\S]{0,250}?(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}\s+-\s+\d{2}:\d{2}\s+UTC)/) || []
    )[1] || null;

    return response(req, {
      satellite: {
        provider: "NOAA/NESDIS/STAR",
        satellite: "GOES-19",
        sector: "Caribbean",
        product: "GeoColor",
        imageUrl: geo ? absolute(geo) : null,
        loopUrl: loop ? absolute(loop) : null,
        sourceUrl: NOAA_CARIBBEAN,
        sourceTimestamp: stamp,
        refreshMinutes: 10,
        classification: "Official source imagery / informational use",
        disclaimer:
          "NOAA STAR states this web imagery is informational and should not be used as the sole basis for operational forecasting or emergency response.",
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return response(
      req,
      {
        error: timedOut
          ? "NOAA source timed out; use the direct NOAA source while FTN retries."
          : error instanceof Error
            ? error.message
            : String(error),
        satellite: { provider: "NOAA/NESDIS/STAR", sourceUrl: NOAA_CARIBBEAN },
      },
      502,
    );
  }
});
