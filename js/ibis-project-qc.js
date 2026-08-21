// FTN Platform — real, deterministic project QC (Phase 6 continuation). No AI model, no network
// call: checks a real js/ibis-project-graph.js project's actual asset state and returns the exact
// status vocabulary the master directive specifies -- READY_FOR_REVIEW or
// NOT_READY_ISSUES_REQUIRE_ATTENTION -- never a fabricated pass.
//
// Deliberately scoped to STORY-level completeness only. The directive's own QC section also
// names PRODUCTION checks (missing assets/scenes, visual continuity, audio/video sync, lip sync,
// subtitle sync) and TECHNICAL checks (resolution, frame rate, audio, subtitles, file integrity).
// None of those are checked here because nothing to check exists yet -- js/ftnscreen-
// screenwriter.js has not produced any video, audio or subtitle asset (no eligible provider for
// those capabilities is deployed -- see IBIS-MAP.md). Claiming to QC assets that don't exist
// would be exactly the fabricated-eligibility failure mode the directive forbids. When those
// capabilities go live, PRODUCTION/TECHNICAL checks belong here as real, additional checks
// against real assets -- not invented ahead of time.
(function (global) {
  'use strict';

  var REQUIRED_STAGES = ['CONCEPT', 'CHARACTERS', 'BEAT_SHEET', 'OUTLINE', 'SCREENPLAY'];

  function assetText(project, assetType) {
    var assetId = project.stageAssets[assetType];
    if (!assetId) return null;
    var asset = project.graph.getAsset(assetId);
    var text = asset && asset.provenance && asset.provenance.text;
    return text && text.trim() ? text : null;
  }

  function checkCompleteness(project) {
    var missing = REQUIRED_STAGES.filter(function (assetType) { return !assetText(project, assetType); });
    return { complete: missing.length === 0, missingStages: missing };
  }

  function checkRuntime(project) {
    var assetId = project.stageAssets.RUNTIME_ESTIMATE;
    if (!assetId) return { checked: false, withinTarget: null, reason: 'No runtime estimate has been produced yet.' };
    var asset = project.graph.getAsset(assetId);
    var data = asset && asset.provenance && asset.provenance.data;
    if (!data || typeof data.minutes !== 'number') return { checked: false, withinTarget: null, reason: 'The runtime estimate asset has no usable data.' };
    return {
      checked: true,
      minutes: data.minutes,
      targetMinutes: project.runtimeTargetMinutes || null,
      withinTarget: data.withinTarget != null ? data.withinTarget : null,
    };
  }

  // A structural signal only -- this never judges screenplay quality or semantically resolves
  // continuity issues (that would require real language understanding this module does not have).
  // It reports whether a continuity check has run and gives a weak, honestly-labeled text signal,
  // always surfaced for human review rather than presented as an automated pass/fail verdict.
  function checkContinuity(project) {
    var text = assetText(project, 'CONTINUITY_REPORT');
    if (!text) return { checked: false, reason: 'No continuity check has been run yet.' };
    var looksClean = /no (continuity )?(errors|issues)|none (found|identified|noted)/i.test(text);
    return { checked: true, reportPresent: true, weakSignal: looksClean ? 'no-issues-phrase-detected' : 'review-report-text', reportLength: text.length };
  }

  function run(project) {
    if (!project || !project.graph || !project.stageAssets) {
      return { status: 'NOT_READY_ISSUES_REQUIRE_ATTENTION', blockers: ['No project supplied.'], completeness: null, runtime: null, continuity: null };
    }
    var completeness = checkCompleteness(project);
    var runtime = checkRuntime(project);
    var continuity = checkContinuity(project);

    var blockers = [];
    if (!completeness.complete) blockers.push('Missing stages: ' + completeness.missingStages.join(', ') + '.');
    if (!runtime.checked) blockers.push('No runtime estimate on record.');
    else if (runtime.withinTarget === false) blockers.push('Runtime estimate (' + runtime.minutes + ' min) is outside the target tolerance (' + runtime.targetMinutes + ' min).');
    if (!continuity.checked) blockers.push('No continuity check has been run.');

    return {
      status: blockers.length ? 'NOT_READY_ISSUES_REQUIRE_ATTENTION' : 'READY_FOR_REVIEW',
      completeness: completeness,
      runtime: runtime,
      continuity: continuity,
      blockers: blockers,
      scope: 'STORY-level completeness only -- PRODUCTION and TECHNICAL QC are not applicable until video/audio/subtitle assets exist.',
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisProjectQC = { run: run, REQUIRED_STAGES: REQUIRED_STAGES };
})(typeof window !== 'undefined' ? window : globalThis);
