import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedKinds = new Set(["tool-call", "tool-success", "tool-error", "source-open", "conversion"]);
const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const clean = (value: unknown, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "https://ftnplatform.org", "access-control-allow-methods": "POST,OPTIONS", "access-control-allow-headers": "authorization,content-type" } });
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403);
  const expected = Deno.env.get("FTN_IBIS_MCP_USAGE_TOKEN") || "";
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || supplied !== expected) return reply({ error: "Usage collector unavailable" }, 503);
  let body: any;
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const eventKind = clean(body.eventKind, 30);
  const toolName = clean(body.toolName, 80);
  if (!allowedKinds.has(eventKind) || !toolName) return reply({ error: "Invalid aggregate event" }, 422);
  const latency = Number.isFinite(Number(body.latencyMs)) ? Math.max(0, Math.min(600000, Math.round(Number(body.latencyMs)))) : null;
  const admin = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("ftn_ibis_mcp_usage_events").insert({ event_kind: eventKind, host_name: clean(body.hostName, 60) || "mcp", tool_name: toolName, request_category: clean(body.requestCategory, 80) || null, result_state: clean(body.resultState, 40) || null, latency_ms: latency, metadata: {} });
  if (error) return reply({ error: "Usage event was not recorded" }, 500);
  return reply({ recorded: true });
});
