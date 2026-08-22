// FTN Platform Website — shared Save/Unsave primitive.
//
// No shared save/bookmark pattern existed before this: js/opportunities-workspace.js already
// has its own working save feature (STORE='ftn-opportunities-saved-v3'), but it's a private
// implementation detail of that one file, not something another product can reuse. This is the
// smallest FTN-owned primitive that IS reusable — one localStorage-backed list via the existing
// js/storage.js JSON helper, not a new database (client-side saves work identically for guests
// and signed-in users today, matching how js/account.js already treats browser-local data as
// the honest current state of "My FTN" rather than claiming a cloud backup that doesn't exist).
//
// Item shape: { id, type, title, url, savedAt }. `type` namespaces ids across products
// (e.g. 'observer:weather-radar') so two products can never collide on the same id.
(function (global) {
  'use strict';

  var KEY = 'ftn-saved-items-v1';

  function list() {
    var storage = global.FTN && global.FTN.storage;
    var items = storage ? storage.getJSON(KEY, []) : [];
    return Array.isArray(items) ? items : [];
  }

  function isSaved(type, id) {
    return list().some(function (item) { return item.type === type && item.id === id; });
  }

  function save(item) {
    if (!item || !item.type || !item.id) return false;
    var storage = global.FTN && global.FTN.storage;
    if (!storage) return false;
    var items = list();
    if (items.some(function (x) { return x.type === item.type && x.id === item.id; })) return true;
    items.push({
      type: item.type,
      id: item.id,
      title: String(item.title || item.id),
      url: item.url || null,
      savedAt: new Date().toISOString()
    });
    return storage.setJSON(KEY, items);
  }

  function unsave(type, id) {
    var storage = global.FTN && global.FTN.storage;
    if (!storage) return false;
    var items = list().filter(function (x) { return !(x.type === type && x.id === id); });
    return storage.setJSON(KEY, items);
  }

  function toggle(item) {
    if (!item || !item.type || !item.id) return false;
    if (isSaved(item.type, item.id)) { unsave(item.type, item.id); return false; }
    save(item);
    return true;
  }

  function count() { return list().length; }

  global.FTN = global.FTN || {};
  global.FTN.Save = { list: list, isSaved: isSaved, save: save, unsave: unsave, toggle: toggle, count: count };
})(window);
