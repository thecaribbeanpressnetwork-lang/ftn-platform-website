import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function originOf(value: string) {
  try {
    const url = new URL(value);
    return url.origin.slice(0, 300);
  } catch {
    return null;
  }
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function notifyEmail(subject: string, body: string) {
  const key = Deno.env.get("FTN_PROVENANCE_RESEND_API_KEY");
  const from = Deno.env.get("FTN_PROVENANCE_FROM_EMAIL");
  const to = Deno.env.get("FTN_PROVENANCE_ALERT_EMAIL") || "facethenationtt@gmail.com";
  if (!key || !from) return { configured: false, sent: false };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  return { configured: true, sent: response.ok };
}

async function notifyWhatsApp(body: string) {
  const webhook = Deno.env.get("FTN_PROVENANCE_WHATSAPP_WEBHOOK_URL");
  if (!webhook) return { configured: false, sent: false };
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      to: Deno.env.get("FTN_PROVENANCE_ALERT_WHATSAPP_E164") || "+18683961471",
      text: body,
      source: "FTN provenance usage signal",
    }),
  });
  return { configured: true, sent: response.ok };
}

Deno.serve(async (request) => {
  // Disabled until a server-side token is configured. A public pixel without
  // this gate would be an unauthenticated event-ingestion endpoint.
  const expectedToken = Deno.env.get("FTN_PROVENANCE_BEACON_TOKEN");
  if (!expectedToken) return new Response(null, { status: 204 });
  const suppliedToken = request.headers.get("x-ftn-provenance-token") || new URL(request.url).searchParams.get("token");
  if (suppliedToken !== expectedToken) return json({ ok: false }, 403);

  let input: Record<string, unknown> = {};
  try { input = await request.json(); } catch { input = {}; }
  const assetId = text(input.assetId, 160);
  if (!assetId || !/^ftn:(ibis|public):[a-z0-9._/-]+$/i.test(assetId)) return json({ ok: false, error: "invalid_asset" }, 400);
  const pagePath = text(input.pagePath, 500) || null;
  const referrerOrigin = originOf(text(input.referrer, 1000));
  const eventKind = ["asset-request", "page-request", "manifest-verify"].includes(String(input.eventKind)) ? String(input.eventKind) : "asset-request";
  const dedupeKey = await digest(`${assetId}|${pagePath || ""}|${referrerOrigin || ""}|${new Date().toISOString().slice(0, 13)}`);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signal = { asset_id: assetId, page_path: pagePath, referrer_origin: referrerOrigin, event_kind: eventKind, signal_score: referrerOrigin ? 20 : 5, dedupe_key: dedupeKey, metadata: { userAgentClass: "omitted-by-design" } };
  const { data, error } = await db.from("ftn_provenance_usage_signals").upsert(signal, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id,asset_id,page_path,referrer_origin,event_kind,signal_score,created_at").maybeSingle();
  if (error) return json({ ok: false, error: "signal_write_failed" }, 500);
  if (!data) return json({ ok: true, duplicate: true });

  const body = [`Asset: ${data.asset_id}`, `Page: ${data.page_path || "(not supplied)"}`, `Referrer origin: ${data.referrer_origin || "(none)"}`, `Signal score: ${data.signal_score}`, `Time: ${data.created_at}`, "This is an asset-request signal, not proof of copying or viewer identity."].join("\n");
  const [email, whatsapp] = await Promise.all([notifyEmail("FTN provenance usage signal", body), notifyWhatsApp(body)]);
  const alertState = email.sent || whatsapp.sent ? "sent" : (email.configured || whatsapp.configured ? "failed" : "not-configured");
  await db.from("ftn_provenance_usage_signals").update({ alert_state: alertState, alerted_at: alertState === "sent" ? new Date().toISOString() : null }).eq("id", data.id);
  return json({ ok: true, signalId: data.id, alertState });
});
