// FTN Platform Website — Entity Metadata Engine (Sprint 1, Wave 1).
//
// Reusable metadata architecture for FTN entity types. Schemas define the fields a real
// consumer needs; the engine validates required fields and stamps records with a consistent
// envelope. Product-specific workflow rules stay in the product workspace, not in this engine.
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
    return {
      valid: true,
      errors: [],
      record: {
        entityType: entityType,
        generatedAt: new Date().toISOString(),
        fields: fields
      }
    };
  }

  function fieldsFor(entityType) {
    var schema = SCHEMAS[entityType];
    return schema ? schema.fields.slice() : [];
  }

  // Canonical FTN Riddim music record. Unknown values remain blank until supplied or confirmed;
  // the workspace may display them as em dashes in exports rather than inventing metadata.
  registerSchema('music-release', {
    fields: [
      { key: 'catalogNo', label: 'Catalog No.', type: 'text', required: false },
      { key: 'trackTitle', label: 'Track Title', type: 'text', required: true },
      { key: 'version', label: 'Version', type: 'text', required: false },
      { key: 'artistName', label: 'Artist', type: 'text', required: true },
      { key: 'albumTitle', label: 'Album / Release Title', type: 'text', required: false },
      { key: 'composers', label: 'Composer(s) / Writer(s)', type: 'textarea', required: false },
      { key: 'producer', label: 'Producer', type: 'text', required: false },
      { key: 'studio', label: 'Studio', type: 'text', required: false },
      { key: 'contact', label: 'Contact', type: 'text', required: false },
      { key: 'artistIpi', label: 'Artist / Writer IPI / CAE', type: 'text', required: false },
      { key: 'genre', label: 'Genre', type: 'text', required: false },
      { key: 'subgenre', label: 'Subgenre', type: 'text', required: false },
      { key: 'bpm', label: 'BPM', type: 'text', required: false },
      { key: 'key', label: 'Musical Key', type: 'text', required: false },
      { key: 'tempoFeel', label: 'Tempo Feel', type: 'text', required: false },
      { key: 'vocalsPresent', label: 'Vocals Present', type: 'text', required: false },
      { key: 'explicit', label: 'Explicit Content', type: 'text', required: false },
      { key: 'moods', label: 'Mood(s)', type: 'text', required: false },
      { key: 'instruments', label: 'Instruments', type: 'textarea', required: false },
      { key: 'description', label: 'Description', type: 'textarea', required: false },
      { key: 'tags', label: 'Tags', type: 'textarea', required: false },
      { key: 'similarTo', label: 'Similar To', type: 'textarea', required: false },
      { key: 'coverArtDirection', label: 'Cover Art Direction', type: 'textarea', required: false },
      { key: 'isrc', label: 'ISRC', type: 'text', required: false },
      { key: 'upcEan', label: 'UPC / EAN', type: 'text', required: false },
      { key: 'iswc', label: 'ISWC', type: 'text', required: false },
      { key: 'pro', label: 'PRO / CMO', type: 'text', required: false },
      { key: 'publisher', label: 'Publisher / Administrator', type: 'text', required: false },
      { key: 'adminIpi', label: 'Publishing Administrator IPI', type: 'text', required: false },
      { key: 'publishingSplits', label: 'Publishing / Writer Splits', type: 'textarea', required: false },
      { key: 'publishingAdminAgreement', label: 'FTN Publishing Administration Agreement', type: 'text', required: false },
      { key: 'masterOwner', label: 'Master Owner', type: 'text', required: false },
      { key: 'territory', label: 'Territory', type: 'text', required: false },
      { key: 'usageRestrictions', label: 'Usage Restrictions', type: 'textarea', required: false },
      { key: 'clearanceNotes', label: 'Clearance Notes', type: 'textarea', required: false },
      { key: 'priceTier', label: 'Price Tier', type: 'text', required: false },
      { key: 'releaseDate', label: 'Target Release Date', type: 'date', required: false },
      { key: 'status', label: 'Release Status', type: 'text', required: false },
      { key: 'audioUrl', label: 'Audio URL', type: 'text', required: false },
      { key: 'coverUrl', label: 'Cover URL', type: 'text', required: false },
      { key: 'stemsUrl', label: 'Stems URL', type: 'text', required: false },
      { key: 'localFilePath', label: 'Local File / Source Name', type: 'text', required: false },
      { key: 'notes', label: 'Notes', type: 'textarea', required: false }
    ]
  });

  registerSchema('screen-submission', {
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'creatorName', label: 'Creator / Studio Name', type: 'text', required: true },
      { key: 'genre', label: 'Genre', type: 'text', required: false },
      { key: 'runtime', label: 'Runtime (minutes)', type: 'text', required: false },
      { key: 'synopsis', label: 'Synopsis', type: 'textarea', required: true }
    ]
  });

  global.FTN = global.FTN || {};
  global.FTN.EntityMetadataEngine = {
    registerSchema: registerSchema,
    validate: validate,
    createRecord: createRecord,
    fieldsFor: fieldsFor
  };
})(window);
