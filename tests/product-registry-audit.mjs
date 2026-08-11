import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('js/product-registry-data.js','utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(source,context);
const products=context.window.FTN.ProductRegistryData;
assert(Array.isArray(products),'Product Registry did not produce an array');

const required=['platform-home','community-connect','mission-control','ibis-ai','parliament','facethenation','events','screen','tv','ftn-live','radio','riddim','kaiso','dj-tube','daw','opportunities','love','display-network','invest','account','health'];
for(const id of required)assert(products.some(p=>p.id===id),`Required FTN product missing: ${id}`);
assert.equal(new Set(products.map(p=>p.id)).size,products.length,'Product Registry IDs must be unique');

const fields=['id','name','shortName','route','parentProduct','status','publicVisibility','owner','description','primaryUser','primaryJourney','callsToAction','atmosphere','visualMnemonic','icon','heroAsset','dataSources','accessRules','featureFlags','relatedProducts','legalNotices','analyticsClassification','lastVerified','releaseVersion'];
for(const p of products){
  for(const field of fields)assert(Object.prototype.hasOwnProperty.call(p,field),`${p.id} missing registry field ${field}`);
  assert(['LIVE','BETA','MAINTENANCE','PRIVATE','PHASE 2'].includes(p.status),`${p.id} has unsupported status ${p.status}`);
  assert.match(p.route,/^\//,`${p.id} route must be root-relative`);
  assert.match(p.lastVerified,/^\d{4}-\d{2}-\d{2}$/,`${p.id} verification date is invalid`);
}

const phaseTwo=products.filter(p=>p.status==='PHASE 2');
assert.equal(phaseTwo.map(p=>p.id).join(','),'health','FTN Health must be the sole Phase 2 product');
const love=products.find(p=>p.id==='love');
assert.equal(love.status,'PRIVATE');assert.equal(love.publicVisibility,false);
const fire=products.find(p=>p.id==='ftn-fire');
assert(fire,'FTN Fire supporting product missing');assert.equal(fire.parentProduct,'riddim');assert.equal(fire.principal,false);assert(fire.capabilities.includes('wav-export'));assert.match(fire.description,/without generated lyrics or vocalist/i);
const ibis=products.find(p=>p.id==='ibis-ai');assert(ibis.capabilities.includes('creative-project-planning'),'ibis Creative Studio capability missing');assert(ibis.featureFlags.includes('provider-cost-lock'),'ibis provider cost lock missing');

const sitemap=fs.readFileSync('sitemap.xml','utf8'),manifest=fs.readFileSync('manifest.webmanifest','utf8'),robots=fs.readFileSync('robots.txt','utf8');
for(const p of products.filter(p=>p.publicVisibility!==false&&p.status!=='PRIVATE'&&p.id!=='account'&&p.principal!==false))assert(sitemap.includes(`https://ftnplatform.org${p.route}`),`Public product absent from sitemap: ${p.id}`);
for(const route of ['/account/','/god-mode/','/love/'])assert(!sitemap.includes(`https://ftnplatform.org${route}`),`Private route leaked into sitemap: ${route}`);
assert(!manifest.includes('/god-mode/'),'God Mode must not appear in the public manifest');
assert(!manifest.includes('/love/'),'Private Love must not appear in the public manifest');
for(const route of ['/account/','/god-mode/','/love/'])assert(robots.includes(`Disallow: ${route}`),`${route} must be disallowed in robots.txt`);

const publicHtml=['index.html','applications/index.html'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
assert(!/href=["']\/love\//.test(publicHtml),'Private Love must not be advertised on home/product directory source');

const htmlFiles=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.name.endsWith('.html'))htmlFiles.push(full);}}walk('.');
for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8'),match=html.match(/<link rel=["']canonical["'] href=["']([^"']+)/i);if(match)assert(/^https:\/\/ftnplatform\.org\//.test(match[1]),`${file} has non-apex canonical ${match[1]}`);}

console.log(`${required.length}/${required.length} required FTN products are present with complete registry metadata.`);
console.log('Health is the sole PHASE 2 product; FTN Fire is nested under Riddim; private routes are excluded from public discovery, sitemap and manifest.');
