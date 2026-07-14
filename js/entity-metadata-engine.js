// FTN Platform Website — Entity Metadata Engine (Sprint 1, Wave 1).
//
// A reusable metadata *architecture* for FTN entity types (music releases, screen submissions,
// and future types: events, news stories, opportunities, community reports, radio segments) --
// not hardcoded to any one product. Per the founder's explicit refinement: only the schemas
// Sprint 1's real consumers need (music-release for Riddim, screen-submission for Screen) are
// implemented. Other entity types are documented extension points below, not pre-built --
// register a real schema for one only when it gains a real consumer.
//
// A schema is: { fields: [{ key, label, type, required }], toRecord(input) -> a plain object }.
// The engine validates required fields and stamps every record with a consistent envelope
// (entityType, createdAt placeholder, fields) so every consumer's output has the same shape.
(function (global) {
  'use strict';

  var SCHEMAS = {};

  function registerSchema(entityType, schema) {
    SCHEMAS[entityType] = schema;
  }

  function validate(entityType, input) {
    var schema = SCHEMAS[entityType];
    if (!schema) return { valid: false, errors: ['Unknown entity type: ' + entityType] };
    var errors = [];
    schema.fields.forEach(function (f) {
      if (f.required && !String(input[f.key] || '').trim()) {
        errors.push(f.label + ' is required.');
      }
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function createRecord(entityType, input) {
    var v = validate(entityType, input);
    if (!v.valid) return { valid: false, errors: v.errors, record: null };
    var schema = SCHEMAS[entityType];
    var fields = {};
    schema.fields.forEach(function (f) { fields[f.key] = input[f.key] || ''; });
    return {
      valid: true,
      errors: [],
      record: {
        entityType: entityType,
        // A real, honest timestamp of when the record was generated in this session -- not a
        // server-assigned id, since there's no backend yet (see Integration Adapter Layer).
        generatedAt: new Date().toISOString(),
        fields: fields,
      },
    };
  }

  function fieldsFor(entityType) {
    var schema = SCHEMAS[entityType];
    return schema ? schema.fields.slice() : [];
  }

  // --- Real Sprint 1 schemas -----------------------------------------------------------------

  registerSchema('music-release', {
    fields: [
      { key: 'trackTitle', label: 'Track Title', type: 'text', required: true },
      { key: 'artistName', label: 'Artist Name', type: 'text', required: true },
      { key: 'genre', label: 'Genre', type: 'text', required: false },
      { key: 'releaseDate', label: 'Target Release Date', type: 'date', required: false },
      { key: 'credits', label: 'Credits (producer, writers, features)', type: 'textarea', required: false },
      { key: 'isrc', label: 'ISRC (if already assigned)', type: 'text', required: false },
    ],
  });

  registerSchema('screen-submission', {
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'creatorName', label: 'Creator / Studio Name', type: 'text', required: true },
      { key: 'genre', label: 'Genre', type: 'text', required: false },
      { key: 'runtime', label: 'Runtime (minutes)', type: 'text', required: false },
      { key: 'synopsis', label: 'Synopsis', type: 'textarea', required: true },
    ],
  });

  // --- Documented extension points, not implemented this sprint ------------------------------
  // Each of these becomes a real registerSchema() call once a real product needs it -- adding one
  // does not require changing this engine, only adding the schema definition (see the two above
  // for the pattern). Intentionally left unregistered, not stubbed with fake fields:
  //   'event'              -- FTN Events, if/when it needs structured entity records beyond its
  //                           own Generator Engine checklist output
  //   'news-story'         -- FTN Kaiso
  //   'opportunity'        -- FTN Opportunities
  //   'community-report'   -- Community Connect (would need coordination with its own repo)
  //   'radio-segment'      -- FTN Radio

  global.FTN = global.FTN || {};
  global.FTN.EntityMetadataEngine = {
    registerSchema: registerSchema,
    validate: validate,
    createRecord: createRecord,
    fieldsFor: fieldsFor,
  };
})(window);
