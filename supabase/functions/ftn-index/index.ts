// FTN Index — public read/internal-first API + invitation claim endpoint.
// No paid external provider is used. Canonical data remains in FTN-owned PostgreSQL tables.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org", "http://localhost:8000", "http://127.0.0.1:8000"]);
const windows = new Map<string, { count: number; resetAt: number }>();
const COMMON_FIELDS = new Set(["name","legalName","description","phone","email","website","address","locality","territory","postalCode","latitude","longitude","hours","instagram","facebook","youtube","whatsapp","services"]);
const CATEGORY_FIELDS: Record<string, Set<string>> = {
  accommodation: new Set(["accommodationType","bookingUrl","checkIn","checkOut","amenities","accessibility","airportTransfer","foodService","nearbyAttractions"]),
  restaurant: new Set(["cuisine","menuUrl","reservationsUrl","diningOptions","delivery","takeaway","dietaryOptions","priceRange"]),
  tours: new Set(["tourTypes","bookingUrl","pickupArea","languages","accessibility","duration","priceRange"]),
  transport: new Set(["transportType","serviceArea","bookingUrl","accessibility","operatingHours"]),
  business: new Set(["serviceArea","priceRange","bookingUrl","products"]),
};

function cors(origin: string | null) {
  const safeOrigin = origin && allowedOrigins.has(origin) ? origin : "https://ftnplatform.org";
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}
function reply(body: unknown, status: number, origin: string | null) { return new Response(JSON.stringify(body), { status, headers: cors(origin) }); }
function limit(ip: string) {
  const now = Date.now(), current = windows.get(ip);
  if (!current || current.resetAt <= now) { windows.set(ip, { count: 1, resetAt: now + 5 * 60_000 }); return true; }
  if (current.count >= 80) return false;
  current.count += 1; return true;
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function cleanSearch(value: unknown) { return typeof value === "string" ? value.trim().slice(0, 120).replace(/[%_,()]/g, " ") : ""; }
function allowedFields(category: string) {
  const result = new Set(COMMON_FIELDS);
  const extra = CATEGORY_FIELDS[String(category || "").toLowerCase()] || CATEGORY_FIELDS.business;
  extra.forEach((key) => result.add(key));
  return result;
}
function sanitizeFields(input: unknown, category: string) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const allowed = allowedFields(category), output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!allowed.has(key)) continue;
    if (typeof value === "string") output[key] = value.trim().slice(0, 2000);
    else if (typeof value === "boolean" || typeof value === "number" || value === null) output[key] = value;
    else if (Array.isArray(value)) output[key] = value.slice(0, 40).map((item) => String(item).trim().slice(0, 240)).filter(Boolean);
  }
  return output;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!limit(ip)) return reply({ error: "Rate limit reached. Please try again shortly." }, 429, origin);

  const url = Deno.env.get("SUPABASE_URL") || "", serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceRole) return reply({ error: "FTN Index is not configured." }, 503, origin);
  const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }
  const action = typeof body.action === "string" ? body.action : "search";

  if (action === "search") {
    const q = cleanSearch(body.q), territory = typeof body.territory === "string" ? body.territory.trim().slice(0, 8).toUpperCase() : "";
    let query = db.from("ftn_index_public_entities").select("ftn_id,slug,entity_type,display_name,territory_code,category,subcategory,public_status,claimed,last_entity_confirmed_at,verification_freshness,fields,updated_at").limit(25);
    if (q) query = query.or(`display_name.ilike.%${q}%,legal_name.ilike.%${q}%,category.ilike.%${q}%`);
    if (territory) query = query.eq("territory_code", territory);
    const { data, error } = await query.order("verification_freshness", { ascending: false }).order("display_name", { ascending: true });
    if (error) { console.error("FTN Index search", error); return reply({ error: "Search unavailable." }, 500, origin); }
    return reply({ ok: true, results: data || [], count: data?.length || 0 }, 200, origin);
  }

  if (action === "entity") {
    const slug = typeof body.slug === "string" ? body.slug.trim().slice(0, 180) : "";
    if (!slug) return reply({ error: "Missing entity." }, 400, origin);
    const { data, error } = await db.from("ftn_index_public_entities").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) return reply({ error: "Entity not found." }, 404, origin);
    return reply({ ok: true, entity: data }, 200, origin);
  }

  if (action === "claim-preview") {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (token.length < 32 || token.length > 256) return reply({ error: "Invitation unavailable." }, 400, origin);
    const { data, error } = await db.rpc("ftn_index_claim_preview", { p_token_hash: await sha256(token) });
    if (error || !data?.ok) return reply({ error: "This invitation is unavailable or expired." }, 410, origin);
    return reply(data, 200, origin);
  }

  if (action === "claim-confirm") {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (token.length < 32 || token.length > 256) return reply({ error: "Invitation unavailable." }, 400, origin);
    const tokenHash = await sha256(token);
    const { data: preview } = await db.rpc("ftn_index_claim_preview", { p_token_hash: tokenHash });
    if (!preview?.ok) return reply({ error: "This invitation is unavailable or expired." }, 410, origin);
    const fields = sanitizeFields(body.fields, preview.entity?.category || "business");
    if (!fields || !Object.keys(fields).length) return reply({ error: "Review at least one business detail." }, 400, origin);
    const { data, error } = await db.rpc("ftn_index_confirm_invitation", { p_token_hash: tokenHash, p_fields: fields });
    if (error || !data?.ok) { console.error("FTN Index confirmation", error); return reply({ error: "Confirmation could not be saved." }, 500, origin); }
    return reply({ ...data, verificationMeaning: "Recently confirmed public information — not an FTN endorsement or safety rating." }, 200, origin);
  }

  return reply({ error: "Unknown action." }, 400, origin);
});
