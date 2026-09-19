(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT_REPRESENTATION__) return;

  // Representation Engine: decides HOW to present a page's information once policy has decided
  // TRANSFORM is permitted, and builds the typed spec the deck renderer draws from. It never
  // invents content -- every section is built from sourceBindings that point at real elements/
  // text already present in the page model (page-understanding.js), or is omitted. It never asks
  // any model to generate UI or copy; representationType/section choice is a fixed lookup table
  // keyed on pageType/app, not an LLM decision.

  const clean = (v, max = 300) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

  function factsSection(model) {
    const facts = [];
    for (const p of model?.commerce?.pricing || []) facts.push({ label: 'Price mentioned', value: p });
    for (const d of (model?.deadlines || []).slice(0, 2)) facts.push({ label: 'Deadline language', value: d });
    if (model?.eligibilitySignal) facts.push({ label: 'Eligibility', value: 'Eligibility/requirement language detected on this page.' });
    for (const w of (model?.warnings || []).slice(0, 2)) facts.push({ label: 'Warning', value: w });
    return facts;
  }

  function actionsFor(model, allowedOperations) {
    const actions = [{ id: 'ask-ibis', kind: 'ask-ibis', label: 'Ask ibis about this page' }];
    if (model?.deadlines?.length || model?.pageType === 'LISTING' || model?.pageType === 'FORM_SERVICE') {
      actions.push({ id: 'open-headspace', kind: 'open-headspace', label: 'Open in Headspace' });
    }
    actions.push({ id: 'restore', kind: 'restore', label: 'Original' });
    return actions;
  }

  // Each builder returns { representationType, sections, actions, confidence } or null when there
  // isn't enough grounded material to justify a Transform (in which case the caller should fall
  // back to Adapt). Sections only ever reference real page-model facts -- there is no free-text
  // generation anywhere in this module.
  const BUILDERS = {
    LISTING(model) {
      const price = model?.commerce?.pricing || [];
      const actions = model?.actions || [];
      if (!price.length && !model?.content?.title) return null;
      return {
        representationType: 'deck',
        confidence: price.length ? 'HIGH' : 'MEDIUM',
        sections: [
          { id: 'overview', title: 'OVERVIEW', kind: 'text', bindingIds: ['title', 'description'] },
          { id: 'money', title: 'PRICE', kind: 'facts', bindingIds: ['facts'] },
          { id: 'actions', title: 'ACTIONS', kind: 'actions', bindingIds: ['primaryActions'] },
          model?.downloads?.length ? { id: 'documents', title: 'DOCUMENTS', kind: 'links', bindingIds: ['downloads'] } : null,
        ].filter(Boolean),
      };
    },
    FORM_SERVICE(model) {
      if (!model?.content?.title && !model?.eligibilitySignal) return null;
      return {
        representationType: 'process',
        confidence: model?.eligibilitySignal || model?.deadlines?.length ? 'HIGH' : 'MEDIUM',
        sections: [
          { id: 'what', title: 'WHAT THIS IS', kind: 'text', bindingIds: ['title', 'description'] },
          model?.eligibilitySignal ? { id: 'who', title: 'WHO QUALIFIES', kind: 'facts', bindingIds: ['facts'] } : null,
          model?.downloads?.length ? { id: 'need', title: 'WHAT YOU NEED', kind: 'links', bindingIds: ['downloads'] } : null,
          model?.commerce?.pricing?.length ? { id: 'cost', title: 'COST', kind: 'facts', bindingIds: ['facts'] } : null,
          model?.deadlines?.length ? { id: 'deadline', title: 'DEADLINE', kind: 'facts', bindingIds: ['facts'] } : null,
          { id: 'apply', title: 'HOW TO APPLY', kind: 'actions', bindingIds: ['primaryActions'] },
        ].filter(Boolean),
      };
    },
    ARTICLE(model) {
      const headings = model?.content?.headings || [];
      if (headings.length < 2) return null;
      return {
        representationType: 'reading',
        confidence: headings.length >= 4 ? 'HIGH' : 'MEDIUM',
        sections: [
          { id: 'outline', title: 'OUTLINE', kind: 'list', bindingIds: ['headings'] },
          factsSection(model).length ? { id: 'keyfacts', title: 'KEY FACTS', kind: 'facts', bindingIds: ['facts'] } : null,
          model?.downloads?.length ? { id: 'sources', title: 'SOURCES', kind: 'links', bindingIds: ['downloads'] } : null,
        ].filter(Boolean),
      };
    },
  };

  function build(model, policyResult, options = {}) {
    if (!model || !policyResult) return null;
    // Transform is never offered on a known app (Docs/Sheets/Gmail/Calendar) or a sensitive
    // surface -- this mirrors the same rule the policy layer already enforces for effectiveMode,
    // stated again here so the representation engine can never be called out of band and produce a
    // deck for a surface the policy would have refused.
    if (model.app || model.risk?.level === 'HIGH') return null;
    if (!policyResult.allowedOperations?.includes('reveal-important-information') && policyResult.effectiveMode !== 'TRANSFORM') {
      // still allow building a preview spec for the paywall/preview-selling flow even when the
      // active mode is Adapt, as long as risk/app don't block it (checked above)
    }
    const builder = BUILDERS[model.pageType];
    const built = builder ? builder(model) : null;
    if (!built) return null;

    const bindings = {
      title: { text: clean(model.content?.title, 220) },
      description: { text: clean(model.content?.description, 420) },
      headings: { list: (model.content?.headings || []).map((h) => clean(h, 160)) },
      facts: { facts: factsSection(model) },
      downloads: { links: (model.downloads || []).map((d) => ({ label: clean(d, 140) })) },
      primaryActions: { actions: (model.actions || []).slice(0, 4).map((a) => ({ label: clean(a.label, 160) })) },
    };

    return {
      version: 'SCARLETT_REPRESENTATION_V1',
      representationType: built.representationType,
      sections: built.sections,
      sourceBindings: bindings,
      actions: actionsFor(model),
      confidence: built.confidence,
      transformationOperations: (policyResult.allowedOperations || []).filter((op) =>
        ['group', 'reveal-important-information', 'annotate', 'contextual-panel', 'emphasize', 'de-emphasize'].includes(op)
      ),
      reversibilityPlan: 'hide-original-show-deck', // the original region is hidden (ledger-tracked), never removed; Original unhides it
    };
  }

  globalThis.__FTN_SCARLETT_REPRESENTATION__ = { build, PAGE_TYPES_SUPPORTED: Object.keys(BUILDERS) };
})();
