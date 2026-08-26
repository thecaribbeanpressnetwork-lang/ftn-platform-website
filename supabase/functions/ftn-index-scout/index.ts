// FTN Index Scout v1 — controlled Caribbean business discovery.
// Initial lane: Trinidad & Tobago accommodation. OpenStreetMap/Overpass is discovery-only:
// imported candidate fields remain internal until the business confirms them or another approved
// provenance gate promotes them. No external paid API is used.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const TERRITORY = "TTO";
const VERTICAL = "accommodation";
const SOURCE_KEY = "osm-overpass-discovery";
const TIMEOUT_MS = 25_000;
const MAX_RESULTS = 250;

type OsmElement = { type: "node" | "way" | "relation"; id: number; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string> };

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "caribbean-business";
}
function publicEmail(tags: Record<string, string>) { return (tags["contact:email"] || tags.email || "").trim().toLowerCase().slice(0, 320); }
function fieldPairs(tags: Record<string, string>, element: OsmElement) {
  const location = element.center || { lat: element.lat, lon: element.lon };
  const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ");
  const raw: Record<string, unknown> = {
    name: tags.name || "",
    description: tags.description || "",
    phone: tags["contact:phone"] || tags.phone || "",
    email: publicEmail(tags),
    website: tags["contact:website"] || tags.website || "",
    address,
    locality: tags["addr:city"] || tags["addr:suburb"] || tags["addr:place"] || "",
    hours: tags.opening_hours || "",
    instagram: tags["contact:instagram"] || "",
    facebook: tags["contact:facebook"] || "",
    whatsapp: tags["contact:whatsapp"] || "",
    accommodationType: tags.tourism || "",
    bookingUrl: tags["contact:booking"] || "",
    latitude: location.lat ?? null,
    longitude: location.lon ?? null,
  };
  return Object.entries(raw).filter(([, value]) => value !== "" && value !== null && value !== undefined);
}
function overpassQuery() {
  return `[out:json][timeout:20];area["ISO3166-1"="TT"][admin_level=2]->.searchArea;(nwr["tourism"~"^(hotel|guest_house|hostel|motel|apartment|chalet|resort)$"](area.searchArea););out center tags ${MAX_RESULTS};`;
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function fetchCandidates() {
  const response = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "FTN-Index-Scout/1.0 (https://ftnplatform.org/index/)" },
    body: new URLSearchParams({ data: overpassQuery() }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`overpass_${response.status}`);
  const data = await response.json();
  return (Array.isArray(data?.elements) ? data.elements : []).slice(0, MAX_RESULTS) as OsmElement[];
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "", serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRole) return reply({ error: "Scout unavailable" }, 503);
  const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  const supplied = request.headers.get("x-ftn-scout-secret") || "";
  const { data: secretRow } = await db.from("ftn_index_internal_settings").select("setting_value").eq("setting_key", "scout_cron_secret").maybeSingle();
  if (!secretRow?.setting_value || supplied !== secretRow.setting_value) return reply({ error: "Unauthorized" }, 401);

  const day = new Date().toISOString().slice(0, 10), runKey = `${day}:${TERRITORY}:${VERTICAL}:${SOURCE_KEY}`;
  const { data: existing } = await db.from("ftn_index_scout_runs").select("status").eq("run_key", runKey).maybeSingle();
  if (existing?.status === "completed") return reply({ ok: true, skipped: "already_completed", runKey });

  await db.from("ftn_index_scout_runs").upsert({ run_key: runKey, territory_code: TERRITORY, vertical: VERTICAL, source_key: SOURCE_KEY, status: "started", started_at: new Date().toISOString(), error_code: null }, { onConflict: "run_key" });

  let elements: OsmElement[];
  try { elements = await fetchCandidates(); }
  catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : "discovery_failed";
    await db.from("ftn_index_scout_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_code: code }).eq("run_key", runKey);
    return reply({ error: "Discovery source unavailable", runKey }, 502);
  }

  let discovered = 0, contactable = 0;
  for (const element of elements) {
    const tags = element.tags || {}, name = (tags.name || "").trim();
    if (!name) continue;
    const sourceObject = `${element.type}/${element.id}`;
    const ftnId = `FTN-${TERRITORY}-BIZ-OSM-${element.type[0].toUpperCase()}${element.id}`;
    const slug = `${slugify(name)}-${(await sha256(ftnId)).slice(0, 8)}`;

    const { data: entity, error: entityError } = await db.from("ftn_index_entities").upsert({
      ftn_id: ftnId, entity_type: "business", slug, display_name: name, territory_code: TERRITORY,
      category: "accommodation", subcategory: tags.tourism || null, public_status: "provisional", updated_at: new Date().toISOString(),
    }, { onConflict: "ftn_id" }).select("id,public_status").single();
    if (entityError || !entity) continue;

    const sourceUrl = `https://www.openstreetmap.org/${sourceObject}`;
    const sourceHash = await sha256(`${SOURCE_KEY}:${sourceObject}`);
    const { data: existingSource } = await db.from("ftn_index_sources").select("id").eq("entity_id", entity.id).eq("content_hash", sourceHash).maybeSingle();
    let sourceId = existingSource?.id;
    if (sourceId) await db.from("ftn_index_sources").update({ last_checked_at: new Date().toISOString() }).eq("id", sourceId);
    else {
      const { data: source } = await db.from("ftn_index_sources").insert({ entity_id: entity.id, source_type: "directory", source_url: sourceUrl, source_label: "OpenStreetMap / Overpass — discovery candidate only", content_hash: sourceHash }).select("id").single();
      sourceId = source?.id;
    }

    await db.from("ftn_index_scout_observations").insert({ entity_id: entity.id, territory_code: TERRITORY, vertical: VERTICAL, observation_type: "business-discovered", candidate_url: sourceUrl, candidate_value: { source_object: sourceObject, tourism: tags.tourism || null }, source_label: "OpenStreetMap / Overpass", review_status: "candidate" });

    let emailFieldId: string | null = null;
    for (const [key, value] of fieldPairs(tags, element)) {
      const { data: current } = await db.from("ftn_index_fields").select("id,provenance_type").eq("entity_id", entity.id).eq("field_key", key).is("superseded_at", null).maybeSingle();
      if (current && current.provenance_type !== "discovered") { if (key === "email") emailFieldId = current.id; continue; }
      if (current) {
        await db.from("ftn_index_fields").update({ value_json: value, visibility: "internal", provenance_type: "discovered", source_id: sourceId, effective_from: new Date().toISOString() }).eq("id", current.id);
        if (key === "email") emailFieldId = current.id;
      } else {
        const { data: created } = await db.from("ftn_index_fields").insert({ entity_id: entity.id, field_key: key, value_json: value, visibility: "internal", provenance_type: "discovered", source_id: sourceId }).select("id").single();
        if (key === "email") emailFieldId = created?.id || null;
      }
    }

    if (emailFieldId) {
      contactable += 1;
      await db.from("ftn_index_outreach_queue").upsert({ entity_id: entity.id, public_contact_field_id: emailFieldId, territory_code: TERRITORY, vertical: VERTICAL, status: "blocked-transport", transport_key: "unconfigured", updated_at: new Date().toISOString() }, { onConflict: "entity_id,public_contact_field_id" });
    }
    discovered += 1;
  }

  await db.from("ftn_index_scout_runs").update({ status: "completed", discovered_count: discovered, contactable_count: contactable, completed_at: new Date().toISOString() }).eq("run_key", runKey);
  return reply({ ok: true, runKey, discovered, contactable, outreach: "blocked_until_free_transport_is_approved" });
});
