// FTN Platform Website — Product Registry data.
// This is the auditable source of truth for product identity, hierarchy, release state,
// visibility, access and public claims. Consumers must use js/product-registry.js.
(function(global){
'use strict';
var RELEASE='2.0.0-rc.1',VERIFIED='2026-08-10',OWNER='RealityArtTV Media';
function product(config){
  var accent=config.accent||'var(--color-red-on-dark)';
  return Object.assign({
    shortName:config.name,
    parentProduct:null,
    publicVisibility:true,
    owner:OWNER,
    primaryUser:'Caribbean public',
    primaryJourney:'Open the product and complete its bounded public task.',
    callsToAction:[{label:'Open',route:config.route}],
    visualMnemonic:'FTN signal node',
    icon:'/assets/icons/favicon.svg',
    heroAsset:config.panelAsset||null,
    dataSources:[],
    accessRules:['guest'],
    featureFlags:[],
    relatedProducts:[],
    legalNotices:['FTN product terms','FTN privacy policy'],
    analyticsClassification:'public-essential-only',
    lastVerified:VERIFIED,
    releaseVersion:RELEASE,
    principal:true,
    panelAsset:null,
    panelRow:null,
    atmosphere:{accent:accent,background:'dark-minimal',motionProfile:'none',heroStyle:'editorial'},
    keywords:[],
    capabilities:[]
  },config,{accent:undefined});
}
var PRODUCTS=[
product({
  id:'platform-home',name:'FTN Platform',shortName:'Home',tagline:'The Caribbean Operating System.',
  description:'One connected Caribbean ecosystem for civic action, trusted information, media, creation, opportunity and business.',route:'/',status:'LIVE',
  primaryJourney:'Describe a goal, discover the right FTN product and continue without forced sign-in.',callsToAction:[{label:'Find a product',route:'/#find-your-path'},{label:'Explore all products',route:'/applications/'}],
  visualMnemonic:'Connected Caribbean signal field',dataSources:['FTN Product Registry','verified public FTN records'],relatedProducts:['community-connect','ibis-ai','opportunities'],
  keywords:['Caribbean','platform','ecosystem','discover','search','operating system'],capabilities:['product-discovery','public-search','country-preference','pwa-install','return-to-task']
}),
product({
  id:'community-connect',name:'Community Connect',shortName:'Community',tagline:'Connect. Report. Improve.',
  description:'FTN’s protected citizen-reporting application for documenting local issues and following community action without implying government endorsement or automatic resolution.',route:'/community-connect/',status:'BETA',
  primaryUser:'Residents and community participants',primaryJourney:'Review the evidence and privacy terms, then continue to the protected web app or verified Android release.',
  callsToAction:[{label:'Open Community Connect',route:'/community-connect/#launch'},{label:'Android release',route:'/community-connect/#download'}],visualMnemonic:'Community pin and verified report',
  panelAsset:'/assets/panels/01-community-connect.png',panelRow:1,accent:'var(--color-red)',atmosphere:{accent:'var(--color-red)',background:'photo',motionProfile:'none',heroStyle:'photo-real'},
  dataSources:['Community Connect protected application','approved public aggregate records'],accessRules:['guest landing','separate protected application account'],featureFlags:['community-connect-handoff'],
  relatedProducts:['parliament','facethenation'],legalNotices:['Evidence and consent notice','Community guidelines','Privacy policy'],analyticsClassification:'civic-sensitive-no-replay',
  keywords:['report','issue','pothole','community','neighbourhood','infrastructure','complaint'],capabilities:['verified-release-handoff','reporting-handoff','public-boundary-notice']
}),
product({
  id:'mission-control',name:'Mission Control',shortName:'Mission Control',tagline:'See what is happening. Understand why. Coordinate what happens next.',
  description:'A transparent public decision-support demonstration with calculated comparisons, evidence views and scenarios; it is not a live government operations system.',route:'/mission-control/',status:'BETA',
  primaryUser:'Public-interest teams and institutional evaluators',primaryJourney:'Explore supplied evidence, run a calculation and export a clearly labelled demonstration brief.',
  callsToAction:[{label:'Open public demonstration',route:'/mission-control/demo/'}],visualMnemonic:'Command radar sweep',panelAsset:'/assets/panels/02-mission-control.png',panelRow:1,accent:'var(--color-mission-control)',atmosphere:{accent:'var(--color-mission-control)',background:'dark-grid',motionProfile:'radar-sweep',heroStyle:'operations-center'},
  dataSources:['labelled demonstration dataset'],accessRules:['guest demonstration'],featureFlags:['mission-control-demo'],relatedProducts:['parliament','events','opportunities','facethenation'],
  legalNotices:['Demonstration data notice','No institutional endorsement'],keywords:['government','agency','dashboard','analytics','decisions','evidence','correlation','scenario'],capabilities:['calculated-change-analysis','calculated-correlation','scenario-demonstration','evidence-explorer','relationship-graph']
}),
product({
  id:'ibis-ai',name:'ibis.ai',shortName:'ibis',tagline:'Built for the Caribbean.',
  description:'FTN’s Caribbean-first intelligence and creative orchestration workspace for task routing, analysis, image/video project planning and provider-transparent production.',route:'/ibis-ai/',status:'BETA',
  primaryUser:'People trying to complete or create something across FTN',primaryJourney:'Describe the outcome, choose an intelligence or creative mode, inspect the source/provider/cost boundary and continue with an exportable project.',
  callsToAction:[{label:'Ask ibis',route:'/ibis-ai/'},{label:'Open Creative Studio',route:'/ibis-ai/#ibis-creative-studio'}],visualMnemonic:'Ibis creative command node',panelAsset:'/assets/panels/05-ibis-ai.png',panelRow:1,accent:'var(--color-ibis)',atmosphere:{accent:'var(--color-ibis)',background:'dark-minimal',motionProfile:'node-pulse',heroStyle:'calm-focused'},
  dataSources:['FTN Product Registry','FTN public source functions','authenticated approved AI provider','verified creative-provider registry'],accessRules:['guest deterministic tools','authenticated server AI','paid provider calls disabled until credits and server approval'],featureFlags:['ibis-router','ibis-visual','ibis-authenticated-ai','ibis-creative-studio','provider-cost-lock'],
  relatedProducts:['platform-home','mission-control','kaiso','ftn-fire'],legalNotices:['Generated-output notice','Private conversation boundary','Provider transfer and cost notice','Responsible AI'],analyticsClassification:'private-content-no-replay',
  keywords:['help','navigate','find','assist','goal','route','analyze','visual','image','video','creative studio','campaign'],capabilities:['task-routing','ftn-data-analysis','media-discovery','on-device-visual-draft','creative-project-planning','provider-evidence','authenticated-server-ai','cross-product-handoff']
}),
product({
  id:'parliament',name:'FTN Parliament',shortName:'Parliament',tagline:'Public records. Clear sources. Civic context.',
  description:'An independent source directory for Parliament of Trinidad and Tobago records, with visible jurisdiction, source and verification dates.',route:'/parliament/',status:'BETA',
  primaryUser:'Residents, researchers and public-affairs audiences',primaryJourney:'Search a record category, open the official source, save/share it or report a broken source.',
  callsToAction:[{label:'Find a public record',route:'/parliament/#records'}],visualMnemonic:'Civic columns and source seal',dataSources:['Parliament of Trinidad and Tobago official website'],
  accessRules:['guest directory'],featureFlags:['parliament-directory'],relatedProducts:['facethenation','community-connect','mission-control'],legalNotices:['Independent non-official service','Source and correction notice'],
  keywords:['parliament','representative','constituency','bill','sitting','debate','committee','public record'],capabilities:['official-source-directory','search','filter','save','share','broken-source-report']
}),
product({
  id:'facethenation',name:'Face The Nation',shortName:'Face The Nation',tagline:'Every Voice. Every Constituency. Every Truth.',
  description:'FTN’s public-affairs and constituency programme hub with source-backed episode discovery and moderated participation paths.',route:'/facethenation',status:'BETA',
  primaryUser:'Public-affairs audiences, guests and constituents',primaryJourney:'Find an authorized episode, view supporting context, share it or submit a moderated question/story.',
  callsToAction:[{label:'Watch and participate',route:'/facethenation#watch'}],visualMnemonic:'Constituency microphone',panelAsset:'/assets/panels/04-face-the-nation.png',panelRow:1,atmosphere:{accent:'var(--color-red-on-dark)',background:'photo',motionProfile:'none',heroStyle:'broadcast'},
  dataSources:['FTN authorized YouTube records','user-consented submissions'],accessRules:['guest discovery','moderated submission'],featureFlags:['face-episodes'],relatedProducts:['parliament','community-connect','tv'],
  legalNotices:['Editorial independence','Corrections','Sponsorship disclosure'],keywords:['interview','debate','politics','public affairs','constituency','episode','guest'],capabilities:['episode-discovery','authorized-embedded-playback','participation','public-affairs']
}),
product({
  id:'events',name:'FTN Events',shortName:'Events',tagline:'Every Event Starts Here.',
  description:'A Caribbean event discovery, planning and submission workspace with source follow-through and practical preparation tools.',route:'/events/',status:'BETA',
  primaryUser:'Event attendees, organizers and production teams',primaryJourney:'Discover or prepare an event, save/export the details and follow a real organizer/source destination.',
  callsToAction:[{label:'Discover or plan an event',route:'/events/'}],visualMnemonic:'Backstage spotlight',panelAsset:'/assets/panels/03-ftn-events.png',panelRow:1,accent:'var(--color-events)',atmosphere:{accent:'var(--color-events)',background:'dark-stage',motionProfile:'spotlight',heroStyle:'backstage'},
  dataSources:['organizer-supplied links','public event sources','local user workspace'],accessRules:['guest discovery and planning','moderated submissions'],featureFlags:['event-planner','event-directory'],relatedProducts:['display-network','opportunities','ftn-live'],
  keywords:['event','concert','festival','conference','wedding','plan','venue','calendar','ticket'],capabilities:['event-discovery','event-brief','operational-plan','provider-discovery','calendar-export','save','share']
}),
product({
  id:'screen',name:'FTN Screen',shortName:'Screen',tagline:'Where Caribbean Stories Come Alive.',
  description:'Caribbean film, filmmaker and screen-work discovery with permitted trailers, lawful destinations and festival-package preparation.',route:'/screen/',status:'BETA',
  primaryUser:'Film audiences and screen creators',primaryJourney:'Discover an approved film, inspect rights/source context and follow a permitted watch or creator path.',
  callsToAction:[{label:'Discover Caribbean screen work',route:'/screen/'}],visualMnemonic:'Cinema frame aperture',panelAsset:'/assets/panels/09-ftn-screen.png',panelRow:2,accent:'var(--color-screen)',atmosphere:{accent:'var(--color-screen)',background:'dark-cinematic',motionProfile:'none',heroStyle:'cinematic'},
  dataSources:['authorized public embeds','creator-declared metadata','official festival sources'],accessRules:['guest discovery','creator preparation'],featureFlags:['screen-catalog','festival-package'],relatedProducts:['tv','facethenation'],legalNotices:['Media rights and destination notice'],
  keywords:['film','movie','cinema','documentary','filmmaker','festival','trailer'],capabilities:['film-discovery','authorized-embedded-playback','film-metadata','festival-readiness','festival-matching','export']
}),
product({
  id:'tv',name:'FTN TV',shortName:'TV',tagline:'Caribbean Television, Programmed with Purpose.',
  description:'A scheduled and on-demand FTN programme surface using authorized sources and honest on-air, replay, off-air and provider-failure states.',route:'/tv/',status:'BETA',parentProduct:'screen',
  primaryUser:'Caribbean programme audiences',primaryJourney:'Select a programme, verify its current availability and play an authorized source.',callsToAction:[{label:'Open the programme guide',route:'/tv/'}],visualMnemonic:'Broadcast frame and clock',
  dataSources:['FTN schedule data','authorized YouTube embeds'],accessRules:['guest viewing'],featureFlags:['tv-guide'],relatedProducts:['screen','facethenation','ftn-live'],legalNotices:['Programme rights and source notice'],
  keywords:['television','tv','channel','schedule','guide','watch','programme','replay'],capabilities:['current-programme-resolution','authorized-playback','schedule','tune','failure-state']
}),
product({
  id:'ftn-live',legacyIds:['observatory'],name:'FTN Live',shortName:'Live',tagline:'See the Caribbean as it changes.',
  description:'A public live-information and scheduled coverage layer with verified source states, Caribbean time handling and explicit fallbacks.',route:'/observatory/',status:'BETA',
  primaryUser:'People following current Caribbean conditions and scheduled coverage',primaryJourney:'Open a current or scheduled signal, inspect its source/time and follow its accurate next state.',
  callsToAction:[{label:'Open FTN Live',route:'/observatory/'}],visualMnemonic:'Caribbean signal constellation',atmosphere:{accent:'var(--color-red-on-dark)',background:'dark-grid',motionProfile:'constellation',heroStyle:'observatory'},
  dataSources:['NOAA satellite products','Open-Meteo','World Bank','FTN public source registry'],accessRules:['guest'],featureFlags:['live-sources','satellite'],relatedProducts:['events','tv','mission-control'],
  legalNotices:['External source availability','Calculated context notice'],keywords:['indicators','data','live','satellite','weather','schedule','replay','change'],capabilities:['current-satellite-imagery','connected-public-sources','indicator-context','accurate-state','fallback']
}),
product({
  id:'radio',name:'FTN Radio',shortName:'Radio',tagline:'The Soundtrack of the Caribbean.',
  description:'Authorized Caribbean audio and programme discovery with creator, programming and FTN EPK preparation workspaces.',route:'/radio/',status:'BETA',
  primaryUser:'Listeners, creators and programmers',primaryJourney:'Discover and play a permitted source, then save/share it or prepare a protected creator submission.',
  callsToAction:[{label:'Listen and discover',route:'/radio/'}],visualMnemonic:'Warm broadcast waveform',panelAsset:'/assets/panels/08-ftn-radio.png',panelRow:2,accent:'var(--color-radio)',atmosphere:{accent:'var(--color-radio)',background:'dark-warm',motionProfile:'waveform',heroStyle:'broadcast-studio'},
  dataSources:['authorized YouTube discovery','creator-declared metadata'],accessRules:['guest listening','Turnstile-protected submission'],featureFlags:['radio-discovery','radio-airtime'],relatedProducts:['riddim','kaiso','tv'],legalNotices:['Media rights and source notice'],
  keywords:['radio','music','talk','culture','creator','epk','soca','reggae','dancehall'],capabilities:['authorized-discovery-player','genre-catalog','programming-brief','creator-package','ftn-epk']
}),
product({
  id:'riddim',name:'FTN Riddim',shortName:'Riddim',tagline:'Powering Caribbean Music.',
  description:'The Caribbean music ecosystem connecting rights-aware discovery and project metadata to FTN Fire, FTN DAW, FTN DJ Tube and FTN Kaiso.',route:'/riddim/',status:'BETA',
  primaryUser:'Artists, producers, DJs and music audiences',primaryJourney:'Start with a rights-aware track, beat or project and continue into the appropriate creation, production, discovery or performance tool.',
  callsToAction:[{label:'Open the music hub',route:'/riddim/'}],visualMnemonic:'Layered riddim waveform',panelAsset:'/assets/panels/06-ftn-riddim.png',panelRow:2,accent:'var(--color-riddim)',atmosphere:{accent:'var(--color-riddim)',background:'dark-studio',motionProfile:'waveform',heroStyle:'studio'},
  dataSources:['user-owned local audio','creator metadata','authorized public sources','on-device Fire synthesis'],accessRules:['guest local projects'],featureFlags:['riddim-hub','ftn-fire'],relatedProducts:['ftn-fire','daw','dj-tube','kaiso','radio'],legalNotices:['Music ownership and licence declaration'],
  keywords:['music','artist','producer','release','track','beat','riddim','fire','rights','daw','dj','kaiso'],capabilities:['track-intake','rights-metadata','instrumental-draft','local-media','creative-handoff','export']
}),
product({
  id:'ftn-fire',name:'FTN Fire',shortName:'Fire',tagline:'Caribbean riddims. Instrumentals only.',
  description:'Riddim’s Caribbean-first instrumental creation hand-off: Fire turns a producer brief into a detailed Flow Music prompt without generated lyrics or vocalist.',route:'/riddim/fire/',status:'BETA',parentProduct:'riddim',principal:false,
  primaryUser:'Caribbean producers, artists and creators who need an original instrumental starting point',primaryJourney:'Describe the riddim, set BPM/key/energy/instruments, open Flow Music with a copied instrumental-only producer prompt, then import rights-cleared audio into FTN DAW.',
  callsToAction:[{label:'Create an instrumental',route:'/riddim/fire/'}],visualMnemonic:'Layered Caribbean flame waveform',atmosphere:{accent:'#ff4d00',background:'dark-fire-studio',motionProfile:'flame-pulse',heroStyle:'producer-deck'},
  dataSources:['user-authored producer brief','user-operated Flow Music hand-off'],accessRules:['guest producer brief','separate Flow Music account required'],featureFlags:['fire-flow-music-handoff'],relatedProducts:['riddim','daw','ibis-ai'],
  legalNotices:['Instrumentals only','No artist impersonation','Separate-provider account and rights boundary'],analyticsClassification:'creative-private-no-replay',keywords:['fire','beatmaker','beat','instrumental','soca','reggae','dancehall','calypso','chutney','kompa','zouk'],capabilities:['producer-brief','caribbean-style-controls','flow-music-handoff','prompt-copy','daw-handoff']
}),
product({
  id:'kaiso',name:'FTN Kaiso',shortName:'Kaiso',tagline:'Caribbean music, culture and newsroom sources.',
  description:'A source-backed calypso, soca and Caribbean culture discovery desk with explicit provenance, verification and correction boundaries.',route:'/kaiso/',status:'BETA',
  primaryUser:'Culture audiences, researchers and editorial contributors',primaryJourney:'Search current sources and permitted media, inspect provenance and submit a correction or story lead.',
  callsToAction:[{label:'Explore Kaiso sources',route:'/kaiso/'}],visualMnemonic:'Editorial rhythm lines',panelAsset:'/assets/panels/07-ftn-kaiso.png',panelRow:2,accent:'var(--color-kaiso)',atmosphere:{accent:'var(--color-kaiso)',background:'dark-editorial',motionProfile:'none',heroStyle:'newsroom'},
  dataSources:['FTN public news-source function','authorized YouTube discovery','user-submitted lead drafts'],accessRules:['guest discovery','consented submission'],featureFlags:['kaiso-source-radar'],relatedProducts:['riddim','radio','facethenation'],legalNotices:['Editorial verification and correction notice'],
  keywords:['kaiso','calypso','soca','culture','artist','song','news','archive','source'],capabilities:['current-source-radar','culture-discovery','authorized-playback','story-lead-desk','verification-state']
}),
product({
  id:'dj-tube',legacyIds:['ftn-dj'],name:'FTN DJ Tube',shortName:'DJ Tube',tagline:'Prepare and perform with audio you have the right to use.',
  description:'A DJ performance and preparation tool for user-owned or licensed local audio, with protected streaming media kept in reference mode.',route:'/riddim/dj/',status:'BETA',parentProduct:'riddim',
  primaryUser:'DJs and performance creators',primaryJourney:'Confirm rights, load local audio, use real two-deck controls and save or export only supported user-owned output.',
  callsToAction:[{label:'Open FTN DJ Tube',route:'/riddim/dj/'}],visualMnemonic:'Twin decks and crossfader',dataSources:['user-owned local audio','authorized YouTube reference embeds'],accessRules:['guest local workspace','authenticated cloud jobs'],featureFlags:['dj-local-decks','dj-reference-discovery'],relatedProducts:['riddim','daw','radio'],
  legalNotices:['Local-audio rights declaration','Streaming reference-only notice'],analyticsClassification:'creative-private-no-replay',keywords:['dj','decks','mix','crossfade','cue','loop','tempo','local audio'],capabilities:['local-deck-loading','playback','cue','gain','crossfade','reference-discovery']
}),
product({
  id:'daw',legacyIds:['ftn-daw'],name:'FTN DAW',shortName:'DAW',tagline:'Make a real mix in your browser.',
  description:'A bounded browser production workspace for recording or importing permitted audio, arranging edits and exporting supported user-owned mixes.',route:'/riddim/daw/',status:'BETA',parentProduct:'riddim',
  primaryUser:'Music creators with owned or licensed audio',primaryJourney:'Confirm rights, import audio, apply real browser-audio edits, restore project state and export a supported mix.',
  callsToAction:[{label:'Open FTN DAW',route:'/riddim/daw/'}],visualMnemonic:'Multitrack timeline',dataSources:['user-owned local audio'],accessRules:['guest local workspace'],featureFlags:['daw-browser-audio'],relatedProducts:['riddim','dj-tube'],
  legalNotices:['Audio ownership and contributor declaration','Local-storage limitation'],analyticsClassification:'creative-private-no-replay',keywords:['daw','audio','record','track','arrange','fade','gain','pan','export'],capabilities:['local-audio-import','browser-audio-processing','project-recipe','mix-export']
}),
product({
  id:'opportunities',name:'FTN Opportunities',shortName:'Opportunities',tagline:'Find it. Prepare. Move.',
  description:'Source-backed Caribbean jobs, grants, tenders, scholarships and programme discovery with official destinations and deadline tools.',route:'/opportunities/',status:'BETA',
  primaryUser:'Caribbean and diaspora opportunity seekers',primaryJourney:'Filter a current listing, verify issuer/source/eligibility, save its deadline and continue to the official destination.',
  callsToAction:[{label:'Find an opportunity',route:'/opportunities/'}],visualMnemonic:'Rising opportunity line',panelAsset:'/assets/panels/10-ftn-opportunities.png',panelRow:2,accent:'var(--color-opportunities)',atmosphere:{accent:'var(--color-opportunities)',background:'dark-growth',motionProfile:'rising-line',heroStyle:'momentum'},
  dataSources:['FTN opportunities source function','official issuer destinations'],accessRules:['guest discovery and local saves'],featureFlags:['opportunity-sources'],relatedProducts:['events','invest','mission-control'],legalNotices:['No guarantee or endorsement','Official-destination notice'],
  keywords:['job','grant','contract','business','career','procurement','funding','scholarship','tender'],capabilities:['official-source-feed','search','filter','save','application-tracker','calendar-export']
}),
product({
  id:'love',name:'FTN Love',shortName:'Love',tagline:'Consent and safety before discovery.',
  description:'A consent-first relationship-discovery product for adults. Private profiles, discovery, matching, messages, block, report and deletion remain protected behind FTN Account and server-side safety controls.',route:'/love/',status:'BETA',publicVisibility:true,
  primaryUser:'Adults who explicitly consent to a private relationship journey',primaryJourney:'Authenticate, confirm age and consent, create a private profile, use controlled discovery and retain block/report/delete control.',
  callsToAction:[{label:'Explore FTN Love',route:'/love/'}],visualMnemonic:'Protected heart boundary',panelAsset:'/assets/panels/11-ftn-love.png',panelRow:null,accent:'var(--color-love)',atmosphere:{accent:'var(--color-love)',background:'warm',motionProfile:'heartbeat',heroStyle:'warm-human'},
  dataSources:['user-consented private profile data'],accessRules:['authenticated adult','RLS owner-only profile','mutual match for messaging'],featureFlags:['love-private'],relatedProducts:['account'],legalNotices:['18+ only','Consent and safety','Private-data boundary'],analyticsClassification:'restricted-sensitive-no-replay',
  keywords:['relationship','connection','match','compatibility','consent','safety'],capabilities:['private-onboarding','consent','controlled-discovery','block','report','delete']
}),
product({
  id:'display-network',name:'FTN Display Network',shortName:'Display',tagline:'Approved information. The right screen. The right place.',
  description:'A business and creator campaign-request workspace for eligible FTN-owned placements, creative preview and honest moderation status.',route:'/display-network/',status:'BETA',
  primaryUser:'Advertisers, partners and FTN placement operators',primaryJourney:'Review placement rules, prepare and preview creative, submit an honest request and track moderation status.',
  callsToAction:[{label:'Prepare a campaign request',route:'/display-network/'}],visualMnemonic:'Screen grid and approval signal',panelAsset:'/assets/panels/12-display-network.png',panelRow:3,accent:'var(--color-display-network)',atmosphere:{accent:'var(--color-display-network)',background:'dark-infrastructure',motionProfile:'none',heroStyle:'infrastructure'},
  dataSources:['user-provided creative','FTN placement registry'],accessRules:['guest preparation','protected submission','operator approval'],featureFlags:['display-playlist','campaign-request'],relatedProducts:['events','invest'],legalNotices:['Sponsored-content disclosure','Creative rights declaration','No automatic placement'],
  keywords:['signage','display','advertising','campaign','placement','screen','playlist'],capabilities:['campaign-brief','creative-preview','playlist-builder','moderation-request','status']
}),
product({
  id:'invest',name:'FTN Invest',shortName:'Invest',tagline:'Learn first. Verify sources. Decide independently.',
  description:'Financial education and source-backed business/investment discovery with risk context and a private local watchlist—not brokerage or advice.',route:'/invest/',status:'BETA',
  primaryUser:'People building financial literacy or researching public business sources',primaryJourney:'Read an official education source, review risk/conflict context and save a source to a local watchlist.',
  callsToAction:[{label:'Open financial learning hub',route:'/invest/'}],visualMnemonic:'Verified growth ledger',dataSources:['Trinidad and Tobago Securities and Exchange Commission','Central Bank of Trinidad and Tobago'],accessRules:['guest education and local watchlist'],featureFlags:['invest-learning','invest-watchlist'],relatedProducts:['opportunities','top-picks'],
  legalNotices:['Education only—not advice','No trades or custody','Source and conflict disclosure'],keywords:['invest','financial literacy','business','risk','watchlist','securities','education'],capabilities:['official-education-sources','source-profiles','risk-disclosure','local-watchlist']
}),
product({
  id:'account',name:'FTN Account',shortName:'Account',tagline:'One account. Clear permissions. Your control.',
  description:'The shared FTN identity and preference surface for protected saves, projects, consent choices, sessions, export and deletion.',route:'/account/',status:'BETA',
  primaryUser:'Returning FTN users and creators',primaryJourney:'Sign in at the point of need, return to the exact task and inspect or revoke account state.',
  callsToAction:[{label:'Open FTN Account',route:'/account/'}],visualMnemonic:'Identity keyring',dataSources:['Supabase Auth','FTN account schema'],accessRules:['guest sign-in','authenticated self-service'],featureFlags:['account-email-auth'],relatedProducts:['ibis-ai','love','opportunities'],legalNotices:['Account privacy','Consent controls','Deletion and retention'],analyticsClassification:'authentication-no-replay',
  keywords:['account','sign in','login','profile','session','saved','consent','delete','export'],capabilities:['email-auth','session','return-to-task','profile','saved-items','sign-out']
}),
product({
  id:'health',name:'FTN Health',shortName:'Health',tagline:'A future Caribbean health-information pathway.',
  description:'PHASE 2 preview only. FTN Health is not a medical service and does not collect symptoms, diagnoses, records or insurance information.',route:'/health/',status:'PHASE 2',
  primaryUser:'People evaluating the future FTN product direction',primaryJourney:'Read the high-level Phase 2 purpose and continue to a currently available FTN service.',
  callsToAction:[{label:'View Phase 2 preview',route:'/health/'}],visualMnemonic:'Future care pulse',dataSources:[],accessRules:['guest preview only'],featureFlags:['health-preview'],relatedProducts:['platform-home'],
  legalNotices:['Phase 2 only','No medical advice','No health-data collection'],analyticsClassification:'public-essential-only',keywords:['health','wellbeing','future','phase 2'],capabilities:['non-clinical-preview']
}),
product({
  id:'top-picks',name:'FTN Top Picks',shortName:'Top Picks',tagline:'Useful tools. Caribbean context.',
  description:'An FTN supporting service with free-first guidance and explicit affiliate, support and editorial relationship labels.',route:'/top-picks/',status:'LIVE',principal:false,
  primaryUser:'Creators and small Caribbean teams',primaryJourney:'Compare a disclosed recommendation and continue to the provider independently.',callsToAction:[{label:'Browse Top Picks',route:'/top-picks/'}],visualMnemonic:'Curated tool marker',
  dataSources:['FTN relationship registry','provider public pages'],accessRules:['guest'],featureFlags:['top-picks'],relatedProducts:['invest'],legalNotices:['Affiliate and relationship disclosure'],keywords:['tools','affiliate','software','creator','recommendation'],capabilities:['recommendations','relationship-disclosure']
})
];
global.FTN=global.FTN||{};global.FTN.ProductRegistryData=PRODUCTS;
})(window);
