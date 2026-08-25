// FTN Platform — shared Node-side Product Registry loader.
//
// js/product-registry-data.js and js/product-registry.js are written as browser IIFEs
// (`(function(global){...})(window)`), not ES modules — this loads them under Node via a minimal
// `window` shim rather than forking the source into a second module-shaped copy. Extracted here
// (Phase 3 nav consolidation) once a third build script needed the identical logic that
// scripts/generate-sitemap.mjs and scripts/sync-footer.mjs already carried independently.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadRegistry(root) {
  const fakeWindow = {};
  const dataSrc = readFileSync(resolve(root, 'js/product-registry-data.js'), 'utf8');
  const apiSrc = readFileSync(resolve(root, 'js/product-registry.js'), 'utf8');
  const fn = new Function('window', dataSrc + '\n' + apiSrc);
  fn(fakeWindow);
  return fakeWindow.FTN.ProductRegistry;
}
