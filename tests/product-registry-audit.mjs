import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('js/product-registry-data.js','utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(source,context);
const products=context.window.FTN.ProductRegistryData;
assert(Array.isArray(products),'Product Registry did not produce an array');

const required=['platform-home','community-connect','mission-control','scenario-workspace','govern','ibis-ai','parliament','facethenation','events','screen','tv','ftn-live','radio','riddim','ftn-fire','kaiso','dj-tube','daw','epk','opportunities','love','display-network','invest','top-picks','account','health'];
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
const firstClassDirectoryIds=['community-connect','govern','parliament','facethenation','ftn-live','kaiso','ibis-ai','scenario-workspace','radio','screen','tv','riddim','ftn-fire','dj-tube','daw','epk','opportunities','invest','top-picks','events','display-network'];
const ecosystemGroups=context.window.FTN.ProductRegistry.ecosystemGroups();
const groupedIds=ecosystemGroups.flatMap(group=>group.products.map(product=>product.id));
for(const id of firstClassDirectoryIds)assert(groupedIds.includes(id),`Active product missing from Product Registry ecosystem groups: ${id}`);
assert(directorySource.includes('Registry.ecosystemGroups()'),'FTN Directory must consume registry-defined ecosystem groups');
assert(!directorySource.includes("'mission-control'"),'Mission Control must not be exposed in the FTN Directory');
for(const name of ['FTN Community Connect','FTN Face The Nation','FTN ibis.ai','FTN Invest-in','FTN Radio','FTN Screen','FTN Opportunities','FTN DJ Tube','FTN Picks'])assert(products.some(p=>p.name===name),`Canonical product name missing: ${name}`);
for(const p of products.filter(p=>firstClassDirectoryIds.includes(p.id)))assert(groupedIds.includes(p.id),`${p.name} has no registry group mapping`);

// Sitewide ecosystem-header pass (founder directive): the global nav dropped abstract pillar
// labels (NOW/COMMUNITY/CULTURE/OPPORTUNITY) for real "FTN <Product>" names plus an "FTN
// Ecosystem" overflow menu -- every FTN product keeps its FTN prefix in user-facing nav, never
// abbreviated. See CLAUDE.md and js/nav.js's own PRIMARY_NAV comment for the full record.
const navSource=fs.readFileSync('js/nav.js','utf8');
for(const name of ['FTN Platform','FTN Community Connect','FTN Live','FTN Kaiso','FTN Parliament','FTN TV','FTN Screen','FTN Radio','FTN Riddim','FTN Opportunities','FTN ibis.ai','FTN Ecosystem'])assert(navSource.includes(`'${name}'`)||navSource.includes(name),`Global navigation missing canonical FTN product name: ${name}`);
assert(navSource.includes('FTN Invest-in'),'Global navigation must use the canonical FTN Invest-in name');
assert(fs.existsSync('now/index.html'),'NOW homepage is missing');
assert(sitemap.includes('https://ftnplatform.org/now/'),'NOW homepage is absent from the sitemap');
assert(!/PRIMARY_NAV[^;]+Mission Control/s.test(navSource),'Mission Control must not enter public navigation');
assert(navSource.includes('ecosystemGroups()'),'FTN Ecosystem menu must be built from the Product Registry, not a second hardcoded list');
assert.match(fs.readFileSync('service-worker.js','utf8'),/VERSION='ftn-public-v2\.4\.0'/,'Service-worker cache namespace was not advanced for changed assets');
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
for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8');if(html.includes('/js/nav.js'))assert(html.includes('/js/nav.js?v=20260818.3'),`${file} uses a stale global navigation asset URL`);}
for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8');for(const asset of ['product-registry-data','product-registry','ftn-directory'])if(html.includes(`/js/${asset}.js`)){const expected=asset==='product-registry-data'?/\/js\/product-registry-data\.js\?v=20260819\.(?:1|2)/:new RegExp(`/js/${asset}\\.js\\?v=20260819\\.1`);assert(expected.test(html),`${file} uses a stale ${asset} asset URL`);}}
for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8'),match=html.match(/<link rel=["']canonical["'] href=["']([^"']+)/i);if(match)assert(/^https:\/\/ftnplatform\.org\//.test(match[1]),`${file} has non-apex canonical ${match[1]}`);}
for(const file of htmlFiles.filter(file=>!['love/index.html','health/index.html'].includes(file))){
  const html=fs.readFileSync(file,'utf8');
  assert(!/href=["']\/(?:love|health)\//i.test(html),`${file} advertises a vaulted product`);
}

console.log(`${required.length}/${required.length} required FTN products are present with complete registry metadata.`);
console.log('Vaulted products are excluded from public discovery; FTN Fire remains nested under Riddim; private routes are excluded from sitemap and manifest.');
