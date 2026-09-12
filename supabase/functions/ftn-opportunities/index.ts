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
const TRUSTED_HOSTS = new Set(["caricom.org", "www.caribank.org"]);

type RawResource = {
  id: string;
  title: string;
  organization: string;
  country: string;
  type: string;
  deadline: string | null;
  sourceUrl: string;
  sourceName: string;
  sector?: string | null;
  summary: string;
};

function requestOrigin(req: Request) {
  const supplied = req.headers.get("origin") || "";
  const referrer = req.headers.get("referer") || "";
  if (supplied && ALLOWED.has(supplied)) return supplied;
  try {
    const host = supplied ? new URL(supplied).hostname : "";
    if (/^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(host)) return supplied;
  } catch { /* fail closed below */ }
  for (const allowed of ALLOWED) if (referrer.startsWith(`${allowed}/`)) return allowed;
  return "";
}

function validKey(req: Request) {
  const key = req.headers.get("apikey") || "";
  try {
    const publishable = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}") as Record<string, string>;
    return Boolean(key && Object.values(publishable).includes(key));
  } catch { return false; }
}

function headers(origin: string) {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin || "https://ftnplatform.org",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "apikey,content-type",
    vary: "Origin",
    "cache-control": "public, max-age=900, stale-while-revalidate=1800",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(requestOrigin(req)) });
}

function clean(value: string) {
  const decoded = value
    .replace(/&amp;|&#038;/g, "&").replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "’").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ").trim();
  if (/ignore (all|any|the|previous)|system prompt|developer message|<script|javascript:/i.test(decoded)) return "";
  return decoded.slice(0, 1200);
}
function absoluteUrl(base: string, value: string) {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" || !TRUSTED_HOSTS.has(url.hostname)) return base;
    return url.href;
  } catch { return base; }
}
function inferType(title: string) {
  const value = title.toLowerCase();
  if (/scholar|fellow/.test(value)) return "Scholarship / Fellowship";
  if (/grant|fund/.test(value)) return "Grant / Funding";
  if (/bid|tender|procure|supply|construction|consult/.test(value)) return "Procurement / Consultancy";
  if (/vacan|officer|specialist|counsel|rapporteur|manager|director|attendant|economist|engineer/.test(value)) return "Job / Employment";
  return "Opportunity";
}
function resourceType(value: string) {
  const type = value.toLowerCase();
  if (/grant|fund/.test(type)) return "grant";
  if (/job|employment|vacan/.test(type)) return "job";
  if (/procure|consult|tender|bid/.test(type)) return "business-support";
  if (/scholar|fellow/.test(type)) return "programme";
  return "other";
}
function canonicalKey(item: RawResource) {
  return `${item.sourceName}:${item.title}:${item.country}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "FTN Platform Opportunities/2.0 (+https://ftnplatform.org/opportunities/)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error(`${new URL(url).hostname} response too large`);
  return text;
}

function parseCaricom(html: string) {
  const output: RawResource[] = [];
  const anchors = [...html.matchAll(/<a\s+[^>]*href=["']([^"']*\/opportunities\/[^"'#?]+\/?)['"][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set<string>();
  for (const match of anchors) {
    const title = clean(match[2]);
    const sourceUrl = absoluteUrl(SOURCES.caricom, match[1]);
    if (!title || title.length < 4 || seen.has(sourceUrl) || /details|apply now|download/i.test(title)) continue;
    seen.add(sourceUrl);
    const position = Math.max(0, match.index! - 800);
    const nearby = clean(html.slice(position, match.index! + 800));
    const deadline = (nearby.match(/Closing Date:\s*([^|]{3,40})/i) || nearby.match(/Closing Date\s*:?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i) || [])[1] || null;
    output.push({ id: `caricom-${output.length}`, title, organization: "CARICOM Secretariat", country: "Regional / CARICOM", type: inferType(title), deadline, sourceUrl, sourceName: "CARICOM", summary: "Official CARICOM opportunity. Open the source for qualifications, terms and application instructions." });
    if (output.length >= 20) break;
  }
  return output;
}

function parseCdb(html: string, general = false) {
  const output: RawResource[] = [];
  const rows = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const match of rows) {
    const row = match[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => clean(cell[1]));
    if (cells.length < (general ? 3 : 4)) continue;
    const anchor = row.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const title = clean(anchor?.[2] || cells[0] || "");
    if (!title || /Role\/Service|Project Name/i.test(title)) continue;
    const country = cells[2] || "Regional / Caribbean";
    const type = general ? "General Procurement Notice" : (cells[3] || inferType(title));
    output.push({
      id: `${general ? "cdb-gpn" : "cdb"}-${output.length}`,
      title, organization: "Caribbean Development Bank / executing agency", country, type,
      sector: cells[1] || null, deadline: general ? null : (cells[4] || cells.at(-1) || null),
      sourceUrl: anchor ? absoluteUrl(general ? SOURCES.cdbGeneral : SOURCES.cdb, anchor[1]) : (general ? SOURCES.cdbGeneral : SOURCES.cdb),
      sourceName: "Caribbean Development Bank",
      summary: general ? "Official CDB general procurement notice. Open the source for expected contracts and eligibility." : "Official CDB procurement notice. Open the source for eligibility, terms and submission instructions.",
    });
    if (output.length >= 40) break;
  }
  return output;
}

function tokens(value: string) {
  return [...new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2))];
}
function ttEligibility(country: string) {
  const value = country.toLowerCase();
  if (/trinidad|tobago/.test(value)) return { status: "likely_eligible_verify", reason: "The source record names Trinidad and Tobago; the applicant criteria still require verification." };
  if (/caribbean|caricom|regional/.test(value)) return { status: "possible_verify", reason: "The opportunity is regional, but the record does not prove applicant eligibility from Trinidad and Tobago." };
  return { status: "unknown", reason: "The source record does not establish Trinidad and Tobago eligibility." };
}
function deadlineState(value: string | null, now: number) {
  if (!value) return { state: "unknown", urgency: 0 };
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return { state: "unknown", urgency: 0 };
  const days = Math.ceil((parsed - now) / 86_400_000);
  if (days < 0) return { state: "expired", urgency: -100 };
  if (days <= 14) return { state: "closing-soon", urgency: 12 };
  return { state: "active", urgency: days <= 60 ? 7 : 2 };
}
function normalize(item: RawResource, query: string, territory: string, now: number) {
  const queryTokens = tokens(`${query} ${territory}`);
  const haystack = tokens(`${item.title} ${item.type} ${item.country} ${item.organization} ${item.sector || ""} ${item.summary}`);
  const overlap = queryTokens.filter((token) => haystack.some((candidate) => candidate.includes(token) || token.includes(candidate))).length;
  const eligibility = ttEligibility(item.country);
  const expiry = deadlineState(item.deadline, now);
  const territoryScore = eligibility.status === "likely_eligible_verify" ? 25 : eligibility.status === "possible_verify" ? 14 : 0;
  const rankScore = Math.max(0, overlap * 10 + territoryScore + expiry.urgency + 20);
  return {
    ...item,
    resourceId: canonicalKey(item), canonicalName: item.title, resourceType: resourceType(item.type),
    provider: item.organization, locality: null, geographicCoverage: item.country, deliveryMode: "unknown",
    eligibilityText: "Unknown until the official criteria are opened and checked.", eligibilityAssessment: eligibility,
    applicationUrl: item.sourceUrl, applicationMethod: "Open the authoritative source and verify its current instructions.",
    costStatus: "unknown", payoutOrBenefit: "unknown", payoutAccessibilityFromTrinidadAndTobago: "unknown",
    recurring: false, ongoing: false, sourcePublisher: item.sourceName, sourceRetrievedAt: new Date(now).toISOString(),
    lastVerified: new Date(now).toISOString(), verificationStatus: "confirmed_by_authoritative_source",
    confidenceScore: 0.9, confidenceBasis: "Authoritative publisher and allow-listed HTTPS source; eligibility, cost and payout remain unconfirmed.",
    ownershipIpImplications: "Unknown; review official terms before applying.", dataSensitivity: "public",
    expiryState: expiry.state, rankScore,
    rankExplanation: "Deterministic relevance, Trinidad and Tobago compatibility, deadline urgency and source authority; not a prediction of acceptance.",
  };
}

Deno.serve(async (req) => {
  const origin = requestOrigin(req);
  if (req.method === "OPTIONS") return new Response(null, { status: origin ? 204 : 403, headers: headers(origin) });
  if (req.method !== "GET") return json(req, { error: "GET required" }, 405);
  if (!origin) return json(req, { error: "Origin not allowed" }, 403);
  if (!validKey(req)) return json(req, { error: "Invalid FTN client key" }, 401);

  const url = new URL(req.url);
  const query = clean(url.searchParams.get("q") || "").slice(0, 240);
  const territory = clean(url.searchParams.get("territory") || "Trinidad and Tobago").slice(0, 80);
  const limit = Math.min(25, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const now = Date.now();
  const settled = await Promise.allSettled([fetchText(SOURCES.caricom), fetchText(SOURCES.cdb), fetchText(SOURCES.cdbGeneral)]);
  let raw: RawResource[] = [];
  const warnings: string[] = [];
  if (settled[0].status === "fulfilled") raw.push(...parseCaricom(settled[0].value)); else warnings.push("CARICOM source unavailable");
  if (settled[1].status === "fulfilled") raw.push(...parseCdb(settled[1].value)); else warnings.push("CDB procurement source unavailable");
  if (settled[2].status === "fulfilled") raw.push(...parseCdb(settled[2].value, true)); else warnings.push("CDB general procurement source unavailable");

  const deduplicated = new Map<string, RawResource>();
  for (const item of raw) {
    const key = canonicalKey(item);
    if (!deduplicated.has(key)) deduplicated.set(key, item);
  }
  const items = [...deduplicated.values()]
    .map((item) => normalize(item, query, territory, now))
    .filter((item) => item.expiryState !== "expired")
    .filter((item) => !query || item.rankScore >= 34)
    .sort((a, b) => b.rankScore - a.rankScore || a.title.localeCompare(b.title))
    .slice(0, limit);
  const best = items[0] || null;
  return json(req, {
    schema: "ftn.ecosystem-resource/v1", query, territory, items, count: items.length,
    pathway: best ? {
      bestVerifiedMatch: best,
      whyRelevant: best.rankExplanation,
      eligibility: best.eligibilityAssessment,
      prepare: "Open the source and confirm eligibility, documents, deadline, cost, payout method and ownership terms before acting.",
      alternatives: items.slice(1, 4),
    } : null,
    sources: [
      { name: "CARICOM", url: SOURCES.caricom },
      { name: "Caribbean Development Bank Procurement", url: SOURCES.cdb },
      { name: "CDB General Procurement Notices", url: SOURCES.cdbGeneral },
    ],
    warnings, fetchedAt: new Date(now).toISOString(),
    rankingMethod: "FTN_ECOSYSTEM_RESOURCE_RANKING_V1_DETERMINISTIC",
    notice: "Candidate relevance is not eligibility. Unknown fees, payout access, deadlines or terms remain unknown until verified on the authoritative source.",
  });
});
