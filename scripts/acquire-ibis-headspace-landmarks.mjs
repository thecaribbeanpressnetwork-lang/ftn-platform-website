import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT=process.cwd();
const OUTPUT=path.join(ROOT,'assets/ibis/landmarks');
const MANIFEST=path.join(ROOT,'data/ibis-headspace-landmarks.json');
const CREDITS=path.join(OUTPUT,'LICENSE_CREDITS.md');
const selectionOnly=process.argv.includes('--select-only');
const forceIds=new Set((process.argv.find(argument=>argument.startsWith('--force='))||'').slice(8).split(',').filter(Boolean));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const landmarks=[
  ['antigua-nelsons-dockyard','Antigua & Barbuda',"Nelson's Dockyard","Nelson's Dockyard Antigua",'https://en.wikipedia.org/wiki/Nelson%27s_Dockyard'],
  ['antigua-shirley-heights','Antigua & Barbuda','Shirley Heights','Shirley Heights Antigua','https://en.wikipedia.org/wiki/Shirley_Heights,_Antigua'],
  ['antigua-devils-bridge','Antigua & Barbuda',"Devil's Bridge","Devil's Bridge Antigua",'https://en.wikipedia.org/wiki/Devil%27s_Bridge,_Antigua_and_Barbuda'],
  ['bahamas-exuma-cays','The Bahamas','Exuma Cays','Exuma Cays Bahamas','https://en.wikipedia.org/wiki/Exuma'],
  ['bahamas-atlantis','The Bahamas','Atlantis Paradise Island','Atlantis Paradise Island Bahamas','https://en.wikipedia.org/wiki/Atlantis_Paradise_Island'],
  ['bahamas-queens-staircase','The Bahamas',"Queen's Staircase","Queen's Staircase Nassau Bahamas",'https://en.wikipedia.org/wiki/Queen%27s_Staircase'],
  ['barbados-bathsheba','Barbados','Bathsheba','Bathsheba Rock Barbados','https://en.wikipedia.org/wiki/Bathsheba,_Barbados','File:BATHSHEBA ROCK - ST. JOSEPH PARISH - BARBADOS.jpg'],
  ['barbados-bridgetown','Barbados','Historic Bridgetown','Historic Bridgetown Barbados','https://en.wikipedia.org/wiki/Bridgetown'],
  ['barbados-harrisons-cave','Barbados',"Harrison's Cave","Harrison's Cave Barbados",'https://en.wikipedia.org/wiki/Harrison%27s_Cave'],
  ['belize-great-blue-hole','Belize','Great Blue Hole','Great Blue Hole Belize aerial','https://en.wikipedia.org/wiki/Great_Blue_Hole'],
  ['belize-barrier-reef','Belize','Belize Barrier Reef','Belize Barrier Reef aerial','https://en.wikipedia.org/wiki/Belize_Barrier_Reef'],
  ['belize-xunantunich','Belize','Xunantunich','Xunantunich Belize','https://en.wikipedia.org/wiki/Xunantunich'],
  ['cuba-old-havana','Cuba','Old Havana','Old Havana Cuba panorama','https://en.wikipedia.org/wiki/Old_Havana'],
  ['cuba-vinales','Cuba','Viñales Valley','Viñales Valley Cuba panorama','https://en.wikipedia.org/wiki/Vi%C3%B1ales_Valley'],
  ['cuba-trinidad','Cuba','Trinidad','Trinidad Cuba colonial city','https://en.wikipedia.org/wiki/Trinidad,_Cuba'],
  ['dominica-boiling-lake','Dominica','Boiling Lake','Boiling Lake Dominica','https://en.wikipedia.org/wiki/Boiling_Lake'],
  ['dominica-morne-trois-pitons','Dominica','Morne Trois Pitons National Park','Morne Trois Pitons Dominica','https://en.wikipedia.org/wiki/Morne_Trois_Pitons_National_Park'],
  ['dominica-trafalgar-falls','Dominica','Trafalgar Falls','Trafalgar Falls Dominica','https://en.wikipedia.org/wiki/Trafalgar_Falls'],
  ['dominican-zona-colonial','Dominican Republic','Zona Colonial','Zona Colonial Santo Domingo','https://en.wikipedia.org/wiki/Ciudad_Colonial_(Santo_Domingo)'],
  ['dominican-los-tres-ojos','Dominican Republic','Los Tres Ojos','Los Tres Ojos Dominican Republic','https://en.wikipedia.org/wiki/Los_Tres_Ojos'],
  ['dominican-pico-duarte','Dominican Republic','Pico Duarte','Pico Duarte Dominican Republic','https://en.wikipedia.org/wiki/Pico_Duarte'],
  ['grenada-st-georges','Grenada',"St. George's","St. George's Grenada harbour panorama",'https://en.wikipedia.org/wiki/St._George%27s,_Grenada'],
  ['grenada-grand-anse','Grenada','Grand Anse Beach','Grand Anse Beach Grenada','https://en.wikipedia.org/wiki/Grand_Anse_Beach'],
  ['grenada-fort-george','Grenada','Fort George','Fort George Grenada panorama','https://en.wikipedia.org/wiki/Fort_George,_Grenada'],
  ['guyana-kaieteur-falls','Guyana','Kaieteur Falls','Kaieteur Falls Guyana landscape','https://en.wikipedia.org/wiki/Kaieteur_Falls','File:Kaieteur Falls Guyana (2) 2007.jpg'],
  ['guyana-st-georges-cathedral','Guyana',"St. George's Cathedral","St. George's Cathedral Georgetown Guyana",'https://en.wikipedia.org/wiki/St._George%27s_Cathedral,_Georgetown'],
  ['guyana-fort-zeelandia','Guyana','Fort Zeelandia','Fort Zeelandia Guyana','https://en.wikipedia.org/wiki/Fort_Zeelandia_(Guyana)'],
  ['haiti-citadelle','Haiti','Citadelle Laferrière','Citadelle Laferrière Haiti panorama','https://en.wikipedia.org/wiki/Citadelle_Laferri%C3%A8re'],
  ['haiti-sans-souci','Haiti','Sans-Souci Palace','Sans-Souci Palace Haiti','https://en.wikipedia.org/wiki/Sans-Souci_Palace'],
  ['haiti-labadee','Haiti','Labadee','Labadee Haiti coast','https://en.wikipedia.org/wiki/Labadee'],
  ['jamaica-dunns-river','Jamaica',"Dunn's River Falls","Dunn's River Falls Jamaica",'https://en.wikipedia.org/wiki/Dunn%27s_River_Falls'],
  ['jamaica-blue-mountains','Jamaica','Blue Mountains','Blue Mountains Jamaica panorama','https://en.wikipedia.org/wiki/Blue_Mountains_(Jamaica)'],
  ['jamaica-port-royal','Jamaica','Port Royal','Port Royal Jamaica panorama','https://en.wikipedia.org/wiki/Port_Royal'],
  ['st-kitts-brimstone-hill','Saint Kitts & Nevis','Brimstone Hill Fortress','Brimstone Hill Fortress Saint Kitts','https://en.wikipedia.org/wiki/Brimstone_Hill_Fortress_National_Park'],
  ['st-kitts-mount-liamuiga','Saint Kitts & Nevis','Mount Liamuiga','Mount Liamuiga Saint Kitts','https://en.wikipedia.org/wiki/Mount_Liamuiga'],
  ['nevis-charlestown','Saint Kitts & Nevis','Charlestown','Charlestown Nevis panorama','https://en.wikipedia.org/wiki/Charlestown,_Nevis'],
  ['st-lucia-pitons','Saint Lucia','The Pitons','Pitons Saint Lucia panorama','https://en.wikipedia.org/wiki/Pitons'],
  ['st-lucia-sulphur-springs','Saint Lucia','Sulphur Springs','Sulphur Springs Saint Lucia','https://en.wikipedia.org/wiki/Soufrière_Volcanic_Centre'],
  ['st-lucia-marigot-bay','Saint Lucia','Marigot Bay','Marigot Bay Saint Lucia panorama','https://en.wikipedia.org/wiki/Marigot_Bay'],
  ['st-vincent-tobago-cays','Saint Vincent & the Grenadines','Tobago Cays','Tobago Cays panorama','https://en.wikipedia.org/wiki/Tobago_Cays'],
  ['st-vincent-la-soufriere','Saint Vincent & the Grenadines','La Soufrière','La Soufrière Saint Vincent','https://en.wikipedia.org/wiki/La_Soufri%C3%A8re_(volcano)'],
  ['st-vincent-bequia','Saint Vincent & the Grenadines','Bequia','Bequia waterfront panorama','https://en.wikipedia.org/wiki/Bequia'],
  ['suriname-paramaribo','Suriname','Historic Paramaribo','Historic Paramaribo Suriname panorama','https://en.wikipedia.org/wiki/Historic_Inner_City_of_Paramaribo'],
  ['suriname-fort-zeelandia','Suriname','Fort Zeelandia','Fort Zeelandia Suriname','https://en.wikipedia.org/wiki/Fort_Zeelandia_(Paramaribo)'],
  ['suriname-nature-reserve','Suriname','Central Suriname Nature Reserve','Central Suriname Nature Reserve','https://en.wikipedia.org/wiki/Central_Suriname_Nature_Reserve'],
  ['trinidad-maracas-bay','Trinidad & Tobago','Maracas Bay','Maracas Bay Trinidad panorama','https://en.wikipedia.org/wiki/Maracas_Bay'],
  ['trinidad-pitch-lake','Trinidad & Tobago','Pitch Lake','Pitch Lake Trinidad aerial','https://en.wikipedia.org/wiki/Pitch_Lake','File:STAPP 102 La Brea Pitch Lake.jpg'],
  ['tobago-pigeon-point','Trinidad & Tobago','Pigeon Point','Pigeon Point Tobago panorama','https://en.wikipedia.org/wiki/Pigeon_Point,_Tobago'],
  ['venezuela-angel-falls','Venezuela','Angel Falls / Kerepakupai Merú','Angel Falls Venezuela panorama','https://en.wikipedia.org/wiki/Angel_Falls'],
  ['venezuela-roraima','Venezuela','Mount Roraima','Mount Roraima Venezuela panorama','https://en.wikipedia.org/wiki/Mount_Roraima'],
  ['venezuela-coro','Venezuela','Coro Historic Centre','Coro Venezuela historic centre','https://en.wikipedia.org/wiki/Coro,_Venezuela']
].map(([id,country,landmark,search,articleUrl,fileTitle])=>({id,country,landmark,search,articleUrl,fileTitle}));

const allowed=/^(CC0|CC BY(?:-SA)?(?: |$)|Public domain|PDM)/i;
const denied=/\b(map|plano|locator|flag|logo|coat of arms|stamp|coin|banknote|diagram|drawing|engraving|daguerre\w*|poster|portrait|sign|coral|underwater|coast guard|cutter|tradewinds|hmbs)\b/i;
const exactCategories={
  'cuba-old-havana':'Old Havana and its Fortification System','cuba-trinidad':'Trinidad, Cuba',
  'grenada-st-georges':"St. George's, Grenada",'grenada-fort-george':'Fort George, Grenada',
  'haiti-citadelle':'Citadelle Laferrière','haiti-labadee':'Labadee',
  'jamaica-blue-mountains':'Blue Mountains, Jamaica','jamaica-port-royal':'Port Royal, Jamaica',
  'st-kitts-mount-liamuiga':'Mount Liamuiga','nevis-charlestown':'Charlestown, Nevis',
  'st-lucia-marigot-bay':'Marigot Bay','st-vincent-bequia':'Bequia',
  'suriname-paramaribo':'Historic Inner City of Paramaribo','suriname-nature-reserve':'Central Suriname Nature Reserve',
  'trinidad-maracas-bay':'Maracas Bay, Trinidad and Tobago','tobago-pigeon-point':'Pigeon Point, Tobago',
  'venezuela-angel-falls':'Angel Falls','venezuela-coro':'Coro, Venezuela'
};
const exactFiles={
  'antigua-nelsons-dockyard':'File:Antigua English Harbour Nelson\'s Dockyard 4.jpg',
  'antigua-shirley-heights':'File:Antigua Shirley\'s Heights English Harbour.jpg',
  'antigua-devils-bridge':'File:Antigua Willikies Devil\'s Bridge National Park.jpg',
  'bahamas-exuma-cays':'File:Cay in Tar Bay (offshore Great Exuma Island, Bahamas) 1.jpg',
  'bahamas-atlantis':'File:Atlantis Paradise Island resort, Nassau, Bahamas (March 14, 2024).jpg',
  'bahamas-queens-staircase':'File:Bahamas - Nassau, Queens Staircase - panoramio.jpg',
  'barbados-bathsheba':'File:BATHSHEBA ROCK - ST. JOSEPH PARISH - BARBADOS.jpg',
  'barbados-bridgetown':'File:Barbados Parliament and Central Bank.jpg',
  'barbados-harrisons-cave':'File:Harrisons Cave (6835262484).jpg',
  'belize-great-blue-hole':'File:Belize Blue Hole (TMP) (16912331906).jpg',
  'belize-barrier-reef':'File:Caye Caulker Belize Barrier Reef Aerial (119509505).jpeg',
  'belize-xunantunich':'File:Xunantunich Belize 1.jpg',
  'cuba-old-havana':'File:09423 - Havanna Capitol E facade.jpg',
  'cuba-vinales':'File:Viñales Cuba HDSR S5is 1 363.jpg',
  'cuba-trinidad':'File:Colonial Facade - Trinidad - Cuba - 02 (5289981346).jpg',
  'dominica-boiling-lake':'File:Dominica Boiling Lake.jpg',
  'dominica-morne-trois-pitons':'File:Morne Trois Pitons National Park, Dominica - jungle.jpg',
  'dominica-trafalgar-falls':'File:Dominica (Caribbean) - Trafalgar Falls - double-falls (32724044870).jpg',
  'dominican-zona-colonial':'File:Zona Colonial, Santo Domingo, Dominican Republic - panoramio (11).jpg',
  'dominican-los-tres-ojos':'File:Los Tres Ojos768.jpg',
  'dominican-pico-duarte':'File:Pinus occidentalis on Pico Duarte.jpg',
  'grenada-st-georges':'File:Grenada, Karibik - Partial View of St. George\'s - panoramio (2).jpg',
  'grenada-grand-anse':'File:Sunset, Grand Anse beach, Grenada.jpg',
  'grenada-fort-george':'File:Grenada, Karibik - Fort George - panoramio (cropped).jpg',
  'guyana-kaieteur-falls':'File:Kaieteur Falls Guyana (2) 2007.jpg',
  'guyana-st-georges-cathedral':'File:St. Georges Cathedral Georgetown, Guyana.jpg',
  'guyana-fort-zeelandia':'File:20191123 Guyana 0203 Fort Island sRGB.jpg',
  'haiti-citadelle':'File:Citadelle Laferrière Aerial View.jpg',
  'haiti-sans-souci':'File:Sans-Souci Palace, National History Park, Haiti.jpg',
  'haiti-labadee':'File:Labadee ~ Haiti (45506013254).jpg',
  'jamaica-dunns-river':'File:Jamaica Ocho Rios Dunn\'s River Falls (beach).jpg',
  'jamaica-blue-mountains':'File:Blue Mountains, Jamaica.jpg',
  'jamaica-port-royal':'File:Aerial view of Port Royal Jamaica.JPG',
  'st-kitts-brimstone-hill':'File:Saint Kitts - Brimstone Hill Fortress 01.JPG',
  'st-kitts-mount-liamuiga':'File:ISS022-E-39042 - View of the Lesser Antilles.jpg',
  'nevis-charlestown':'File:Nevis Charlestown Ferry Pier 2.jpg',
  'st-lucia-pitons':'File:Soufriere, St. Lucia Sunset.jpg',
  'st-lucia-sulphur-springs':'File:17-04-07 106 Sulphur Springs, Saint Lucia.jpg',
  'st-lucia-marigot-bay':'File:Saint Lucia - Marigot Bay.jpg',
  'st-vincent-tobago-cays':'File:Tobago Cays Sunset Panorama - panoramio.jpg',
  'st-vincent-la-soufriere':'File:La Soufrière Volcano ash plume, Saint Vincent and the Grenadines - April 9th, 2021 (51111518991).jpg',
  'st-vincent-bequia':'File:Admiralty Bay, Port Elizabeth, Bequia, St Vincent and the Grenadines - panoramio.jpg',
  'suriname-paramaribo':'File:Heritage buildings along Zeelandiaweg.jpg',
  'suriname-fort-zeelandia':'File:Inside Fort Zeelandia Abraham Crijnssenweg 1 paramaribo, suriname (photo 2).jpg',
  'suriname-nature-reserve':'File:Amazon jungle from above.jpg',
  'trinidad-maracas-bay':'File:Maracas Bay - Trinidad, West Indies.jpg',
  'trinidad-pitch-lake':'File:STAPP 102 La Brea Pitch Lake.jpg',
  'tobago-pigeon-point':'File:Pigeon Point jetty.jpg',
  'venezuela-angel-falls':'File:Angel Falls Venezuela.jpg',
  'venezuela-roraima':'File:Roraima panorama hi-sky.jpg',
  'venezuela-coro':'File:Calle en Coro 2.JPG'
};
const sceneDayparts={
  'cuba-old-havana':['night'],
  'grenada-grand-anse':['evening'],
  'st-lucia-pitons':['evening'],
  'st-vincent-tobago-cays':['evening']
};
const strip=value=>String(value||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#0?39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const markdown=value=>String(value||'').replaceAll('|','\\|');
const slug=value=>value.replace(/^File:/,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();

async function api(params){
  const url=new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({action:'query',format:'json',origin:'*',...params}).forEach(([key,value])=>url.searchParams.set(key,value));
  const response=await fetch(url,{headers:{'user-agent':'FTN-IBIS-landmark-curation/1.0 (https://ftnplatform.org/)'}});
  if(!response.ok)throw new Error(`Commons API ${response.status} for ${url}`);
  return response.json();
}

function imageRecord(page){
  const info=page.imageinfo?.[0],meta=info?.extmetadata||{};
  if(!info)return null;
  return {title:page.title,url:info.url,sourceWidth:info.width,sourceHeight:info.height,mime:info.mime,author:strip(meta.Artist?.value||meta.Credit?.value||'Unknown'),license:strip(meta.LicenseShortName?.value),licenseUrl:meta.LicenseUrl?.value||'',descriptionUrl:info.descriptionurl};
}

function score(item,entry){
  if(!item||!/^image\/(jpeg|png|webp)$/i.test(item.mime||''))return -Infinity;
  if(!allowed.test(item.license)||denied.test(item.title))return -Infinity;
  const ratio=item.sourceWidth/item.sourceHeight;
  if(item.sourceWidth<1600||item.sourceHeight<800||ratio<1.25||ratio>2.8)return -Infinity;
  const words=entry.search.toLowerCase().split(/\W+/).filter(word=>word.length>3);
  const title=item.title.toLowerCase();
  const matches=words.filter(word=>title.includes(word)).length;
  return matches*20+Math.log10(item.sourceWidth*item.sourceHeight)*4-Math.abs(ratio-16/9)*8+(item.license==='Public domain'?4:0);
}

async function choose(entry){
  const category=exactCategories[entry.id];
  const fileTitle=entry.fileTitle||exactFiles[entry.id];
  const primaryParams=fileTitle
    ?{titles:fileTitle,prop:'imageinfo',iiprop:'url|size|mime|extmetadata'}
    :category?{generator:'categorymembers',gcmtitle:`Category:${category}`,gcmtype:'file',gcmlimit:'100',prop:'imageinfo',iiprop:'url|size|mime|extmetadata'}
    :{generator:'search',gsrsearch:`${entry.search} filetype:bitmap`,gsrnamespace:'6',gsrlimit:'50',prop:'imageinfo',iiprop:'url|size|mime|extmetadata'};
  let data=await api(primaryParams),items=Object.values(data.query?.pages||{}).map(imageRecord).filter(Boolean).sort((a,b)=>score(b,entry)-score(a,entry));
  if((!items.length||score(items[0],entry)===-Infinity)&&category&&!fileTitle){
    data=await api({generator:'search',gsrsearch:`${entry.search} filetype:bitmap`,gsrnamespace:'6',gsrlimit:'50',prop:'imageinfo',iiprop:'url|size|mime|extmetadata'});
    items=Object.values(data.query?.pages||{}).map(imageRecord).filter(Boolean).sort((a,b)=>score(b,entry)-score(a,entry));
  }
  if(!items.length||score(items[0],entry)===-Infinity)throw new Error(`No qualifying image for ${entry.country} — ${entry.landmark}`);
  return {...entry,...items[0],dayparts:sceneDayparts[entry.id]||['morning','daytime'],localPath:`/assets/ibis/landmarks/${entry.id}.webp`};
}

async function download(url,target){
  const source=new URL(url);source.search='';
  for(let attempt=1;attempt<=5;attempt+=1){
    const response=await fetch(source,{headers:{'user-agent':'FTN-IBIS-landmark-curation/1.0 (https://ftnplatform.org/)'}});
    if(response.ok){await fs.writeFile(target,Buffer.from(await response.arrayBuffer()));return;}
    if(response.status!==429||attempt===5)throw new Error(`Download ${response.status}: ${source}`);
    const retryAfter=Number(response.headers.get('retry-after'))||attempt*5;
    await wait(retryAfter*1000);
  }
}

await fs.mkdir(OUTPUT,{recursive:true});
const selected=[];
const failures=[];
for(const [index,entry] of landmarks.entries()){
  try{
    const chosen=await choose(entry);selected.push(chosen);
    process.stdout.write(`${String(index+1).padStart(2,'0')}/51 ${entry.country} — ${entry.landmark}: ${chosen.title} [${chosen.license}]\n`);
  }catch(error){failures.push({entry,error:error.message});process.stdout.write(`${String(index+1).padStart(2,'0')}/51 NEEDS REVIEW ${entry.country} — ${entry.landmark}\n`);}
  await wait(90);
}

if(selectionOnly){
  await fs.writeFile('/tmp/ibis-headspace-landmark-selection.json',JSON.stringify({selected,failures},null,2)+'\n');
  process.stdout.write('Selection written to /tmp/ibis-headspace-landmark-selection.json\n');
  if(failures.length)process.exitCode=2;
  process.exit(0);
}

if(failures.length)throw new Error(`${failures.length} landmarks require explicit source selection before download.`);

for(const [index,item] of selected.entries()){
  const original=path.join('/tmp',`ibis-landmark-${slug(item.title)}`);
  const target=path.join(ROOT,item.localPath.slice(1));
  let existingBytes=0;
  try{existingBytes=(await fs.stat(target)).size;}catch{}
  if(existingBytes<1024||forceIds.has(item.id)){
    await fs.rm(target,{force:true});
    await download(item.url,original);
    const converted=spawnSync('convert',[original,'-auto-orient','-resize','2560x1440^','-gravity','center','-extent','2560x1440','-strip','-quality','84',target],{encoding:'utf8'});
    if(converted.status!==0)throw new Error(`Image conversion failed for ${item.title}: ${converted.stderr}`);
    await fs.rm(original,{force:true});
    await wait(250);
  }
  const bytes=await fs.readFile(target);item.fileHashSha256=createHash('sha256').update(bytes).digest('hex');item.bytes=bytes.length;
  delete item.url;delete item.search;delete item.fileTitle;
  process.stdout.write(`asset ${String(index+1).padStart(2,'0')}/51 ${item.localPath} (${Math.round(item.bytes/1024)} KB)\n`);
}
await fs.writeFile(MANIFEST,JSON.stringify({schemaVersion:1,count:selected.length,generatedAt:new Date().toISOString(),selectionRules:{minimumSourceWidth:1600,minimumSourceHeight:800,minimumAspectRatio:1.25,commercialLicensesOnly:true,localFormat:'WebP 2560x1440 quality 84'},landmarks:selected},null,2)+'\n');
const creditRows=selected.map(item=>`| \`${path.basename(item.localPath)}\` | ${markdown(item.landmark)} · ${markdown(item.country)} | ${markdown(item.author)} | [Wikimedia Commons](${item.descriptionUrl}) | [${markdown(item.license)}](${item.licenseUrl||item.descriptionUrl}) | \`${item.fileHashSha256}\` |`).join('\n');
await fs.writeFile(CREDITS,`# IBIS Headspace landmark image credits

These 51 locally served WebP files are resized, centre-cropped and compressed derivatives of their named source photographs. The source and licence links remain available on the Headspace landing surface. No photographer, source or subject endorsement of FTN is implied.

| Local file | Landmark | Photographer / author | Source | Licence | SHA-256 |
| --- | --- | --- | --- | --- | --- |
${creditRows}
`);
process.stdout.write(`Manifest written: ${MANIFEST}\n`);
