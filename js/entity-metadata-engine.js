// FTN Platform Website — Entity Metadata Engine (Sprint 1, Wave 1).
// Shared canonical metadata architecture for FTN entity types.
(function (global) {
  'use strict';

  var SCHEMAS = {};

  function registerSchema(entityType, schema) { SCHEMAS[entityType] = schema; }

  function validate(entityType, input) {
    var schema = SCHEMAS[entityType];
    if (!schema) return { valid: false, errors: ['Unknown entity type: ' + entityType] };
    var errors = [];
    schema.fields.forEach(function (f) {
      if (f.required && !String(input[f.key] || '').trim()) errors.push(f.label + ' is required.');
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function createRecord(entityType, input) {
    var v = validate(entityType, input);
    if (!v.valid) return { valid: false, errors: v.errors, record: null };
    var schema = SCHEMAS[entityType];
    var fields = {};
    schema.fields.forEach(function (f) { fields[f.key] = input[f.key] || ''; });
    return { valid: true, errors: [], record: { entityType: entityType, generatedAt: new Date().toISOString(), fields: fields } };
  }

  function fieldsFor(entityType) {
    var schema = SCHEMAS[entityType];
    return schema ? schema.fields.slice() : [];
  }

  registerSchema('music-release', {
    fields: [
      { key: 'trackTitle', label: 'Track Title', type: 'text', required: true },
      { key: 'artistName', label: 'Artist Name', type: 'text', required: true },
      { key: 'genre', label: 'Genre', type: 'text', required: false },
      { key: 'releaseDate', label: 'Target Release Date', type: 'date', required: false },
      { key: 'credits', label: 'Credits (producer, writers, features)', type: 'textarea', required: false },
      { key: 'isrc', label: 'ISRC (if already assigned)', type: 'text', required: false }
    ]
  });

  // Canonical FTN Screen submission record. These fields are deliberately distribution- and
  // platform-neutral so the record can later feed programming, catalog, rights and ibis.ai
  // services without being locked to a specific streaming or CMS vendor.
  registerSchema('screen-submission', {
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'creatorName', label: 'Creator / Studio Name', type: 'text', required: true },
      { key: 'format', label: 'Format', type: 'text', required: true },
      { key: 'genre', label: 'Genre', type: 'text', required: false },
      { key: 'country', label: 'Country / Territory of Origin', type: 'text', required: false },
      { key: 'language', label: 'Primary Language', type: 'text', required: false },
      { key: 'runtime', label: 'Runtime / Episode Length', type: 'text', required: false },
      { key: 'year', label: 'Production Year', type: 'text', required: false },
      { key: 'productionStatus', label: 'Production Status', type: 'text', required: false },
      { key: 'logline', label: 'Logline', type: 'textarea', required: true },
      { key: 'synopsis', label: 'Synopsis', type: 'textarea', required: true },
      { key: 'audience', label: 'Intended Audience', type: 'text', required: false },
      { key: 'credits', label: 'Key Cast / Crew / Credits', type: 'textarea', required: false },
      { key: 'rightsStatus', label: 'Rights / Submission Authority', type: 'text', required: true },
      { key: 'availability', label: 'Current Availability / Distribution Status', type: 'textarea', required: false },
      { key: 'contact', label: 'Creator / Rights Contact', type: 'text', required: false }
    ]
  });

  // Future extension points are registered only when a real consumer exists:
  // event, news-story, opportunity, community-report, radio-segment.
  global.FTN = global.FTN || {};
  global.FTN.EntityMetadataEngine = { registerSchema: registerSchema, validate: validate, createRecord: createRecord, fieldsFor: fieldsFor };
})(window);
