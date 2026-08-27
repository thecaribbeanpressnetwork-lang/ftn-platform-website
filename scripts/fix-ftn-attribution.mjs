import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const skip=new Set(['.git','node_modules']);
let changed=0;
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(ent.isFile()&&p.endsWith('.html'))fix(p);}}
function fix(file){let s=fs.readFileSync(file,'utf8'),n=s;
n=n.replaceAll('FTN Platform is built and operated by RealityArtTV Media, connecting citizens, governments, media, and partners through one integrated platform. Every relationship starts here.','FTN Platform connects citizens, governments, media, businesses, and partners through one integrated Caribbean digital ecosystem. Every relationship starts here.');
n=n.replaceAll('You can also follow FTN Platform and RealityArtTV\n            Media directly on the channels below.','You can also follow FTN Platform directly on the channels below.');
n=n.replaceAll('© 2026 RealityArtTV Media. All Rights Reserved.','© 2026 FTN Platform. All Rights Reserved. Designed by Boss Consulting.');
if(n!==s){fs.writeFileSync(file,n);changed++;}}
walk(root);
console.log(`FTN attribution repair updated ${changed} HTML file(s).`);
