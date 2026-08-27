import fs from 'node:fs';
function read(path){return fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');}
const outreach=read('supabase/functions/ftn-index-outreach/index.ts');
const css=read('css/components/ftn-index.css');
const strategyCss=read('css/components/ftn-strategic-intelligence.css');
const html=read('index/index.html');
const heroUrl=new URL('../assets/logos/ftn-index-hero.jpg',import.meta.url);
const hero=fs.readFileSync(heroUrl);
const checks=[];
function check(name,ok){checks.push({name,ok:Boolean(ok)});if(!ok)process.exitCode=1;console.log(`${ok?'PASS':'FAIL'} ${name}`);}
check('email-mobile-viewport',/meta name="viewport" content="width=device-width,initial-scale=1"/.test(outreach));
check('email-narrow-outer-padding',/padding:12px/.test(outreach));
check('email-fluid-wrapper',/width:100%;max-width:640px;box-sizing:border-box/.test(outreach));
check('email-fixed-table-layout',/table-layout:fixed/.test(outreach));
check('email-long-values-wrap',/word-break:break-word/.test(outreach));
check('email-full-width-touch-cta',/display:block;box-sizing:border-box;width:100%/.test(outreach)&&/text-align:center/.test(outreach));
check('email-missing-fields-visible',/\[Not found\]/.test(outreach));
check('email-platform-social-fields',/instagram:"Instagram"/.test(outreach)&&/facebook:"Facebook"/.test(outreach)&&/tiktok:"TikTok"/.test(outreach)&&/x:"X"/.test(outreach)&&/youtube:"YouTube"/.test(outreach));
check('index-page-mobile-viewport',/name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?"/.test(html));
check('index-mobile-single-column',/@media\(max-width:760px\)[\s\S]*\.index-edit\{grid-template-columns:1fr\}/.test(css));
check('index-mobile-full-width-confirm',/@media\(max-width:760px\)[\s\S]*\.index-edit button\{justify-self:stretch;width:100%;min-height:48px\}/.test(css));
check('index-mobile-safe-shell-padding',/@media\(max-width:760px\)[\s\S]*\.index-shell\{padding-left:1rem;padding-right:1rem\}/.test(css));
check('index-hero-binary-is-jpeg',hero.length>50000&&hero[0]===0xff&&hero[1]===0xd8&&hero[2]===0xff);
check('index-and-faq-share-hero',/\.index-hero,\.faq-hero\{/.test(strategyCss)&&/ftn-index-hero\.jpg/.test(strategyCss));
check('index-hero-desktop-height-capped',/height:clamp\(190px,22vw,320px\)!important/.test(strategyCss));
check('index-hero-mobile-height-capped',/height:clamp\(145px,42vw,205px\)!important/.test(strategyCss));
if(process.exitCode)console.error(`FTN Index phone audit failed: ${checks.filter(x=>!x.ok).length} check(s).`);else console.log(`FTN Index phone audit passed: ${checks.length} checks.`);
