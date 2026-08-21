// FTN Platform — the minimum viable IBIS project/asset graph (Phase 4). Pure, deterministic,
// in-memory data structure: create assets, declare their dependencies, and compute exactly which
// assets must be regenerated when one changes. This module does NOT generate anything -- it
// answers "what would need to change," which is a real, honestly-testable question on its own,
// independent of whether any generation provider is actually live yet (most aren't -- see
// IBIS-MAP.md). "Do not build a massive database unnecessarily" -- this is a plain in-memory
// structure a caller owns per project; persistence (if ever needed) is the caller's problem, the
// same way js/ibis-creative-studio.js already persists its own project records to localStorage.
(function (global) {
  'use strict';

  function makeId(prefix, counter) {
    return prefix + '-' + counter;
  }

  function createGraph() {
    var assets = Object.create(null);
    var counter = 0;

    // parentAssetId links versions of the SAME asset (LYRICS v1 -> LYRICS v2). dependencies is a
    // list of OTHER assets this one was built from/consumes (SONG depends on VOCALS + INSTRUMENTAL).
    // The two are deliberately distinct: version history vs. build dependency.
    function addAsset(spec) {
      spec = spec || {};
      if (!spec.assetType) throw new Error('addAsset requires assetType.');
      counter += 1;
      var id = spec.assetId || makeId(spec.assetType.toLowerCase(), counter);
      var parent = spec.parentAssetId || null;
      var version = 1;
      if (parent && assets[parent]) version = assets[parent].version + 1;
      var asset = {
        assetId: id,
        projectId: spec.projectId || null,
        parentAssetId: parent,
        version: version,
        assetType: spec.assetType,
        operation: spec.operation || null,
        provider: spec.provider || null,
        model: spec.model || null,
        prompt: spec.prompt || null,
        source: spec.source || 'ibis-generated',
        createdAt: spec.createdAt || new Date().toISOString(),
        status: spec.status || 'CREATED',
        dependencies: (spec.dependencies || []).slice(),
        provenance: spec.provenance || null,
      };
      assets[id] = asset;
      return Object.assign({}, asset);
    }

    function getAsset(assetId) {
      var a = assets[assetId];
      return a ? Object.assign({}, a) : null;
    }

    function allAssets(projectId) {
      var out = [];
      Object.keys(assets).forEach(function (id) {
        var a = assets[id];
        if (!projectId || a.projectId === projectId) out.push(Object.assign({}, a));
      });
      return out;
    }

    // Direct dependents: assets whose `dependencies` list names this asset.
    function directDependents(assetId) {
      var out = [];
      Object.keys(assets).forEach(function (id) {
        if (assets[id].dependencies.indexOf(assetId) !== -1) out.push(id);
      });
      return out;
    }

    // The full, honest answer to "what would need to change" -- the transitive closure of
    // dependents, computed with a real cycle guard (a malformed graph must never infinite-loop).
    function transitiveDependents(assetId) {
      var seen = Object.create(null);
      var queue = [assetId];
      var result = [];
      while (queue.length) {
        var current = queue.shift();
        directDependents(current).forEach(function (depId) {
          if (seen[depId]) return;
          seen[depId] = true;
          result.push(depId);
          queue.push(depId);
        });
      }
      return result;
    }

    // The set that must be touched if `assetId` changes: itself plus every real dependent,
    // direct or transitive. Everything else in the project is, by construction, untouched --
    // this is what makes "change only Scene 4" and "leave Scenes 1-3 alone" a provable property
    // of the graph rather than a hopeful claim.
    function regenerationSet(assetId) {
      if (!assets[assetId]) throw new Error('Unknown assetId: ' + assetId);
      return [assetId].concat(transitiveDependents(assetId));
    }

    function assetsToPreserve(projectId, changedAssetId) {
      var regen = regenerationSet(changedAssetId);
      return allAssets(projectId).filter(function (a) { return regen.indexOf(a.assetId) === -1; }).map(function (a) { return a.assetId; });
    }

    return {
      addAsset: addAsset,
      getAsset: getAsset,
      allAssets: allAssets,
      directDependents: directDependents,
      transitiveDependents: transitiveDependents,
      regenerationSet: regenerationSet,
      assetsToPreserve: assetsToPreserve,
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisProjectGraph = { createGraph: createGraph };
})(typeof window !== 'undefined' ? window : globalThis);
