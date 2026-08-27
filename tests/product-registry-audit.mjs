import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('js/product-registry-data.js','utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(source,context);
const products=context.window.FTN.ProductRegistryData;
assert(Array.isArray(products),'Product Registry did not produce an array');

const required=['platform-home','community-connect','mission-control','scenario-workspace','govern','ibis-ai','parliament','facethenation','events','screen','tv','ftn-live','display','learn','radio','riddim','ftn-fire','kaiso','dj-tube','daw','epk','opportunities','love','display-network','invest','top-picks','account','health'];
for(const id of required)assert(products.some(p=>p.id===id),`Required FTN product missing: ${id}`);
assert.equal(new Set(products.map(p=>p.id)).size,products.length,'Product Registry IDs must be unique');

const fields=['id','name','shortName','route','parentProduct','status','publicVisibility','owner','description','primaryUser','primaryJourney','callsToAction','atmosphere','visualMnemonic','icon','heroAsset','dataSources','accessRules','featureFlags','relatedProducts','legalNotices','analyticsClassification','lastVerified','releaseVersion'];
for(const p of products){
  for(const field of fields)assert(Object.prototype.hasOwnProperty.call(p,field),`${p.id} missing registry field ${field}`);
  assert(['LIVE','AVAILABLE','PRIVATE','PHASE 2','ILLUSTRATIVE','TEMPORARILY UNAVAILABLE','VAULTED'].includes(p.status),`${p.id} has unsupported status ${p.status}`);
  assert.match(p.route,/^\//,`${p.id} route must be root-relative`);
  assert.match(p.lastVerified,/^\d{4}-\d{2}-\d{2}$/,`${p.id} verification date is invalid`);
}

const love=products.find(p=>p.id==='love');
assert.equal(love.status,'VAULTED');assert.equal(love.publicVisibility,false);
const health=products.find(p=>p.id==='health');
assert.equal(health.status,'VAULTED');assert.equal(health.publicVisibility,false);
vm.runInContext(fs.readFileSync('js/product-registry.js','utf8'),context);
const publicIds=context.window.FTN.ProductRegistry.publicProducts({includeSupporting:true}).map(p=>p.id);
assert(!publicIds.includes('love')&&!publicIds.includes('health'),'Vaulted products escaped the public Product Registry API');
assert.equal(context.window.FTN.ProductRegistry.search('love health').length,0,'Vaulted products escaped public Product Registry search');
const mission=products.find(p=>p.id==='mission-control');assert.equal(mission.status,'PRIVATE');assert.equal(mission.publicVisibility,false);
assert.equal(products.find(p=>p.id==='scenario-workspace').status,'ILLUSTRATIVE');
assert.equal(products.find(p=>p.id==='govern').status,'AVAILABLE');
const fire=products.find(p=>p.id==='ftn-fire');
assert(fire,'FTN Fire supporting product missing');assert.equal(fire.parentProduct,'riddim');assert.equal(fire.principal,false);assert(fire.capabilities.includes('flow-music-handoff'));assert.match(fire.description,/without generated lyrics or vocalist/i);
const ibis=products.find(p=>p.id==='ibis-ai');assert(ibis.capabilities.includes('creative-project-planning'),'ibis Creative Studio capability missing');assert(ibis.featureFlags.includes('provider-cost-lock'),'ibis provider cost lock missing');

const sitemap=fs.readFileSync('sitemap.xml','utf8'),manifest=fs.readFileSync('manifest.webmanifest','utf8'),robots=fs.readFileSync('robots.txt','utf8');
for(const p of products.filter(p=>p.publicVisibility!==false&&!['PRIVATE','VAULTED'].includes(p.status)&&p.id!=='account'&&p.principal!==false))assert(sitemap.includes(`https://ftnplatform.org${p.route}`),`Public product absent from sitemap: ${p.id}`);
for(const route of ['/account/','/god-mode/','/mission-control/','/love/','/health/'])assert(!sitemap.includes(`https://ftnplatform.org${route}`),`Non-public route leaked into sitemap: ${route}`);
assert(!manifest.includes('/god-mode/'),'God Mode must not appear in the public manifest');
assert(!manifest.includes('/love/'),'Sensitive Love workspace must not appear in the public manifest');
assert(!manifest.includes('/health/'),'Vaulted Health route must not appear in the public manifest');
for(const route of ['/account/','/god-mode/'])assert(robots.includes(`Disallow: ${route}`),`${route} must be disallowed in robots.txt`);
for(const file of ['love/index.html','health/index.html'])assert.match(fs.readFileSync(file,'utf8'),/<meta name=["']robots["'] content=["']noindex,follow["']/i,`${file} must tell search engines not to index the vaulted product`);

const publicHtml=['index.html','applications/index.html','js/ftn-directory.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
assert(!/['"](?:love|health)['"]/.test(publicHtml),'Vaulted products must not be advertised by public directory source');
assert(context.window.FTN.ProductRegistry.ecosystemGroups().some(group=>group.products.some(product=>product.id==='govern')),'FTN Govern must be advertised in the Product Registry ecosystem groups');
assert(!/\bBETA\b/.test(publicHtml),'Public release source must not advertise a stale BETA state');

const directorySource=fs.readFileSync('js/ftn-directory.js','utf8');
const firstClassDirectoryIds=['community-connect','govern','parliament','facethenation','ftn-live','display','learn','kaiso','ibis-ai','scenario-workspace','radio','screen','tv','riddim','ftn-fire','dj-tube','daw','epk','opportunities','invest','top-picks','events','display-network'];
const ecosystemGroups=context.window.FTN.ProductRegistry.ecosystemGroups();
const groupedIds=ecosystemGroups.flatMap(group=>group.products.map(product=>product.id));
for(const id of firstClassDirectoryIds)assert(groupedIds.includes(id),`Active product missing from Product Registry ecosystem groups: ${id}`);
assert(directorySource.includes('Registry.ecosystemGroups()'),'FTN Directory must consume registry-defined ecosystem groups');
assert(!directorySource.includes("'mission-control'"),'Mission Control must not be exposed in the FTN Directory');
for(const name of ['FTN Community Connect','FTN Face The Nation','ibis-ai','FTN Invest-in','FTN Radio','FTN Screen','FTN Opportunities','FTN DJ Tube','FTN Picks','FTN Live','FTN Learn'])assert(products.some(p=>p.name===name),`Canonical product name missing: ${name}`);
// FTN Live compatibility migration (2026-08-24 founder decision): 'FTN Display' is deliberately
// no longer required as an independent canonical name -- it is consolidated into FTN Screen as
// Display Mode (parentProduct:'screen'), which is why 'FTN Screen' above already covers it.
assert.equal(products.find(p=>p.id==='display').parentProduct,'screen','FTN Display must be a capability of FTN Screen (Display Mode), not an independent product');
assert.equal(products.find(p=>p.id==='ftn-live').name,'FTN Live','FTN Live must be the canonical public name at the ftn-live registry id');
for(const p of products.filter(p=>firstClassDirectoryIds.includes(p.id)))assert(groupedIds.includes(p.id),`${p.name} has no registry group mapping`);

// Sitewide ecosystem-header pass (founder directive): the global nav dropped abstract pillar
// labels (NOW/COMMUNITY/CULTURE/OPPORTUNITY) for real "FTN <Product>" names plus an "FTN
// Ecosystem" overflow menu -- every FTN product keeps its FTN prefix in user-facing nav, never
// abbreviated. See CLAUDE.md and js/nav.js's own PRIMARY_NAV comment for the full record.
//
// FTN Live compatibility migration (2026-08-24 founder decision, BUILD NOW): supersedes the prior
// "Ecosystem Simplification pass" note below. FTN Live is the canonical public umbrella again --
// NOW is its default current-information view, Observer Console its advanced interface, both
// served at the existing /observatory/ route (no URL change, no analytics history lost). FTN
// Display is consolidated into FTN Screen as Display Mode, still served at /display/.
//
// Superseded history: the "Ecosystem Simplification pass" previously retired FTN Live as an
// independent identity (renamed FTN Observer -- deep investigation, distinct from the then-
// separate ambient FTN Display) and retired FTN Now outright (superseded by FTN Display). That
// decision no longer holds; both old routes still redirect rather than 404, just to updated
// targets (see the _redirects assertions below).
// Phase 3 nav consolidation (2026-08-24 founder decision, BUILD NOW) supersedes the "Founder
// Walkthrough Repair Pass" note this comment used to carry, which had cut PRIMARY_NAV to 5 items
// because 11 permanently-visible items wrapped the header actions cluster at wide viewports. That
// visual regression was re-verified and addressed (see GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md)
// rather than left as a reason to keep the list short -- PRIMARY_NAV is registry-driven now (see
// data/nav-config.mjs, scripts/sync-nav.mjs) and restored to the founder's approved 8-product,
// 11-item structure. FTN Display is deliberately absent (consolidated into FTN Screen as Display
// Mode, so it is covered by 'FTN Screen' in the canonical-name assertion above and by the
// ecosystem-group assertions, not by primary nav). Full content/order/registry-link assertions
// live in tests/nav-registry-audit.mjs, not duplicated here.
const navSource=fs.readFileSync('js/nav.js','utf8');
for(const name of ['FTN Platform','FTN Community Connect','FTN Live','FTN Directory','FTN Ecosystem'])assert(navSource.includes(`'${name}'`)||navSource.includes(name),`Global primary navigation missing canonical FTN product name: ${name}`);
assert(navSource.includes('FTN Invest-in'),'Global navigation must use the canonical FTN Invest-in name');
assert(!/PRIMARY_NAV\s*=\s*\[[^\]]*'FTN Display'/s.test(navSource),'FTN Display must not silently re-enter the primary nav array (it is a capability of FTN Screen, not an independent nav entry)');
// FTN Live compatibility migration (2026-08-24 founder decision): inverts the prior guard, which
// forbade 'FTN Live' from appearing in navigation. It is required now, not forbidden -- FTN Live
// is the canonical umbrella product; Observer Console is its advanced interface, not a competing
// nav entry, so 'FTN Observer' is deliberately no longer required here.
assert(navSource.includes("'FTN Live'"),'FTN Live must appear as the canonical current-conditions product name in global navigation');
assert(!fs.existsSync('now/index.html'),'NOW is FTN Live\'s default view at the existing /observatory/ route, not a standalone page -- it should still not exist as its own product page');
assert(!sitemap.includes('https://ftnplatform.org/now/'),'/now/ is a redirect into FTN Live, not a crawlable page of its own -- must not be advertised in the sitemap');
assert(sitemap.includes('https://ftnplatform.org/display/'),'FTN Display is absent from the sitemap');
assert(sitemap.includes('https://ftnplatform.org/learn/'),'FTN Learn is absent from the sitemap');
const redirectsSource=fs.readFileSync('_redirects','utf8');
assert(/^\/live\/?\s+\/observatory\/\s+301/m.test(redirectsSource)||redirectsSource.includes('/live/ /observatory/ 301'),'/live/ must redirect to FTN Live\'s real route so no external link breaks');
// FTN Live compatibility migration (2026-08-24 founder decision): /now/ now redirects into FTN
// Live (/observatory/), not FTN Display -- NOW is FTN Live's default view, not covered by Display
// under the new architecture. Retargeting this redirect, not removing it: no external link breaks.
assert(redirectsSource.includes('/now/ /observatory/ 301'),'/now/ must redirect into FTN Live so no external link breaks');
assert(!/PRIMARY_NAV[^;]+Mission Control/s.test(navSource),'Mission Control must not enter public navigation');
assert(navSource.includes('ecosystemGroups()'),'FTN Ecosystem menu must be built from the Product Registry, not a second hardcoded list');
assert.match(fs.readFileSync('service-worker.js','utf8'),/VERSION='ftn-public-v2\.4\.2'/,'Service-worker cache namespace was not advanced for changed assets');
const analyticsSource=fs.readFileSync('js/analytics.js','utf8');
assert(analyticsSource.includes('6b49afbc-3929-4855-bda8-eff8755f685d'),'Umami website ID is missing');
assert(analyticsSource.includes("data-exclude-search"),'Analytics must exclude URL search parameters');
assert(analyticsSource.includes("data-do-not-track"),'Analytics must respect browser do-not-track');
for(const event of ['navigation_select','product_open','source_open'])assert(analyticsSource.includes(event),`Safe analytics event missing: ${event}`);
assert(!analyticsSource.includes('account_action'),'Account actions must not be sent to analytics');
for(const route of ['account','god-mode','love','health','mission-control','ibis-ai'])assert(analyticsSource.includes(route),`Private analytics exclusion missing: ${route}`);
assert(!/email|access_token|user_id|textContent\s*[,)]/.test(analyticsSource),'Analytics source must not collect identity, tokens or visible text');
assert(navSource.includes('/js/analytics.js?v=20260818.3'),'Global navigation must load the current privacy-safe analytics module');

const htmlFiles=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.name.endsWith('.html'))htmlFiles.push(full);}}walk('.');
for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8');if(html.includes('/js/nav.js'))assert(html.includes('/js/nav.js?v=20260824.5'),`${file} uses a stale global navigation asset URL`);}
for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8');for(const asset of ['product-registry-data','product-registry'])if(html.includes(`/js/${asset}.js`))assert(html.includes(`/js/${asset}.js?v=20260822.1`),`${file} uses a stale ${asset} asset URL`);}
for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8'),match=html.match(/<link rel=["']canonical["'] href=["']([^"']+)/i);if(match)assert(/^https:\/\/ftnplatform\.org\//.test(match[1]),`${file} has non-apex canonical ${match[1]}`);}
for(const file of htmlFiles.filter(file=>!['love/index.html','health/index.html'].includes(file))){
  const html=fs.readFileSync(file,'utf8');
  assert(!/href=["']\/(?:love|health)\//i.test(html),`${file} advertises a vaulted product`);
}

// Phase 5A (2026-08-25): FTN Statistics registry + sitemap integration.
const statistics=products.find(p=>p.id==='statistics');
assert(statistics,'FTN Statistics product missing from the registry');
assert.equal(statistics.route,'/statistics/');assert.equal(statistics.status,'AVAILABLE');
assert(ecosystemGroups.some(group=>group.id==='information-intelligence'&&group.products.some(p=>p.id==='statistics')),'FTN Statistics must be grouped under information-intelligence');
assert(sitemap.includes('https://ftnplatform.org/statistics/'),'FTN Statistics is absent from the sitemap');
for(const module of statistics.ownerModules)assert(fs.existsSync(module),`FTN Statistics ownerModule does not exist on disk: ${module}`);
assert(fs.readFileSync('data/footer-config.mjs','utf8').includes("registry: 'statistics'"),'FTN Statistics is missing from the shared footer config');

console.log(`${required.length}/${required.length} required FTN products are present with complete registry metadata.`);
console.log('Vaulted products are excluded from public discovery; FTN Fire remains nested under Riddim; private routes are excluded from sitemap and manifest.');
console.log('FTN Statistics is registered, grouped, sitemapped and footer-linked.');
