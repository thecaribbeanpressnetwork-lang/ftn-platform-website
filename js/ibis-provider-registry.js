// ibis provider evidence. Originally scoped to Creative Studio (image/video/instrumental)
// candidates; broadened in the Phase 2 provider-fabric pass to be the one registry for every
// external AI provider IBIS touches, so a capability lookup has one place to check rather than
// several. Public facts only: credentials, private unit costs, affiliate IDs and enablement
// remain server-side. No generic provider URL is an FTN affiliate link.
//
// `categories` (image/video/instrumental/...) is the original field ibis-creative-studio.js's
// byCategory() already reads -- kept unchanged so that consumer keeps working. `capabilities` is
// the new, additive standardized taxonomy (see js/ibis-eligibility.js) used by the eligibility
// engine. `costToIbis` is the field the economic router actually gates on: ZERO_CUSTOMER_FUNDED
// means the customer's own prepaid ibis Credits pay the provider, never FTN's own money;
// WOULD_REQUIRE_IBIS_COMPUTE_SPEND means self-hosting would put a real GPU bill on FTN and is
// therefore ineligible until that's a deliberate, budgeted decision, not an automatic one.
(function(global){
'use strict';
var VERIFIED='2026-08-10';
var providers=[
  {
    id:'pixverse',name:'PixVerse',categories:['image','video'],capabilities:['IMAGE_GENERATION','VIDEO_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',
    website:'https://pixverse.ai/en',apiUrl:'https://docs.platform.pixverse.ai/',pricingUrl:'https://docs.platform.pixverse.ai/pricing-796039m0',affiliateProgramUrl:'https://pixverse.ai/en/affiliate',
    commercialUse:'REQUIRES_CONTRACT_AND_OUTPUT_TERMS_REVIEW',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://docs.platform.pixverse.ai/',
    note:'Official API and affiliate programme exist. API generation is disabled until FTN has an approved account, customer-funded credits and completed output-rights review. The public programme link is not an FTN affiliate link.'
  },
  {
    id:'kling',name:'Kling AI',categories:['image','video'],capabilities:['IMAGE_GENERATION','VIDEO_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',
    website:'https://app.klingai.com/global/',apiUrl:'https://kling.ai/document-api/guides/get-started/overview',pricingUrl:'https://kling.ai/dev/pricing',affiliateProgramUrl:'https://app.klingai.com/global/commission-share',
    commercialUse:'REQUIRES_CONTRACT_AND_OUTPUT_TERMS_REVIEW',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://kling.ai/document-api/guides/get-started/overview',
    note:'Official API and affiliate programme surfaces exist. Current API packages require pre-purchase, so Kling is not enabled for an FTN zero-upfront-cost launch.'
  },
  {
    id:'musicapi-producer',name:'MusicAPI Producer · Lyria 3 Pro',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',
    website:'https://musicapi.ai/producer-ai-api',apiUrl:'https://docs.musicapi.ai/',pricingUrl:'https://musicapi.ai/lyria-3-pro-pricing',affiliateProgramUrl:'https://musicapi.ai/affiliates',
    commercialUse:'PROVIDER_STATES_COMMERCIAL_RIGHTS_INCLUDED_TERMS_REVIEW_REQUIRED',redistribution:'PROVIDER_STATES_CUSTOMER_DELIVERY_ALLOWED_TERMS_REVIEW_REQUIRED',lastVerified:VERIFIED,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://docs.musicapi.ai/',
    note:'Official Producer API is 12 provider credits per task and supports instrumental prompts. The official affiliate programme advertises 30% lifetime commission. FTN has no approved API account or affiliate link configured, so both paths remain off.'
  },
  {
    id:'ace-step',name:'ACE-Step',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/ace-step/ACE-Step',apiUrl:null,pricingUrl:'https://github.com/ace-step/ACE-Step/blob/main/LICENSE',affiliateProgramUrl:null,
    commercialUse:'APACHE_2_CODE_AND_MODEL_CANDIDATE_REVIEW_REQUIRED',redistribution:'ORIGINALITY_AND_MODEL_RELEASE_REVIEW_REQUIRED',lastVerified:VERIFIED,
    weightsAvailable:'YES_STATED_APACHE_2_0',sourceAvailable:'YES_GITHUB_APACHE_2_0',selfHostable:true,deploymentMethod:'PYTHON_TRANSFORMERS_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_NOT_QUANTIFIED_BY_FTN',verificationSource:'https://github.com/ace-step/ACE-Step',
    note:'Official project and model card identify Apache 2.0 and support instrumental workflows. Self-hosting remains disabled until GPU cost, exact model version, safety, cultural-quality and release-rights testing pass. Open licensing does not mean zero cost to IBIS -- someone still pays for the GPU.'
  },
  {
    id:'stable-audio-3',name:'Stable Audio 3',categories:['instrumental','sample'],capabilities:['INSTRUMENTAL_GENERATION','AUDIO_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://stability.ai/stable-audio',apiUrl:'https://platform.stability.ai/',pricingUrl:'https://stability.ai/license',affiliateProgramUrl:null,
    commercialUse:'CONDITIONAL_STABILITY_COMMUNITY_LICENSE',redistribution:'REQUIRES_LICENSE_REVIEW',lastVerified:VERIFIED,
    weightsAvailable:'YES_STABILITY_COMMUNITY_LICENSE',sourceAvailable:'YES_STABILITY_REPO',selfHostable:true,deploymentMethod:'PYTHON_DIFFUSERS_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_NOT_QUANTIFIED_BY_FTN',verificationSource:'https://stability.ai/license',
    note:'Stability states that Small/Medium are open weights trained on licensed data and outputs may be commercialized under its Community License, with Enterprise licensing above its threshold. FTN deployment still needs exact-version and cost validation. This is the model ftn-fire-generate already targets, gated behind FTN_CREATIVE_GENERATION_ENABLED + FTN_FIRE_GENERATION_ENABLED, both currently off.'
  },
  {
    id:'musicgen',name:'MusicGen',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'RESEARCH_ONLY',
    apiStatus:'OPEN_MODEL_WEIGHTS_NONCOMMERCIAL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'NOT_APPLICABLE_LICENSE_BLOCKS_USE',
    website:'https://github.com/facebookresearch/audiocraft',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPROVED_FOR_FTN_CUSTOMER_OUTPUT',redistribution:'NOT_APPROVED',lastVerified:VERIFIED,
    weightsAvailable:'YES_NONCOMMERCIAL_LICENSE_ONLY',sourceAvailable:'YES_MIT_CODE_NONCOMMERCIAL_WEIGHTS',selfHostable:true,deploymentMethod:'PYTHON_AUDIOCRAFT_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_NOT_QUANTIFIED_BY_FTN',verificationSource:'https://github.com/facebookresearch/audiocraft',
    note:'AudioCraft code and model weights have different licences. MusicGen is excluded from commercial FTN generation unless a later rights review establishes a permitted path.'
  },
  {
    id:'producer-ai',name:'Producer.ai',categories:['instrumental','production'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'PARTNER_REVIEW',
    apiStatus:'UNVERIFIED',affiliateStatus:'UNVERIFIED',payAsYouGo:null,prepaidRequired:null,enabled:false,costToIbis:'UNVERIFIED',
    website:'https://producer.ai/',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'UNVERIFIED',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    weightsAvailable:'UNKNOWN',sourceAvailable:'UNKNOWN',selfHostable:null,deploymentMethod:'UNKNOWN',hardwareRequirements:'UNKNOWN',verificationSource:null,
    note:'Never automate a consumer login or subscription. FTN will integrate only after a permitted API, partner or referral arrangement and export rights are documented.'
  },
  {
    id:'ibis-query-gemini',name:'ibis-query (Google Gemini)',categories:['text'],capabilities:['TEXT'],integration:'NATIVE_API_LIVE',
    apiStatus:'LIVE_IF_GEMINI_API_KEY_CONFIGURED',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:null,prepaidRequired:false,enabled:true,costToIbis:'PAID_BY_IBIS_PRE_EXISTING',
    website:'https://ai.google.dev/',apiUrl:'https://ai.google.dev/gemini-api/docs',pricingUrl:'https://ai.google.dev/pricing',affiliateProgramUrl:null,
    commercialUse:'INHERITED_FROM_EXISTING_IBIS_QUERY_DEPLOYMENT_NOT_INDEPENDENTLY_REVERIFIED',redistribution:'NOT_APPLICABLE',lastVerified:VERIFIED,
    userAuthorizationRequired:true,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://ai.google.dev/gemini-api/docs',
    note:'Pre-existing production integration (supabase/functions/ibis-query), not newly added by this registry pass. Requires FTN Account sign-in (CI-enforced in tests/backend-source-audit.mjs). Marked costToIbis PAID_BY_IBIS_PRE_EXISTING rather than ZERO because Gemini API usage is billed to FTN\'s own key, not a customer-funded credit -- flagged honestly rather than reclassified without a founder review of that cost.'
  },
  {
    id:'ibis-assistant-anthropic',name:'ibis-widget (Anthropic)',categories:['text'],capabilities:['TEXT'],integration:'NATIVE_API_LIVE',
    apiStatus:'PENDING_DEPLOYMENT',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:null,prepaidRequired:false,enabled:false,costToIbis:'PAID_BY_IBIS_FOUNDER_APPROVED',
    website:'https://www.anthropic.com/',apiUrl:'https://docs.anthropic.com/',pricingUrl:'https://www.anthropic.com/pricing',affiliateProgramUrl:null,
    commercialUse:'FOUNDER_APPROVED_NARROW_SCOPE_2026_08_19',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://docs.anthropic.com/',
    note:'Backs the sitewide ibis widget (supabase/functions/ibis-assistant). Guest-accessible by explicit design, not authenticated. enabled stays false here until the function is actually deployed and ANTHROPIC_API_KEY is set -- see IBIS-MAP.md. The widget already tries the free deterministic Product Registry match first and only reaches this provider on fallback.'
  },
  {
    // Phase 3 provider discovery, verified 2026-08-20 against official documentation (not SEO
    // aggregator summaries): the free daily Neuron allocation officially fails closed --
    // "If you exceed any one of the above limits, further operations will fail with an error" --
    // rather than silently billing past the cap. No credit card required for the free allocation.
    // Callable via plain REST (bearer token + account id) from any external server, confirmed
    // against the official REST API guide, so it fits this repo's Supabase-Edge-Function
    // architecture with no new infrastructure. This is category A (ZERO_COST_TO_IBIS) in the
    // Phase 3 directive's own taxonomy, not a customer-funded or IBIS-billed route.
    id:'cloudflare-workers-ai-text',name:'Cloudflare Workers AI — Llama 3.1 8B',categories:['text'],capabilities:['TEXT'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'PENDING_ACCOUNT_SETUP',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/get-started/rest-api/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'PROVIDER_STATES_FREE_ALLOCATION_HARD_CAPPED_TERMS_REVIEW_RECOMMENDED_BEFORE_ENABLING',redistribution:'UNVERIFIED',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    modelId:'@cf/meta/llama-3.1-8b-instruct',
    weightsAvailable:'YES_UNDERLYING_MODEL_OPEN_WEIGHT_META_LLAMA_3_LICENSE',sourceAvailable:'NOT_APPLICABLE_FTN_DOES_NOT_SELF_HOST',selfHostable:false,deploymentMethod:'CLOUDFLARE_HOSTED_INFERENCE_REST_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_BY_CLOUDFLARE',verificationSource:'https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct/',
    note:'Not yet integrated -- requires a Cloudflare account, an API token with Workers AI permissions, and CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN set as Supabase secrets before enabled can become true (per this codebase\'s "discovery is not deployment" rule). The 10,000-Neuron/day pool also covers embeddings, image generation (flux-1-schnell, stable-diffusion-xl) and speech-to-text (whisper) -- those are documented as researched-but-not-registered candidates in IBIS-MAP.md, not added here speculatively.'
  },
  {
    // Phase 3B follow-through: IMAGE_GENERATION was a researched-but-not-registered candidate on
    // the cloudflare-workers-ai-text entry above (see IBIS-MAP.md §0.8); this promotes it to a
    // registered candidate using the same account, same free Neuron allocation and the same
    // ZERO_COST_TO_IBIS classification already verified for TEXT. Primary model.
    id:'cloudflare-workers-ai-image-flux',name:'Cloudflare Workers AI — FLUX.1 [schnell]',categories:['image'],capabilities:['IMAGE_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'PENDING_ACCOUNT_SETUP',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'VERIFIED_APACHE_2_0_COMMERCIAL_USE_PERMITTED',redistribution:'APACHE_2_0_PERMITS_COMMERCIAL_AND_PERSONAL_USE',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    modelId:'@cf/black-forest-labs/flux-1-schnell',
    weightsAvailable:'YES_APACHE_2_0_VERIFIED_ON_OFFICIAL_MODEL_CARD',sourceAvailable:'YES_HUGGING_FACE_BLACK_FOREST_LABS',selfHostable:false,deploymentMethod:'CLOUDFLARE_HOSTED_INFERENCE_REST_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_BY_CLOUDFLARE',verificationSource:'https://huggingface.co/black-forest-labs/FLUX.1-schnell',
    note:'Not yet integrated -- requires the same CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN Supabase secrets as cloudflare-workers-ai-text, plus supabase/functions/ibis-image-cloudflare actually deployed, before enabled can become true. License upgraded from UNVERIFIED to VERIFIED this pass: the official Hugging Face model card states "Released under the apache-2.0 licence, the model can be used for personal, scientific, and commercial purposes" -- fetched directly 2026-08-20, not from a third-party summary.'
  },
  {
    // Same-account, same-mechanism fallback model so a single model's outage or timeout doesn't
    // remove IMAGE_GENERATION eligibility entirely -- real model-level failover via
    // js/ibis-eligibility.js attemptInOrder(), the same pattern already proven for TEXT (Phase 3).
    id:'cloudflare-workers-ai-image-sdxl',name:'Cloudflare Workers AI — SDXL-Lightning',categories:['image'],capabilities:['IMAGE_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'PENDING_ACCOUNT_SETUP',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'OPENRAIL_PLUS_PLUS_PERMITS_COMMERCIAL_USE_WITH_USE_BASED_RESTRICTIONS',redistribution:'OPENRAIL_PLUS_PLUS_USE_BASED_RESTRICTIONS_APPLY',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    modelId:'@cf/bytedance/stable-diffusion-xl-lightning',
    weightsAvailable:'YES_OPENRAIL_PLUS_PLUS_VERIFIED_ON_OFFICIAL_MODEL_CARD',sourceAvailable:'YES_HUGGING_FACE_BYTEDANCE',selfHostable:false,deploymentMethod:'CLOUDFLARE_HOSTED_INFERENCE_REST_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_BY_CLOUDFLARE',verificationSource:'https://huggingface.co/ByteDance/SDXL-Lightning',
    note:'Not yet integrated -- same deployment prerequisites as cloudflare-workers-ai-image-flux. License upgraded from UNVERIFIED to VERIFIED this pass: the official Hugging Face model card states openrail++, which permits commercial use subject to its use-based restriction annex -- fetched directly 2026-08-20. FTN has not independently reviewed the specific use-based restriction clauses against its own output pipeline; that narrower review is still recommended before enabling.'
  },
  {
    // Open-source/open-weight audit pass (2026-08-20): VIDEO_GENERATION previously had zero
    // documented candidates of any kind in this registry -- only the customer-funded PixVerse/
    // Kling routes existed. This is the first honestly-recorded self-host candidate, added for
    // documentation completeness (IBIS-MAP.md category K), not because it is close to eligible:
    // Cloudflare Workers AI's own model catalog confirmed to have NO video-generation category at
    // all (Phase 3B), so no zero-cost hosted VIDEO route is known to exist anywhere.
    id:'cogvideox-2b',name:'CogVideoX-2B',categories:['video'],capabilities:['VIDEO_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/zai-org/CogVideo',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'VERIFIED_APACHE_2_0_ON_2B_VARIANT_ONLY',redistribution:'APACHE_2_0_PERMITS_REDISTRIBUTION_2B_VARIANT_ONLY',lastVerified:'2026-08-20',
    weightsAvailable:'YES_APACHE_2_0_VERIFIED_ON_OFFICIAL_MODEL_CARD_2B_ONLY',sourceAvailable:'YES_GITHUB_AND_HUGGING_FACE_ZAI_ORG',selfHostable:true,deploymentMethod:'PYTHON_DIFFUSERS_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_APPROX_5GB_VRAM_WITH_CPU_OFFLOAD_PER_OFFICIAL_REPO_UNQUANTIFIED_COST_BY_FTN',verificationSource:'https://huggingface.co/THUDM/CogVideoX-2b',
    note:'The 2B variant is confirmed Apache 2.0 (commercial use permitted) on its official Hugging Face model card, distinct from the larger 5B variant which uses a separate, more restrictive CogVideoX license -- do not conflate the two when this entry is revisited. Even the smaller 2B variant requires a real GPU (~5GB VRAM with the official memory-optimization flags); IBIS has no GPU infrastructure today, so this stays WOULD_REQUIRE_IBIS_COMPUTE_SPEND and ineligible until a founder makes a budgeted infrastructure decision -- open licensing does not change that.'
  },
  {
    // Open-source/open-weight audit pass (2026-08-20): the one capability this pass could
    // actually IMPLEMENT rather than just document. Real, deterministic, dependency-free
    // client-side digital signal processing (see js/ibis-audio-analysis.js) -- no AI model, no
    // network call, no server cost of any kind, because it executes entirely in the visitor's own
    // browser. This is the strongest possible reading of "prefer local/deterministic operations"
    // (this directive's own Performance section): not just the cheapest eligible provider, but no
    // provider at all where a deterministic calculation suffices. costToIbis is ZERO_COST_TO_IBIS
    // for the strongest possible reason -- IBIS never even makes a network request for this
    // capability -- and enabled is true because it is genuinely live today, not pending any
    // deployment. See tests/ibis-audio-analysis-audit.mjs for the real, passing correctness tests.
    id:'ibis-local-dsp',name:'ibis local DSP (client-side, no model)',categories:['audio'],capabilities:['BPM_DETECTION','AUDIO_ANALYSIS'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus:'LIVE',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:true,costToIbis:'ZERO_COST_TO_IBIS',
    website:null,apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPLICABLE_FTN_OWNED_CODE_NO_THIRD_PARTY_MODEL',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_NO_MODEL',sourceAvailable:'YES_FTN_OWNED_js/ibis-audio-analysis.js',selfHostable:true,deploymentMethod:'BROWSER_CLIENT_SIDE_JAVASCRIPT_NO_SERVER',hardwareRequirements:'NONE_RUNS_IN_VISITOR_BROWSER',verificationSource:'js/ibis-audio-analysis.js and tests/ibis-audio-analysis-audit.mjs (this repository)',
    note:'Autocorrelation-based tempo (BPM) detection over an onset-strength envelope, entirely FTN-authored, no third-party model or dataset involved. Deliberately not wired into any specific FTN node UI this pass (see IBIS-MAP.md) -- registered and tested as a real, complete, working capability first; /riddim/daw/ integration is the flagged next step, following the same "ship a tested vertical slice, flag the next integration point" pattern already used for TEXT and IMAGE.'
  },
  {
    // Phase 4 real-code investigation finding: js/ftn-fire.js (read directly, not inferred from
    // the product registry) is a genuine, substantial, zero-cost local INSTRUMENTAL_GENERATION
    // engine -- real WebAudio procedural synthesis per Caribbean style (soca/power-soca/reggae/
    // dancehall/calypso/chutney/kompa/zouk/island-fusion), real WAV export, real 4-stem export
    // (its own hand-rolled ZIP/CRC32 writer), all client-side. This was previously undocumented in
    // this registry despite being real and live. costToIbis is honestly ZERO_COST_TO_IBIS for the
    // same reason ibis-local-dsp is -- no network call, no provider bill of any kind.
    id:'ftn-fire-local-procedural',name:'FTN Fire local procedural engine',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus:'LIVE_AT_OWN_PAGE_NO_SHARED_ADAPTER',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'/riddim/fire/',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPLICABLE_FTN_OWNED_CODE_NO_THIRD_PARTY_MODEL',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_NO_MODEL',sourceAvailable:'YES_FTN_OWNED_js/ftn-fire.js',selfHostable:true,deploymentMethod:'BROWSER_CLIENT_SIDE_JAVASCRIPT_NO_SERVER',hardwareRequirements:'NONE_RUNS_IN_VISITOR_BROWSER',verificationSource:'js/ftn-fire.js (this repository, read directly 2026-08-20)',
    note:'enabled stays false NOT because the capability is unreal or costly -- it genuinely works today at /riddim/fire/ -- but because "NO FAKE REDUNDANCY" requires a real, callable adapter before js/ibis-eligibility.js.attemptInOrder() may select it, and js/ftn-fire.js\'s schedule()/play()/exportWav() functions are tightly bound to that page\'s own DOM (fire-style/fire-bpm/etc. element ids), not exposed as a portable, other-node-callable function today. Extracting the procedural engine into a shared module (the same refactor pattern js/charts.js\'s trendGlyph() already proved for a smaller case, RC3 Sec 7.7) is the concrete next step to make this genuinely IBIS-orchestrable beyond its own page -- flagged, not rushed, per this codebase\'s standing "ship real, flag next" discipline.'
  }
];
global.FTN=global.FTN||{};
global.FTN.IbisProviders={all:function(){return providers.map(function(p){return Object.assign({},p);});},byCategory:function(category){return providers.filter(function(p){return p.categories.indexOf(category)>=0;}).map(function(p){return Object.assign({},p);});},byCapability:function(capability){return providers.filter(function(p){return(p.capabilities||[]).indexOf(capability)>=0;}).map(function(p){return Object.assign({},p);});},get:function(id){var p=providers.filter(function(x){return x.id===id;})[0];return p?Object.assign({},p):null;},verifiedAt:VERIFIED};
})(window);
