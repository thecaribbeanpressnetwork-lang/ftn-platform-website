import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const allowed = new Set([
  "https://ftnplatform.org",
  "https://www.ftnplatform.org",
  ...(Deno.env.get("FTN_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]);

function headers(origin: string | null) {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin":
      origin && allowed.has(origin) ? origin : "https://ftnplatform.org",
    "access-control-allow-headers": "authorization,apikey,content-type",
    "access-control-allow-methods": "POST,OPTIONS",
    "cache-control": "no-store",
    "vary": "Origin",
  };
}

function respond(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers(origin) });
  }
  if (req.method !== "POST" || (origin && !allowed.has(origin))) {
    return respond(origin, { error: "Not allowed" }, 403);
  }

  const token =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) {
    return respond(origin, { error: "Authenticate first" }, 401);
  }

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return respond(origin, { error: "Invalid request" }, 400);
  }

  if (body.action !== "request-deletion") {
    return respond(origin, { error: "Unknown account action" }, 400);
  }

  const findPending = () =>
    admin
      .from("ftn_account_requests")
      .select("id,status,requested_at")
      .eq("user_id", user.id)
      .eq("request_type", "deletion")
      .in("status", ["PENDING", "IN_REVIEW"])
      .maybeSingle();

  const { data: existing, error: lookupError } = await findPending();
  if (lookupError) {
    return respond(origin, { error: "Deletion request service is unavailable" }, 503);
  }
  if (existing) {
    return respond(origin, { ok: true, request: existing, duplicate: true });
  }

  const { data: request, error: insertError } = await admin
    .from("ftn_account_requests")
    .insert({ user_id: user.id, request_type: "deletion" })
    .select("id,status,requested_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: racedRequest } = await findPending();
      if (racedRequest) {
        return respond(origin, {
          ok: true,
          request: racedRequest,
          duplicate: true,
        });
      }
    }
    return respond(origin, { error: "Deletion request was not recorded" }, 500);
  }

  const { error: preferenceError } = await admin
    .from("ftn_user_preferences")
    .upsert(
      { user_id: user.id, deletion_pending_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (preferenceError) {
    console.error("Account deletion preference marker failed", {
      userId: user.id,
      requestId: request.id,
      code: preferenceError.code,
    });
  }

  return respond(origin, { ok: true, request });
});
