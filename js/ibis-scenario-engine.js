// FTN Platform — shared, headless scenario comparison/calculation engine (FTN Consolidation
// closure wave, 2026-09-18).
//
// Extracted from js/mission-control-demo.js's Scenario Studio panel (renderScenarioStudio()'s
// recompute() math): a deliberately simple, explicitly-illustrative weighted-sum scoring model --
// "outcome = sum(variable * weight)" -- the same honesty the original page states plainly
// ("Deliberately simple... not a real economic model"). No DOM dependency: every function takes
// plain data and returns plain data.
//
// This is NOT a reimplementation of ibis's server-side EBR/Butterfly/Prediction/Founder reasoning
// engines (supabase/functions/_shared/ibis-*-engine.ts) -- those are evidence-bounded causal/
// probabilistic reasoning over real retrieved evidence. This is a much simpler, complementary
// deterministic tool: multi-criteria weighted scoring for comparing named options or continuous
// variables, useful on its own (no evidence retrieval required) and honestly labeled as such.
(function (global) {
  'use strict';

  function round1(n) { return Math.round(n * 10) / 10; }
  function direction(score) { return score > 0.5 ? 'up' : score < -0.5 ? 'down' : 'flat'; }

  // The exact math from Scenario Workspace's own Scenario Studio: given named variable values and
  // a set of outcomes (each a weight per variable id), computes each outcome's weighted score and
  // trend direction. `variables`: {varId: number}. `outcomes`: [{id, title, weights: {varId: n}}].
  function scoreOutcomes(variables, outcomes) {
    return outcomes.map(function (outcome) {
      var score = 0;
      Object.keys(outcome.weights).forEach(function (varId) { score += (variables[varId] || 0) * outcome.weights[varId]; });
      score = round1(score);
      return { id: outcome.id, title: outcome.title, score: score, direction: direction(score) };
    });
  }

  // Generalizes the same weighted-sum idea to discrete OPTIONS rather than continuous sliders --
  // this is the primitive "compare three strategies" needs. `options`: [{name, criteria:
  // {criterionId: n}}]. `weights` (optional): {criterionId: n}, default 1 for every criterion
  // that appears. Returns options ranked highest score first, each with its per-criterion
  // contribution shown (never a hidden black-box total).
  function compareOptions(options, weights) {
    weights = weights || {};
    var allCriteria = {};
    options.forEach(function (o) { Object.keys(o.criteria || {}).forEach(function (c) { allCriteria[c] = true; }); });
    var criteriaIds = Object.keys(allCriteria);
    var scored = options.map(function (o) {
      var contributions = {}, total = 0;
      criteriaIds.forEach(function (c) {
        var w = weights[c] != null ? weights[c] : 1;
        var contribution = round1((o.criteria[c] || 0) * w);
        contributions[c] = contribution;
        total += contribution;
      });
      return { name: o.name, total: round1(total), contributions: contributions };
    });
    scored.sort(function (a, b) { return b.total - a.total; });
    return { criteria: criteriaIds, ranked: scored };
  }

  // "Show me how these assumptions change the outcome" -- a plain delta between two scored-outcome
  // sets (same outcome ids, different variable inputs). Never claims causation, only reports the
  // arithmetic difference.
  function deltaSummary(beforeScored, afterScored) {
    var beforeById = {}; beforeScored.forEach(function (o) { beforeById[o.id] = o; });
    return afterScored.map(function (after) {
      var before = beforeById[after.id];
      var change = before ? round1(after.score - before.score) : after.score;
      return { id: after.id, title: after.title, before: before ? before.score : null, after: after.score, change: change };
    });
  }

  function toPortableJSON(data) { return JSON.stringify(Object.assign({ schemaVersion: 1, engine: 'FTN illustrative weighted-scoring model (not a calibrated economic/business model)', createdAt: new Date().toISOString() }, data), null, 2); }

  global.FTN = global.FTN || {};
  global.FTN.ScenarioEngine = { scoreOutcomes: scoreOutcomes, compareOptions: compareOptions, deltaSummary: deltaSummary, toPortableJSON: toPortableJSON };
})(typeof window !== 'undefined' ? window : globalThis);
