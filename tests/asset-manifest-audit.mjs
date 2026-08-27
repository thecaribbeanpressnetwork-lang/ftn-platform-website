import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),media=new Set(['.svg','.png','.jpg','.jpeg','.webp','.avif','.gif','.mp4','.webm','.mp3','.wav','.pdf']);
async function walk(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,entry.name);if(entry.isDirectory())out.push(...await walk(p));else if(media.has(extname(p).toLowerCase()))out.push(p);}return out;}
const files=await walk(resolve(root,'assets'));
const csv=await readFile(resolve(root,'GOVERNANCE/FTN_Visual_Asset_Manifest_2026-08-10.csv'),'utf8');
const surface=JSON.parse(await readFile(resolve(root,'data/ftn-surface-assets.json'),'utf8'));
const structuredAssets=new Set((surface.surfaces||[]).filter(x=>x&&x.approvedForProduction&&x.productionAsset).map(x=>String(x.productionAsset).replace(/^\//,'')));
for(const file of files){const relative=file.slice(root.length+1).replaceAll('\\','/');assert(csv.includes(relative)||structuredAssets.has(relative),`Asset missing from approved visual manifests: ${relative}`);}
assert.match(csv,/file_hash_sha256/);assert.match(csv,/approval_status/);assert.match(csv,/accessibility_text/);assert.match(csv,/replacement_history/);
for(const relative of structuredAssets){assert(relative.startsWith('assets/'),`Structured production asset must live under assets/: ${relative}`);}
console.log(`${files.length}/${files.length} visual assets are represented in the legacy ledger or approved structured surface manifest.`);
