// FTN Platform Website — Product Registry data.
// This is the auditable source of truth for product identity, hierarchy, release state,
// visibility, access and public claims. Consumers must use js/product-registry.js.
(function(global){
'use strict';
var RELEASE='2.4.0',VERIFIED='2026-08-19',OWNER='RealityArtTV Media';
function product(config){
  var accent=config.accent||'var(--color-red-on-dark)';
  return Object.assign({
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
    capabilities:[]
  },config,{accent:undefined});
}
var PRODUCTS=[
product({
  id:'platform-home',name:'FTN Platform',shortName:'Home',tagline:'The Caribbean Operating System.',
  description:'One connected Caribbean ecosystem for civic action, trusted information, media, creation, opportunity and business.',route:'/',status:'LIVE',
  primaryJourney:'Describe a goal, discover the right FTN product and continue without forced sign-in.',callsToAction:[{label:'Find a product',route:'/#find-your-path'},{label:'Open FTN Directory',route:'/applications/'}],
  visualMnemonic:'Connected Caribbean signal field',dataSources:['FTN Product Registry','verified public FTN records'],relatedProducts:['community-connect','ibis-ai','opportunities'],
  keywords:['Caribbean','platform','ecosystem','discover','search','operating system'],capabilities:['product-discovery','public-search','country-preference','pwa-install','return-to-task']
}),
product({
  id:'community-connect',name:'FTN Community Connect',shortName:'Community Connect',tagline:'Connect. Report. Improve.',
  description:'FTN’s protected citizen-reporting application for documenting local issues and following community action without implying government endorsement or automatic resolution.',route:'/community-connect/',status:'AVAILABLE',
  primaryUser:'Residents and community participants',primaryJourney:'Review the evidence and privacy terms, then continue to the protected web app or verified Android release.',
  callsToAction:[{label:'Open Community Connect',route:'/community-connect/#launch'},{label:'Android release',route:'/community-connect/#download'}],visualMnemonic:'Community pin and verified report',
  panelAsset:'/assets/panels/01-community-connect.png',panelRow:1,accent:'var(--color-red)',atmosphere:{accent:'var(--color-red)',background:'photo',motionProfile:'none',heroStyle:'photo-real'},
  dataSources:['Community Connect protected application','approved public aggregate records'],accessRules:['guest landing','separate protected application account'],featureFlags:['community-connect-handoff'],
  relatedProducts:['parliament','facethenation'],legalNotices:['Evidence and consent notice','Community guidelines','Privacy policy'],analyticsClassification:'civic-sensitive-no-replay',
  keywords:['report','issue','pothole','community','neighbourhood','infrastructure','complaint'],capabilities:['verified-release-handoff','reporting-handoff','public-boundary-notice']
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
  description:'A public scenario workspace with calculated comparisons, evidence views and clearly labelled illustrative datasets; it is not a live operations system.',route:'/scenario-workspace/',status:'ILLUSTRATIVE',productType:'illustrative tool',
  primaryUser:'Public-interest teams, researchers and institutional evaluators',primaryJourney:'Explore supplied evidence, run a calculation and export a clearly labelled scenario brief.',
  callsToAction:[{label:'Open Scenario Workspace',route:'/scenario-workspace/'}],visualMnemonic:'Evidence radar',panelAsset:'/assets/panels/02-mission-control.png',panelRow:1,accent:'var(--color-mission-control)',atmosphere:{accent:'var(--color-mission-control)',background:'dark-grid',motionProfile:'radar-sweep',heroStyle:'operations-center'},
  dataSources:['labelled illustrative dataset'],accessRules:['guest scenario workspace'],featureFlags:['scenario-workspace'],relatedProducts:['parliament','events','opportunities','facethenation'],
  legalNotices:['Illustrative data notice','No institutional endorsement'],keywords:['scenario','analytics','decisions','evidence','correlation'],capabilities:['calculated-change-analysis','calculated-correlation','scenario-exploration','evidence-explorer','relationship-graph']
}),
product({
  id:'govern',name:'FTN Govern',shortName:'Govern',tagline:'Find the official path. Follow the public record.',
  description:'An independent civic gateway to official Trinidad and Tobago government services, Parliament, departments and public-information sources.',route:'/govern/',status:'AVAILABLE',
  primaryUser:'Residents and civic-information seekers',primaryJourney:'Choose a civic task, see the source owner and continue to the official destination.',
  callsToAction:[{label:'Open FTN Govern',route:'/govern/'}],visualMnemonic:'Civic gateway',accent:'#c9a45c',atmosphere:{accent:'#c9a45c',background:'dark-civic',motionProfile:'none',heroStyle:'civic-gateway'},
  dataSources:['ttconnect','Parliament of Trinidad and Tobago'],accessRules:['guest source gateway'],featureFlags:['govern-gateway'],relatedProducts:['parliament','community-connect','facethenation'],
  legalNotices:['Independent non-government service','Official destinations remain source-owned'],keywords:['government','service','department','parliament','public notice','civic'],capabilities:['official-source-gateway','country-boundary','service-routing']
}),
product({
  id:'ibis-ai',name:'FTN ibis.ai',shortName:'ibis',tagline:'Built for the Caribbean.',
  description:'FTN’s Caribbean-first intelligence and creative orchestration workspace for task routing, analysis, image/video project planning and provider-transparent production.',route:'/ibis-ai/',status:'AVAILABLE',
  primaryUser:'People trying to complete or create something across FTN',primaryJourney:'Describe the outcome, choose an intelligence or creative mode, inspect the source/provider/cost boundary and continue with an exportable project.',
  callsToAction:[{label:'Ask ibis',route:'/ibis-ai/'},{label:'Open Creative Studio',route:'/ibis-ai/#ibis-creative-studio'}],visualMnemonic:'Ibis creative command node',panelAsset:'/assets/panels/05-ibis-ai.png',panelRow:1,accent:'var(--color-ibis)',atmosphere:{accent:'var(--color-ibis)',background:'dark-minimal',motionProfile:'node-pulse',heroStyle:'calm-focused'},
  dataSources:['FTN Product Registry','FTN public source functions','authenticated approved AI provider','verified creative-provider registry'],accessRules:['guest deterministic tools','authenticated server AI','paid provider calls disabled until credits and server approval'],featureFlags:['ibis-router','ibis-visual','ibis-authenticated-ai','ibis-creative-studio','provider-cost-lock'],
  relatedProducts:['platform-home','mission-control','kaiso','ftn-fire','learn'],legalNotices:['Generated-output notice','Private conversation boundary','Provider transfer and cost notice','Responsible AI'],analyticsClassification:'private-content-no-replay',
  keywords:['help','navigate','find','assist','goal','route','analyze','visual','image','video','creative studio','campaign','TV show','pilot','series','screenplay','script'],capabilities:['task-routing','ftn-data-analysis','media-discovery','on-device-visual-draft','creative-project-planning','provider-evidence','authenticated-server-ai','cross-product-handoff']
}),
product({
  id:'parliament',name:'FTN Parliament',shortName:'Parliament',tagline:'Public records. Clear sources. Civic context.',
  description:'An independent source directory for Parliament of Trinidad and Tobago records, with visible jurisdiction, source and verification dates.',route:'/parliament/',status:'AVAILABLE',
  primaryUser:'Residents, researchers and public-affairs audiences',primaryJourney:'Search a record category, open the official source, save/share it or report a broken source.',
  callsToAction:[{label:'Find a public record',route:'/parliament/#records'}],visualMnemonic:'Civic columns and source seal',dataSources:['Parliament of Trinidad and Tobago official website'],
  accessRules:['guest directory'],featureFlags:['parliament-directory'],relatedProducts:['facethenation','community-connect','mission-control'],legalNotices:['Independent non-official service','Source and correction notice'],
  keywords:['parliament','representative','constituency','bill','sitting','debate','committee','public record'],capabilities:['official-source-directory','search','filter','save','share','broken-source-report']
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
  keywords:['film','movie','cinema','documentary','filmmaker','festival','trailer'],capabilities:['film-discovery','authorized-embedded-playback','film-metadata','festival-readiness','festival-matching','export']
}),
product({
  id:'tv',name:'FTN TV',shortName:'TV',tagline:'Caribbean Television, Programmed with Purpose.',
  description:'A scheduled and on-demand FTN programme surface using authorized sources and honest on-air, replay, off-air and provider-failure states.',route:'/tv/',status:'AVAILABLE',parentProduct:'screen',
  primaryUser:'Caribbean programme audiences',primaryJourney:'Select a programme, verify its current availability and play an authorized source.',callsToAction:[{label:'Open the programme guide',route:'/tv/'}],visualMnemonic:'Broadcast frame and clock',
  dataSources:['FTN schedule data','authorized YouTube embeds'],accessRules:['guest viewing'],featureFlags:['tv-guide'],relatedProducts:['screen','facethenation','ftn-live','display'],legalNotices:['Programme rights and source notice'],
  keywords:['television','tv','channel','schedule','guide','watch','programme','replay'],capabilities:['current-programme-resolution','authorized-playback','schedule','tune','failure-state']
}),
product({
  // Ecosystem Simplification pass: FTN Live retired as an independent identity. Its deep
  // investigation/indicator/correlation capability IS what "FTN Observer" now means -- the id
  // stays 'ftn-live' (every relatedProducts reference across this file keys on it) but the public
  // name/description/role changed to INVESTIGATE, distinct from the new ambient FTN Display.
  id:'ftn-live',legacyIds:['observatory','ftn-live'],name:'FTN Observer',shortName:'Observer',tagline:'Investigate what is happening in Trinidad and Tobago.',
  description:'FTN’s deep observation and investigation console: current indicators, scheduled coverage, correlations and explicit source states for people who want to look closely, not glance from across a room.',route:'/observatory/',status:'AVAILABLE',
  primaryUser:'People investigating current Caribbean conditions in depth',primaryJourney:'Open a current or scheduled signal, inspect its source/time/correlations and follow its accurate next state.',
  callsToAction:[{label:'Open FTN Observer',route:'/observatory/'}],visualMnemonic:'Caribbean signal constellation',atmosphere:{accent:'var(--color-red-on-dark)',background:'dark-grid',motionProfile:'constellation',heroStyle:'observatory'},
  dataSources:['NOAA satellite products','Open-Meteo','World Bank','FTN public source registry','Trinidad and Tobago Meteorological Service','UWI Seismic Research Centre'],accessRules:['guest'],featureFlags:['live-sources','satellite','observer-console'],relatedProducts:['events','tv','mission-control','display'],
  legalNotices:['External source availability','Calculated context notice'],keywords:['indicators','data','investigate','satellite','weather','schedule','replay','change','observer','correlation','flood','ferry','airport','vessel','earthquake','air quality','crime','parliament','power outage'],capabilities:['current-satellite-imagery','connected-public-sources','indicator-context','accurate-state','fallback','observer-console','observer-correlation-engine']
}),
product({
  id:'display',name:'FTN Display',shortName:'Display',tagline:'Watch what is happening. One screen. No setup.',
  description:'One standardized public FTN information screen — a compact Trinidad & Tobago national pulse, FTN TV NOW and a world strip, meant to be opened and left full screen. No account, no configuration, no advertising.',route:'/display/',status:'AVAILABLE',
  primaryUser:'Anyone near a shared screen — a waiting room, office, shop or reception area',primaryJourney:'Open FTN Display, press full screen and leave it running.',
  callsToAction:[{label:'Open FTN Display',route:'/display/'}],visualMnemonic:'Ambient national pulse screen',panelAsset:'/assets/panels/02-mission-control.png',panelRow:2,accent:'var(--color-red-on-dark)',atmosphere:{accent:'var(--color-red-on-dark)',background:'dark-grid',motionProfile:'constellation',heroStyle:'observatory'},
  dataSources:['FTN Product Registry','FTN public source registry','authorized YouTube discovery'],accessRules:['guest'],featureFlags:['display-pulse','display-tv-now'],relatedProducts:['ftn-live','kaiso','tv','parliament','events','community-connect'],
  legalNotices:['External source availability','Calculated context notice'],keywords:['screen','ambient','watch','pulse','fullscreen','signage','waiting room','national debt','weather','currency','tv now'],capabilities:['national-pulse','tv-now','world-now','fullscreen','anonymous-presence']
}),
product({
  id:'learn',name:'FTN Learn',shortName:'Learn',tagline:'Find something to learn.',
  description:'FTN discovers legitimate Caribbean learning and training opportunities and sends you to the real provider — FTN Skills for practical/professional training, FTN School for what you are studying.',route:'/learn/',status:'AVAILABLE',
  primaryUser:'Anyone looking for a course, workshop, apprenticeship or exam help',primaryJourney:'Choose FTN Skills or FTN School, search or filter, then contact or visit the real provider.',
  callsToAction:[{label:'Open FTN Learn',route:'/learn/'}],visualMnemonic:'Open learning path',accent:'var(--color-opportunities)',atmosphere:{accent:'var(--color-opportunities)',background:'dark-growth',motionProfile:'none',heroStyle:'momentum'},
  dataSources:['FTN Learn source function','provider-supplied and publicly discovered listings'],accessRules:['guest discovery'],featureFlags:['learn-fork','learn-search'],relatedProducts:['opportunities','ibis-ai'],legalNotices:['No accreditation by FTN','Verify current availability with the provider'],
  keywords:['learn','course','training','workshop','apprenticeship','certification','scholarship','tutor','SEA','CSEC','CAPE','electrician','plumbing','welding','coding','school'],capabilities:['skills-school-fork','learn-search','provider-directory','opportunities-crosslink']
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
  description:'The Caribbean music ecosystem connecting rights-aware discovery and project metadata to FTN Fire, FTN DAW, FTN DJ Tube and FTN Kaiso.',route:'/riddim/',status:'AVAILABLE',
  primaryUser:'Artists, producers, DJs and music audiences',primaryJourney:'Start with a rights-aware track, beat or project and continue into the appropriate creation, production, discovery or performance tool.',
  callsToAction:[{label:'Open the music hub',route:'/riddim/'}],visualMnemonic:'Layered riddim waveform',panelAsset:'/assets/panels/06-ftn-riddim.png',panelRow:2,accent:'var(--color-riddim)',atmosphere:{accent:'var(--color-riddim)',background:'dark-studio',motionProfile:'waveform',heroStyle:'studio'},
  heroAsset:'/assets/heroes/ftn-riddim-studio.webp',heroAlt:'Caribbean musicians and engineers recording together in a professional studio',heroFocalDesktop:'64% 50%',heroFocalMobile:'66% 50%',
  dataSources:['user-owned local audio','creator metadata','authorized public sources','on-device Fire synthesis'],accessRules:['guest local projects'],featureFlags:['riddim-hub','ftn-fire'],relatedProducts:['ftn-fire','daw','dj-tube','kaiso','radio'],legalNotices:['Music ownership and licence declaration'],
  keywords:['music','artist','producer','release','track','beat','riddim','fire','rights','daw','dj','kaiso'],capabilities:['track-intake','rights-metadata','instrumental-draft','local-media','creative-handoff','export']
}),
product({
  id:'ftn-fire',name:'FTN Fire',shortName:'Fire',tagline:'Caribbean riddims. Instrumentals only.',
  description:'Riddim’s Caribbean-first instrumental creation hand-off: Fire turns a producer brief into a detailed Flow Music prompt without generated lyrics or vocalist.',route:'/riddim/fire/',status:'AVAILABLE',parentProduct:'riddim',principal:false,
  primaryUser:'Caribbean producers, artists and creators who need an original instrumental starting point',primaryJourney:'Describe the riddim, set BPM/key/energy/instruments, open Flow Music with a copied instrumental-only producer prompt, then import rights-cleared audio into FTN DAW.',
  callsToAction:[{label:'Create an instrumental',route:'/riddim/fire/'}],visualMnemonic:'Layered Caribbean flame waveform',atmosphere:{accent:'#ff4d00',background:'dark-fire-studio',motionProfile:'flame-pulse',heroStyle:'producer-deck'},
  dataSources:['user-authored producer brief','user-operated Flow Music hand-off'],accessRules:['guest producer brief','separate Flow Music account required'],featureFlags:['fire-flow-music-handoff'],relatedProducts:['riddim','daw','ibis-ai'],
  legalNotices:['Instrumentals only','No artist impersonation','Separate-provider account and rights boundary'],analyticsClassification:'creative-private-no-replay',keywords:['fire','beatmaker','beat','instrumental','soca','reggae','dancehall','calypso','chutney','kompa','zouk'],capabilities:['producer-brief','caribbean-style-controls','flow-music-handoff','prompt-copy','daw-handoff']
}),
product({
  id:'kaiso',name:'FTN Kaiso',shortName:'Kaiso',tagline:'Caribbean reporting with the source in view.',
  description:'A regional current-affairs and news desk for attributed Trinidad and Tobago, Caribbean and internationally relevant reporting.',route:'/kaiso/',status:'AVAILABLE',
  primaryUser:'Caribbean readers and editorial contributors',primaryJourney:'Read current attributed headlines, open the original publisher and submit a correction or story lead.',
  callsToAction:[{label:'Explore Kaiso sources',route:'/kaiso/'}],visualMnemonic:'Editorial rhythm lines',panelAsset:'/assets/panels/07-ftn-kaiso.png',panelRow:2,accent:'var(--color-kaiso)',atmosphere:{accent:'var(--color-kaiso)',background:'dark-editorial',motionProfile:'none',heroStyle:'newsroom'},
  heroAsset:'/assets/heroes/ftn-kaiso-newsroom.webp',heroAlt:'Caribbean editors reviewing printed stories in a working newsroom',heroFocalDesktop:'67% 50%',heroFocalMobile:'68% 50%',
  dataSources:['Trinidad and Tobago Guardian','Trinidad Express','CARICOM official releases','original international publisher links','user-submitted lead drafts'],accessRules:['guest discovery','consented submission'],featureFlags:['kaiso-source-radar'],relatedProducts:['ftn-live','parliament','facethenation','display'],legalNotices:['Editorial verification and correction notice'],
  keywords:['kaiso','news','current affairs','Caribbean','Trinidad and Tobago','reporting','headlines','source'],capabilities:['current-source-radar','regional-context','original-publisher-links','story-lead-desk','verification-state']
}),
product({
  id:'dj-tube',legacyIds:['ftn-dj'],name:'FTN DJ Tube',shortName:'DJ Tube',tagline:'Prepare and perform with audio you have the right to use.',
  description:'A DJ performance and preparation tool for user-owned or licensed local audio, with protected streaming media kept in reference mode.',route:'/riddim/dj/',status:'AVAILABLE',parentProduct:'riddim',
  primaryUser:'DJs and performance creators',primaryJourney:'Confirm rights, load local audio, use real two-deck controls and save or export only supported user-owned output.',
  callsToAction:[{label:'Open FTN DJ Tube',route:'/riddim/dj/'}],visualMnemonic:'Twin decks and crossfader',dataSources:['user-owned local audio','authorized YouTube reference embeds'],accessRules:['guest local workspace','authenticated cloud jobs'],featureFlags:['dj-local-decks','dj-reference-discovery'],relatedProducts:['riddim','daw','radio'],
  legalNotices:['Local-audio rights declaration','Streaming reference-only notice'],analyticsClassification:'creative-private-no-replay',keywords:['dj','decks','mix','crossfade','cue','loop','tempo','local audio'],capabilities:['local-deck-loading','playback','cue','gain','crossfade','reference-discovery']
}),
product({
  id:'daw',legacyIds:['ftn-daw'],name:'FTN DAW',shortName:'DAW',tagline:'Make a real mix in your browser.',
  description:'A bounded browser production workspace for recording or importing permitted audio, arranging edits and exporting supported user-owned mixes.',route:'/riddim/daw/',status:'AVAILABLE',parentProduct:'riddim',
  primaryUser:'Music creators with owned or licensed audio',primaryJourney:'Confirm rights, import audio, apply real browser-audio edits, restore project state and export a supported mix.',
  callsToAction:[{label:'Open FTN DAW',route:'/riddim/daw/'}],visualMnemonic:'Multitrack timeline',dataSources:['user-owned local audio'],accessRules:['guest local workspace'],featureFlags:['daw-browser-audio'],relatedProducts:['riddim','dj-tube'],
  legalNotices:['Audio ownership and contributor declaration','Local-storage limitation'],analyticsClassification:'creative-private-no-replay',keywords:['daw','audio','record','track','arrange','fade','gain','pan','export'],capabilities:['local-audio-import','browser-audio-processing','project-recipe','mix-export']
}),
product({
  id:'epk',name:'FTN EPK',shortName:'EPK',tagline:'One creator record. Reusable professional presentation.',
  description:'A creator-controlled metadata, credits and presentation capability for preparing professional Caribbean artist and media profiles.',route:'/radio/#ftn-epk',status:'AVAILABLE',parentProduct:'riddim',principal:false,
  primaryUser:'Artists, producers and Caribbean creators',primaryJourney:'Prepare reusable creator metadata, credits, links and authorized press-asset references without surrendering source ownership.',
  callsToAction:[{label:'Build an FTN EPK',route:'/radio/#ftn-epk'}],visualMnemonic:'Creator credential card',dataSources:['creator-declared metadata','creator-authorized asset references'],accessRules:['guest local preparation'],featureFlags:['ftn-epk'],relatedProducts:['riddim','radio','screen','events'],
  legalNotices:['Creator ownership declaration','Local press files remain on device'],analyticsClassification:'creative-private-no-replay',keywords:['epk','press kit','artist','credits','metadata','creator'],capabilities:['creator-metadata','credits','press-links','portable-export']
}),
product({
  id:'opportunities',name:'FTN Opportunities',shortName:'Opportunities',tagline:'Search. Identify. Predict. Execute.',
  description:'Source-backed Caribbean jobs, grants, calls, funding, business-acquisition and partnership discovery with official destinations and deadline tools.',route:'/opportunities/',status:'AVAILABLE',
  primaryUser:'Caribbean and diaspora opportunity seekers',primaryJourney:'Filter a current listing, verify issuer/source/eligibility, save its deadline and continue to the official destination.',
  callsToAction:[{label:'Find an opportunity',route:'/opportunities/'}],visualMnemonic:'Rising opportunity line',panelAsset:'/assets/panels/10-ftn-opportunities.png',panelRow:2,accent:'var(--color-opportunities)',atmosphere:{accent:'var(--color-opportunities)',background:'dark-growth',motionProfile:'rising-line',heroStyle:'momentum'},
  heroAsset:'/assets/heroes/ftn-opportunities-port.webp',heroAlt:'Caribbean logistics professionals reviewing work at a busy container port',heroFocalDesktop:'68% 50%',heroFocalMobile:'66% 50%',
  dataSources:['FTN opportunities source function','official issuer destinations'],accessRules:['guest discovery and local saves'],featureFlags:['opportunity-sources'],relatedProducts:['events','invest','mission-control','learn'],legalNotices:['No guarantee or endorsement','Official-destination notice'],
  keywords:['job','grant','contract','business','career','procurement','funding','scholarship','tender'],capabilities:['official-source-feed','search','filter','save','application-tracker','calendar-export']
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
  legalNotices:['No public investment solicitation','No financial advice','No trades or custody','External sources remain source-owned'],keywords:['partner','sponsor','invest','institution','business','Caribbean infrastructure'],capabilities:['partnership-brief','sponsorship-path','official-financial-source-directory','contact-handoff']
}),
product({
  id:'account',name:'FTN Account',shortName:'Account',tagline:'One account. Clear permissions. Your control.',
  description:'The shared FTN identity and preference surface for protected saves, projects, consent choices, sessions, export and deletion.',route:'/account/',status:'AVAILABLE',
  primaryUser:'Returning FTN users and creators',primaryJourney:'Sign in at the point of need, return to the exact task and inspect or revoke account state.',
  callsToAction:[{label:'Open FTN Account',route:'/account/'}],visualMnemonic:'Identity keyring',dataSources:['Supabase Auth','FTN account schema'],accessRules:['guest sign-in','authenticated self-service'],featureFlags:['account-email-auth'],relatedProducts:['ibis-ai','love','opportunities'],legalNotices:['Account privacy','Consent controls','Deletion and retention'],analyticsClassification:'authentication-no-replay',
  keywords:['account','sign in','login','profile','session','saved','consent','delete','export'],capabilities:['email-auth','session','return-to-task','profile','saved-items','sign-out']
}),
product({
  id:'health',name:'FTN Health',shortName:'Health',tagline:'A future Caribbean health-information pathway.',
  description:'Vaulted until a separately approved clinical-governance, privacy, emergency-boundary and public-information release exists.',route:'/health/',status:'VAULTED',publicVisibility:false,visibility:'VAULTED',
  primaryUser:'FTN product, privacy and clinical-governance stewards',primaryJourney:'Complete the separately approved governance and safety gate before any public health-information journey is restored.',
  callsToAction:[],visualMnemonic:'Future care pulse',dataSources:[],accessRules:['no public access'],featureFlags:['health-vaulted'],relatedProducts:['platform-home'],
  legalNotices:['No medical service','Governance review required before release','No health-data collection'],analyticsClassification:'restricted-sensitive-no-replay',keywords:['health','wellbeing','future'],capabilities:[]
}),
product({
  id:'top-picks',name:'FTN Picks',shortName:'Picks',tagline:'Useful tools. Caribbean context.',
  description:'FTN Invest-in’s supporting recommendation capability with free-first guidance and explicit affiliate, support and editorial relationship labels.',route:'/top-picks/',status:'AVAILABLE',parentProduct:'invest',principal:false,
  primaryUser:'Creators and small Caribbean teams',primaryJourney:'Compare a disclosed recommendation and continue to the provider independently.',callsToAction:[{label:'Browse FTN Picks',route:'/top-picks/'}],visualMnemonic:'Curated tool marker',
  dataSources:['FTN relationship registry','provider public pages'],accessRules:['guest'],featureFlags:['top-picks'],relatedProducts:['invest'],legalNotices:['Affiliate and relationship disclosure'],keywords:['tools','affiliate','software','creator','recommendation'],capabilities:['recommendations','relationship-disclosure']
})
];
var ECOSYSTEM_GROUPS=[
  {id:'civic-public-life',title:'Civic & public life',description:'Participate, find official paths and follow the public record.',productIds:['community-connect','govern','parliament','facethenation']},
  {id:'information-intelligence',title:'Information & intelligence',description:'Watch what is happening, investigate it in depth, and get source-backed reporting and Caribbean-first assistance.',productIds:['display','ftn-live','kaiso','ibis-ai','scenario-workspace']},
  {id:'media-culture',title:'Media & culture',description:'Watch, listen and discover Caribbean stories through permitted sources.',productIds:['radio','screen','tv']},
  {id:'music-creation',title:'Music & creation',description:'Move from a music idea to rights-aware preparation, production and performance.',productIds:['riddim','ftn-fire','dj-tube','daw','epk']},
  {id:'opportunities-business',title:'Opportunities & business',description:'Find verified paths to work, funding, partnerships, training and useful tools.',productIds:['opportunities','learn','invest','top-picks']},
  {id:'community-infrastructure',title:'Community & infrastructure',description:'Plan gatherings and prepare messages for eligible Caribbean placements.',productIds:['events','display-network']}
];
global.FTN=global.FTN||{};
global.FTN.ProductRegistryData=PRODUCTS;
global.FTN.ProductRegistryGroups=ECOSYSTEM_GROUPS;
})(window);
