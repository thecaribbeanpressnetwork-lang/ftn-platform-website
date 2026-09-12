import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.FTN_TEST_BASE||'http://127.0.0.1:3000';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.FTN_CHROME_PATH||undefined});
const context=await browser.newContext({serviceWorkers:'block'});

async function isolate(page){
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'window.supabase={createClient:function(){return{auth:{getUser:async function(){return{data:{user:null},error:null}},getSession:async function(){return{data:{session:null},error:null}},onAuthStateChange:function(){}},from:function(){throw new Error("fixture database access not expected")},functions:{invoke:async function(){return{data:null,error:new Error("fixture")}}}}}};'}));
}
async function open(page,path,selector){
  await page.goto(base+path,{waitUntil:'commit',timeout:15000});
  await page.locator(selector).waitFor({state:'attached',timeout:10000});
}
async function askHead(page,text){await page.locator('#headspaceQuery').fill(text);await page.locator('#inputOrbit button[type="submit"]').click();await page.waitForTimeout(950);}

const head=await context.newPage();
await isolate(head);
await head.route('**/functions/v1/ibis-text-cloudflare*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'GENERAL_ROUTE_MARKER: The Caribbean contains sovereign states and dependent territories.','provider':'behavioral-fixture',cebos:true})}));
await head.route('https://api.github.com/repos/thecaribbeanpressnetwork-lang/ftn-platform-website/actions/runs?*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total_count:1,workflow_runs:[{name:'FTN Scout 2.0',event:'schedule',status:'completed',conclusion:'success',run_number:18,run_started_at:'2026-09-09T14:41:22Z'}]})}));
await head.route('**/functions/v1/ftn-opportunities*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fetchedAt:'2026-09-08T12:00:00Z',warnings:[],items:[]})}));
await open(head,'/ibis-headspace-preview/','#headspaceQuery');
await head.waitForFunction(()=>document.documentElement.classList.contains('headspace-hydrated'),null,{timeout:15000});
assert.match(await head.locator('[data-thought="answer"] h2').innerText(),/What do you need/i,'Headspace must open neutral.');
assert.equal(await head.locator('[data-thought="graph"]').evaluate(el=>el.classList.contains('dematerialized')),true,'Sample graph must stay hidden.');
assert.doesNotMatch(await head.locator('body').innerText(),/Sample signal\s*[—-]/i,'No sample demand data may appear investor-facing.');
await head.waitForFunction(()=>{const n=document.querySelector('#toolStatus');return n&&!/Checking governed/.test(n.textContent||'');},null,{timeout:8000}).catch(()=>{});
assert.doesNotMatch(await head.locator('#toolStatus').innerText(),/runtime catalog is unavailable/i,'Tool health must not falsely fail.');
await askHead(head,'What is the latest USD selling rate?');assert.match(await head.locator('[data-thought="answer"]').innerText(),/USD|TTD|selling|rate/i);
await askHead(head,'show live population');assert.match(await head.locator('[data-thought="answer"]').innerText(),/population/i);
await askHead(head,'How much capital do I need to live on TT$35,000 a month at 5%?');const capital=await head.locator('[data-thought="answer"]').innerText();assert.match(capital,/8,400,000|8\.4/i);assert.doesNotMatch(capital,/Population is moving/i);
await askHead(head,'list the Caribbean islands');const general=await head.locator('[data-thought="answer"]').innerText();assert.match(general,/GENERAL_ROUTE_MARKER/);assert.doesNotMatch(general,/Real Objective|User Value|Ecosystem Value|Economic Value/i);
const free=head.locator('[data-arrange="freeform"]');await free.waitFor({state:'visible'});await free.click();assert.equal(await head.locator('#field').getAttribute('data-layout'),'freeform');const card=head.locator('[data-thought="answer"]'),bar=card.locator('.thought-bar');const before=await card.boundingBox(),drag=await bar.boundingBox();assert(before&&drag);await head.mouse.move(drag.x+30,drag.y+15);await head.mouse.down();await head.mouse.move(drag.x+180,drag.y+120,{steps:8});await head.mouse.up();await head.waitForTimeout(150);const after=await card.boundingBox();assert(after&&Math.abs(after.x-before.x)>20);await head.locator('[data-arrange="grid"]').click();assert.equal(await head.locator('#field').getAttribute('data-layout'),'grid');await head.screenshot({path:'test-artifacts/ibis-behavioral-headspace.png',fullPage:true});

const main=await context.newPage();await isolate(main);
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXQAAAAASUVORK5CYII=';
await main.route('**/functions/v1/ibis-image-cloudflare*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({image:png,mimeType:'image/png',extension:'png',provider:'Cloudflare Workers AI',model:'fixture-image'})}));
await main.route('**/functions/v1/ftn-news-sources*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({localItems:[{title:'Trinidad fixture headline',publisher:'Fixture Trinidad Publisher',url:'https://example.test/trinidad-story',publishedAt:'2026-09-11T10:00:00Z',classification:'Publisher headline'}],items:[]})}));
await main.route('**/functions/v1/ibis-web-research*',async r=>{
  const request=JSON.parse(r.request().postData()||'{}');
  const query=String(request.query||'');
  if(/Keyon Byron/i.test(query)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'Keyon Byron is identified by the grounded fixture as a Trinidad and Tobago filmmaker and director. This answer is source-backed, not model-memory biography.',sources:[{title:'Film festival biography for Keyon Byron',publisher:'Fixture Film Festival',url:'https://example.test/keyon-byron',sourceClass:'PRIMARY_EVIDENCE',evidenceStatus:'VERIFIED',discoveryUtility:85,decisionAuthority:100},{title:'Independent festival coverage',publisher:'Fixture News',url:'https://example.test/keyon-news',sourceClass:'REPUTABLE_JOURNALISM',evidenceStatus:'CORROBORATED',discoveryUtility:80,decisionAuthority:75}],provider:'Google Search grounding via Gemini',model:'fixture-grounded-search',retrievedAt:'2026-09-11T12:00:00-04:00',cebos:{requestClass:'INFORMATION',caribbeanRelevant:true}})});
  if(/accounting tools/i.test(query)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'For a small Caribbean business, compare these grounded accounting-tool candidates by free tier, invoicing, multi-currency support, export options and limitations before choosing.',sources:[{title:'Wave Accounting',publisher:'Wave',url:'https://www.waveapps.com/',sourceClass:'CORPORATE_STATEMENT',evidenceStatus:'WORKING_INFERENCE',discoveryUtility:75,decisionAuthority:60},{title:'Zoho Books',publisher:'Zoho',url:'https://www.zoho.com/books/',sourceClass:'CORPORATE_STATEMENT',evidenceStatus:'WORKING_INFERENCE',discoveryUtility:75,decisionAuthority:60}],provider:'fixture web research',model:'fixture',retrievedAt:'2026-09-11T12:00:00-04:00'})});
  if(/remove the background from my video/i.test(query)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'These are editing-tool candidates for video background removal; verify current free limits, watermark policy and privacy terms.',sources:[{title:'Unscreen',publisher:'Unscreen',url:'https://www.unscreen.com/',sourceClass:'CORPORATE_STATEMENT',evidenceStatus:'WORKING_INFERENCE',discoveryUtility:75,decisionAuthority:60}],provider:'fixture web research',model:'fixture',retrievedAt:'2026-09-11T12:00:00-04:00'})});
  return r.fulfill({status:424,contentType:'application/json',body:JSON.stringify({error:'Search fixture has no evidence for this request.'})});
});
await open(main,'/ibis-ai/','#ibis-goal');
await main.waitForFunction(()=>window.FTN&&window.FTN.IbisWebResearchWorkspace,null,{timeout:8000});
async function askMain(text){await main.locator('#ibis-goal').fill(text);await main.locator('#ibis-form button[type="submit"]').click();await main.waitForTimeout(700);return main.locator('.ibis-msg__bubble--ibis').last();}
let bubble=await askMain('generate an image of a red scarlet ibis flying across the Caribbean');assert.match(await bubble.innerText(),/REAL IMAGE GENERATION/i);assert.equal(await bubble.locator('img').count(),1);
bubble=await askMain('what is in the Trinidad news today?');const news=await bubble.innerText();assert.match(news,/Fixture Trinidad Publisher|Trinidad fixture headline/i);assert.doesNotMatch(news,/GitHub|Hacker News|IPTV/i);
bubble=await askMain('tell me about Keyon Byron');const person=await bubble.innerText();assert.match(person,/GROUNDED WEB RESEARCH/i);assert.match(person,/Keyon Byron|filmmaker|director/i);assert.match(person,/Fixture Film Festival|Fixture News/i);assert.doesNotMatch(person,/not enough verified|musician|composer|User Value|Ecosystem Value|Future Optionality/i);
await main.waitForFunction(()=>window.FTN&&window.FTN.IbisPartnerExchange,null,{timeout:8000});
bubble=await askMain('which free site can generate a video?');const partners=await bubble.innerText();assert.match(partners,/RANKED TASK PARTNERS/i);assert.equal(await bubble.locator('a[href]').count()>0,true,'Partner exchange must return clickable provider names.');assert.doesNotMatch(partners,/No verified provider/i,'Canonical provider registry should contain video candidates.');

// Generic external tools must not be forced into an unrelated generation capability just because
// the prompt contains words like "video". If the governed registry lacks that task class, research
// the real web and present grounded candidates instead.
bubble=await askMain('Find free or low-cost accounting tools suitable for a small Caribbean business and rank them.');const accounting=await bubble.innerText();assert.match(accounting,/GROUNDED WEB RESEARCH/i);assert.match(accounting,/Wave|Zoho/i);assert.equal(await bubble.locator('a[href]').count()>0,true,'Grounded external provider candidates must be clickable.');
bubble=await askMain('What free sites can remove the background from my video? Rank them by cost, output quality, watermark, limits and privacy, and give clickable links.');const editing=await bubble.innerText();assert.match(editing,/GROUNDED WEB RESEARCH/i);assert.match(editing,/Unscreen/i);assert.doesNotMatch(editing,/RANKED TASK PARTNERS/i,'Background-removal request must not be misclassified as video generation.');

bubble=await askMain('Find a good restaurant near me for four people under TT$600 total.');const nearMe=await bubble.innerText();assert.match(nearMe,/LOCATION NEEDED/i);assert.match(nearMe,/town|neighbourhood/i);assert.doesNotMatch(nearMe,/best restaurant|top restaurant/i,'IBIS must not invent a precise location.');
bubble=await askMain('I heard a company in Trinidad is shutting down next month. Can you verify it before I tell my staff?');const rumor=await bubble.innerText();assert.match(rumor,/VERIFICATION NEEDS A SUBJECT/i);assert.match(rumor,/company name/i);assert.doesNotMatch(rumor,/confirmed/i,'A subjectless rumor cannot be confirmed.');

assert.equal(await main.locator('[data-ibis-headspace-entry] a[href="/ibis-headspace-preview/"]').count(),1);await main.screenshot({path:'test-artifacts/ibis-behavioral-workspace.png',fullPage:true});

const widget=await context.newPage();await isolate(widget);await open(widget,'/','#ibis-widget-trigger');await widget.locator('#ibis-widget-trigger').click();async function askWidget(text){await widget.locator('#ibis-widget-input').fill(text);await widget.locator('#ibis-widget-form button[type="submit"]').click();await widget.waitForTimeout(300);}await askWidget('give me the ibis link');let widgetText=await widget.locator('#ibis-widget-messages').innerText();assert.doesNotMatch(widgetText,/ftn\.to/i);let link=widget.locator('#ibis-widget-messages a[href]').last();assert.equal(await link.getAttribute('href'),base+'/ibis-ai/');await askWidget('full url');widgetText=await widget.locator('#ibis-widget-messages').innerText();assert.doesNotMatch(widgetText,/ftn\.to/i);link=widget.locator('#ibis-widget-messages a[href]').last();assert.equal(await link.getAttribute('href'),base+'/ibis-ai/');

await context.close();await browser.close();console.log('IBIS behavioral UX acceptance passed.');
