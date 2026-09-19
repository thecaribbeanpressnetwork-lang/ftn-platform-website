(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT_POLICY__) return;

  function defaultMode(model) {
    if (model?.app?.defaultMode) return model.app.defaultMode;
    if (model?.risk?.level === 'HIGH') return 'ASSIST';
    if (model?.pageType === 'ARTICLE' || model?.pageType === 'LISTING' || model?.pageType === 'FORM_SERVICE') return 'ADAPT';
    return 'ASSIST';
  }

  function resolve(model, requestedMode) {
    const requested = String(requestedMode || defaultMode(model)).toUpperCase();
    if (!['ORIGINAL','ASSIST','ADAPT'].includes(requested)) {
      return { mode:defaultMode(model), reason:'UNSUPPORTED_MODE' };
    }
    if (requested === 'ADAPT' && model?.risk?.level === 'HIGH') {
      return { mode:'ASSIST', reason:'SENSITIVE_SURFACE_ASSIST_ONLY' };
    }
    if (requested === 'ADAPT' && model?.app) {
      return { mode:'ASSIST', reason:'COMPLEX_APP_MUSCLE_MEMORY' };
    }
    return { mode:requested, reason:'USER_OR_DEFAULT' };
  }

  globalThis.__FTN_SCARLETT_POLICY__ = { defaultMode, resolve };
})();
