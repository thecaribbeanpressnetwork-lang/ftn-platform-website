// FTN Platform — shared, headless EPK (Electronic Press Kit) record schema (FTN Consolidation,
// 2026-09-18).
//
// Extracted from js/radio-workspace.js's inline EPK submit handler so the exact same record shape
// and validation rules are available to ibis's EPK_GENERATION capability, not just the Radio page.
// No DOM dependency: buildRecord() takes a plain data object (whatever collected it -- a form, a
// chat turn, a future creator-onboarding flow), never reads document/window UI state.
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 3;
  var LINK_KEYS = ['youtube', 'spotify', 'beatstars', 'apple', 'soundcloud', 'bandcamp', 'instagram', 'tiktok', 'website'];

  function safeUrl(v) {
    v = (v || '').trim(); if (!v) return '';
    try { var u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch (e) { return ''; }
  }

  // `data`: { name, email, country, roles, bio, <one key per LINK_KEYS>, photoReferences: [url,...],
  // localPhotoMetadata: [{name,type,size,width,height},...] }. Every link is re-validated as a real
  // https URL here (never trusted from the caller) -- an invalid/unsafe URL is silently dropped,
  // exactly as the Radio page's own form handler already did.
  function buildRecord(data) {
    data = data || {};
    var links = {};
    LINK_KEYS.forEach(function (key) { var u = safeUrl(data[key]); if (u) links[key] = u; });
    var photoReferences = (Array.isArray(data.photoReferences) ? data.photoReferences : []).map(safeUrl).filter(Boolean);
    return {
      schemaVersion: SCHEMA_VERSION,
      recordType: 'ftn_epk',
      name: String(data.name || '').trim(),
      email: String(data.email || '').trim(),
      country: String(data.country || '').trim(),
      roles: String(data.roles || '').trim(),
      bio: String(data.bio || '').trim(),
      links: links,
      photoReferences: photoReferences,
      // Local press-photo FILES never leave the device (see radio-workspace.js's photo-intake UI)
      // -- only harmless, non-identifying metadata (filename/type/size/dimensions) is kept in the
      // portable record, exactly as the Radio page's own rights notice already discloses.
      localPhotoMetadata: Array.isArray(data.localPhotoMetadata) ? data.localPhotoMetadata.slice() : [],
      ftnAttribution: 'https://ftnplatform.org/',
      createdAt: new Date().toISOString(),
    };
  }

  // Same required-field rule the Radio page's own form already enforces (name/email/bio).
  function validate(record) {
    var errors = [];
    if (!record || !record.name) errors.push('Creator name is required.');
    if (!record || !record.email) errors.push('Professional email is required.');
    if (!record || !record.bio) errors.push('A short professional bio is required.');
    return errors;
  }

  // Portable export: a plain, versioned JSON string -- reusable as a download, a clipboard value
  // or an ibis-returned artifact, independent of whatever UI produced the record.
  function toPortableJSON(record) { return JSON.stringify(record, null, 2); }

  global.FTN = global.FTN || {};
  global.FTN.EpkSchema = { SCHEMA_VERSION: SCHEMA_VERSION, LINK_KEYS: LINK_KEYS, safeUrl: safeUrl, buildRecord: buildRecord, validate: validate, toPortableJSON: toPortableJSON };
})(typeof window !== 'undefined' ? window : globalThis);
