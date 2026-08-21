// FTNScreen Screenwriter (Phase 6, extended in the final integration pass) — a NEW CAPABILITY
// inside the EXISTING FTNScreen (js/screen-workspace.js, /screen/), not a second application.
// Turns a natural-language idea into a structured pilot project: concept -> logline -> synopsis
// -> characters -> world -> beat sheet -> outline -> screenplay -> scene breakdown -> production
// plan -> pitch material -> continuity check -> runtime estimate -> QC, each stage a real asset
// in js/ibis-project-graph.js (the
// same selective-regeneration graph already built and tested for exactly this purpose -- this
// module does not invent a second project/asset model). Every creative stage is requested through
// js/ibis-client.js's IbisClient.request() -- Screenwriter has no AI logic of its own, no
// hardcoded provider, and never calls a Supabase function or fetch() directly. Dialect/country
// context is resolved the same way js/ibis-voice-registry.js resolves it for voice (explicit
// request > UI selection > account context > project context > default) -- kept as a real,
// reusable priority function here rather than importing voice-specific code into a screenwriting
// module, since the resolution RULE is shared even though the two modules serve different
// capabilities.
//
// Honest current state: no TEXT-capable provider is eligible for a guest today (see
// IBIS-MAP.md), and ibis-query-gemini (the one enabled TEXT provider) requires a real signed-in
// browser session this repository's test tooling cannot provide. Every creative (non-
// RUNTIME_ESTIMATION) stage therefore honestly reports NO_ELIGIBLE_PROVIDER for an unauthenticated
// test run -- that is not a bug in this module, it is the true, current state of the fabric, and
// is asserted as such in tests/ftnscreen-screenwriter-audit.mjs. The RUNTIME_ESTIMATION stage is
// genuinely live (js/ibis-runtime-estimator.js) and is proven end-to-end in the same test.
(function (global) {
  'use strict';

  var STAGES = [
    {
      id: 'concept', capability: 'STORY_DEVELOPMENT', assetType: 'CONCEPT', dependsOn: [],
      promptBuilder: function (project) {
        return 'Develop a one-paragraph pilot concept for this idea. Original material only -- no real people, no copyrighted characters. Idea: ' + project.idea +
          (project.country ? ' Setting/country: ' + project.country + '.' : '') +
          (project.dialect ? ' Dialogue should reflect ' + project.dialect + ' where natural, without caricature.' : '');
      },
    },
    // Final integration pass: LOGLINE and SYNOPSIS inserted between concept and characters,
    // matching the real target pipeline order (IDEA -> LOGLINE -> SYNOPSIS -> CHARACTERS ->
    // WORLD -> ...). characters now depends on SYNOPSIS (richer context) instead of CONCEPT
    // directly -- SYNOPSIS already carries everything CONCEPT did, one stage downstream.
    {
      id: 'logline', capability: 'LOGLINE', assetType: 'LOGLINE', dependsOn: ['CONCEPT'],
      promptBuilder: function (project, ctx) {
        return 'Write a single-sentence logline (25 words or fewer) for this pilot concept -- protagonist, goal, obstacle. Concept: ' + ctx.concept;
      },
    },
    {
      id: 'synopsis', capability: 'SYNOPSIS', assetType: 'SYNOPSIS', dependsOn: ['LOGLINE'],
      promptBuilder: function (project, ctx) {
        return 'Expand this logline into a short (150-250 word) prose synopsis covering the pilot\'s central conflict and stakes. Logline: ' + ctx.logline;
      },
    },
    {
      id: 'characters', capability: 'CHARACTER_DEVELOPMENT', assetType: 'CHARACTERS', dependsOn: ['SYNOPSIS'],
      promptBuilder: function (project, ctx) {
        return 'Based on this pilot synopsis, develop the principal character profiles (name, role, want, flaw, arc) and their key relationships. Original characters only. Synopsis: ' + ctx.synopsis;
      },
    },
    {
      id: 'world', capability: 'WORLD_BUILDING', assetType: 'WORLD', dependsOn: ['CHARACTERS'],
      promptBuilder: function (project, ctx) {
        return 'Describe the world/setting this story takes place in -- time, place, tone, and any rules of the world these characters live under. Ground it in ' + (project.country || 'a real, specific Caribbean setting') + ' where appropriate. Characters: ' + ctx.characters;
      },
    },
    {
      id: 'beats', capability: 'BEAT_SHEET', assetType: 'BEAT_SHEET', dependsOn: ['CHARACTERS', 'WORLD'],
      promptBuilder: function (project, ctx) {
        return 'Using these characters and this world, write a pilot beat sheet (8-12 beats) for a ' + (project.runtimeTargetMinutes || 30) + '-minute episode. Characters: ' + ctx.characters + ' World: ' + ctx.world;
      },
    },
    {
      id: 'outline', capability: 'OUTLINE', assetType: 'OUTLINE', dependsOn: ['BEAT_SHEET'],
      promptBuilder: function (project, ctx) {
        return 'Expand this beat sheet into a scene-by-scene outline with act breaks appropriate for a ' + (project.runtimeTargetMinutes || 30) + '-minute pilot. Beat sheet: ' + ctx.beat_sheet;
      },
    },
    {
      id: 'screenplay', capability: 'SCREENPLAY', assetType: 'SCREENPLAY', dependsOn: ['OUTLINE'],
      promptBuilder: function (project, ctx) {
        return 'Write the full screenplay for this outline in standard format (scene headings, action, dialogue) targeting approximately ' + (project.runtimeTargetMinutes || 30) + ' minutes of screen time. Do not stop at a synopsis -- write complete scenes. Outline: ' + ctx.outline;
      },
    },
    // Final integration pass: SCENE_BREAKDOWN/PRODUCTION_PLAN/PITCH_MATERIAL inserted after
    // screenplay, matching the real target pipeline's production-facing tail
    // (SCREENPLAY -> SCENE_BREAKDOWN -> PRODUCTION_PLAN -> PITCH_MATERIAL).
    {
      id: 'scene_breakdown', capability: 'SCENE_BREAKDOWN', assetType: 'SCENE_BREAKDOWN', dependsOn: ['SCREENPLAY'],
      promptBuilder: function (project, ctx) {
        return 'Break this screenplay into a per-scene production list: scene number, location (interior/exterior), time of day, characters present, and any notable props or effects needed. Screenplay: ' + ctx.screenplay;
      },
    },
    {
      id: 'production_plan', capability: 'PRODUCTION_PLAN', assetType: 'PRODUCTION_PLAN', dependsOn: ['SCENE_BREAKDOWN'],
      promptBuilder: function (project, ctx) {
        return 'Using this scene breakdown, draft practical production notes: likely locations to scout, cast/crew needs, and any scenes with unusual production complexity or cost. Scene breakdown: ' + ctx.scene_breakdown;
      },
    },
    {
      id: 'pitch_material', capability: 'PITCH_MATERIAL', assetType: 'PITCH_MATERIAL', dependsOn: ['SYNOPSIS', 'CHARACTERS'],
      promptBuilder: function (project, ctx) {
        return 'Write a one-page pitch summary for this pilot suitable for a network/platform submission: hook, synopsis, principal characters, and why this show now. Synopsis: ' + ctx.synopsis + ' Characters: ' + ctx.characters;
      },
    },
    {
      id: 'continuity', capability: 'CONTINUITY_CHECK', assetType: 'CONTINUITY_REPORT', dependsOn: ['SCREENPLAY'],
      promptBuilder: function (project, ctx) {
        return 'Review this screenplay for character/timeline/setting continuity errors and list them plainly. Screenplay: ' + ctx.screenplay;
      },
    },
    {
      // The one stage with a REAL, live, zero-cost provider today -- no TEXT capability needed.
      id: 'runtime', capability: 'RUNTIME_ESTIMATION', assetType: 'RUNTIME_ESTIMATE', dependsOn: ['SCREENPLAY'],
      buildPayload: function (project, ctx) {
        return { text: ctx.screenplay, options: { targetMinutes: project.runtimeTargetMinutes || 30 } };
      },
    },
    {
      // Also genuinely live: real, deterministic completeness checking over the project's actual
      // current asset state (js/ibis-project-qc.js). Deliberately not fed through gatherContext's
      // dependsOn->text extraction -- QC needs the whole project object (which assets exist,
      // which are missing), not any one stage's text, so it builds its own payload directly.
      id: 'qc', capability: 'QC', assetType: 'QC_REPORT', dependsOn: ['SCREENPLAY', 'CONTINUITY_REPORT', 'RUNTIME_ESTIMATE'],
      buildPayload: function (project) { return { project: project }; },
    },
  ];

  var STAGE_INDEX = {};
  STAGES.forEach(function (s) { STAGE_INDEX[s.id] = s; });

  function stageByAssetType(assetType) {
    return STAGES.filter(function (s) { return s.assetType === assetType; })[0] || null;
  }

  // Same resolution-priority contract as js/ibis-voice-registry.js's resolveDialectContext --
  // deliberately reimplemented here (not imported) rather than creating a cross-dependency
  // between a screenwriting module and a voice module for a small, generic piece of logic; both
  // independently satisfy the directive's specified priority order.
  function resolveContext(params) {
    params = params || {};
    var layers = ['explicitRequest', 'uiSelection', 'accountContext', 'projectContext'];
    for (var i = 0; i < layers.length; i++) {
      var layer = params[layers[i]];
      if (layer && (layer.country || layer.dialect)) return { source: layers[i], country: layer.country || null, dialect: layer.dialect || null };
    }
    return { source: 'default', country: null, dialect: null };
  }

  function createProject(idea, options) {
    options = options || {};
    if (!idea || !String(idea).trim()) throw new Error('Screenwriter requires an idea.');
    var context = resolveContext(options.dialectParams);
    var Graph = global.FTN && global.FTN.IbisProjectGraph;
    if (!Graph) throw new Error('js/ibis-project-graph.js is not loaded.');
    return {
      graph: Graph.createGraph(),
      projectId: options.projectId || ('ftnscreen-pilot-' + Math.random().toString(36).slice(2)),
      idea: String(idea).trim(),
      country: context.country,
      dialect: context.dialect,
      contextSource: context.source,
      runtimeTargetMinutes: options.runtimeTargetMinutes || 30,
      stageAssets: {},
      log: [],
    };
  }

  function gatherContext(project, dependsOn) {
    var ctx = {};
    (dependsOn || []).forEach(function (assetType) {
      var assetId = project.stageAssets[assetType];
      var asset = assetId ? project.graph.getAsset(assetId) : null;
      var key = assetType.toLowerCase();
      ctx[key] = (asset && asset.provenance && asset.provenance.text) || '';
    });
    return ctx;
  }

  async function runStage(project, stageId, opts) {
    opts = opts || {};
    var stage = STAGE_INDEX[stageId];
    if (!stage) throw new Error('Unknown Screenwriter stage: ' + stageId);
    var IbisClient = global.FTN && global.FTN.IbisClient;
    if (!IbisClient) throw new Error('js/ibis-client.js is not loaded.');
    var ctx = gatherContext(project, stage.dependsOn);
    var payload = stage.buildPayload ? stage.buildPayload(project, ctx) : { prompt: stage.promptBuilder(project, ctx) };

    var outcome = await IbisClient.request({
      nodeId: opts.nodeId || 'screen',
      capability: stage.capability,
      context: opts.context || { authenticated: false },
      payload: payload,
      executor: opts.executor,
    });

    if (!outcome.success) {
      project.log.push({ stage: stageId, success: false, code: outcome.code, reason: outcome.reason });
      return { success: false, stage: stageId, code: outcome.code, reason: outcome.reason };
    }

    var text = (outcome.result && (outcome.result.answer || outcome.result.text)) || null;
    var provenanceRecord = { providerProvenance: outcome.provenance };
    if (text !== null) provenanceRecord.text = text; else provenanceRecord.data = outcome.result;

    var asset = project.graph.addAsset({
      projectId: project.projectId,
      assetType: stage.assetType,
      operation: stage.capability,
      provider: outcome.provenance.provider,
      dependencies: (stage.dependsOn || []).map(function (t) { return project.stageAssets[t]; }).filter(Boolean),
      provenance: provenanceRecord,
    });
    project.stageAssets[stage.assetType] = asset.assetId;
    project.log.push({ stage: stageId, success: true, assetId: asset.assetId });
    return { success: true, stage: stageId, asset: asset };
  }

  // Develops the full pipeline in order, stopping honestly (never fabricating a later stage) the
  // first time a stage fails to find an eligible provider -- matching the real, current state of
  // the fabric (see the module header) rather than pretending downstream stages could proceed.
  async function developPilot(project, opts) {
    var results = [];
    for (var i = 0; i < STAGES.length; i++) {
      var result = await runStage(project, STAGES[i].id, opts);
      results.push(result);
      if (!result.success) break;
    }
    return results;
  }

  // Selective revision: re-run only the stage that produced `assetType` and its REAL downstream
  // dependents, using js/ibis-project-graph.js's own regenerationSet() -- never a hand-rolled
  // cascade rule that could drift from the graph's real dependency data.
  async function revise(project, assetType, opts) {
    var assetId = project.stageAssets[assetType];
    if (!assetId) throw new Error('No existing ' + assetType + ' asset to revise -- run developPilot() first.');
    var regenIds = project.graph.regenerationSet(assetId);
    var toRerun = STAGES.filter(function (s) {
      var existingId = project.stageAssets[s.assetType];
      return existingId && regenIds.indexOf(existingId) !== -1;
    });
    var results = [];
    for (var i = 0; i < toRerun.length; i++) {
      var result = await runStage(project, toRerun[i].id, opts);
      results.push(result);
      if (!result.success) break;
    }
    return results;
  }

  global.FTN = global.FTN || {};
  global.FTN.FtnScreenScreenwriter = {
    STAGES: STAGES,
    stageByAssetType: stageByAssetType,
    resolveContext: resolveContext,
    createProject: createProject,
    runStage: runStage,
    developPilot: developPilot,
    revise: revise,
  };
})(typeof window !== 'undefined' ? window : globalThis);
