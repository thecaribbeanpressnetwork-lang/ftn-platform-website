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
      RuntimeEstimator: FTN.IbisRuntimeEstimator || null,
      ProjectQC: FTN.IbisProjectQC || null,
      MusicEngine: FTN.IbisMusicEngine || null,
      SfxEngine: FTN.IbisSfxEngine || null,
      Auth: FTN.Auth || null,
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
    // Two real callers use two different payload shapes: js/ibis-widget.js sends a message
    // history, js/ftnscreen-screenwriter.js (and any future single-prompt caller) sends
    // {prompt}. Normalize the latter into a one-message array so either shape reaches the
    // function correctly -- silently dropping payload.prompt here would send an empty
    // conversation to a real provider once ibis-assistant/ibis-text-cloudflare are deployed.
    var messages = (payload && payload.messages) || (payload && payload.prompt ? [{ role: 'user', content: payload.prompt }] : []);
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: PUBLISHABLE_KEY, authorization: 'Bearer ' + PUBLISHABLE_KEY },
      body: JSON.stringify({ messages: messages, products: (payload && payload.products) || [] }),
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

  // ibis-query-gemini's real call shape (js/ftn-auth.js's invoke() -> Supabase's own
  // functions.invoke(), authenticated) differs from the guest TEXT_PROVIDER_ENDPOINTS map above --
  // a single {country, prompt} body, not a message-history array. This closes a gap explicitly
  // flagged and deferred in Phase 4 (IBIS Client had no default executor for the one TEXT provider
  // that's actually enabled today). Requires a real signed-in browser session to execute for
  // real -- js/ftn-auth.js must be loaded and the user authenticated, neither of which this
  // repository's Node-based test tooling can provide, so this path is code-reviewed and
  // structurally tested (a mocked Auth.invoke proving the request/response shape is handled
  // correctly), never claimed as a live-verified execution. See IBIS-MAP.md Sec 0.13.
  function callGeminiQuery(provider, payload) {
    var reg = registries();
    if (!reg.Auth || typeof reg.Auth.invoke !== 'function') return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    var prompt = (payload && payload.prompt) || flattenMessages(payload && payload.messages);
    if (!prompt) return Promise.resolve({ success: false, errorType: 'INVALID_REQUEST' });
    var startedAt = Date.now();
    return reg.Auth.invoke('ibis-query', { country: (payload && payload.country) || 'Caribbean', prompt: prompt })
      .then(function (data) {
        var latencyMs = Date.now() - startedAt;
        if (!data || !data.answer) return { success: false, latencyMs: latencyMs, errorType: 'SERVER_ERROR' };
        return { success: true, latencyMs: latencyMs, data: { answer: data.answer, provider: 'ibis-query (Google Gemini)' } };
      })
      .catch(function (err) {
        var errorType = err && /auth|sign.?in/i.test(String(err.message || '')) ? 'AUTH_FAILURE' : 'SERVER_ERROR';
        return { success: false, latencyMs: Date.now() - startedAt, errorType: errorType };
      });
  }

  // Message-history payloads (widget/Screenwriter shape) flattened into a single prompt for
  // providers that only accept one, so callers don't need to know which shape a given provider
  // wants.
  function flattenMessages(messages) {
    if (!Array.isArray(messages) || !messages.length) return null;
    return messages.map(function (m) { return (m.role === 'assistant' ? 'ibis: ' : 'User: ') + m.content; }).join('\n');
  }

  function callRuntimeEstimator(provider, payload) {
    var reg = registries();
    if (provider.id !== 'ibis-local-script-runtime-estimator' || !reg.RuntimeEstimator) return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    var text = payload && payload.text;
    var startedAt = Date.now();
    var result = reg.RuntimeEstimator.estimateRuntime(text, payload && payload.options);
    var latencyMs = Date.now() - startedAt;
    if (result.minutes === null) return Promise.resolve({ success: false, latencyMs: latencyMs, errorType: 'INVALID_REQUEST', errorDetail: result.reason });
    return Promise.resolve({ success: true, latencyMs: latencyMs, data: result });
  }

  function callProjectQC(provider, payload) {
    var reg = registries();
    if (provider.id !== 'ibis-local-project-qc' || !reg.ProjectQC) return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    var project = payload && payload.project;
    if (!project) return Promise.resolve({ success: false, errorType: 'INVALID_REQUEST' });
    var startedAt = Date.now();
    var result = reg.ProjectQC.run(project);
    return Promise.resolve({ success: true, latencyMs: Date.now() - startedAt, data: result });
  }

  // Phase 7: real, local, zero-cost procedural synthesis -- no network call, same standard as
  // ibis-local-dsp/ibis-local-script-runtime-estimator/ibis-local-project-qc.
  function callMusicEngine(provider, payload) {
    var reg = registries();
    if (provider.id !== 'ibis-local-music-engine' || !reg.MusicEngine) return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    var startedAt = Date.now();
    try {
      var result = reg.MusicEngine.renderInstrumental(payload || {});
      var wav = reg.MusicEngine.encodeWav(result);
      return Promise.resolve({ success: true, latencyMs: Date.now() - startedAt, data: { audio: wav, style: result.style, bpm: result.bpm, key: result.key, bars: result.bars, durationSeconds: result.durationSeconds, mimeType: 'audio/wav' } });
    } catch (err) {
      return Promise.resolve({ success: false, latencyMs: Date.now() - startedAt, errorType: 'SERVER_ERROR', errorDetail: err && err.message });
    }
  }

  function callSfxEngine(provider, payload) {
    var reg = registries();
    if (provider.id !== 'ibis-local-sfx-engine' || !reg.SfxEngine) return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    var startedAt = Date.now();
    try {
      var result = reg.SfxEngine.renderSfx(payload || {});
      var wav = reg.SfxEngine.encodeWav(result);
      return Promise.resolve({ success: true, latencyMs: Date.now() - startedAt, data: { audio: wav, preset: result.preset, durationSeconds: result.durationSeconds, mimeType: 'audio/wav' } });
    } catch (err) {
      return Promise.resolve({ success: false, latencyMs: Date.now() - startedAt, errorType: 'SERVER_ERROR', errorDetail: err && err.message });
    }
  }

  function defaultExecutorFor(capability, payload) {
    return function (provider) {
      if (capability === 'TEXT') {
        if (TEXT_PROVIDER_ENDPOINTS[provider.id]) return callTextProvider(provider, payload);
        if (provider.id === 'ibis-query-gemini') return callGeminiQuery(provider, payload);
      }
      if (capability === 'BPM_DETECTION' && provider.id === 'ibis-local-dsp') return callLocalDsp(provider, payload);
      if (capability === 'INSTRUMENTAL_GENERATION' && provider.id === 'ibis-local-music-engine') return callMusicEngine(provider, payload);
      if (capability === 'SFX_GENERATION' && provider.id === 'ibis-local-sfx-engine') return callSfxEngine(provider, payload);
      if (capability === 'RUNTIME_ESTIMATION' && provider.id === 'ibis-local-script-runtime-estimator') return callRuntimeEstimator(provider, payload);
      if (capability === 'QC' && provider.id === 'ibis-local-project-qc') return callProjectQC(provider, payload);
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

  // Phase 8 (production plan / "IBIS must approve the plan before execution"). Composes the
  // EXISTING eligibility engine -- this is not a second router or a second economics engine, it
  // is a real-data report over the one that already exists: for each requested stage, is there
  // genuinely an eligible provider right now, and if so which one (ranked by the same real
  // observed-health ordering attemptInOrder() itself uses)? A stage with zero eligible providers
  // is honestly marked blocked with the real reason -- never silently dropped, never guessed at.
  // Execution is still each stage's own IbisClient.request() call; this function never executes
  // anything itself, matching "IBIS must approve the plan before execution" as a real gate a
  // caller can inspect first, not a promise this function keeps on the caller's behalf.
  function planProduction(spec) {
    spec = spec || {};
    var reg = registries();
    var stages = Array.isArray(spec.stages) ? spec.stages : [];
    var context = spec.context || {};
    var nodePermission = null;

    if (spec.nodeId) {
      if (!reg.Nodes) return { approved: false, reason: 'js/ftn-node-registry.js is not loaded.', stages: [] };
      var node = reg.Nodes.get(spec.nodeId);
      if (!node) return { approved: false, reason: 'Node "' + spec.nodeId + '" is not registered.', stages: [] };
      if (node.IBISRole === 'EXCLUDED_SEPARATE_APPLICATION') return { approved: false, reason: node.excludedReason, stages: [] };
      if (!node.canCallIbisCapabilities) return { approved: false, reason: 'This node is not authorized to call IBIS capabilities.', stages: [] };
      nodePermission = node.id;
    }

    if (!reg.Eligibility || !reg.Taxonomy) return { approved: false, reason: 'Eligibility/taxonomy modules are not loaded.', stages: [] };

    var planned = stages.map(function (stage) {
      var capability = stage && stage.capability;
      if (!capability || !reg.Taxonomy.isRecognized(capability)) {
        return { capability: capability || null, status: 'UNKNOWN_CAPABILITY', eligibleProvider: null, providerClass: null, blocker: 'Not a recognized capability.' };
      }
      var ranked = reg.Eligibility.find(capability, context);
      if (!ranked.length) {
        return { capability: capability, status: 'BLOCKED', eligibleProvider: null, providerClass: null, blocker: 'No eligible provider for ' + capability + ' right now.' };
      }
      var best = ranked[0].provider;
      var providerClass = best.costToIbis === 'ZERO_COST_TO_IBIS' ? 'LOCAL_OR_FREE' : best.costToIbis === 'ZERO_CUSTOMER_FUNDED' ? 'CUSTOMER_FUNDED' : 'IBIS_FUNDED';
      return { capability: capability, status: 'READY', eligibleProvider: best.id, providerClass: providerClass, blocker: null };
    });

    var allReady = planned.every(function (p) { return p.status === 'READY'; });
    return {
      approved: allReady,
      reason: allReady ? null : 'One or more requested stages have no eligible provider right now -- see each stage\'s own blocker.',
      nodeId: nodePermission,
      stages: planned,
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisClient = { request: request, describeNode: describeNode, planProduction: planProduction, defaultExecutorFor: defaultExecutorFor };
})(typeof window !== 'undefined' ? window : globalThis);
