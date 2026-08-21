// FTN Platform — ibis provider eligibility engine (Phase 2 of the provider-fabric directive).
//
// A pure, deterministic layer between "what capability does this task need" and "which provider
// may IBIS actually call." Reads js/ibis-provider-registry.js; does not call any network endpoint
// itself. Fails closed: if a provider's state can't be positively confirmed eligible, it is not
// eligible. Health data is real and observed (via recordOutcome), never a hand-typed score --
// every provider starts with an empty health record and earns its numbers from actual calls.
(function (global) {
  'use strict';

  var STATUS = {
    ELIGIBLE: 'ELIGIBLE',
    INELIGIBLE: 'INELIGIBLE',
    USER_AUTH_REQUIRED: 'USER_AUTH_REQUIRED',
    TEMPORARILY_UNAVAILABLE: 'TEMPORARILY_UNAVAILABLE',
    UNKNOWN: 'UNKNOWN',
  };

  // Cost classifications that may NEVER be selected automatically. ZERO_CUSTOMER_FUNDED is real
  // $0 to IBIS (the customer's own prepaid credits pay). The two PAID_BY_IBIS_* values are
  // pre-existing/founder-approved exceptions already live in this codebase (ibis-query,
  // ibis-assistant) -- they stay eligible when explicitly enabled, but are never treated as
  // interchangeable with a genuinely zero-cost route, and a *new* provider can't earn this status
  // just by being enabled; it has to already carry one of these two labeled exceptions.
  var COST_INELIGIBLE = ['WOULD_REQUIRE_IBIS_COMPUTE_SPEND', 'NOT_APPLICABLE_LICENSE_BLOCKS_USE', 'UNVERIFIED'];
  var COST_ALLOWED = ['ZERO_CUSTOMER_FUNDED', 'PAID_BY_IBIS_PRE_EXISTING', 'PAID_BY_IBIS_FOUNDER_APPROVED'];

  var ERROR_TYPES = ['TIMEOUT', 'RATE_LIMIT', 'QUOTA', 'AUTH_FAILURE', 'SERVER_ERROR',
    'INVALID_REQUEST', 'UNSUPPORTED', 'GEOGRAPHIC_RESTRICTION', 'CONTENT_RESTRICTION', 'OUTPUT_FAILURE'];

  // In-memory only, per page load / per Deno isolate -- a persistent cross-session health store
  // would need a Supabase table, which is out of scope for this pass. Documented as a real
  // limitation in IBIS-MAP.md rather than silently pretended away.
  var health = Object.create(null);
  function healthFor(id) {
    if (!health[id]) health[id] = { successes: 0, failures: 0, lastSuccessAt: null, lastFailureAt: null, recentOutcomes: [] };
    return health[id];
  }

  function recordOutcome(providerId, outcome) {
    var h = healthFor(providerId);
    var now = new Date().toISOString();
    var ok = !!(outcome && outcome.success);
    if (ok) { h.successes += 1; h.lastSuccessAt = now; }
    else { h.failures += 1; h.lastFailureAt = now; }
    h.recentOutcomes.push({ success: ok, at: now, errorType: (outcome && outcome.errorType) || null, latencyMs: (outcome && outcome.latencyMs) || null });
    if (h.recentOutcomes.length > 20) h.recentOutcomes.shift();
    return getHealth(providerId);
  }

  function getHealth(providerId) {
    var h = healthFor(providerId);
    return {
      successes: h.successes,
      failures: h.failures,
      lastSuccessAt: h.lastSuccessAt,
      lastFailureAt: h.lastFailureAt,
      recentOutcomes: h.recentOutcomes.slice(),
    };
  }

  // Degraded, not dead: the last 3 observed outcomes (if we have at least 3) were all failures.
  // A brand-new provider with no history is not "degraded" -- absence of data is UNKNOWN territory
  // handled by evaluate(), not a health verdict.
  function isDegraded(providerId) {
    var h = healthFor(providerId);
    if (h.recentOutcomes.length < 3) return false;
    var last3 = h.recentOutcomes.slice(-3);
    return last3.every(function (o) { return !o.success; });
  }

  function registry() {
    return (global.FTN && global.FTN.IbisProviders) || null;
  }

  // context: { authenticated: boolean }
  function evaluate(providerId, capability, context) {
    context = context || {};
    var reg = registry();
    if (!reg) return { status: STATUS.UNKNOWN, reason: 'Provider registry not loaded.' };
    var p = reg.get(providerId);
    if (!p) return { status: STATUS.UNKNOWN, reason: 'No provider record for "' + providerId + '".' };
    if (capability && (p.capabilities || []).indexOf(capability) === -1) {
      return { status: STATUS.INELIGIBLE, reason: p.name + ' does not declare capability ' + capability + '.' };
    }
    if (!p.enabled) {
      return { status: STATUS.INELIGIBLE, reason: p.name + ' is not enabled.' };
    }
    if (COST_INELIGIBLE.indexOf(p.costToIbis) !== -1) {
      return { status: STATUS.INELIGIBLE, reason: p.name + ' costToIbis (' + p.costToIbis + ') is not an automatically eligible route.' };
    }
    if (COST_ALLOWED.indexOf(p.costToIbis) === -1) {
      // Any cost classification we don't explicitly recognize is UNKNOWN, not eligible --
      // fail closed rather than assume a new/misspelled value is safe.
      return { status: STATUS.UNKNOWN, reason: p.name + ' has an unrecognized costToIbis value.' };
    }
    if (p.userAuthorizationRequired && !context.authenticated) {
      return { status: STATUS.USER_AUTH_REQUIRED, reason: p.name + ' requires the user to be signed in.' };
    }
    if (p.apiStatus === 'PENDING_DEPLOYMENT') {
      return { status: STATUS.TEMPORARILY_UNAVAILABLE, reason: p.name + ' is not deployed yet.' };
    }
    if (isDegraded(providerId)) {
      return { status: STATUS.TEMPORARILY_UNAVAILABLE, reason: p.name + '’s last 3 observed calls all failed.' };
    }
    return { status: STATUS.ELIGIBLE, reason: null };
  }

  // Real, simple ranking: eligible providers only, most-successful-first by observed health,
  // ties broken by registry order. No fabricated quality/latency scores.
  function find(capability, context) {
    var reg = registry();
    if (!reg) return [];
    return reg.byCapability(capability)
      .map(function (p) { return { provider: p, evaluation: evaluate(p.id, capability, context) }; })
      .filter(function (r) { return r.evaluation.status === STATUS.ELIGIBLE; })
      .sort(function (a, b) {
        var ha = healthFor(a.provider.id), hb = healthFor(b.provider.id);
        return (hb.successes - hb.failures) - (ha.successes - ha.failures);
      });
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisEligibility = {
    STATUS: STATUS,
    ERROR_TYPES: ERROR_TYPES,
    evaluate: evaluate,
    find: find,
    recordOutcome: recordOutcome,
    getHealth: getHealth,
  };
})(window);
