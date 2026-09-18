// FTN Platform Website — Product Registry data.
// This is the auditable source of truth for product identity, hierarchy, release state,
// visibility, access and public claims. Consumers must use js/product-registry.js.
(function(global){
'use strict';
var RELEASE='2.4.0',VERIFIED='2026-08-19',OWNER='RealityArtTV Media';
function product(config){
  var accent=config.accent||'var(--color-red-on-dark)';
  // Phase 3 (Product Registry consolidation) additive fields -- see
  // GOVERNANCE/FTN_Phase3_Product_Registry_and_Live_Consolidation_2026-08-24.md §2. Every field
  // here is a safe default so no existing entry or consumer breaks; only a handful of entries
  // populate real values for these so far (incremental migration, not a sitewide rewrite).
  var merged=Object.assign({
    shortName:config.name,
    parentProduct:null,
    productType:config.parentProduct?'capability':'product',
    publicVisibility:true,
    visibility:'PUBLIC',
    owner:OWNER,
    sourceOwnership:'FTN-owned interface; external sources remain source-owned',
    primaryUser:'Caribbean public',
    primaryJourney:'Open the product and complete its bounded public task.',
    callsToAction:[{label:'Open',route:config.route}],
    visualMnemonic:'FTN signal node',
    icon:'/assets/icons/ftn-shortcut-mark.svg?v=20260811.2',
    heroAsset:null,
    heroAlt:null,
    heroFocalDesktop:'50% 50%',
    heroFocalMobile:'50% 50%',
    surfaceMode:'interface',
    dataSources:[],
    accessRules:['guest'],
    featureFlags:[],
    relatedProducts:[],
    legalNotices:['FTN product terms','FTN privacy policy'],
    analyticsClassification:'public-essential-only',
    lastVerified:VERIFIED,
    lastVerificationDate:VERIFIED,
    releaseVersion:RELEASE,
    principal:true,
    panelAsset:null,
    panelRow:null,
    atmosphere:{accent:accent,background:'dark-minimal',motionProfile:'none',heroStyle:'editorial'},
    keywords:[],
    capabilities:[],
    // -- Phase 3 additive fields --
    purposeStatement:null,
    routeAliases:[],
    sitemapRoutes:[],
    navPlacement:{primary:false,ecosystemGroup:null,footer:true},
    authRequirement:'guest',
    dataProduced:[],
    integrations:[],
    provenanceLevel:'none',
    ownerModules:[],
    // FTN Product/Node Consolidation (see GOVERNANCE/FTN_Consolidation_2026-09-18.md): null means
    // this stays a standalone product/capability exactly as before. A registry id here means this
    // product's own standalone identity is retired -- its route stays live (never deleted, see
    // ownerModules/route above), but it stops appearing as an independent product in nav, footer,
    // the Directory's product list, ecosystem menus and ibis's own suggested-destination list
    // (js/ftn-node-registry.js's IBISRole becomes ABSORBED_CAPABILITY). Its real, reusable logic is
    // ported to a shared, headless module and exposed as a genuine ibis-executable capability --
    // see that module/capability's own ownerModules/capabilities entries for what actually runs.
    absorbedInto:null
  },config,{accent:undefined});
  if(!('analyticsId' in config))merged.analyticsId='ftn_'+String(merged.id||'').replace(/-/g,'_');
  return merged;
}
var PRODUCTS=[
product({
  id:'platform-home',name:'FTN Platform',shortName:'Home',tagline:'The Caribbean Operating System.',
  description:'One connected Caribbean ecosystem for civic action, trusted information, media, creation, opportunity and business.',route:'/',status:'LIVE',
  primaryJourney:'Describe a goal, discover the right FTN product and continue without forced sign-in.',callsToAction:[{label:'Find a product',route:'/#find-your-path'},{label:'Open FTN Directory',route:'/applications/'}],
  visualMnemonic:'Connected Caribbean signal field',dataSources:['FTN Product Registry','verified public FTN records'],relatedProducts:['community-connect','ibis-ai','opportunities'],
  keywords:['Caribbean','platform','ecosystem','discover','search','operating system'],capabilities:['product-discovery','public-search','country-preference','pwa-install','return-to-task'],
  navPlacement:{primary:true,ecosystemGroup:null,footer:true}
}),
product({
  id:'community-connect',name:'FTN Community Connect',shortName:'Community Connect',tagline:'Connect. Report. Improve.',
  description:'FTN’s protected citizen-reporting application for documenting local issues and following community action without implying government endorsement or automatic resolution.',route:'/community-connect/',status:'AVAILABLE',
  primaryUser:'Residents and community participants',primaryJourney:'Review the evidence and privacy terms, then continue to the protected web app or verified Android release.',
  callsToAction:[{label:'Open Community Connect',route:'/community-connect/#launch'},{label:'Android release',route:'/community-connect/#download'}],visualMnemonic:'Community pin and verified report',
  panelAsset:'/assets/panels/01-community-connect.png',panelRow:1,accent:'var(--color-red)',atmosphere:{accent:'var(--color-red)',background:'photo',motionProfile:'none',heroStyle:'photo-real'},
  dataSources:['Community Connect protected application','approved public aggregate records'],accessRules:['guest landing','separate protected application account'],featureFlags:['community-connect-handoff'],
  relatedProducts:['parliament','facethenation'],legalNotices:['Evidence and consent notice','Community guidelines','Privacy policy'],analyticsClassification:'civic-sensitive-no-replay',
  keywords:['report','issue','pothole','community','neighbourhood','infrastructure','complaint'],capabilities:['verified-release-handoff','reporting-handoff','public-boundary-notice'],
  navPlacement:{primary:true,ecosystemGroup:'civic-public-life',footer:true}
}),
product({
  id:'mission-control',name:'Mission Control',shortName:'Mission Control',tagline:'Private institutional operations.',productType:'private infrastructure',visibility:'PRIVATE',
  description:'A private institutional decision-support and operations product. It is not a public government system.',route:'/mission-control/',status:'PRIVATE',publicVisibility:false,
  primaryUser:'Authorized institutional teams',primaryJourney:'Enter through an organization-specific authenticated deployment.',
  callsToAction:[],visualMnemonic:'Private command layer',panelAsset:'/assets/panels/02-mission-control.png',panelRow:null,accent:'var(--color-mission-control)',atmosphere:{accent:'var(--color-mission-control)',background:'dark-grid',motionProfile:'radar-sweep',heroStyle:'operations-center'},
  dataSources:['organization-authorized sources'],accessRules:['private organization deployment'],featureFlags:['mission-control-private'],relatedProducts:['scenario-workspace','parliament','events','opportunities'],
  legalNotices:['Private access only','No institutional endorsement'],keywords:['institutional','operations','decisions','evidence'],capabilities:['private-decision-support']
}),
product({
  id:'scenario-workspace',name:'Scenario Workspace',shortName:'Scenarios',tagline:'Explore evidence. Test assumptions. Keep the limits visible.',
  description:'A public scenario workspace with calculated comparisons, evidence views and clearly labelled illustrative datasets; it is not a live operations system.',route:'/scenario-workspace/',status:'ILLUSTRATIVE',productType:'capability',parentProduct:'ibis-ai',principal:false,absorbedInto:'ibis-ai',
  primaryUser:'Public-interest teams, researchers and institutional evaluators',primaryJourney:'Explore supplied evidence, run a calculation and export a clearly labelled scenario brief.',
  callsToAction:[{label:'Open Scenario Workspace',route:'/scenario-workspace/'}],visualMnemonic:'Evidence radar',panelAsset:'/assets/panels/02-mission-control.png',panelRow:1,accent:'var(--color-mission-control)',atmosphere:{accent:'var(--color-mission-control)',background:'dark-grid',motionProfile:'radar-sweep',heroStyle:'operations-center'},
  dataSources:['labelled illustrative dataset'],accessRules:['guest scenario workspace'],featureFlags:['scenario-workspace'],relatedProducts:['ibis-ai','parliament','events','opportunities','facethenation'],
  purposeStatement:'Its weighted-scoring comparison formula is now a shared, headless engine (js/ibis-scenario-engine.js) ibis calls directly for SCENARIO_ANALYSIS/SCENARIO_COMPARE -- an explicitly-illustrative, transparent multi-criteria tool, deliberately distinct from ibis\'s own evidence-bounded EBR/Butterfly/Prediction reasoning, not a duplicate of it.',
  legalNotices:['Illustrative data notice','No institutional endorsement'],keywords:['scenario','analytics','decisions','evidence','correlation','compare','strategy','strategies','options','assumptions'],capabilities:['calculated-change-analysis','calculated-correlation','scenario-exploration','evidence-explorer','relationship-graph'],
  ownerModules:['scenario-workspace/index.html','js/mission-control-demo.js','js/ibis-scenario-engine.js']
}),
product({
  id:'govern',name:'FTN Govern',shortName:'Govern',tagline:'Find the official path. Follow the public record.',
  description:'An independent civic gateway to official Trinidad and Tobago government services, Parliament, departments and public-information sources.',route:'/govern/',status:'AVAILABLE',
  primaryUser:'Residents and civic-information seekers',primaryJourney:'Choose a civic task, see the source owner and continue to the official destination.',
  callsToAction:[{label:'Open FTN Govern',route:'/govern/'}],visualMnemonic:'Civic gateway',heroAsset:'/assets/heroes/ftn-govern-red-house.webp',heroAlt:'The Red House, seat of Parliament, in Port of Spain, Trinidad and Tobago',accent:'#c9a45c',atmosphere:{accent:'#c9a45c',background:'dark-civic',motionProfile:'none',heroStyle:'civic-gateway'},
  dataSources:['ttconnect','Parliament of Trinidad and Tobago'],accessRules:['guest source gateway'],featureFlags:['govern-gateway'],relatedProducts:['parliament','community-connect','facethenation'],
  legalNotices:['Independent non-government service','Official destinations remain source-owned'],keywords:['government','service','department','parliament','public notice','civic'],capabilities:['official-source-gateway','country-boundary','service-routing'],
  purposeStatement:'The one civic-source system: official government services AND Parliament records live here as one coherent gateway, not two competing civic products.',
  navPlacement:{primary:true,ecosystemGroup:'civic-public-life',footer:true},
  integrations:[{productId:'parliament',kind:'child'}]
}),
product({
  id:'ibis-ai',name:'FTN ibis',shortName:'ibis',tagline:'Caribbean intelligence, intent and execution.',
  description:'FTN ibis is FTN Platform’s founder-led Caribbean intelligence, intent and execution network: provenance-aware reasoning, opportunity intelligence, governed action and a permissioned Headspace interface. The legacy /ibis-ai/ route remains the compatible workspace.',route:'/ibis-ai/',status:'AVAILABLE',
  primaryUser:'People trying to complete or create something across FTN',primaryJourney:'Describe the outcome, choose an intelligence or creative mode, inspect the source/provider/cost boundary and continue with an exportable project.',
  callsToAction:[{label:'Ask ibis',route:'/ibis-ai/'},{label:'Open Creative Studio',route:'/ibis-ai/#ibis-creative-studio'}],visualMnemonic:'Ibis creative command node',panelAsset:'/assets/panels/05-ibis-ai.png',panelRow:1,accent:'var(--color-ibis)',atmosphere:{accent:'var(--color-ibis)',background:'dark-minimal',motionProfile:'node-pulse',heroStyle:'calm-focused'},
  sitemapRoutes:['/ibis/','/ibis/ecosystem-map/','/ibis/international-capital/','/ibis/pricing/'],
  dataSources:['FTN Product Registry','FTN public source functions','authenticated approved AI provider','verified creative-provider registry'],accessRules:['guest deterministic tools','authenticated server AI','paid provider calls disabled until credits and server approval'],featureFlags:['ibis-router','ibis-visual','ibis-authenticated-ai','ibis-creative-studio','provider-cost-lock'],
  relatedProducts:['platform-home','mission-control','kaiso','ftn-fire','learn'],legalNotices:['Generated-output notice','Private conversation boundary','Provider transfer and cost notice','Responsible AI'],analyticsClassification:'private-content-no-replay',
  keywords:['help','navigate','find','assist','goal','route','analyze','visual','image','video','creative studio','campaign','TV show','pilot','series','screenplay','script','reggae','soca','dancehall','instrumental','beat','riddim','clean up audio','export wav','epk','press kit','scenario','evidence','course','learn'],capabilities:['task-routing','ftn-data-analysis','media-discovery','on-device-visual-draft','creative-project-planning','provider-evidence','authenticated-server-ai','cross-product-handoff','caribbean-music-generation','audio-processing','epk-workflow','scenario-analysis','learning-guidance'],
  // FTN Consolidation: ibis is now the real, executing home for the Caribbean music-generation
  // engine (formerly FTN Fire), the browser audio-processing chain (formerly FTN DAW), the EPK
  // schema/workflow and Scenario Workspace's evidence/calculation tools -- see each absorbed
  // product's own absorbedInto/ownerModules for the shared module that actually runs. FTN DJ Tube
  // remains its own specialized direct-manipulation interface (real-time dual-deck performance is
  // not a chat capability); ibis hands off to it rather than reimplementing it.
  integrations:[{productId:'ftn-fire',kind:'absorbed'},{productId:'daw',kind:'absorbed'},{productId:'epk',kind:'absorbed'},{productId:'scenario-workspace',kind:'absorbed'},{productId:'learn',kind:'absorbed'},{productId:'riddim',kind:'absorbed'},{productId:'dj-tube',kind:'hands-off-to'}],
  ownerModules:['ibis-ai/index.html','js/ibis-ai-workspace.js','js/ibis-caribbean-music-engine.js','js/ftn-audio-dsp-engine.js','js/ftn-epk-schema.js','js/ibis-scenario-engine.js','js/ftn-learn-discovery.js','js/ibis-absorbed-capabilities.js'],
  navPlacement:{primary:true,ecosystemGroup:'information-intelligence',footer:true},
  // Phase 3 service-worker route-policy consolidation: 'mixed' -- guest-usable deterministic tools
  // plus authenticated server AI with private conversation content (see legalNotices above) that
  // must never be served from or written to the SW's public cache. See account's identical field
  // for the same reasoning.
  authRequirement:'mixed'
}),
product({
  id:'parliament',name:'FTN Parliament',shortName:'Parliament',tagline:'Public records. Clear sources. Civic context.',
  description:'An independent source directory for Parliament of Trinidad and Tobago records, with visible jurisdiction, source and verification dates.',route:'/parliament/',status:'AVAILABLE',parentProduct:'govern',principal:false,absorbedInto:'govern',
  primaryUser:'Residents, researchers and public-affairs audiences',primaryJourney:'Search a record category, open the official source, save/share it or report a broken source.',
  callsToAction:[{label:'Find a public record',route:'/parliament/#records'}],visualMnemonic:'Civic columns and source seal',dataSources:['Parliament of Trinidad and Tobago official website'],
  accessRules:['guest directory'],featureFlags:['parliament-directory'],relatedProducts:['govern','facethenation','community-connect','mission-control'],legalNotices:['Independent non-official service','Source and correction notice'],
  purposeStatement:'A specialized civic vertical inside FTN Govern -- official source directory, record lookup and broken-source reporting for Parliament specifically, not a second, independent civic product.',
  keywords:['parliament','representative','constituency','bill','sitting','debate','committee','public record'],capabilities:['official-source-directory','search','filter','save','share','broken-source-report'],
  navPlacement:{primary:false,ecosystemGroup:'civic-public-life',footer:true}
}),
product({
  id:'facethenation',name:'FTN Face The Nation',shortName:'Face The Nation',tagline:'Every Voice. Every Constituency. Every Truth.',
  description:'FTN’s public-affairs and constituency programme hub with source-backed episode discovery and moderated participation paths.',route:'/facethenation',status:'AVAILABLE',
  primaryUser:'Public-affairs audiences, guests and constituents',primaryJourney:'Find an authorized episode, view supporting context, share it or submit a moderated question/story.',
  callsToAction:[{label:'Watch and participate',route:'/facethenation#watch'}],visualMnemonic:'Constituency microphone',panelAsset:'/assets/panels/04-face-the-nation.png',panelRow:1,atmosphere:{accent:'var(--color-red-on-dark)',background:'photo',motionProfile:'none',heroStyle:'broadcast'},
  dataSources:['FTN authorized YouTube records','user-consented submissions'],accessRules:['guest discovery','moderated submission'],featureFlags:['face-episodes'],relatedProducts:['parliament','community-connect','tv'],
  legalNotices:['Editorial independence','Corrections','Sponsorship disclosure'],keywords:['interview','debate','politics','public affairs','constituency','episode','guest'],capabilities:['episode-discovery','authorized-embedded-playback','participation','public-affairs']
}),
product({
  id:'events',name:'FTN Events',shortName:'Events',tagline:'Every Event Starts Here.',
  description:'A Caribbean event discovery, planning and submission workspace with source follow-through and practical preparation tools.',route:'/events/',status:'AVAILABLE',
  primaryUser:'Event attendees, organizers and production teams',primaryJourney:'Discover or prepare an event, save/export the details and follow a real organizer/source destination.',
  callsToAction:[{label:'Discover or plan an event',route:'/events/'}],visualMnemonic:'Backstage spotlight',panelAsset:'/assets/panels/03-ftn-events.png',panelRow:1,accent:'var(--color-events)',atmosphere:{accent:'var(--color-events)',background:'dark-stage',motionProfile:'spotlight',heroStyle:'backstage'},
  dataSources:['organizer-supplied links','public event sources','local user workspace'],accessRules:['guest discovery and planning','moderated submissions'],featureFlags:['event-planner','event-directory'],relatedProducts:['display-network','opportunities','ftn-live'],
  keywords:['event','concert','festival','conference','wedding','plan','venue','calendar','ticket'],capabilities:['event-discovery','event-brief','operational-plan','provider-discovery','calendar-export','save','share']
}),
product({
  id:'screen',name:'FTN Screen',shortName:'Screen',tagline:'Where Caribbean Stories Come Alive.',
  description:'Caribbean film, filmmaker and screen-work discovery with permitted trailers, lawful destinations and festival-package preparation.',route:'/screen/',status:'AVAILABLE',
  primaryUser:'Film audiences and screen creators',primaryJourney:'Discover an approved film, inspect rights/source context and follow a permitted watch or creator path.',
  callsToAction:[{label:'Discover Caribbean screen work',route:'/screen/'}],visualMnemonic:'Cinema frame aperture',panelAsset:'/assets/panels/09-ftn-screen.png',panelRow:2,accent:'var(--color-screen)',atmosphere:{accent:'var(--color-screen)',background:'dark-cinematic',motionProfile:'none',heroStyle:'cinematic'},
  heroAsset:'/assets/heroes/ftn-screen-film-crew.webp',heroAlt:'A Caribbean film crew working on location above a coastal town',heroFocalDesktop:'66% 50%',heroFocalMobile:'64% 50%',
  dataSources:['authorized public embeds','creator-declared metadata','official festival sources'],accessRules:['guest discovery','creator preparation'],featureFlags:['screen-catalog','festival-package'],relatedProducts:['tv','facethenation'],legalNotices:['Media rights and destination notice'],
  keywords:['film','movie','cinema','documentary','filmmaker','festival','trailer'],capabilities:['film-discovery','authorized-embedded-playback','film-metadata','festival-readiness','festival-matching','export'],
  purposeStatement:'The one media/screen system: film discovery, the TV programme guide and Display Mode are all real capabilities of FTN Screen, not three competing media products. Unrelated to FTN Live\'s current-conditions intelligence (see Phase 3 responsibility matrix).',
  navPlacement:{primary:true,ecosystemGroup:'media-culture',footer:true},authRequirement:'guest',
  integrations:[{productId:'tv',kind:'parent'},{productId:'display',kind:'parent'},{productId:'facethenation',kind:'routes-to'}],
  provenanceLevel:'editorial',ownerModules:['screen/index.html','css/components/screen-production.css']
}),
product({
  id:'tv',name:'FTN TV',shortName:'TV',tagline:'Caribbean Television, Programmed with Purpose.',
  description:'A scheduled and on-demand FTN programme surface using authorized sources and honest on-air, replay, off-air and provider-failure states.',route:'/tv/',status:'AVAILABLE',parentProduct:'screen',absorbedInto:'screen',
  primaryUser:'Caribbean programme audiences',primaryJourney:'Select a programme, verify its current availability and play an authorized source.',callsToAction:[{label:'Open the programme guide',route:'/tv/'}],visualMnemonic:'Broadcast frame and clock',
  dataSources:['FTN schedule data','authorized YouTube embeds'],accessRules:['guest viewing'],featureFlags:['tv-guide'],relatedProducts:['screen','facethenation','ftn-live','display'],legalNotices:['Programme rights and source notice'],
  keywords:['television','tv','channel','schedule','guide','watch','programme','replay'],capabilities:['current-programme-resolution','authorized-playback','schedule','tune','failure-state'],
  purposeStatement:'Scheduled/on-demand programme guide, a capability of FTN Screen — not a current-conditions or Live product.',
  navPlacement:{primary:false,ecosystemGroup:'media-culture',footer:true},authRequirement:'guest',
  // Not claiming a direct integration with 'display': FTN Display's "TV NOW" module and this
  // product both independently call the same shared js/ftn-media-discovery.js capability -- they
  // don't consume each other's output, so a product-to-product edge here would overclaim.
  integrations:[{productId:'screen',kind:'child'}],
  provenanceLevel:'editorial',ownerModules:['tv/index.html','js/tv-guide.js']
}),
product({
  // FTN Live compatibility migration (2026-08-24 founder decision, BUILD NOW -- see
  // GOVERNANCE/FTN_Phase3_Product_Registry_and_Live_Consolidation_2026-08-24.md §3.2 and
  // .claude/context/decisions.md): this SUPERSEDES the prior "Ecosystem Simplification pass" that
  // retired "FTN Live" as an independent identity. FTN Live is now the canonical public umbrella;
  // "Observer Console" is its advanced/deep-investigation interface, not a competing product; NOW
  // is its default current-information view. The route stays '/observatory/' deliberately -- no
  // existing URL, bookmark, inbound link or analytics history breaks. '/live/' is the new
  // canonical alias (a real redirect stub, see js/redirect-live.js) for anyone/anything that
  // should now reference FTN Live going forward.
  id:'ftn-live',legacyIds:['observatory','ftn-live'],name:'FTN Live',shortName:'Live',tagline:'What is happening in Trinidad and Tobago, right now and in depth.',
  description:'FTN’s real-time and current-conditions intelligence product. FTN NOW is the default glanceable view; the Observer Console is its advanced interface for indicators, correlations, scheduled coverage and explicit source states.',route:'/observatory/',routeAliases:['/live/'],status:'AVAILABLE',
  primaryUser:'Anyone tracking current Caribbean conditions, from a glance to a deep investigation',primaryJourney:'Open FTN Live for the current-conditions view (NOW), or go deeper into the Observer Console to inspect a signal\'s source/time/correlations and follow its accurate next state.',
  callsToAction:[{label:'Open FTN Live',route:'/observatory/'}],visualMnemonic:'Caribbean signal constellation',atmosphere:{accent:'var(--color-red-on-dark)',background:'dark-grid',motionProfile:'constellation',heroStyle:'observatory'},
  dataSources:['NOAA satellite products','Open-Meteo','World Bank','FTN public source registry','Trinidad and Tobago Meteorological Service','UWI Seismic Research Centre'],accessRules:['guest'],featureFlags:['live-sources','satellite','observer-console'],relatedProducts:['events','tv','mission-control','screen'],
  legalNotices:['External source availability','Calculated context notice'],keywords:['live','now','indicators','data','investigate','satellite','weather','schedule','replay','change','observer','correlation','flood','ferry','airport','vessel','earthquake','air quality','crime','parliament','power outage'],capabilities:['now-view','current-satellite-imagery','connected-public-sources','indicator-context','accurate-state','fallback','observer-console','observer-correlation-engine'],
  purposeStatement:'Canonical real-time/current-conditions intelligence product. NOW is its default glanceable view; Observer Console is its advanced interface; Kaiso is its source-backed news/current-affairs desk -- all views of FTN Live, not separate products (no separate registry entries for NOW or Observer Console, by design).',
  navPlacement:{primary:true,ecosystemGroup:'information-intelligence',footer:true},authRequirement:'guest',
  integrations:[{productId:'screen',kind:'consumes'},{productId:'community-connect',kind:'consumes'},{productId:'kaiso',kind:'absorbed'}],
  provenanceLevel:'official',ownerModules:['observatory/index.html','js/observer-console.js','js/observatory.js','js/indicators-data.js']
}),
product({
  // Consolidated into FTN Screen as "Display Mode" per the same 2026-08-24 founder decision
  // (see comment on the 'ftn-live' entry above). parentProduct:'screen' uses the identical,
  // already-proven pattern 'tv' has used under 'screen' since before this pass -- productType
  // becomes 'capability' automatically (see the product() factory), so this stops presenting as
  // an independent top-level product without deleting anything. Route stays '/display/'
  // deliberately: this is a real, physically-deployed kiosk/waiting-room screen product --
  // breaking that URL would break an actual shared screen somewhere, not just a bookmark.
  id:'display',name:'FTN Screen — Display Mode',shortName:'Display',tagline:'Watch what is happening. One screen. No setup.',parentProduct:'screen',absorbedInto:'screen',
  description:'FTN Screen\'s ambient information display mode — a compact Trinidad & Tobago national pulse, FTN TV NOW and a world strip, meant to be opened and left full screen. No account, no configuration, no advertising.',route:'/display/',status:'AVAILABLE',
  primaryUser:'Anyone near a shared screen — a waiting room, office, shop or reception area',primaryJourney:'Open Display Mode, press full screen and leave it running.',
  callsToAction:[{label:'Open Display Mode',route:'/display/'}],visualMnemonic:'Ambient national pulse screen',panelAsset:'/assets/panels/02-mission-control.png',panelRow:2,accent:'var(--color-screen)',atmosphere:{accent:'var(--color-red-on-dark)',background:'dark-grid',motionProfile:'constellation',heroStyle:'observatory'},
  dataSources:['FTN Product Registry','FTN public source registry','authorized YouTube discovery'],accessRules:['guest'],featureFlags:['display-pulse','display-tv-now'],relatedProducts:['ftn-live','kaiso','tv','parliament','events','community-connect'],
  legalNotices:['External source availability','Calculated context notice'],keywords:['screen','display','display mode','ambient','watch','pulse','fullscreen','signage','waiting room','national debt','weather','currency','tv now'],capabilities:['national-pulse','tv-now','world-now','fullscreen','anonymous-presence'],
  purposeStatement:'Glanceable, no-account, kiosk/full-screen ambient view for a shared physical screen -- a capability of FTN Screen, not a standalone product.',
  navPlacement:{primary:false,ecosystemGroup:'media-culture',footer:true},authRequirement:'none',
  // "FTN TV NOW" here is a module name only (js/display-page.js renderTvNow()), not the 'tv'
  // product and not FTN Live's "NOW" view -- unrelated namesakes, see governance doc §3.1.
  // Recorded-murders is deliberately absent from what this consumes: suppressed from
  // current-condition presentation
  // per the Phase 1 Trust Engine repair (js/display-page.js PULSE_IDS).
  integrations:[{productId:'ftn-live',kind:'consumes'},{productId:'community-connect',kind:'consumes'}],
  provenanceLevel:'ftn-calculated',ownerModules:['display/index.html','js/display-page.js','css/components/display.css']
}),
product({
  id:'learn',name:'FTN Learn',shortName:'Learn',tagline:'Find something to learn.',
  description:'FTN discovers legitimate Caribbean learning and training opportunities and sends you to the real provider — FTN Skills for practical/professional training, FTN School for what you are studying.',route:'/learn/',status:'AVAILABLE',parentProduct:'ibis-ai',principal:false,absorbedInto:'ibis-ai',
  primaryUser:'Anyone looking for a course, workshop, apprenticeship or exam help',primaryJourney:'Choose FTN Skills or FTN School, search or filter, then contact or visit the real provider.',
  callsToAction:[{label:'Open FTN Learn',route:'/learn/'}],visualMnemonic:'Open learning path',accent:'var(--color-opportunities)',atmosphere:{accent:'var(--color-opportunities)',background:'dark-growth',motionProfile:'none',heroStyle:'momentum'},
  dataSources:['FTN Learn source function','provider-supplied and publicly discovered listings'],accessRules:['guest discovery'],featureFlags:['learn-fork','learn-search'],relatedProducts:['ibis-ai','opportunities'],legalNotices:['No accreditation by FTN','Verify current availability with the provider'],
  purposeStatement:'AI tutoring/explanation/study guidance is a conversational ibis capability. The real provider/listing dataset (js/learn-data.js -- one dated listing plus four real Trinidad and Tobago training institutions, honestly labelled UNVERIFIED where FTN has not itself confirmed a detail) is preserved unduplicated and queried directly by ibis\'s COURSE_DISCOVERY capability (js/ftn-learn-discovery.js) -- never deleted, never re-typed.',
  keywords:['learn','course','training','workshop','apprenticeship','certification','scholarship','tutor','SEA','CSEC','CAPE','electrician','plumbing','welding','coding','school'],capabilities:['skills-school-fork','learn-search','provider-directory','opportunities-crosslink'],
  ownerModules:['learn/index.html','js/learn-data.js','js/learn-workspace.js','js/ftn-learn-discovery.js']
}),
product({
  id:'radio',name:'FTN Radio',shortName:'Radio',tagline:'The Soundtrack of the Caribbean.',
  description:'Authorized Caribbean audio discovery with rights-aware creator delivery and FTN EPK preparation workspaces.',route:'/radio/',status:'AVAILABLE',
  primaryUser:'Listeners, creators and programmers',primaryJourney:'Discover and play a permitted source, then save/share it or prepare a protected creator submission.',
  callsToAction:[{label:'Listen and discover',route:'/radio/'}],visualMnemonic:'Warm broadcast waveform',panelAsset:'/assets/panels/08-ftn-radio.png',panelRow:2,accent:'var(--color-radio)',atmosphere:{accent:'var(--color-radio)',background:'dark-warm',motionProfile:'waveform',heroStyle:'broadcast-studio'},
  dataSources:['authorized YouTube discovery','creator-declared metadata'],accessRules:['guest listening','Turnstile-protected submission'],featureFlags:['radio-discovery','radio-airtime'],relatedProducts:['riddim','kaiso','tv'],legalNotices:['Media rights and source notice'],
  keywords:['radio','music','talk','culture','creator','epk','soca','reggae','dancehall'],capabilities:['authorized-discovery-player','genre-catalog','programming-brief','creator-package','ftn-epk']
}),
product({
  id:'riddim',name:'FTN Riddim',shortName:'Riddim',tagline:'Powering Caribbean Music.',
  description:'The Caribbean music ecosystem connecting rights-aware discovery and project metadata to FTN Fire, FTN DAW, FTN DJ Tube and FTN Kaiso.',route:'/riddim/',status:'AVAILABLE',parentProduct:'ibis-ai',principal:false,absorbedInto:'ibis-ai',
  primaryUser:'Artists, producers, DJs and music audiences',primaryJourney:'Start with a rights-aware track, beat or project and continue into the appropriate creation, production, discovery or performance tool.',
  callsToAction:[{label:'Open the music hub',route:'/riddim/'}],visualMnemonic:'Layered riddim waveform',panelAsset:'/assets/panels/06-ftn-riddim.png',panelRow:2,accent:'var(--color-riddim)',atmosphere:{accent:'var(--color-riddim)',background:'dark-studio',motionProfile:'waveform',heroStyle:'studio'},
  heroAsset:'/assets/heroes/ftn-riddim-studio.webp',heroAlt:'Caribbean musicians and engineers recording together in a professional studio',heroFocalDesktop:'64% 50%',heroFocalMobile:'66% 50%',
  dataSources:['user-owned local audio','creator metadata','authorized public sources','on-device Fire synthesis'],accessRules:['guest local projects'],featureFlags:['riddim-hub','ftn-fire'],relatedProducts:['ibis-ai','ftn-fire','daw','dj-tube','kaiso','radio'],legalNotices:['Music ownership and licence declaration'],
  purposeStatement:'Its real music-creation engines (Fire, DAW, EPK) now run as genuine ibis capabilities; this page remains live as a legacy hub/handoff into ibis and FTN DJ Tube\'s specialized performance interface, not a second, independent music product.',
  keywords:['music','artist','producer','release','track','beat','riddim','fire','rights','daw','dj','kaiso'],capabilities:['track-intake','rights-metadata','instrumental-draft','local-media','creative-handoff','export'],
  navPlacement:{primary:false,ecosystemGroup:'music-creation',footer:true}
}),
product({
  id:'ftn-fire',name:'FTN Fire',shortName:'Fire',tagline:'Caribbean riddims. Instrumentals only.',
  description:'Riddim’s Caribbean-first instrumental creation hand-off: Fire turns a producer brief into a detailed Flow Music prompt without generated lyrics or vocalist.',route:'/riddim/fire/',status:'AVAILABLE',parentProduct:'ibis-ai',principal:false,absorbedInto:'ibis-ai',
  primaryUser:'Caribbean producers, artists and creators who need an original instrumental starting point',primaryJourney:'Describe the riddim, set BPM/key/energy/instruments, open Flow Music with a copied instrumental-only producer prompt, then import rights-cleared audio into FTN DAW.',
  callsToAction:[{label:'Create an instrumental',route:'/riddim/fire/'}],visualMnemonic:'Layered Caribbean flame waveform',atmosphere:{accent:'#ff4d00',background:'dark-fire-studio',motionProfile:'flame-pulse',heroStyle:'producer-deck'},
  dataSources:['user-authored producer brief','user-operated Flow Music hand-off'],accessRules:['guest producer brief','separate Flow Music account required'],featureFlags:['fire-flow-music-handoff'],relatedProducts:['ibis-ai','riddim','daw'],
  purposeStatement:'Its pure Caribbean rhythm/bass/harmony/melody generator is now a shared, headless music engine (js/ibis-caribbean-music-engine.js) that ibis calls directly for on-device instrumental generation -- a capability, not a separate product to route to.',
  legalNotices:['Instrumentals only','No artist impersonation','Separate-provider account and rights boundary'],analyticsClassification:'creative-private-no-replay',keywords:['fire','beatmaker','beat','instrumental','soca','reggae','dancehall','calypso','chutney','kompa','zouk'],capabilities:['producer-brief','caribbean-style-controls','flow-music-handoff','prompt-copy','daw-handoff'],
  ownerModules:['riddim/fire/index.html','js/ftn-fire.js','js/ibis-caribbean-music-engine.js']
}),
product({
  id:'kaiso',name:'FTN Kaiso',shortName:'Kaiso',tagline:'Caribbean reporting with the source in view.',
  description:'A regional current-affairs and news desk for attributed Trinidad and Tobago, Caribbean and internationally relevant reporting.',route:'/kaiso/',status:'AVAILABLE',parentProduct:'ftn-live',principal:false,absorbedInto:'ftn-live',
  primaryUser:'Caribbean readers and editorial contributors',primaryJourney:'Read current attributed headlines, open the original publisher and submit a correction or story lead.',
  callsToAction:[{label:'Explore Kaiso sources',route:'/kaiso/'}],visualMnemonic:'Editorial rhythm lines',panelAsset:'/assets/panels/07-ftn-kaiso.png',panelRow:2,accent:'var(--color-kaiso)',atmosphere:{accent:'var(--color-kaiso)',background:'dark-editorial',motionProfile:'none',heroStyle:'newsroom'},
  heroAsset:'/assets/heroes/ftn-kaiso-newsroom.webp',heroAlt:'Caribbean editors reviewing printed stories in a working newsroom',heroFocalDesktop:'67% 50%',heroFocalMobile:'68% 50%',
  dataSources:['Trinidad and Tobago Guardian','Trinidad Express','CARICOM official releases','original international publisher links','user-submitted lead drafts'],accessRules:['guest discovery','consented submission'],featureFlags:['kaiso-source-radar'],relatedProducts:['ftn-live','govern','facethenation','display'],legalNotices:['Editorial verification and correction notice'],
  // Brand equity note (explicit instruction: do not destroy useful brand equity to reduce registry
  // count): "Kaiso" stops being a standalone SOFTWARE PRODUCT but remains a real, named EDITORIAL
  // DESK/mode inside FTN Live -- its own newsroom identity, source-radar and correction workflow
  // stay fully intact at their own route, just presented as part of FTN Live rather than a
  // competing destination.
  purposeStatement:'Kaiso is FTN Live\'s source-backed current-affairs/news desk -- a real editorial identity and mode of FTN Live, not a second, independent current-information product.',
  keywords:['kaiso','news','current affairs','Caribbean','Trinidad and Tobago','reporting','headlines','source'],capabilities:['current-source-radar','regional-context','original-publisher-links','story-lead-desk','verification-state'],
  navPlacement:{primary:false,ecosystemGroup:'information-intelligence',footer:true}
}),
product({
  id:'dj-tube',legacyIds:['ftn-dj'],name:'FTN DJ Tube',shortName:'DJ Tube',tagline:'Prepare and perform with audio you have the right to use.',
  description:'A DJ performance and preparation tool for user-owned or licensed local audio, with protected streaming media kept in reference mode.',route:'/riddim/dj/',status:'AVAILABLE',parentProduct:'ibis-ai',
  primaryUser:'DJs and performance creators',primaryJourney:'Confirm rights, load local audio, use real two-deck controls and save or export only supported user-owned output.',
  callsToAction:[{label:'Open FTN DJ Tube',route:'/riddim/dj/'}],visualMnemonic:'Twin decks and crossfader',dataSources:['user-owned local audio','authorized YouTube reference embeds'],accessRules:['guest local workspace','authenticated cloud jobs'],featureFlags:['dj-local-decks','dj-reference-discovery'],relatedProducts:['ibis-ai','daw','radio'],
  // KEEP_SPECIALIZED_INTERFACE (explicit, not absorbed): live dual-deck performance, cue, loop and
  // crossfade are direct-manipulation tasks a conversational interface does not replace -- ibis
  // hands off here rather than reimplementing a performance surface. Its own AI-text/generation
  // affordances (if any) are removed in favour of the one ibis path; the deck/cue/crossfade engine
  // itself is what stays.
  purposeStatement:'A specialized direct-manipulation performance interface -- kept standalone because live deck control is genuinely better as direct manipulation than conversation, not absorbed into ibis.',
  legalNotices:['Local-audio rights declaration','Streaming reference-only notice'],analyticsClassification:'creative-private-no-replay',keywords:['dj','decks','mix','crossfade','cue','loop','tempo','local audio'],capabilities:['local-deck-loading','playback','cue','gain','crossfade','reference-discovery']
}),
product({
  id:'daw',legacyIds:['ftn-daw'],name:'FTN DAW',shortName:'DAW',tagline:'Make a real mix in your browser.',
  description:'A bounded browser production workspace for recording or importing permitted audio, arranging edits and exporting supported user-owned mixes.',route:'/riddim/daw/',status:'AVAILABLE',parentProduct:'ibis-ai',principal:false,absorbedInto:'ibis-ai',
  primaryUser:'Music creators with owned or licensed audio',primaryJourney:'Confirm rights, import audio, apply real browser-audio edits, restore project state and export a supported mix.',
  callsToAction:[{label:'Open FTN DAW',route:'/riddim/daw/'}],visualMnemonic:'Multitrack timeline',dataSources:['user-owned local audio'],accessRules:['guest local workspace'],featureFlags:['daw-browser-audio'],relatedProducts:['ibis-ai','riddim','dj-tube'],
  purposeStatement:'Its WebAudio DSP chain (EQ, shelves, cuts, gain, tempo, spectrum, WAV/MP3 export) is now a shared, headless audio engine (js/ftn-audio-dsp-engine.js) -- ibis calls it directly for AUDIO_PROCESSING, and FTN DJ Tube or a future media tool can call the exact same engine rather than a copy.',
  legalNotices:['Audio ownership and contributor declaration','Local-storage limitation'],analyticsClassification:'creative-private-no-replay',keywords:['daw','audio','record','track','arrange','fade','gain','pan','export'],capabilities:['local-audio-import','browser-audio-processing','project-recipe','mix-export'],
  ownerModules:['riddim/daw/index.html','js/ftn-daw.js','js/ftn-audio-dsp-engine.js']
}),
product({
  id:'epk',name:'FTN EPK',shortName:'EPK',tagline:'One creator record. Reusable professional presentation.',
  description:'A creator-controlled metadata, credits and presentation capability for preparing professional Caribbean artist and media profiles.',route:'/radio/#ftn-epk',status:'AVAILABLE',parentProduct:'ibis-ai',principal:false,absorbedInto:'ibis-ai',
  primaryUser:'Artists, producers and Caribbean creators',primaryJourney:'Prepare reusable creator metadata, credits, links and authorized press-asset references without surrendering source ownership.',
  callsToAction:[{label:'Build an FTN EPK',route:'/radio/#ftn-epk'}],visualMnemonic:'Creator credential card',dataSources:['creator-declared metadata','creator-authorized asset references'],accessRules:['guest local preparation'],featureFlags:['ftn-epk'],relatedProducts:['ibis-ai','radio','screen','events'],
  purposeStatement:'Its creator-metadata/credits/press-links schema is now a shared module (js/ftn-epk-schema.js) that ibis uses directly for the EPK_GENERATION capability; the existing preparation workspace on the Radio page keeps working unchanged.',
  legalNotices:['Creator ownership declaration','Local press files remain on device'],analyticsClassification:'creative-private-no-replay',keywords:['epk','press kit','artist','credits','metadata','creator'],capabilities:['creator-metadata','credits','press-links','portable-export'],
  ownerModules:['radio/index.html','js/radio-workspace.js','js/ftn-epk-schema.js']
}),
product({
  id:'opportunities',name:'FTN Opportunities',shortName:'Opportunities',tagline:'Search. Identify. Predict. Execute.',
  description:'Source-backed Caribbean jobs, grants, calls, funding, business-acquisition and partnership discovery with official destinations and deadline tools.',route:'/opportunities/',status:'AVAILABLE',
  primaryUser:'Caribbean and diaspora opportunity seekers',primaryJourney:'Filter a current listing, verify issuer/source/eligibility, save its deadline and continue to the official destination.',
  callsToAction:[{label:'Find an opportunity',route:'/opportunities/'}],visualMnemonic:'Rising opportunity line',panelAsset:'/assets/panels/10-ftn-opportunities.png',panelRow:2,accent:'var(--color-opportunities)',atmosphere:{accent:'var(--color-opportunities)',background:'dark-growth',motionProfile:'rising-line',heroStyle:'momentum'},
  heroAsset:'/assets/heroes/ftn-opportunities-port.webp',heroAlt:'Caribbean logistics professionals reviewing work at a busy container port',heroFocalDesktop:'68% 50%',heroFocalMobile:'66% 50%',
  dataSources:['FTN opportunities source function','official issuer destinations'],accessRules:['guest discovery and local saves'],featureFlags:['opportunity-sources'],relatedProducts:['ibis-ai','events','invest','mission-control','learn'],legalNotices:['No guarantee or endorsement','Official-destination notice'],
  purposeStatement:'A live, continuously-changing source-backed data/workflow service -- ibis searches and reasons over it, but does not replace or absorb it.',
  keywords:['job','grant','contract','business','career','procurement','funding','scholarship','tender'],capabilities:['official-source-feed','search','filter','save','application-tracker','calendar-export'],
  navPlacement:{primary:true,ecosystemGroup:'opportunities-business',footer:true}
}),
product({
  id:'love',name:'FTN Love',shortName:'Love',tagline:'Consent and safety before discovery.',
  description:'Vaulted until FTN independently verifies the complete adult-safety, moderation, deletion and protected server-control release gate.',route:'/love/',status:'VAULTED',publicVisibility:false,visibility:'VAULTED',
  primaryUser:'FTN product and safety stewards',primaryJourney:'Complete the approved safety case and deployment gate before any public relationship journey is restored.',
  callsToAction:[],visualMnemonic:'Protected heart boundary',panelAsset:'/assets/panels/11-ftn-love.png',panelRow:null,accent:'var(--color-love)',atmosphere:{accent:'var(--color-love)',background:'warm',motionProfile:'none',heroStyle:'warm-human'},
  dataSources:[],accessRules:['no public access'],featureFlags:['love-vaulted'],relatedProducts:['account'],legalNotices:['18+ only','Safety review required before release','No public service'],analyticsClassification:'restricted-sensitive-no-replay',
  keywords:['relationship','connection','match','compatibility','consent','safety'],capabilities:['private-onboarding','consent','controlled-discovery','block','report','delete']
}),
product({
  id:'display-network',name:'FTN Display Network',shortName:'Display',tagline:'Host a screen or place a verified message.',
  description:'A business and creator campaign-request workspace for eligible FTN-owned placements, creative preview and honest moderation status.',route:'/display-network/',status:'AVAILABLE',
  primaryUser:'Advertisers, partners and FTN placement operators',primaryJourney:'Review placement rules, prepare and preview creative, submit an honest request and track moderation status.',
  callsToAction:[{label:'Prepare a campaign request',route:'/display-network/'}],visualMnemonic:'Screen grid and approval signal',panelAsset:'/assets/panels/12-display-network.png',panelRow:3,accent:'var(--color-display-network)',atmosphere:{accent:'var(--color-display-network)',background:'dark-infrastructure',motionProfile:'none',heroStyle:'infrastructure'},
  dataSources:['user-provided creative','FTN placement registry'],accessRules:['guest preparation','protected submission','operator approval'],featureFlags:['display-playlist','campaign-request'],relatedProducts:['events','invest'],legalNotices:['Sponsored-content disclosure','Creative rights declaration','No automatic placement'],
  keywords:['signage','display','advertising','campaign','placement','screen','playlist'],capabilities:['campaign-brief','creative-preview','playlist-builder','moderation-request','status']
}),
product({
  id:'invest',name:'FTN Invest-in',shortName:'InvestIn',tagline:'Partner with Caribbean-owned digital infrastructure.',
  description:'The FTN partnership, sponsorship and investment-conversation surface, with a separate directory of official Trinidad and Tobago financial-information sources.',route:'/invest/',status:'AVAILABLE',
  primaryUser:'Potential partners, sponsors, institutions and aligned investors',primaryJourney:'Understand the FTN partnership opportunity, choose a conversation type and submit through the verified FTN contact path.',
  callsToAction:[{label:'Explore FTN partnerships',route:'/invest/'},{label:'Request a conversation',route:'/contact/?subject=FTN%20partnership'}],visualMnemonic:'Verified growth ledger',dataSources:['FTN-owned partnership information','Ministry of Finance','Central Bank of Trinidad and Tobago','Trinidad and Tobago Stock Exchange'],accessRules:['guest partnership information','verified FTN contact path'],featureFlags:['invest-partnerships','official-financial-sources'],relatedProducts:['opportunities','top-picks'],
  legalNotices:['No public investment solicitation','No financial advice','No trades or custody','External sources remain source-owned'],keywords:['partner','sponsor','invest','institution','business','Caribbean infrastructure'],capabilities:['partnership-brief','sponsorship-path','official-financial-source-directory','contact-handoff'],
  navPlacement:{primary:true,ecosystemGroup:'opportunities-business',footer:true}
}),
product({
  id:'account',name:'FTN Account',shortName:'Account',tagline:'One account. Clear permissions. Your control.',
  description:'The shared FTN identity and preference surface for protected saves, projects, consent choices, sessions, export and deletion.',route:'/account/',status:'AVAILABLE',
  primaryUser:'Returning FTN users and creators',primaryJourney:'Sign in at the point of need, return to the exact task and inspect or revoke account state.',
  callsToAction:[{label:'Open FTN Account',route:'/account/'}],visualMnemonic:'Identity keyring',dataSources:['Supabase Auth','FTN account schema'],accessRules:['guest sign-in','authenticated self-service'],featureFlags:['account-email-auth'],relatedProducts:['ibis-ai','love','opportunities'],legalNotices:['Account privacy','Consent controls','Deletion and retention'],analyticsClassification:'authentication-no-replay',
  keywords:['account','sign in','login','profile','session','saved','consent','delete','export'],capabilities:['email-auth','session','return-to-task','profile','saved-items','sign-out'],
  // Phase 3 service-worker route-policy consolidation: 'mixed' means a real guest-visible surface
  // (the sign-in page itself) that also renders authenticated, per-user responses once signed in --
  // scripts/sync-service-worker.mjs reads this to exclude the route from the SW's public cache,
  // same as an explicitly PRIVATE/VAULTED product. See data/route-policy.mjs for the non-product
  // half of this policy and the explicit "not a security boundary" statement.
  authRequirement:'mixed'
}),
product({
  id:'health',name:'FTN Health',shortName:'Health',tagline:'A future Caribbean health-information pathway.',
  description:'Vaulted until a separately approved clinical-governance, privacy, emergency-boundary and public-information release exists.',route:'/health/',status:'VAULTED',publicVisibility:false,visibility:'VAULTED',
  primaryUser:'FTN product, privacy and clinical-governance stewards',primaryJourney:'Complete the separately approved governance and safety gate before any public health-information journey is restored.',
  callsToAction:[],visualMnemonic:'Future care pulse',dataSources:[],accessRules:['no public access'],featureFlags:['health-vaulted'],relatedProducts:['platform-home'],
  legalNotices:['No medical service','Governance review required before release','No health-data collection'],analyticsClassification:'restricted-sensitive-no-replay',keywords:['health','wellbeing','future'],capabilities:[]
}),
product({
  // Phase 5A (2026-08-25): the shared, source-verified official-statistics foundation --
  // registered here, not built as a second isolated product with its own data model.
  // `dataSources`/`consumingProducts`-equivalent linkage lives in js/ftn-statistics.js's own
  // indicatorDefinition() shape (`consumingProducts`), not duplicated as a second list here.
  id:'statistics',name:'FTN Statistics',shortName:'Statistics',tagline:'Real numbers. Real sources. Every time.',
  // KEEP_DATA_SERVICE (explicit, never ABSORB): authoritative/shared state that ibis and every
  // other product CONSUME, never replace -- one verified number, one source, one methodology,
  // reused everywhere. Folding this into ibis would turn a shared foundation into a single
  // product's feature; it stays its own node precisely so it is not owned by any one consumer.
  productType:'data-service',
  description:'FTN’s shared, source-verified official-data foundation for Trinidad and Tobago — one place a government statistic is checked, dated and attributed once, then reused by FTN Live, ibis.ai and the rest of the platform instead of copied and re-guessed.',route:'/statistics/',status:'AVAILABLE',
  primaryUser:'Residents, researchers, institutions and other FTN products needing a verified official figure',primaryJourney:'Open a verified indicator, inspect its real source/reference date/methodology via its Trust Card, and follow the link to the official publisher.',
  callsToAction:[{label:'Open FTN Statistics',route:'/statistics/'}],visualMnemonic:'Verified data ledger',accent:'var(--color-red)',atmosphere:{accent:'var(--color-red)',background:'dark-minimal',motionProfile:'none',heroStyle:'editorial'},
  dataSources:['Trinidad and Tobago Police Service — Statistical Reports Collection','Central Statistical Office — Crime Statistics','Central Bank of Trinidad and Tobago — Exchange Rates (Monthly)'],accessRules:['guest'],featureFlags:['statistics-crime-vertical-slice','statistics-fx-vertical-slice','statistics-ibis-query'],relatedProducts:['ftn-live','ibis-ai','govern','parliament','community-connect'],
  legalNotices:['Official source attribution notice','Not a redistribution of the underlying government dataset'],
  keywords:['statistics','data','crime','murder','exchange rate','currency','official','CSO','TTPS','central bank','indicator','verified','source'],capabilities:['verified-official-indicator','source-attribution','trust-card-evidence','accessible-data-table','ibis-statistic-query'],
  purposeStatement:'The shared statistical data foundation meant to serve FTN Live, ibis.ai, FTN Screen, FTN Govern, FTN Parliament and Community Connect alike — not a second, isolated statistics product. Two verified indicators: CSO/TTPS crime data and Central Bank TT$/US$ exchange rates, both queryable through a real, deterministic ibis.ai STATISTIC_QUERY capability (see GOVERNANCE/FTN_Statistics_Source_Map_2026-08-25.md and IBIS-MAP.md Phase 5B).',
  navPlacement:{primary:false,ecosystemGroup:'information-intelligence',footer:true},authRequirement:'guest',
  integrations:[{productId:'ftn-live',kind:'shares-data-with'},{productId:'ibis-ai',kind:'shares-data-with'}],
  provenanceLevel:'official',ownerModules:['statistics/index.html','js/ftn-statistics.js','js/ftn-statistics-crime-adapter.js','js/ftn-statistics-fx-adapter.js','js/ftn-statistics-chart.js','js/crime-intelligence.js','js/fx-intelligence.js','js/ibis-statistics-capability.js','js/statistics-ask-ibis.js','data/crime-statistics.json','data/fx-usd-ttd.json']
}),
product({
  id:'top-picks',name:'FTN Picks',shortName:'Picks',tagline:'Useful tools. Caribbean context.',
  description:'FTN Invest-in’s supporting recommendation capability with free-first guidance and explicit affiliate, support and editorial relationship labels.',route:'/top-picks/',status:'AVAILABLE',parentProduct:'invest',principal:false,absorbedInto:'invest',
  primaryUser:'Creators and small Caribbean teams',primaryJourney:'Compare a disclosed recommendation and continue to the provider independently.',callsToAction:[{label:'Browse FTN Picks',route:'/top-picks/'}],visualMnemonic:'Curated tool marker',
  dataSources:['FTN relationship registry','provider public pages'],accessRules:['guest'],featureFlags:['top-picks'],relatedProducts:['invest'],legalNotices:['Affiliate and relationship disclosure'],keywords:['tools','affiliate','software','creator','recommendation'],capabilities:['recommendations','relationship-disclosure']
})
];
var ECOSYSTEM_GROUPS=[
  {id:'civic-public-life',title:'Civic & public life',description:'Participate and follow the public record through one civic-source system.',productIds:['community-connect','govern','facethenation']},
  {id:'information-intelligence',title:'Information & intelligence',description:'One current-information system (FTN Live) and FTN ibis, Caribbean-first intelligence and orchestration for everything else.',productIds:['ftn-live','ibis-ai','statistics']},
  {id:'media-culture',title:'Media & culture',description:'One media/screen system for Caribbean stories, film, TV and radio through permitted sources.',productIds:['radio','screen']},
  {id:'music-creation',title:'Music & creation',description:'Create with ibis\'s Caribbean music and audio engines; perform live with FTN DJ Tube\'s specialized interface.',productIds:['ibis-ai','dj-tube']},
  {id:'opportunities-business',title:'Opportunities & business',description:'Find verified paths to work, funding and partnerships; ibis reasons over the same live data.',productIds:['opportunities','invest']},
  {id:'community-infrastructure',title:'Community & infrastructure',description:'Plan gatherings and prepare messages for eligible Caribbean placements.',productIds:['events','display-network']}
];
global.FTN=global.FTN||{};
global.FTN.ProductRegistryData=PRODUCTS;
global.FTN.ProductRegistryGroups=ECOSYSTEM_GROUPS;
})(window);
