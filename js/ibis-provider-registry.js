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
    note:'Official API and affiliate programme exist. API generation is disabled until FTN has an approved account, customer-funded credits and completed output-rights review. The public programme link is not an FTN affiliate link.'
  },
  {
    id:'kling',name:'Kling AI',categories:['image','video'],capabilities:['IMAGE_GENERATION','VIDEO_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',
    website:'https://app.klingai.com/global/',apiUrl:'https://kling.ai/document-api/guides/get-started/overview',pricingUrl:'https://kling.ai/dev/pricing',affiliateProgramUrl:'https://app.klingai.com/global/commission-share',
    commercialUse:'REQUIRES_CONTRACT_AND_OUTPUT_TERMS_REVIEW',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    note:'Official API and affiliate programme surfaces exist. Current API packages require pre-purchase, so Kling is not enabled for an FTN zero-upfront-cost launch.'
  },
  {
    id:'musicapi-producer',name:'MusicAPI Producer · Lyria 3 Pro',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',
    website:'https://musicapi.ai/producer-ai-api',apiUrl:'https://docs.musicapi.ai/',pricingUrl:'https://musicapi.ai/lyria-3-pro-pricing',affiliateProgramUrl:'https://musicapi.ai/affiliates',
    commercialUse:'PROVIDER_STATES_COMMERCIAL_RIGHTS_INCLUDED_TERMS_REVIEW_REQUIRED',redistribution:'PROVIDER_STATES_CUSTOMER_DELIVERY_ALLOWED_TERMS_REVIEW_REQUIRED',lastVerified:VERIFIED,
    note:'Official Producer API is 12 provider credits per task and supports instrumental prompts. The official affiliate programme advertises 30% lifetime commission. FTN has no approved API account or affiliate link configured, so both paths remain off.'
  },
  {
    id:'ace-step',name:'ACE-Step',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/ace-step/ACE-Step',apiUrl:null,pricingUrl:'https://github.com/ace-step/ACE-Step/blob/main/LICENSE',affiliateProgramUrl:null,
    commercialUse:'APACHE_2_CODE_AND_MODEL_CANDIDATE_REVIEW_REQUIRED',redistribution:'ORIGINALITY_AND_MODEL_RELEASE_REVIEW_REQUIRED',lastVerified:VERIFIED,
    note:'Official project and model card identify Apache 2.0 and support instrumental workflows. Self-hosting remains disabled until GPU cost, exact model version, safety, cultural-quality and release-rights testing pass. Open licensing does not mean zero cost to IBIS -- someone still pays for the GPU.'
  },
  {
    id:'stable-audio-3',name:'Stable Audio 3',categories:['instrumental','sample'],capabilities:['INSTRUMENTAL_GENERATION','AUDIO_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://stability.ai/stable-audio',apiUrl:'https://platform.stability.ai/',pricingUrl:'https://stability.ai/license',affiliateProgramUrl:null,
    commercialUse:'CONDITIONAL_STABILITY_COMMUNITY_LICENSE',redistribution:'REQUIRES_LICENSE_REVIEW',lastVerified:VERIFIED,
    note:'Stability states that Small/Medium are open weights trained on licensed data and outputs may be commercialized under its Community License, with Enterprise licensing above its threshold. FTN deployment still needs exact-version and cost validation. This is the model ftn-fire-generate already targets, gated behind FTN_CREATIVE_GENERATION_ENABLED + FTN_FIRE_GENERATION_ENABLED, both currently off.'
  },
  {
    id:'musicgen',name:'MusicGen',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'RESEARCH_ONLY',
    apiStatus:'OPEN_MODEL_WEIGHTS_NONCOMMERCIAL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'NOT_APPLICABLE_LICENSE_BLOCKS_USE',
    website:'https://github.com/facebookresearch/audiocraft',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPROVED_FOR_FTN_CUSTOMER_OUTPUT',redistribution:'NOT_APPROVED',lastVerified:VERIFIED,
    note:'AudioCraft code and model weights have different licences. MusicGen is excluded from commercial FTN generation unless a later rights review establishes a permitted path.'
  },
  {
    id:'producer-ai',name:'Producer.ai',categories:['instrumental','production'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'PARTNER_REVIEW',
    apiStatus:'UNVERIFIED',affiliateStatus:'UNVERIFIED',payAsYouGo:null,prepaidRequired:null,enabled:false,costToIbis:'UNVERIFIED',
    website:'https://producer.ai/',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'UNVERIFIED',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    note:'Never automate a consumer login or subscription. FTN will integrate only after a permitted API, partner or referral arrangement and export rights are documented.'
  },
  {
    id:'ibis-query-gemini',name:'ibis-query (Google Gemini)',categories:['text'],capabilities:['TEXT'],integration:'NATIVE_API_LIVE',
    apiStatus:'LIVE_IF_GEMINI_API_KEY_CONFIGURED',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:null,prepaidRequired:false,enabled:true,costToIbis:'PAID_BY_IBIS_PRE_EXISTING',
    website:'https://ai.google.dev/',apiUrl:'https://ai.google.dev/gemini-api/docs',pricingUrl:'https://ai.google.dev/pricing',affiliateProgramUrl:null,
    commercialUse:'INHERITED_FROM_EXISTING_IBIS_QUERY_DEPLOYMENT_NOT_INDEPENDENTLY_REVERIFIED',redistribution:'NOT_APPLICABLE',lastVerified:VERIFIED,
    userAuthorizationRequired:true,
    note:'Pre-existing production integration (supabase/functions/ibis-query), not newly added by this registry pass. Requires FTN Account sign-in (CI-enforced in tests/backend-source-audit.mjs). Marked costToIbis PAID_BY_IBIS_PRE_EXISTING rather than ZERO because Gemini API usage is billed to FTN\'s own key, not a customer-funded credit -- flagged honestly rather than reclassified without a founder review of that cost.'
  },
  {
    id:'ibis-assistant-anthropic',name:'ibis-widget (Anthropic)',categories:['text'],capabilities:['TEXT'],integration:'NATIVE_API_LIVE',
    apiStatus:'PENDING_DEPLOYMENT',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:null,prepaidRequired:false,enabled:false,costToIbis:'PAID_BY_IBIS_FOUNDER_APPROVED',
    website:'https://www.anthropic.com/',apiUrl:'https://docs.anthropic.com/',pricingUrl:'https://www.anthropic.com/pricing',affiliateProgramUrl:null,
    commercialUse:'FOUNDER_APPROVED_NARROW_SCOPE_2026_08_19',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
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
    commercialUse:'PROVIDER_STATES_FREE_ALLOCATION_HARD_CAPPED_TERMS_REVIEW_RECOMMENDED_BEFORE_ENABLING',redistribution:'UNVERIFIED',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    modelId:'@cf/black-forest-labs/flux-1-schnell',
    note:'Not yet integrated -- requires the same CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN Supabase secrets as cloudflare-workers-ai-text, plus supabase/functions/ibis-image-cloudflare actually deployed, before enabled can become true. Output licensing/commercial-use terms for Black Forest Labs FLUX.1 [schnell] have not been independently reviewed by FTN -- redistribution stays UNVERIFIED until that review happens, same discipline already applied to every other unreviewed provider in this registry.'
  },
  {
    // Same-account, same-mechanism fallback model so a single model's outage or timeout doesn't
    // remove IMAGE_GENERATION eligibility entirely -- real model-level failover via
    // js/ibis-eligibility.js attemptInOrder(), the same pattern already proven for TEXT (Phase 3).
    id:'cloudflare-workers-ai-image-sdxl',name:'Cloudflare Workers AI — SDXL-Lightning',categories:['image'],capabilities:['IMAGE_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'PENDING_ACCOUNT_SETUP',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'PROVIDER_STATES_FREE_ALLOCATION_HARD_CAPPED_TERMS_REVIEW_RECOMMENDED_BEFORE_ENABLING',redistribution:'UNVERIFIED',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    modelId:'@cf/bytedance/stable-diffusion-xl-lightning',
    note:'Not yet integrated -- same deployment prerequisites as cloudflare-workers-ai-image-flux. Output licensing/commercial-use terms for this ByteDance model have not been independently reviewed by FTN -- redistribution stays UNVERIFIED until that review happens.'
  }
];
global.FTN=global.FTN||{};
global.FTN.IbisProviders={all:function(){return providers.map(function(p){return Object.assign({},p);});},byCategory:function(category){return providers.filter(function(p){return p.categories.indexOf(category)>=0;}).map(function(p){return Object.assign({},p);});},byCapability:function(capability){return providers.filter(function(p){return(p.capabilities||[]).indexOf(capability)>=0;}).map(function(p){return Object.assign({},p);});},get:function(id){var p=providers.filter(function(x){return x.id===id;})[0];return p?Object.assign({},p):null;},verifiedAt:VERIFIED};
})(window);
