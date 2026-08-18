import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const baseOrigins = ["https://ftnplatform.org", "https://www.ftnplatform.org"];
const configuredOrigins = (Deno.env.get("FTN_ALLOWED_ORIGINS") || "").split(",").map((x) => x.trim()).filter(Boolean);
const allowedOrigins = new Set([...baseOrigins, ...configuredOrigins]);
const statuses = ["LIVE", "AVAILABLE", "PRIVATE", "PHASE 2", "ILLUSTRATIVE", "TEMPORARILY UNAVAILABLE", "VAULTED"];

function headers(origin: string | null) {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin && allowedOrigins.has(origin) ? origin : "https://ftnplatform.org",
    "access-control-allow-headers": "authorization,apikey,content-type,x-ftn-device-credential",
    "access-control-allow-methods": "POST,OPTIONS",
    "cache-control": "no-store",
    "vary": "Origin",
  };
}
function reply(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}
function bearer(req: Request) {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
}
function clean(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function jwtSessionId(token: string) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return /^[0-9a-f-]{36}$/i.test(payload.session_id || "") ? payload.session_id : "";
  } catch {
    return "";
  }
}
function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  value.forEach((x) => binary += String.fromCharCode(x));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hashToken(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function isGoogleIdentity(user: any) {
  if (String(user?.app_metadata?.provider || "").toLowerCase() === "google") return true;
  return Array.isArray(user?.identities) && user.identities.some((x: any) => String(x?.provider || "").toLowerCase() === "google");
}
function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return null;
    if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return null;
    return url;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST" || (origin && !allowedOrigins.has(origin))) return reply(origin, { allowed: false, error: "Not allowed" }, 403);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !service) return reply(origin, { allowed: false, error: "Private authorization is unavailable" }, 503);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = bearer(req);
  if (!token) return reply(origin, { allowed: false, error: "Authenticate first" }, 401);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user: any = userData?.user;
  if (userError || !user) return reply(origin, { allowed: false, error: "Session could not be verified" }, 401);
  const sessionId = jwtSessionId(token);
  const { data: sessionActive } = sessionId ? await admin.rpc("ftn_owner_session_active", { p_session_id: sessionId, p_user_id: user.id }) : { data: false };
  if (!sessionId || sessionActive !== true) return reply(origin, { allowed: false, error: "Session is no longer active" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { return reply(origin, { allowed: false, error: "Invalid request" }, 400); }
  const action = clean(body.action, 80) || "authorize";
  const userAgent = clean(req.headers.get("user-agent"), 500);
  const audit = async (outcome: "ALLOWED" | "DENIED" | "PENDING", reasonCode: string, deviceId: string | null = null) => {
    await admin.from("ftn_owner_access_audit").insert({ user_id: user.id, device_id: deviceId, session_id: sessionId, action, outcome, reason_code: reasonCode, user_agent: userAgent });
  };

  const email = String(user.email || "").trim().toLowerCase();
  const { data: identity } = await admin.from("ftn_founder_identities").select("id,user_id,active,revoked_at").eq("approved_email", email).maybeSingle();
  if (!identity || !identity.active || identity.revoked_at || !isGoogleIdentity(user)) {
    await audit("DENIED", "IDENTITY_DENIED");
    return reply(origin, { allowed: false, error: "Private authorization denied" }, 403);
  }
  if (identity.user_id && identity.user_id !== user.id) {
    await audit("DENIED", "IMMUTABLE_ID_MISMATCH");
    return reply(origin, { allowed: false, error: "Private authorization denied" }, 403);
  }
  if (!identity.user_id) {
    const { data: bound, error: bindError } = await admin.from("ftn_founder_identities").update({ user_id: user.id, bound_at: new Date().toISOString() }).eq("id", identity.id).is("user_id", null).select("id").maybeSingle();
    if (bindError || !bound) {
      await audit("DENIED", "IDENTITY_BIND_RACE");
      return reply(origin, { allowed: false, error: "Private authorization denied" }, 403);
    }
    await admin.from("ftn_operator_roles").upsert({ user_id: user.id, role: "owner", granted_by: user.id, reason: "Exact approved Google founder identity bound server-side", revoked_at: null });
  }
  const { data: role } = await admin.from("ftn_operator_roles").select("role,revoked_at").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "owner" || role?.revoked_at) {
    await audit("DENIED", "OWNER_ROLE_DENIED");
    return reply(origin, { allowed: false, error: "Private authorization denied" }, 403);
  }

  const credential = clean(req.headers.get("x-ftn-device-credential"), 300);
  const findDevice = async () => {
    if (credential.length < 40) return null;
    const credentialHash = await hashToken(credential);
    const { data } = await admin.from("ftn_founder_devices").select("id,device_name,status,revoked_at").eq("founder_user_id", user.id).eq("credential_hash", credentialHash).maybeSingle();
    if (!data || data.status !== "ACTIVE" || data.revoked_at) return null;
    await admin.from("ftn_founder_devices").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).eq("status", "ACTIVE");
    return data;
  };

  if (action === "enroll-device") {
    const deviceName = clean(body.deviceName, 120);
    if (deviceName.length < 2) return reply(origin, { allowed: false, ownerIdentity: true, error: "Name this founder device" }, 422);
    const { count: allDeviceCount } = await admin.from("ftn_founder_devices").select("id", { count: "exact", head: true }).eq("founder_user_id", user.id);
    if ((allDeviceCount || 0) === 0) {
      const issuedCredential = randomToken();
      const { data: device, error } = await admin.from("ftn_founder_devices").insert({ founder_user_id: user.id, device_name: deviceName, status: "ACTIVE", credential_hash: await hashToken(issuedCredential), created_session_id: sessionId, approved_at: new Date().toISOString(), last_used_at: new Date().toISOString(), user_agent: userAgent }).select("id,device_name,status,created_at,last_used_at").single();
      if (error) return reply(origin, { allowed: false, ownerIdentity: true, error: "Founder device could not be enrolled" }, 500);
      await audit("ALLOWED", "FIRST_DEVICE_ENROLLED", device.id);
      return reply(origin, { allowed: true, device, deviceCredential: issuedCredential, firstDevice: true });
    }
    const claimToken = randomToken();
    const claimHash = await hashToken(claimToken);
    const { data: existing } = await admin.from("ftn_founder_devices").select("id").eq("founder_user_id", user.id).eq("created_session_id", sessionId).in("status", ["PENDING", "APPROVED_PENDING_CLAIM"]).maybeSingle();
    const result = existing
      ? await admin.from("ftn_founder_devices").update({ device_name: deviceName, status: "PENDING", claim_hash: claimHash, approved_by_device_id: null, approved_at: null, user_agent: userAgent }).eq("id", existing.id).select("id,device_name,status,created_at").single()
      : await admin.from("ftn_founder_devices").insert({ founder_user_id: user.id, device_name: deviceName, status: "PENDING", claim_hash: claimHash, created_session_id: sessionId, user_agent: userAgent }).select("id,device_name,status,created_at").single();
    if (result.error) return reply(origin, { allowed: false, ownerIdentity: true, error: "Device approval request could not be created" }, 500);
    await audit("PENDING", "DEVICE_APPROVAL_REQUIRED", result.data.id);
    return reply(origin, { allowed: false, ownerIdentity: true, deviceApprovalRequired: true, device: result.data, claimToken });
  }

  if (action === "claim-device") {
    const deviceId = clean(body.deviceId, 50), claimToken = clean(body.claimToken, 300);
    const { data: pending } = await admin.from("ftn_founder_devices").select("id,status,claim_hash,revoked_at").eq("id", deviceId).eq("founder_user_id", user.id).maybeSingle();
    if (!pending || pending.status !== "APPROVED_PENDING_CLAIM" || pending.revoked_at || !claimToken || await hashToken(claimToken) !== pending.claim_hash) {
      await audit("DENIED", "DEVICE_CLAIM_DENIED", pending?.id || null);
      return reply(origin, { allowed: false, ownerIdentity: true, deviceApprovalRequired: true, error: "Founder device approval is not ready" }, 403);
    }
    const issuedCredential = randomToken();
    const { data: device, error } = await admin.from("ftn_founder_devices").update({ status: "ACTIVE", credential_hash: await hashToken(issuedCredential), claim_hash: null, last_used_at: new Date().toISOString() }).eq("id", pending.id).eq("status", "APPROVED_PENDING_CLAIM").select("id,device_name,status,created_at,approved_at,last_used_at").single();
    if (error) return reply(origin, { allowed: false, ownerIdentity: true, error: "Founder device credential could not be issued" }, 500);
    await audit("ALLOWED", "DEVICE_CLAIMED", device.id);
    return reply(origin, { allowed: true, device, deviceCredential: issuedCredential });
  }

  const device = await findDevice();
  if (!device) {
    const { count: total } = await admin.from("ftn_founder_devices").select("id", { count: "exact", head: true }).eq("founder_user_id", user.id);
    await audit("DENIED", "DEVICE_CREDENTIAL_REQUIRED");
    return reply(origin, { allowed: false, ownerIdentity: true, deviceApprovalRequired: true, firstDevice: (total || 0) === 0, error: "Founder device approval required" }, 403);
  }

  await audit("ALLOWED", "AUTHORIZED_DEVICE", device.id);
  const journal = async (journalAction: string, target: string, previousState: unknown, requestedState: unknown, reason: string, dryRun = false) => {
    return await admin.from("ftn_control_journal").insert({ actor_id: user.id, action: journalAction, target, previous_state: previousState || {}, requested_state: requestedState || {}, reason, dry_run: dryRun, device_id: device.id, session_id: sessionId, user_agent: userAgent }).select("id").single();
  };
  const { data: current } = await admin.from("ftn_control_state").select("mode,reason,updated_at,version").eq("singleton", true).maybeSingle();

  if (action === "authorize") return reply(origin, { allowed: true, state: current?.mode || "normal", device: { id: device.id, name: device.device_name }, verifiedAt: new Date().toISOString() });

  if (action === "dashboard") {
    const [products, features, auditRows, controlJournal, devices, grants, sources, links, readiness, deployments, founderActions, providers, jobs, credits, affiliateClicks] = await Promise.all([
      admin.from("ftn_product_controls").select("*").order("product_id"),
      admin.from("ftn_feature_controls").select("*").order("product_id").order("feature_key"),
      admin.from("ftn_owner_access_audit").select("id,user_id,device_id,session_id,action,outcome,reason_code,created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("ftn_control_journal").select("id,actor_id,device_id,session_id,action,target,reason,dry_run,created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("ftn_founder_devices").select("id,device_name,status,created_at,approved_at,last_used_at,revoked_at").eq("founder_user_id", user.id).order("created_at", { ascending: false }),
      admin.from("ftn_user_access_grants").select("id,user_id,grant_key,expires_at,revoked_at,reason,created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("ftn_source_controls").select("*").order("product_id").order("name"),
      admin.from("ftn_external_link_health").select("*").order("checked_at", { ascending: false, nullsFirst: false }),
      admin.from("ftn_integration_readiness").select("*").order("product_id").order("integration_id"),
      admin.from("ftn_deployment_health").select("*").order("checked_at", { ascending: false }).limit(30),
      admin.from("ftn_founder_actions").select("*").order("status").order("area").order("title"),
      admin.from("ftn_ai_providers").select("provider_id,name,categories,integration_type,api_status,affiliate_status,customer_credit_cost,provider_cost_microusd,enabled,generation_enabled,last_verified").order("name"),
      admin.from("ftn_ai_jobs").select("id,provider_id,capability,status,reserved_credits,quoted_provider_cost_microusd,actual_provider_cost_microusd,created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("ftn_ai_credit_ledger").select("entry_type,amount,created_at").order("created_at", { ascending: false }).limit(200),
      admin.from("ftn_ai_affiliate_clicks").select("provider_id,campaign,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    return reply(origin, { allowed: true, state: current || { mode: "normal" }, products: products.data || [], features: features.data || [], audit: auditRows.data || [], journal: controlJournal.data || [], devices: devices.data || [], accessGrants: grants.data || [], sources: sources.data || [], linkHealth: links.data || [], readiness: readiness.data || [], deployments: deployments.data || [], founderActions: founderActions.data || [], creative: { providers: providers.data || [], jobs: jobs.data || [], creditLedger: credits.data || [], affiliateClicks: affiliateClicks.data || [], generationGloballyEnabled: Deno.env.get("FTN_CREATIVE_GENERATION_ENABLED") === "true" } });
  }

  if (action === "approve-device") {
    const targetId = clean(body.deviceId, 50);
    const { data: before } = await admin.from("ftn_founder_devices").select("id,device_name,status").eq("id", targetId).eq("founder_user_id", user.id).maybeSingle();
    if (!before || before.status !== "PENDING") return reply(origin, { allowed: true, error: "Pending founder device not found" }, 404);
    const { error } = await admin.from("ftn_founder_devices").update({ status: "APPROVED_PENDING_CLAIM", approved_at: new Date().toISOString(), approved_by_device_id: device.id }).eq("id", targetId).eq("status", "PENDING");
    if (error) return reply(origin, { allowed: true, error: "Device approval was not recorded" }, 500);
    const logged = await journal("approve-device", targetId, before, { status: "APPROVED_PENDING_CLAIM" }, clean(body.reason, 1000) || "Approved from an enrolled founder device");
    return reply(origin, { allowed: true, deviceId: targetId, status: "APPROVED_PENDING_CLAIM", journalId: logged.data?.id || null });
  }

  if (action === "revoke-device") {
    const targetId = clean(body.deviceId, 50), reason = clean(body.reason, 1000);
    if (reason.length < 8) return reply(origin, { allowed: true, error: "A meaningful revocation reason is required" }, 422);
    const { data: before } = await admin.from("ftn_founder_devices").select("id,device_name,status").eq("id", targetId).eq("founder_user_id", user.id).maybeSingle();
    if (!before || before.status === "REVOKED") return reply(origin, { allowed: true, error: "Active founder device not found" }, 404);
    const { error } = await admin.from("ftn_founder_devices").update({ status: "REVOKED", credential_hash: null, claim_hash: null, revoked_at: new Date().toISOString(), revoked_by_device_id: device.id }).eq("id", targetId);
    if (error) return reply(origin, { allowed: true, error: "Device was not revoked" }, 500);
    const logged = await journal("revoke-device", targetId, before, { status: "REVOKED" }, reason);
    return reply(origin, { allowed: true, deviceId: targetId, currentDeviceRevoked: targetId === device.id, journalId: logged.data?.id || null });
  }

  if (action === "emergency") {
    const mode = clean(body.mode, 20), reason = clean(body.reason, 1000), dryRun = body.dryRun !== false;
    if (!["pause", "lockdown", "nuclear", "normal"].includes(mode) || reason.length < 8) return reply(origin, { allowed: true, error: "Mode and a meaningful reason are required" }, 422);
    if (!dryRun && Deno.env.get("FTN_EMERGENCY_CONTROLS_ENABLED") !== "true") return reply(origin, { allowed: true, error: "Production emergency mutations are disabled; run a dry simulation" }, 409);
    const requested = { mode, reason, requestedAt: new Date().toISOString() };
    if (!dryRun) {
      const { error } = await admin.from("ftn_control_state").update({ mode, reason, updated_by: user.id, updated_at: new Date().toISOString(), version: (current?.version || 0) + 1 }).eq("singleton", true);
      if (error) return reply(origin, { allowed: true, error: "Control state was not changed" }, 500);
    }
    const logged = await journal("emergency", "platform", current || {}, requested, reason, dryRun);
    if (logged.error) return reply(origin, { allowed: true, error: "Control journal failed; no success claimed" }, 500);
    return reply(origin, { allowed: true, state: dryRun ? (current?.mode || "normal") : mode, simulated: dryRun, journalId: logged.data.id });
  }

  if (action === "product-control") {
    const productId = clean(body.productId, 80), reason = clean(body.reason, 1000);
    const requested = { name: clean(body.name, 200) || null, enabled: body.enabled !== false, status: clean(body.status, 40), route: clean(body.route, 300) || null, parent_product: clean(body.parentProduct, 80) || null, public_visibility: body.publicVisibility !== false, routing_priority: Number(body.routingPriority || 100), usage_limit: body.usageLimit && typeof body.usageLimit === "object" ? body.usageLimit : {} };
    if (!/^[a-z0-9-]{2,80}$/.test(productId) || !statuses.includes(requested.status) || reason.length < 8) return reply(origin, { allowed: true, error: "Valid product state and reason required" }, 422);
    const { data: before } = await admin.from("ftn_product_controls").select("*").eq("product_id", productId).maybeSingle();
    const { error } = await admin.from("ftn_product_controls").upsert({ product_id: productId, ...requested, reason, updated_by: user.id, updated_at: new Date().toISOString() });
    if (error) return reply(origin, { allowed: true, error: "Product control was not changed" }, 500);
    const logged = await journal("product-control", productId, before || {}, requested, reason);
    return reply(origin, { allowed: true, productId, state: requested, journalId: logged.data?.id || null });
  }

  if (action === "feature-control") {
    const featureKey = clean(body.featureKey, 120), productId = clean(body.productId, 80), reason = clean(body.reason, 1000), visibility = clean(body.visibility, 30);
    const requested = { product_id: productId, enabled: body.enabled === true, visibility, expires_at: clean(body.expiresAt, 50) || null, reason, updated_by: user.id, updated_at: new Date().toISOString() };
    if (!/^[a-z0-9][a-z0-9.-]{1,119}$/.test(featureKey) || !/^[a-z0-9-]{2,80}$/.test(productId) || !["PUBLIC", "AUTHENTICATED", "PRIVATE"].includes(visibility) || reason.length < 8) return reply(origin, { allowed: true, error: "Valid feature control and reason required" }, 422);
    const { data: before } = await admin.from("ftn_feature_controls").select("*").eq("feature_key", featureKey).maybeSingle();
    const { error } = await admin.from("ftn_feature_controls").upsert({ feature_key: featureKey, ...requested });
    if (error) return reply(origin, { allowed: true, error: "Feature control was not changed" }, 500);
    const logged = await journal("feature-control", featureKey, before || {}, requested, reason);
    return reply(origin, { allowed: true, featureKey, journalId: logged.data?.id || null });
  }

  if (action === "source-control") {
    const sourceId = clean(body.sourceId, 120), reason = clean(body.reason, 1000);
    const sourceUrl = safeExternalUrl(clean(body.officialUrl, 1000));
    const requested = { product_id: clean(body.productId, 80), name: clean(body.name, 200), official_url: sourceUrl?.toString(), source_type: clean(body.sourceType, 60) || "official", confidence: clean(body.confidence, 40) || "VERIFIED OFFICIAL", availability_state: clean(body.availabilityState, 40) || "PUBLISHED", enabled: body.enabled !== false, last_verified: clean(body.lastVerified, 20) || null, notes: clean(body.notes, 1000) || null };
    if (!/^[a-z0-9][a-z0-9-]{1,119}$/.test(sourceId) || !requested.product_id || !requested.name || !requested.official_url || reason.length < 8) return reply(origin, { allowed: true, error: "Valid official source and reason required" }, 422);
    const { data: before } = await admin.from("ftn_source_controls").select("*").eq("source_id", sourceId).maybeSingle();
    const { error } = await admin.from("ftn_source_controls").upsert({ source_id: sourceId, ...requested, updated_by: user.id, updated_at: new Date().toISOString() });
    if (error) return reply(origin, { allowed: true, error: "Source control was not changed" }, 500);
    const logged = await journal("source-control", sourceId, before || {}, requested, reason);
    return reply(origin, { allowed: true, sourceId, journalId: logged.data?.id || null });
  }

  if (action === "check-link") {
    const sourceId = clean(body.sourceId, 120);
    const { data: source } = await admin.from("ftn_source_controls").select("official_url").eq("source_id", sourceId).maybeSingle();
    const sourceUrl = safeExternalUrl(source?.official_url || "");
    if (!sourceUrl) return reply(origin, { allowed: true, error: "Verified source not found" }, 404);
    let health = { source_id: sourceId, http_status: null as number | null, health_state: "BLOCKED", checked_at: new Date().toISOString(), final_url: sourceUrl.toString(), detail: "Request failed safely" };
    try {
      const response = await fetch(sourceUrl, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "user-agent": "FTN-Source-Health/1.0 (+https://ftnplatform.org/trust/)" } });
      health = { ...health, http_status: response.status, health_state: response.status >= 200 && response.status < 300 ? "HEALTHY" : response.status >= 300 && response.status < 400 ? "REDIRECTED" : response.status === 401 || response.status === 403 || response.status === 405 || response.status === 429 ? "BLOCKED" : "DEAD", detail: "Server-side HEAD check; redirects are not followed" };
    } catch (error) { health.detail = clean(error instanceof Error ? error.message : "Request failed", 300); }
    const { error } = await admin.from("ftn_external_link_health").upsert(health);
    if (error) return reply(origin, { allowed: true, error: "Link health was not recorded" }, 500);
    await journal("check-link", sourceId, {}, health, "Founder requested a bounded external-link health check");
    return reply(origin, { allowed: true, health });
  }

  if (action === "access-grant") {
    const targetUserId = clean(body.userId, 50), grantKey = clean(body.grantKey, 120), reason = clean(body.reason, 1000), expiresAt = clean(body.expiresAt, 50) || null;
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId) || grantKey.length < 2 || reason.length < 8) return reply(origin, { allowed: true, error: "Valid user, grant and reason required" }, 422);
    const requested = { user_id: targetUserId, grant_key: grantKey, expires_at: expiresAt, revoked_at: null, reason, granted_by: user.id };
    const { data: before } = await admin.from("ftn_user_access_grants").select("*").eq("user_id", targetUserId).eq("grant_key", grantKey).maybeSingle();
    const { error } = await admin.from("ftn_user_access_grants").upsert(requested, { onConflict: "user_id,grant_key" });
    if (error) return reply(origin, { allowed: true, error: "Access grant was not changed" }, 500);
    const logged = await journal("access-grant", grantKey, before || {}, requested, reason);
    return reply(origin, { allowed: true, grantKey, journalId: logged.data?.id || null });
  }

  if (action === "revoke-grant") {
    const grantId = clean(body.grantId, 50), reason = clean(body.reason, 1000);
    if (!/^[0-9a-f-]{36}$/i.test(grantId) || reason.length < 8) return reply(origin, { allowed: true, error: "Valid grant and reason required" }, 422);
    const { data: before } = await admin.from("ftn_user_access_grants").select("*").eq("id", grantId).maybeSingle();
    if (!before) return reply(origin, { allowed: true, error: "Access grant not found" }, 404);
    const { error } = await admin.from("ftn_user_access_grants").update({ revoked_at: new Date().toISOString(), reason }).eq("id", grantId);
    if (error) return reply(origin, { allowed: true, error: "Access grant was not revoked" }, 500);
    const logged = await journal("revoke-grant", grantId, before, { revoked_at: new Date().toISOString() }, reason);
    return reply(origin, { allowed: true, grantId, journalId: logged.data?.id || null });
  }

  if (action === "integration-control") {
    const integrationId = clean(body.integrationId, 120), productId = clean(body.productId, 80), readiness = clean(body.readiness, 30), summary = clean(body.publicSummary, 500), reason = clean(body.reason, 1000);
    if (!/^[a-z0-9][a-z0-9.-]{1,119}$/.test(integrationId) || !productId || !["READY", "LIMITED", "NOT READY", "OWNER ACTION"].includes(readiness) || !summary || reason.length < 8) return reply(origin, { allowed: true, error: "Valid integration readiness and reason required" }, 422);
    const { data: before } = await admin.from("ftn_integration_readiness").select("*").eq("integration_id", integrationId).maybeSingle();
    const requested = { product_id: productId, readiness, public_summary: summary, private_note: clean(body.privateNote, 1000) || null, last_verified: new Date().toISOString(), updated_by: user.id, updated_at: new Date().toISOString() };
    const { error } = await admin.from("ftn_integration_readiness").upsert({ integration_id: integrationId, ...requested });
    if (error) return reply(origin, { allowed: true, error: "Integration readiness was not changed" }, 500);
    const logged = await journal("integration-control", integrationId, before || {}, requested, reason);
    return reply(origin, { allowed: true, integrationId, journalId: logged.data?.id || null });
  }

  if (action === "founder-action") {
    const actionId = clean(body.actionId, 120), status = clean(body.status, 30), reason = clean(body.reason, 1000);
    if (!/^[a-z0-9][a-z0-9.-]{1,119}$/.test(actionId) || !["PENDING", "APPROVED", "COMPLETE", "DEFERRED"].includes(status) || reason.length < 8) return reply(origin, { allowed: true, error: "Valid founder action, state and reason required" }, 422);
    const { data: before } = await admin.from("ftn_founder_actions").select("*").eq("action_id", actionId).maybeSingle();
    if (!before) return reply(origin, { allowed: true, error: "Founder action not found" }, 404);
    const requested = { status, notes: clean(body.notes, 1000) || before.notes || null, updated_by: user.id, updated_at: new Date().toISOString() };
    const { error } = await admin.from("ftn_founder_actions").update(requested).eq("action_id", actionId);
    if (error) return reply(origin, { allowed: true, error: "Founder action was not changed" }, 500);
    const logged = await journal("founder-action", actionId, before, requested, reason);
    return reply(origin, { allowed: true, actionId, journalId: logged.data?.id || null });
  }

  if (action === "deployment-health") {
    const reason = clean(body.reason, 1000), environment = clean(body.environment, 50), deploymentState = clean(body.deploymentState, 30), functionalState = clean(body.functionalState, 30), commitSha = clean(body.commitSha, 40) || null;
    if (!environment || !["QUEUED", "RUNNING", "HEALTHY", "FAILED", "UNKNOWN"].includes(deploymentState) || !["PASS", "FAIL", "RUNNING", "UNKNOWN"].includes(functionalState) || (commitSha && !/^[0-9a-f]{7,40}$/.test(commitSha)) || reason.length < 8) return reply(origin, { allowed: true, error: "Valid deployment state and reason required" }, 422);
    const requested = { environment, commit_sha: commitSha, deployment_state: deploymentState, functional_state: functionalState, workflow_url: safeExternalUrl(clean(body.workflowUrl, 1000))?.toString() || null, detail: body.detail && typeof body.detail === "object" ? body.detail : {} };
    const { data: record, error } = await admin.from("ftn_deployment_health").insert(requested).select("id").single();
    if (error) return reply(origin, { allowed: true, error: "Deployment health was not recorded" }, 500);
    const logged = await journal("deployment-health", environment, {}, requested, reason);
    return reply(origin, { allowed: true, deploymentId: record.id, journalId: logged.data?.id || null });
  }

  return reply(origin, { allowed: true, error: "Unknown owner action" }, 400);
});
