(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT_POLICY__) return;

  const MODES = ['ORIGINAL','ASSIST','ADAPT','TRANSFORM','COMPARE','BLEND'];
  // V1 scope was ORIGINAL/ASSIST/ADAPT. V2 adds the rest of the continuum from the product
  // definition: TRANSFORM (task-optimized representation), COMPARE (Original vs Scarlett,
  // side-by-side/reveal) and BLEND (a staged 0-100 intervention level, not a visual theme).

  function defaultMode(model) {
    if (model?.app?.defaultMode) return model.app.defaultMode;
    if (model?.risk?.level === 'HIGH') return 'ASSIST';
    if (model?.pageType === 'ARTICLE' || model?.pageType === 'LISTING' || model?.pageType === 'FORM_SERVICE') return 'ADAPT';
    return 'ASSIST';
  }

  // Every allowed op is a bounded, reversible presentation change. Nothing in this list can
  // change a destination, submit a form, alter an account/payment/security control, or touch
  // native editing semantics -- that boundary is enforced by content.js only ever calling
  // setAttr()/CSS custom properties through the ledger, never innerHTML or node removal.
  const ADAPT_OPERATIONS = ['emphasize','de-emphasize','collapse','group','annotate','spacing','readability-constraint','focus-enhancement','contextual-panel','contextual-action-bar','reveal-important-information'];
  const ASSIST_OPERATIONS = ['annotate','contextual-panel','contextual-action-bar','focus-enhancement'];
  const TRANSFORM_OPERATIONS = ADAPT_OPERATIONS.concat(['hide-original-region','mount-representation','build-task-deck']);
  const ALWAYS_BLOCKED = ['reorder-dom','remove-content','change-form-destination','modify-account-controls','modify-payment-controls','modify-security-controls','auto-submit'];

  // Blend is a staged intervention level, not a mode of its own -- each stop maps to a fixed,
  // named operation set (structural, matching the product definition's explicit "not merely
  // opacity" requirement). A risk-capped ceiling below caps how far a HIGH-risk or known-app
  // surface may go, mirroring the same downgrade rule TRANSFORM/ADAPT already apply.
  const BLEND_STOPS = [
    { level: 0, label: 'ORIGINAL', operations: [] },
    { level: 20, label: 'Accessibility/focus assistance', operations: ['focus-enhancement'] },
    { level: 40, label: 'Assist', operations: ASSIST_OPERATIONS.slice() },
    { level: 60, label: 'Adapt', operations: ADAPT_OPERATIONS.slice() },
    { level: 80, label: 'Deep adaptation', operations: ADAPT_OPERATIONS.concat(['hide-original-region']) },
    { level: 100, label: 'Full permitted Transform', operations: TRANSFORM_OPERATIONS.slice() },
  ];

  function preservedRegions(model) {
    const preserved = ['navigation'];
    if (model?.regions?.forms) preserved.push('forms');
    if (model?.regions?.dialogs) preserved.push('dialogs');
    if (model?.app) preserved.push('editable-surface');
    return preserved;
  }

  function operationsFor(effective) {
    if (effective === 'ADAPT') return ADAPT_OPERATIONS.slice();
    if (effective === 'ASSIST') return ASSIST_OPERATIONS.slice();
    if (effective === 'TRANSFORM') return TRANSFORM_OPERATIONS.slice();
    return [];
  }

  function buildResult(model, requested, effective, reason, extra) {
    const riskLevel = model?.risk?.level || 'NORMAL';
    return Object.assign({
      requestedMode: requested,
      effectiveMode: effective,
      mode: effective, // back-compat alias for existing callers
      reason,
      riskLevel,
      preservedRegions: preservedRegions(model),
      allowedOperations: operationsFor(effective),
      blockedOperations: ALWAYS_BLOCKED.slice()
    }, extra || {});
  }

  // A sensitive surface or a known complex app (Docs/Sheets/Gmail/Calendar) forces the same
  // ceiling regardless of which "deep" mode was requested -- ADAPT, TRANSFORM and a high Blend
  // level all collapse to the identical ASSIST-only outcome for the identical reason. Compare is
  // not itself a presentation-changing mode (see resolveCompare) so it is not gated here.
  function deepModeCeiling(model) {
    if (model?.risk?.level === 'HIGH') return { blocked: true, reason: 'SENSITIVE_SURFACE_ASSIST_ONLY' };
    if (model?.app) return { blocked: true, reason: 'COMPLEX_APP_MUSCLE_MEMORY' };
    return { blocked: false };
  }

  function maxBlendLevel(model) {
    const ceiling = deepModeCeiling(model);
    if (ceiling.blocked) return 20; // accessibility/focus assistance only -- never zero, since
    // reduced-motion/focus help is safe even on a sensitive surface and is the whole point of §20.
    return 100;
  }

  function resolveBlend(model, requestedLevel) {
    const requested = Math.max(0, Math.min(100, Math.round(Number(requestedLevel) / 20) * 20 || 0));
    const cap = maxBlendLevel(model);
    const effectiveLevel = Math.min(requested, cap);
    const stop = BLEND_STOPS.find((s) => s.level === effectiveLevel) || BLEND_STOPS[0];
    const reason = effectiveLevel < requested ? (cap === 20 ? (deepModeCeiling(model).reason) : 'BLEND_LEVEL_CAPPED') : 'USER_OR_DEFAULT';
    return buildResult(model, 'BLEND', 'BLEND', reason, {
      blendLevel: effectiveLevel,
      blendLabel: stop.label,
      blendMaxLevel: cap,
      allowedOperations: stop.operations.slice(),
    });
  }

  function resolveCompare(model, baseModeRequested) {
    // Compare shows Original alongside whatever the requested "base" Scarlett mode would be --
    // it inherits that mode's downgrade behavior rather than introducing a second policy for the
    // same risk question.
    const base = resolve(model, baseModeRequested || defaultMode(model));
    return buildResult(model, 'COMPARE', 'COMPARE', base.reason, {
      compareBaseMode: base.effectiveMode,
      allowedOperations: base.allowedOperations,
    });
  }

  function resolve(model, requestedMode) {
    const requested = String(requestedMode || defaultMode(model)).toUpperCase();
    if (!MODES.includes(requested)) {
      return buildResult(model, requested, defaultMode(model), 'UNSUPPORTED_MODE');
    }
    if (requested === 'BLEND') return resolveBlend(model, 100);
    if (requested === 'COMPARE') return resolveCompare(model);
    if ((requested === 'ADAPT' || requested === 'TRANSFORM') && model?.risk?.level === 'HIGH') {
      return buildResult(model, requested, 'ASSIST', 'SENSITIVE_SURFACE_ASSIST_ONLY');
    }
    if ((requested === 'ADAPT' || requested === 'TRANSFORM') && model?.app) {
      return buildResult(model, requested, 'ASSIST', 'COMPLEX_APP_MUSCLE_MEMORY');
    }
    return buildResult(model, requested, requested, 'USER_OR_DEFAULT');
  }

  globalThis.__FTN_SCARLETT_POLICY__ = { defaultMode, resolve, resolveBlend, resolveCompare, MODES: MODES.slice(), BLEND_STOPS: BLEND_STOPS.map((s) => Object.assign({}, s, { operations: s.operations.slice() })) };
})();
