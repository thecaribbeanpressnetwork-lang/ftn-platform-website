import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),media=new Set(['.svg','.png','.jpg','.jpeg','.webp','.avif','.gif','.mp4','.webm','.mp3','.wav','.pdf']);
async function walk(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,entry.name);if(entry.isDirectory())out.push(...await walk(p));else if(media.has(extname(p).toLowerCase()))out.push(p);}return out;}
const files=await walk(resolve(root,'assets')),csv=await readFile(resolve(root,'GOVERNANCE/FTN_Visual_Asset_Manifest_2026-08-10.csv'),'utf8');
for(const file of files){const relative=file.slice(root.length+1).replaceAll('\\','/');assert(csv.includes(relative),`Asset missing from manifest: ${relative}`);}
assert.match(csv,/file_hash_sha256/);assert.match(csv,/approval_status/);assert.match(csv,/accessibility_text/);assert.match(csv,/replacement_history/);
console.log(`${files.length}/${files.length} visual assets are represented in the release manifest.`);
