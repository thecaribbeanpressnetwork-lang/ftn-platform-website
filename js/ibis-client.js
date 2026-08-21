// FTN Platform — the IBIS Client (Phase 5). The one door every FTN web node calls through to
// reach IBIS: permission boundary -> capability recognition -> eligibility/routing -> execution ->
// provenance. This module does not reimplement any of that logic -- it composes the modules that
// already do (js/ftn-node-registry.js, js/ibis-capability-taxonomy.js, js/ibis-eligibility.js,
// js/ibis-provider-registry.js), so a node never has to know a provider's implementation details,
// only ask for a capability. "No duplicate AI brains": js/ibis-widget.js is refactored in this
// same pass to call THROUGH this module instead of maintaining its own copy of the TEXT-calling
// logic -- the first real consumer of the universal fabric is the fabric's own oldest customer.
(function (global) {
  'use strict';

  var PUBLISHABLE_KEY = 'sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  // Provider id -> Supabase function endpoint, for TEXT providers callable via a plain guest
  // fetch. This is the same map js/ibis-widget.js used to own directly -- centralized here so any
  // future node gets the same real routes without re-implementing the call.
  var TEXT_PROVIDER_ENDPOINTS = {
    'ibis-assistant-anthropic': 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-assistant',
    'cloudflare-workers-ai-text': 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-text-cloudflare',
  };

  function registries() {
    var FTN = global.FTN || {};
    return {
      Nodes: FTN.NodeRegistry || null,
      Taxonomy: FTN.CapabilityTaxonomy || null,
      Eligibility: FTN.IbisEligibility || null,
      Providers: FTN.IbisProviders || null,
      AudioAnalysis: FTN.IbisAudioAnalysis || null,
    };
  }

  function blocked(code, reason, extra) {
    return Object.assign({ success: false, blocked: true, code: code, reason: reason }, extra || {});
  }

  // Real, working default execution for the two capabilities that actually have a live route
  // today (TEXT via the two guest-accessible Supabase functions, BPM_DETECTION via the local DSP
  // module). Anything else has no default -- a caller must supply its own `executor`, and if none
  // is supplied this module reports what's eligible without pretending to execute it.
  function callTextProvider(provider, payload) {
    var url = TEXT_PROVIDER_ENDPOINTS[provider.id];
    if (!url) return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    var startedAt = Date.now();
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: PUBLISHABLE_KEY, authorization: 'Bearer ' + PUBLISHABLE_KEY },
      body: JSON.stringify({ messages: (payload && payload.messages) || [], products: (payload && payload.products) || [] }),
    })
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (result) {
        var latencyMs = Date.now() - startedAt;
        if (!result.ok || !result.body || !result.body.answer) return { success: false, latencyMs: latencyMs, errorType: 'SERVER_ERROR' };
        return { success: true, latencyMs: latencyMs, data: { answer: result.body.answer, provider: result.body.provider } };
      })
      .catch(function () { return { success: false, latencyMs: Date.now() - startedAt, errorType: 'TIMEOUT' }; });
  }

  // BPM_DETECTION's real executor: no network call at all, just the local DSP module. Requires
  // js/ibis-audio-analysis.js to already be loaded (or provided synchronously by the caller) --
  // this module does not lazy-load it itself to stay dependency-light and synchronously testable
  // in plain Node via vm, matching every sibling module's own testing pattern.
  function callLocalDsp(provider, payload) {
    var reg = registries();
    if (provider.id !== 'ibis-local-dsp' || !reg.AudioAnalysis) return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    var samples = payload && payload.samples;
    var sampleRate = payload && payload.sampleRate;
    var startedAt = Date.now();
    var result = reg.AudioAnalysis.estimateBpm(samples, sampleRate, payload && payload.options);
    var latencyMs = Date.now() - startedAt;
    if (result.bpm === null) return Promise.resolve({ success: false, latencyMs: latencyMs, errorType: 'INVALID_REQUEST', errorDetail: result.reason });
    return Promise.resolve({ success: true, latencyMs: latencyMs, data: result });
  }

  function defaultExecutorFor(capability, payload) {
    return function (provider) {
      if (capability === 'TEXT' && TEXT_PROVIDER_ENDPOINTS[provider.id]) return callTextProvider(provider, payload);
      if (capability === 'BPM_DETECTION' && provider.id === 'ibis-local-dsp') return callLocalDsp(provider, payload);
      return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    };
  }

  // The one entry point every FTN node calls. spec:
  //   nodeId       - a real id from js/ftn-node-registry.js (optional -- omit for a request that
  //                  isn't attributable to a specific node, e.g. a sitewide widget with no page
  //                  context yet)
  //   capability   - a capability string (canonical or documented legacy alias)
  //   context      - passed through to eligibility evaluation (e.g. {authenticated})
  //   payload      - passed through to the executor (message history, audio samples, etc.)
  //   executor     - optional; if supplied, used instead of the built-in default. Must follow the
  //                  same contract as js/ibis-eligibility.js's attemptInOrder(): resolve to
  //                  {success, latencyMs, errorType, data}, never throw for an ordinary failure.
  function request(spec) {
    spec = spec || {};
    var reg = registries();
    var nodeId = spec.nodeId || null;
    var capability = spec.capability;
    var context = spec.context || {};

    if (nodeId) {
      if (!reg.Nodes) return Promise.resolve(blocked('REGISTRY_NOT_LOADED', 'js/ftn-node-registry.js is not loaded.'));
      var node = reg.Nodes.get(nodeId);
      if (!node) return Promise.resolve(blocked('UNKNOWN_NODE', 'Node "' + nodeId + '" is not registered.', { nodeId: nodeId }));
      if (node.IBISRole === 'EXCLUDED_SEPARATE_APPLICATION') {
        return Promise.resolve(blocked('NODE_EXCLUDED', node.excludedReason || 'This node is excluded from IBIS by explicit policy.', { nodeId: nodeId }));
      }
      if (!node.canCallIbisCapabilities) {
        return Promise.resolve(blocked('NODE_NOT_AUTHORIZED', 'This node is not authorized to call IBIS capabilities (private/vaulted).', { nodeId: nodeId }));
      }
    }

    if (!reg.Taxonomy) return Promise.resolve(blocked('REGISTRY_NOT_LOADED', 'js/ibis-capability-taxonomy.js is not loaded.'));
    if (!capability || !reg.Taxonomy.isRecognized(capability)) {
      return Promise.resolve(blocked('UNKNOWN_CAPABILITY', 'Capability "' + capability + '" is not recognized (not canonical or a documented legacy alias).', { nodeId: nodeId, capability: capability }));
    }

    if (!reg.Eligibility) return Promise.resolve(blocked('REGISTRY_NOT_LOADED', 'js/ibis-eligibility.js is not loaded.'));

    var executor = spec.executor || defaultExecutorFor(capability, spec.payload);
    var requestedAt = new Date().toISOString();

    return reg.Eligibility.attemptInOrder(capability, context, executor).then(function (outcome) {
      var provenance = {
        nodeId: nodeId,
        capability: capability,
        requestedAt: requestedAt,
        respondedAt: new Date().toISOString(),
        attempts: outcome.attempts.map(function (a) { return { providerId: a.providerId, success: a.success, errorType: a.errorType }; }),
      };
      if (outcome.success) {
        var providerRecord = reg.Providers ? reg.Providers.get(outcome.provider.id) : null;
        provenance.provider = outcome.provider.id;
        provenance.costToIbis = providerRecord ? providerRecord.costToIbis : outcome.provider.costToIbis;
        return { success: true, blocked: false, result: outcome.result, provenance: provenance };
      }
      return blocked(
        outcome.attempts.length ? 'ALL_PROVIDERS_FAILED' : 'NO_ELIGIBLE_PROVIDER',
        outcome.reason || 'No eligible provider for capability ' + capability + '.',
        { nodeId: nodeId, capability: capability, provenance: provenance }
      );
    });
  }

  // Real-data-only description of what a node may reach through IBIS today -- for UI/diagnostic
  // use, never a claim that a capability will succeed (eligibility can change call to call as
  // health data accumulates; this is a snapshot, not a guarantee).
  function describeNode(nodeId, context) {
    var reg = registries();
    if (!reg.Nodes) return null;
    var node = reg.Nodes.get(nodeId);
    if (!node) return null;
    var eligibleCapabilities = [];
    if (node.canCallIbisCapabilities && reg.Eligibility && reg.Providers) {
      var seen = Object.create(null);
      reg.Providers.all().forEach(function (p) {
        (p.capabilities || []).forEach(function (cap) {
          if (seen[cap]) return;
          seen[cap] = true;
          var ranked = reg.Eligibility.find(cap, context || {});
          if (ranked.length) eligibleCapabilities.push(cap);
        });
      });
    }
    return {
      nodeId: node.id,
      name: node.name,
      canCallIbisCapabilities: node.canCallIbisCapabilities,
      canIbisRouteInto: node.canIbisRouteInto,
      excludedReason: node.excludedReason,
      eligibleCapabilitiesNow: eligibleCapabilities,
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisClient = { request: request, describeNode: describeNode, defaultExecutorFor: defaultExecutorFor };
})(typeof window !== 'undefined' ? window : globalThis);
