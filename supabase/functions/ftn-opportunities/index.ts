import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED = new Set([
  "https://ftnplatform.org",
  "https://www.ftnplatform.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const SOURCES = {
  caricom: "https://caricom.org/vacancies/",
  cdb: "https://www.caribank.org/work-with-us/procurement/procurement-notices",
  cdbGeneral: "https://www.caribank.org/work-with-us/procurement/general-procurement-notices",
};

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
    const publishable = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    return !!supplied && Object.values(publishable).includes(supplied);
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
    "cache-control": "public, max-age=900, stale-while-revalidate=1800",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin(req)) });
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absolute(base: string, value: string) {
  try {
    return new URL(value, base).href;
  } catch {
    return base;
  }
}

function inferType(title: string) {
  const text = title.toLowerCase();
  if (/scholar|fellow/.test(text)) return "Scholarship / Fellowship";
  if (/grant|fund/.test(text)) return "Grant / Funding";
  if (/bid|tender|procure|supply|construction|consult/.test(text)) return "Procurement / Consultancy";
  if (/vacan|officer|specialist|counsel|rapporteur|manager|director|attendant|economist|engineer/.test(text)) {
    return "Job / Employment";
  }
  return "Opportunity";
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "FTN Platform Opportunities/1.0 (+https://ftnplatform.org/opportunities/)" },
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  return await response.text();
}

function parseCARICOM(html: string) {
  const out: any[] = [];
  const anchors = [
    ...html.matchAll(/<a\s+[^>]*href=["']([^"']*\/opportunities\/[^"'#?]+\/?)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ];
  const seen = new Set<string>();

  for (const match of anchors) {
    const title = decode(match[2]);
    const url = absolute(SOURCES.caricom, match[1]);
    if (!title || title.length < 4 || seen.has(url) || /details|apply now|download/i.test(title)) continue;
    seen.add(url);
    const position = Math.max(0, match.index! - 800);
    const near = decode(html.slice(position, match.index! + 800));
    // Try the strict, correctly-formatted date pattern first. The looser fallback below matches
    // up to 40 characters of whatever follows "Closing Date:" with no real end boundary, so on
    // this source's actual markup it was capturing trailing page furniture (view counts, the
    // start of the next listing's title) appended after a real date -- e.g. "September 30, 2026
    // 48 Views Vacancy Noti" instead of "September 30, 2026". Since `||` short-circuits on the
    // first match, that loose pattern almost always won even though the strict one was checked
    // second and would have matched the real date cleanly on its own.
    const closing = (
      near.match(/Closing Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i) ||
      near.match(/Closing Date:\s*([^|]{3,40})/i) ||
      []
    )[1] || null;

    out.push({
      id: "caricom-" + out.length,
      title,
      organization: "CARICOM Secretariat",
      country: "Regional / CARICOM",
      type: inferType(title),
      deadline: closing,
      sourceUrl: url,
      sourceName: "CARICOM",
      official: true,
      lastVerified: new Date().toISOString(),
      summary: "Official CARICOM opportunity. Open the source for qualifications, terms and application instructions.",
    });
    if (out.length >= 20) break;
  }
  return out;
}

function parseCDB(html: string, general = false) {
  const out: any[] = [];
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowPattern.exec(html))) {
    const row = match[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => decode(cell[1]));
    if (cells.length < (general ? 3 : 4)) continue;
    const anchor = row.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const title = decode(anchor?.[2] || cells[0] || "");
    if (!title || /Role\/Service|Project Name/i.test(title)) continue;
    const country = cells[2] || "Regional";
    const deadline = general ? null : cells[4] || cells[cells.length - 1] || null;

    out.push({
      id: (general ? "cdb-gpn-" : "cdb-") + out.length,
      title,
      organization: "Caribbean Development Bank / executing agency",
      country,
      type: general ? "General Procurement Notice" : cells[3] || inferType(title),
      sector: cells[1] || null,
      deadline,
      sourceUrl: anchor ? absolute(SOURCES.cdb, anchor[1]) : general ? SOURCES.cdbGeneral : SOURCES.cdb,
      sourceName: "Caribbean Development Bank",
      official: true,
      lastVerified: new Date().toISOString(),
      summary: general
        ? "Official CDB general procurement notice. Open the source for expected contracts and eligibility."
        : "Official CDB procurement notice. Open the source for eligibility, terms and submission instructions.",
    });
    if (out.length >= 40) break;
  }
  return out;
}

Deno.serve(async (req) => {
  const allowedOrigin = origin(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: allowedOrigin ? 204 : 403, headers: headers(allowedOrigin) });
  }
  if (req.method !== "GET") return json(req, { error: "GET required" }, 405);
  if (!allowedOrigin) return json(req, { error: "Origin not allowed" }, 403);
  if (!validKey(req)) return json(req, { error: "Invalid FTN client key" }, 401);

  const settled = await Promise.allSettled([
    fetchText(SOURCES.caricom),
    fetchText(SOURCES.cdb),
    fetchText(SOURCES.cdbGeneral),
  ]);

  let items: any[] = [];
  const warnings: string[] = [];
  if (settled[0].status === "fulfilled") items.push(...parseCARICOM(settled[0].value));
  else warnings.push("CARICOM source unavailable");
  if (settled[1].status === "fulfilled") items.push(...parseCDB(settled[1].value, false));
  else warnings.push("CDB procurement source unavailable");
  if (settled[2].status === "fulfilled") items.push(...parseCDB(settled[2].value, true));
  else warnings.push("CDB general procurement source unavailable");

  const deduplicated = new Map<string, any>();
  for (const item of items) {
    const key = (item.title + "|" + item.country).toLowerCase();
    if (!deduplicated.has(key)) deduplicated.set(key, item);
  }
  items = [...deduplicated.values()];

  return json(req, {
    items,
    count: items.length,
    sources: [
      { name: "CARICOM", url: SOURCES.caricom },
      { name: "Caribbean Development Bank Procurement", url: SOURCES.cdb },
      { name: "CDB General Procurement Notices", url: SOURCES.cdbGeneral },
    ],
    warnings,
    fetchedAt: new Date().toISOString(),
    notice:
      "FTN indexes official source metadata for discovery. Applicants must verify current eligibility, deadlines and instructions on the official source before acting.",
  });
});
