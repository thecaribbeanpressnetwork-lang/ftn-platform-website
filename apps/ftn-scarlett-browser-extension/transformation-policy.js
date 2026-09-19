(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT_POLICY__) return;

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
  const ALWAYS_BLOCKED = ['reorder-dom','remove-content','change-form-destination','modify-account-controls','modify-payment-controls','modify-security-controls','auto-submit'];

  function preservedRegions(model) {
    const preserved = ['navigation'];
    if (model?.regions?.forms) preserved.push('forms');
    if (model?.regions?.dialogs) preserved.push('dialogs');
    if (model?.app) preserved.push('editable-surface');
    return preserved;
  }

  function buildResult(model, requested, effective, reason) {
    const riskLevel = model?.risk?.level || 'NORMAL';
    return {
      requestedMode: requested,
      effectiveMode: effective,
      mode: effective, // back-compat alias for existing callers
      reason,
      riskLevel,
      preservedRegions: preservedRegions(model),
      allowedOperations: effective === 'ADAPT' ? ADAPT_OPERATIONS.slice() : effective === 'ASSIST' ? ASSIST_OPERATIONS.slice() : [],
      blockedOperations: ALWAYS_BLOCKED.slice()
    };
  }

  function resolve(model, requestedMode) {
    const requested = String(requestedMode || defaultMode(model)).toUpperCase();
    if (!['ORIGINAL','ASSIST','ADAPT'].includes(requested)) {
      return buildResult(model, requested, defaultMode(model), 'UNSUPPORTED_MODE');
    }
    if (requested === 'ADAPT' && model?.risk?.level === 'HIGH') {
      return buildResult(model, requested, 'ASSIST', 'SENSITIVE_SURFACE_ASSIST_ONLY');
    }
    if (requested === 'ADAPT' && model?.app) {
      return buildResult(model, requested, 'ASSIST', 'COMPLEX_APP_MUSCLE_MEMORY');
    }
    return buildResult(model, requested, requested, 'USER_OR_DEFAULT');
  }

  globalThis.__FTN_SCARLETT_POLICY__ = { defaultMode, resolve };
})();
