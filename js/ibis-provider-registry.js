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
    lifecycleState:'DISCOVERED',
    note:'Official API and affiliate programme exist. API generation is disabled until FTN has an approved account, customer-funded credits and completed output-rights review. The public programme link is not an FTN affiliate link.'
  },
  {
    id:'kling',name:'Kling AI',categories:['image','video'],capabilities:['IMAGE_GENERATION','VIDEO_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',
    website:'https://app.klingai.com/global/',apiUrl:'https://kling.ai/document-api/guides/get-started/overview',pricingUrl:'https://kling.ai/dev/pricing',affiliateProgramUrl:'https://app.klingai.com/global/commission-share',
    commercialUse:'REQUIRES_CONTRACT_AND_OUTPUT_TERMS_REVIEW',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://kling.ai/document-api/guides/get-started/overview',
    lifecycleState:'DISCOVERED',
    note:'Official API and affiliate programme surfaces exist. Current API packages require pre-purchase, so Kling is not enabled for an FTN zero-upfront-cost launch.'
  },
  {
    id:'musicapi-producer',name:'MusicAPI Producer · Lyria 3 Pro',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,costToIbis:'ZERO_CUSTOMER_FUNDED',
    website:'https://musicapi.ai/producer-ai-api',apiUrl:'https://docs.musicapi.ai/',pricingUrl:'https://musicapi.ai/lyria-3-pro-pricing',affiliateProgramUrl:'https://musicapi.ai/affiliates',
    commercialUse:'PROVIDER_STATES_COMMERCIAL_RIGHTS_INCLUDED_TERMS_REVIEW_REQUIRED',redistribution:'PROVIDER_STATES_CUSTOMER_DELIVERY_ALLOWED_TERMS_REVIEW_REQUIRED',lastVerified:VERIFIED,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://docs.musicapi.ai/',
    lifecycleState:'DISCOVERED',
    note:'Official Producer API is 12 provider credits per task and supports instrumental prompts. The official affiliate programme advertises 30% lifetime commission. FTN has no approved API account or affiliate link configured, so both paths remain off.'
  },
  {
    id:'ace-step',name:'ACE-Step',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/ace-step/ACE-Step',apiUrl:null,pricingUrl:'https://github.com/ace-step/ACE-Step/blob/main/LICENSE',affiliateProgramUrl:null,
    commercialUse:'APACHE_2_CODE_AND_MODEL_CANDIDATE_REVIEW_REQUIRED',redistribution:'ORIGINALITY_AND_MODEL_RELEASE_REVIEW_REQUIRED',lastVerified:VERIFIED,
    weightsAvailable:'YES_STATED_APACHE_2_0',sourceAvailable:'YES_GITHUB_APACHE_2_0',selfHostable:true,deploymentMethod:'PYTHON_TRANSFORMERS_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_NOT_QUANTIFIED_BY_FTN',verificationSource:'https://github.com/ace-step/ACE-Step',
    lifecycleState:'DISCOVERED',
    note:'Official project and model card identify Apache 2.0 and support instrumental workflows. Self-hosting remains disabled until GPU cost, exact model version, safety, cultural-quality and release-rights testing pass. Open licensing does not mean zero cost to IBIS -- someone still pays for the GPU.'
  },
  {
    id:'stable-audio-3',name:'Stable Audio 3',categories:['instrumental','sample'],capabilities:['INSTRUMENTAL_GENERATION','AUDIO_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://stability.ai/stable-audio',apiUrl:'https://platform.stability.ai/',pricingUrl:'https://stability.ai/license',affiliateProgramUrl:null,
    commercialUse:'CONDITIONAL_STABILITY_COMMUNITY_LICENSE',redistribution:'REQUIRES_LICENSE_REVIEW',lastVerified:VERIFIED,
    weightsAvailable:'YES_STABILITY_COMMUNITY_LICENSE',sourceAvailable:'YES_STABILITY_REPO',selfHostable:true,deploymentMethod:'PYTHON_DIFFUSERS_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_NOT_QUANTIFIED_BY_FTN',verificationSource:'https://stability.ai/license',
    lifecycleState:'DISCOVERED',
    note:'Stability states that Small/Medium are open weights trained on licensed data and outputs may be commercialized under its Community License, with Enterprise licensing above its threshold. FTN deployment still needs exact-version and cost validation. This is the model ftn-fire-generate already targets, gated behind FTN_CREATIVE_GENERATION_ENABLED + FTN_FIRE_GENERATION_ENABLED, both currently off.'
  },
  {
    id:'musicgen',name:'MusicGen',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'RESEARCH_ONLY',
    apiStatus:'OPEN_MODEL_WEIGHTS_NONCOMMERCIAL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'NOT_APPLICABLE_LICENSE_BLOCKS_USE',
    website:'https://github.com/facebookresearch/audiocraft',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPROVED_FOR_FTN_CUSTOMER_OUTPUT',redistribution:'NOT_APPROVED',lastVerified:VERIFIED,
    weightsAvailable:'YES_NONCOMMERCIAL_LICENSE_ONLY',sourceAvailable:'YES_MIT_CODE_NONCOMMERCIAL_WEIGHTS',selfHostable:true,deploymentMethod:'PYTHON_AUDIOCRAFT_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_NOT_QUANTIFIED_BY_FTN',verificationSource:'https://github.com/facebookresearch/audiocraft',
    lifecycleState:'BLOCKED',
    note:'AudioCraft code and model weights have different licences. MusicGen is excluded from commercial FTN generation unless a later rights review establishes a permitted path.'
  },
  {
    id:'producer-ai',name:'Producer.ai',categories:['instrumental','production'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'PARTNER_REVIEW',
    apiStatus:'UNVERIFIED',affiliateStatus:'UNVERIFIED',payAsYouGo:null,prepaidRequired:null,enabled:false,costToIbis:'UNVERIFIED',
    website:'https://producer.ai/',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'UNVERIFIED',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    weightsAvailable:'UNKNOWN',sourceAvailable:'UNKNOWN',selfHostable:null,deploymentMethod:'UNKNOWN',hardwareRequirements:'UNKNOWN',verificationSource:null,
    lifecycleState:'DISCOVERED',
    note:'Never automate a consumer login or subscription. FTN will integrate only after a permitted API, partner or referral arrangement and export rights are documented.'
  },
  {
    id:'ibis-query-gemini',name:'ibis-query (Google Gemini)',categories:['text'],capabilities:['TEXT','STORY_DEVELOPMENT','LOGLINE','SYNOPSIS','CHARACTER_DEVELOPMENT','WORLD_BUILDING','OUTLINE','BEAT_SHEET','SCREENPLAY','SCENE_BREAKDOWN','PRODUCTION_PLAN','PITCH_MATERIAL','REVISION','CONTINUITY_CHECK'],integration:'NATIVE_API_LIVE',
    apiStatus:'LIVE_IF_GEMINI_API_KEY_CONFIGURED',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:null,prepaidRequired:false,enabled:true,costToIbis:'PAID_BY_IBIS_PRE_EXISTING',
    website:'https://ai.google.dev/',apiUrl:'https://ai.google.dev/gemini-api/docs',pricingUrl:'https://ai.google.dev/pricing',affiliateProgramUrl:null,
    commercialUse:'INHERITED_FROM_EXISTING_IBIS_QUERY_DEPLOYMENT_NOT_INDEPENDENTLY_REVERIFIED',redistribution:'NOT_APPLICABLE',lastVerified:VERIFIED,
    userAuthorizationRequired:true,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://ai.google.dev/gemini-api/docs',
    lifecycleState:'ELIGIBLE',
    note:'Pre-existing production integration (supabase/functions/ibis-query), not newly added by this registry pass. Requires FTN Account sign-in (CI-enforced in tests/backend-source-audit.mjs). Marked costToIbis PAID_BY_IBIS_PRE_EXISTING rather than ZERO because Gemini API usage is billed to FTN\'s own key, not a customer-funded credit -- flagged honestly rather than reclassified without a founder review of that cost.'
  },
  {
    id:'ibis-assistant-anthropic',name:'ibis-widget (Anthropic)',categories:['text'],capabilities:['TEXT','STORY_DEVELOPMENT','LOGLINE','SYNOPSIS','CHARACTER_DEVELOPMENT','WORLD_BUILDING','OUTLINE','BEAT_SHEET','SCREENPLAY','SCENE_BREAKDOWN','PRODUCTION_PLAN','PITCH_MATERIAL','REVISION','CONTINUITY_CHECK'],integration:'NATIVE_API_LIVE',
    apiStatus:'PENDING_DEPLOYMENT',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:null,prepaidRequired:false,enabled:false,costToIbis:'PAID_BY_IBIS_FOUNDER_APPROVED',
    website:'https://www.anthropic.com/',apiUrl:'https://docs.anthropic.com/',pricingUrl:'https://www.anthropic.com/pricing',affiliateProgramUrl:null,
    commercialUse:'FOUNDER_APPROVED_NARROW_SCOPE_2026_08_19',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://docs.anthropic.com/',
    lifecycleState:'DEPLOYMENT_READY',
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
    id:'cloudflare-workers-ai-text',name:'Cloudflare Workers AI — Llama 3.1 8B',categories:['text'],capabilities:['TEXT','STORY_DEVELOPMENT','LOGLINE','SYNOPSIS','CHARACTER_DEVELOPMENT','WORLD_BUILDING','OUTLINE','BEAT_SHEET','SCREENPLAY','SCENE_BREAKDOWN','PRODUCTION_PLAN','PITCH_MATERIAL','REVISION','CONTINUITY_CHECK'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'PENDING_ACCOUNT_SETUP',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/get-started/rest-api/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'PROVIDER_STATES_FREE_ALLOCATION_HARD_CAPPED_TERMS_REVIEW_RECOMMENDED_BEFORE_ENABLING',redistribution:'UNVERIFIED',lastVerified:'2026-08-20',
    userAuthorizationRequired:false,
    modelId:'@cf/meta/llama-3.1-8b-instruct',
    weightsAvailable:'YES_UNDERLYING_MODEL_OPEN_WEIGHT_META_LLAMA_3_LICENSE',sourceAvailable:'NOT_APPLICABLE_FTN_DOES_NOT_SELF_HOST',selfHostable:false,deploymentMethod:'CLOUDFLARE_HOSTED_INFERENCE_REST_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_BY_CLOUDFLARE',verificationSource:'https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct/',
    lifecycleState:'DEPLOYMENT_READY',
    note:'Not yet integrated -- requires a Cloudflare account, an API token with Workers AI permissions, and CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN set as Supabase secrets before enabled can become true (per this codebase\'s "discovery is not deployment" rule). The 10,000-Neuron/day pool also covers embeddings, image generation (flux-1-schnell, stable-diffusion-xl) and speech-to-text (whisper) -- those are documented as researched-but-not-registered candidates in IBIS-MAP.md, not added here speculatively.'
  },
  {
    // Phase 3B follow-through: IMAGE_GENERATION was a researched-but-not-registered candidate on
    // the cloudflare-workers-ai-text entry above (see IBIS-MAP.md §0.8); this promotes it to a
    // registered candidate using the same account, same free Neuron allocation and the same
    // ZERO_COST_TO_IBIS classification already verified for TEXT. Primary model.
    id:'cloudflare-workers-ai-image-flux',name:'Cloudflare Workers AI — FLUX.1 [schnell]',categories:['image'],capabilities:['IMAGE_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'SUPABASE_FUNCTION_DEPLOYED_AWAITING_DURABLE_CLOUDFLARE_SECRET',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'VERIFIED_APACHE_2_0_COMMERCIAL_USE_PERMITTED',redistribution:'APACHE_2_0_PERMITS_COMMERCIAL_AND_PERSONAL_USE',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    modelId:'@cf/black-forest-labs/flux-1-schnell',
    weightsAvailable:'YES_APACHE_2_0_VERIFIED_ON_OFFICIAL_MODEL_CARD',sourceAvailable:'YES_HUGGING_FACE_BLACK_FOREST_LABS',selfHostable:false,deploymentMethod:'CLOUDFLARE_HOSTED_INFERENCE_REST_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_BY_CLOUDFLARE',verificationSource:'Direct authenticated test against the live Cloudflare account, 2026-08-21 (see IBIS-MAP.md Sec 0.17/0.18) -- confirmed against developers.cloudflare.com/workers-ai/models/flux-1-schnell/ for the model catalog entry itself',
    lifecycleState:'EXECUTABLE',
    note:'Phase 9 (2026-08-21): a founder-authorized Cloudflare account is now connected to this execution environment (verified via `wrangler whoami`). A REAL generation call was made directly against the live Cloudflare API: HTTP 200, real ~528KB JPEG image returned (result.image field, confirmed by direct decode), viewed and confirmed coherent and on-topic. Phase 10 (2026-08-21): supabase/functions/ibis-image-cloudflare is now genuinely DEPLOYED (`supabase functions deploy`, verified ACTIVE via `supabase functions list`) -- the earlier blocker (no authenticated Supabase CLI session) is resolved. A real end-to-end request against the live deployed function (matching js/ibis-creative-studio.js\'s exact call pattern: apikey + Bearer using the publishable key) correctly passed the gateway\'s verify_jwt gate and returned the function\'s own honest 503 fail-closed response ("not configured yet"), because CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN are not yet set as Supabase secrets. The only credential available in this environment for that value is the interactive `wrangler login` OAuth session token, which is short-lived (confirmed expiration timestamp in the CLI\'s own config, ~1 hour from authentication) with no server-side refresh path -- deliberately NOT used as a permanent secret, since it would make the function appear to work and then silently fail for real users. enabled stays false until the founder supplies a durable, dashboard-issued Cloudflare API Token (Account.Workers AI:Edit scope, account id 659c0b87c0871b257976e6b8d6425501) to set as CLOUDFLARE_API_TOKEN. EXECUTABLE (provider proven real, production route deployed and gateway-verified) is honestly distinct from ELIGIBLE (live for real users), the same distinction this registry has maintained throughout.'
  },
  {
    // Same-account, same-mechanism fallback model so a single model's outage or timeout doesn't
    // remove IMAGE_GENERATION eligibility entirely -- real model-level failover via
    // js/ibis-eligibility.js attemptInOrder(), the same pattern already proven for TEXT (Phase 3).
    id:'cloudflare-workers-ai-image-sdxl',name:'Cloudflare Workers AI — SDXL-Lightning',categories:['image'],capabilities:['IMAGE_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'SUPABASE_FUNCTION_DEPLOYED_AWAITING_DURABLE_CLOUDFLARE_SECRET',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'OPENRAIL_PLUS_PLUS_PERMITS_COMMERCIAL_USE_WITH_USE_BASED_RESTRICTIONS',redistribution:'OPENRAIL_PLUS_PLUS_USE_BASED_RESTRICTIONS_APPLY',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    modelId:'@cf/bytedance/stable-diffusion-xl-lightning',
    weightsAvailable:'YES_OPENRAIL_PLUS_PLUS_VERIFIED_ON_OFFICIAL_MODEL_CARD',sourceAvailable:'YES_HUGGING_FACE_BYTEDANCE',selfHostable:false,deploymentMethod:'CLOUDFLARE_HOSTED_INFERENCE_REST_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_BY_CLOUDFLARE',verificationSource:'Direct authenticated test against the live Cloudflare account, 2026-08-21 (see IBIS-MAP.md Sec 0.17/0.18)',
    lifecycleState:'EXECUTABLE',
    note:'Same real verification as cloudflare-workers-ai-image-flux, same date: HTTP 200, a real ~89KB image returned directly as raw binary (not JSON -- this model\'s REST response is a raw body with an "image/png" content-type header, but the actual decoded magic bytes are JPEG (0xFFD8) -- a real, confirmed content-type/actual-format mismatch on Cloudflare\'s own API, not an FTN bug; supabase/functions/ibis-image-cloudflare\'s existing raw-binary-response branch already handles this correctly since it trusts the bytes, not the label). Image viewed directly and confirmed coherent and on-topic. Same Phase 10 deployment status as the flux entry: the Supabase function is genuinely deployed and gateway-verified (real 503 fail-closed response observed, not a guess), enabled stays false pending the same durable Cloudflare API Token the flux entry describes -- one token/secret pair serves both models via this one function.'
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
    commercialUse:'VERIFIED_APACHE_2_0_ON_2B_VARIANT_ONLY',redistribution:'APACHE_2_0_PERMITS_REDISTRIBUTION_2B_VARIANT_ONLY',lastVerified:'2026-08-21',
    weightsAvailable:'YES_APACHE_2_0_VERIFIED_ON_OFFICIAL_MODEL_CARD_2B_ONLY',sourceAvailable:'YES_GITHUB_AND_HUGGING_FACE_ZAI_ORG',selfHostable:true,deploymentMethod:'PYTHON_DIFFUSERS_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_APPROX_5GB_VRAM_WITH_CPU_OFFLOAD_PER_OFFICIAL_REPO_UNQUANTIFIED_COST_BY_FTN',verificationSource:'https://huggingface.co/THUDM/CogVideoX-2b',
    lifecycleState:'LICENSE_VERIFIED',
    note:'The 2B variant is confirmed Apache 2.0 (commercial use permitted) on its official Hugging Face model card, distinct from the larger 5B variant which uses a separate, more restrictive CogVideoX license -- do not conflate the two when this entry is revisited. Phase 10 (2026-08-21) obtained this execution environment\'s exact hardware for the first time, not just "no GPU toolkit found": CPU is an AMD Ryzen 3 7320U (4 cores/8 threads), GPU is the integrated AMD Radeon Graphics on that same chip -- no discrete GPU, no NVIDIA hardware, no CUDA possible at any driver/toolkit version, and still no Python interpreter of any kind. Cloudflare\'s live model catalog was also re-checked directly this same pass (wrangler ai models list, 64 models total): still zero video-generation models. This stays WOULD_REQUIRE_IBIS_COMPUTE_SPEND and ineligible until a founder makes a budgeted infrastructure decision -- open licensing does not change that; the blocker is this specific machine\'s hardware, not credentials.'
  },
  {
    // Phase 10 (2026-08-21) VIDEO investigation, per the master directive's LOCAL -> FREE ->
    // AFFILIATE -> PAID priority and its explicit request to evaluate Wan2.1/HunyuanVideo/
    // CogVideoX/LTX-2/Open-Sora. Real license/hardware facts sourced live (WebSearch, primary
    // sources cited below), not from training-data memory -- this repo's own standard for every
    // provider record. All five self-host candidates below share the identical blocker: this
    // machine (confirmed via direct detection this same pass -- AMD Ryzen 3 7320U, integrated AMD
    // Radeon Graphics, no discrete/NVIDIA GPU, no CUDA, no Python, no Docker) cannot run ANY of
    // them regardless of how permissive each one's license is. This is a hardware fact, not a
    // per-model licensing problem -- do not re-litigate licensing to try to unblock this.
    id:'wan-2.1',name:'Wan2.1 (Alibaba)',categories:['video'],capabilities:['VIDEO_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/Wan-Video/Wan2.1',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'VERIFIED_APACHE_2_0_ALL_VARIANTS',redistribution:'APACHE_2_0_PERMITS_REDISTRIBUTION',lastVerified:'2026-08-21',
    weightsAvailable:'YES_APACHE_2_0_HUGGING_FACE_AND_MODELSCOPE',sourceAvailable:'YES_GITHUB_WAN_VIDEO',selfHostable:true,deploymentMethod:'PYTHON_DIFFUSERS_OR_COMFYUI_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_1_3B_VARIANT_ABOUT_8GB_VRAM_MINIMUM_14B_VARIANT_24GB_VRAM_RECOMMENDED_NVIDIA_RTX_4090_CLASS',verificationSource:'https://github.com/Wan-Video/Wan2.1 (Apache 2.0 LICENSE file); willitrunai.com/blog/wan-2-2-vram-requirements for VRAM figures',
    lifecycleState:'LICENSE_VERIFIED',
    note:'The most commercially permissive candidate investigated -- Apache 2.0 on every variant, no attribution-defeating restrictions. Its smallest (1.3B) variant is the lowest-VRAM self-host video option found in this whole investigation (~8GB), which would matter a great deal on different hardware. On THIS machine it is irrelevant: no discrete/NVIDIA GPU exists at all (integrated AMD Radeon Graphics only), and no Python interpreter exists to run diffusers/ComfyUI. Blocked on hardware, not license or credentials.'
  },
  {
    id:'hunyuanvideo-1.5',name:'HunyuanVideo 1.5 (Tencent)',categories:['video'],capabilities:['VIDEO_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/Tencent-Hunyuan/HunyuanVideo',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'PERMITTED_UNDER_TENCENT_HUNYUAN_COMMUNITY_LICENSE_WITH_TERRITORIAL_RESTRICTIONS',redistribution:'CUSTOM_LICENSE_NOT_STANDARD_APACHE_REVIEW_BEFORE_REDISTRIBUTION',lastVerified:'2026-08-21',
    weightsAvailable:'YES_HUGGING_FACE_TENCENT',sourceAvailable:'YES_GITHUB_TENCENT_HUNYUAN',selfHostable:true,deploymentMethod:'PYTHON_DIFFUSERS_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_ABOUT_14GB_VRAM_WITH_OFFLOADING_ABOUT_9GB_AT_FP8_QUANTIZATION',verificationSource:'https://github.com/Tencent-Hunyuan/HunyuanVideo (Tencent Hunyuan Community License Agreement); deepwiki.com/Tencent/HunyuanVideo/5-license-and-legal',
    lifecycleState:'LICENSE_VERIFIED',
    note:'8.3B parameters, free for commercial and research use under Tencent\'s own custom community license (not plain Apache 2.0 -- has real terms of its own, worth a founder read before any future enablement) -- but that license explicitly PROHIBITS use in the EU, UK, and South Korea, a real geographic restriction FTN would need to account for if this were ever pursued. Moot today regardless: same hardware blocker as every other entry in this group (no NVIDIA GPU, no Python).'
  },
  {
    id:'ltx-2',name:'LTX-2 / LTX-2.5 (Lightricks)',categories:['video'],capabilities:['VIDEO_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_WEIGHTS_PLUS_OFFICIAL_API_PARTNERS',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/Lightricks/LTX-2',apiUrl:'https://ltx.io/llm-info',pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'FREE_COMMERCIAL_USE_UNDER_10_MILLION_USD_ANNUAL_REVENUE_LICENSED_ABOVE_THAT',redistribution:'COMMUNITY_LICENSE_REVIEW_BEFORE_REDISTRIBUTION',lastVerified:'2026-08-21',
    weightsAvailable:'YES_HUGGING_FACE_LIGHTRICKS',sourceAvailable:'YES_GITHUB_LIGHTRICKS_LTX_2',selfHostable:true,deploymentMethod:'PYTHON_SELF_HOST_OR_THIRD_PARTY_API_PARTNER',hardwareRequirements:'GPU_REQUIRED_VENDOR_CLAIMS_CONSUMER_GPU_CAPABLE_UP_TO_NATIVE_4K_20S_50FPS_UNVERIFIED_EXACT_VRAM_FIGURE_BY_FTN',verificationSource:'https://github.com/Lightricks/LTX-2/blob/main/LICENSE.md; https://ltx.io/llm-info',
    lifecycleState:'LICENSE_VERIFIED',
    note:'Notable for being the first open model claiming synchronized audio+video generation in one pass, and for a genuinely unusual license structure: free for commercial use below $10M ARR, a separate paid licensing program above that -- FTN would currently qualify for the free tier, a fact worth revisiting if this is ever pursued for real, since most candidates here are flatly free or flatly not. Also available through third-party API partners (a PAID, non-self-host route), not independently verified by this pass -- would need its own pricing/ToS check before ever being registered as a PAID candidate. Self-host route blocked by the same hardware wall as the rest of this group.'
  },
  {
    id:'open-sora-v2',name:'Open-Sora v2 (hpcaitech)',categories:['video'],capabilities:['VIDEO_GENERATION'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/hpcaitech/Open-Sora',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'APACHE_2_0_PERMITS_COMMERCIAL_USE',redistribution:'APACHE_2_0_PERMITS_REDISTRIBUTION',lastVerified:'2026-08-21',
    weightsAvailable:'YES_HUGGING_FACE_HPCAI_TECH',sourceAvailable:'YES_GITHUB_HPCAITECH',selfHostable:true,deploymentMethod:'PYTHON_SELF_HOST',hardwareRequirements:'GPU_REQUIRED_EXACT_VRAM_FIGURE_NOT_INDEPENDENTLY_VERIFIED_BY_FTN_THIS_PASS',verificationSource:'https://github.com/hpcaitech/Open-Sora/blob/main/LICENSE',
    lifecycleState:'LICENSE_VERIFIED',
    note:'Apache 2.0, commercial use permitted -- the project\'s own GitHub issue history shows some past community confusion over a since-resolved non-commercial-license proposal, worth a quick re-check of the LICENSE file directly (not this note) before ever treating this as final. No official hosted API found. Same hardware blocker as the rest of this group; VRAM requirement not independently pinned down this pass since it does not change the outcome on this machine.'
  },
  {
    // MiniMax H3, investigated per the directive's specific continuation of that line of work.
    // The only candidate in this whole VIDEO investigation with a genuine, official, direct
    // hosted API -- meaning it is NOT blocked by this machine's hardware, only by the economics
    // gate every PAID provider in this registry already goes through (founder-approved spend +
    // customer-funded prepaid credits, never automatic FTN-funded billing -- see IBIS-MAP.md Sec
    // 5). No API key exists in this environment; none was requested or fabricated.
    id:'minimax-h3',name:'MiniMax Hailuo (H3)',categories:['video'],capabilities:['VIDEO_GENERATION'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'OFFICIAL_API_CONFIRMED_NO_KEY_CONFIGURED',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:true,prepaidRequired:true,enabled:false,costToIbis:'NOT_APPLICABLE_WOULD_BE_CUSTOMER_FUNDED_IF_EVER_ENABLED',
    website:'https://www.minimax.io/',apiUrl:'https://www.minimax.io/platform_overview',pricingUrl:'https://openrouter.ai/minimax/hailuo-3',affiliateProgramUrl:null,
    commercialUse:'OFFICIAL_PAID_API_COMMERCIAL_USE_IMPLIED_BY_PRODUCT_NOT_A_CONSUMER_SUBSCRIPTION',redistribution:'NOT_APPLICABLE_CLOSED_API',lastVerified:'2026-08-21',
    userAuthorizationRequired:true,
    weightsAvailable:'NOT_APPLICABLE_CLOSED_API',sourceAvailable:'NOT_APPLICABLE_CLOSED_API',selfHostable:false,deploymentMethod:'NATIVE_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_API',verificationSource:'https://www.minimax.io/platform_overview (confirmed a real API + API-reference link exists); openrouter.ai/minimax/hailuo-3 for a real third-party reseller price point ($0.13/sec video output) since exact first-party per-second pricing was not published on the page fetched this pass',
    lifecycleState:'DISCOVERED',
    note:'A real official direct API exists (confirmed by fetching MiniMax\'s own platform-overview page, not inferred from a reseller) -- this is the one VIDEO candidate in this investigation not blocked by local hardware at all, since it runs entirely on MiniMax\'s infrastructure. Exact first-party pricing/ToS/rate limits were not published on the page checked this pass -- OpenRouter\'s reseller price ($0.13/sec) is cited only as an order-of-magnitude reference, not FTN\'s real cost. lifecycleState is intentionally left at DISCOVERED, not LICENSE_VERIFIED, because the actual commercial ToS document (not just "an API page exists") has not yet been read. This would be a real PAID_BY_IBIS or customer-funded-credit candidate depending on a founder pricing decision -- exactly the kind of provider IBIS\'s existing prepaid-credit economic model (IBIS-MAP.md Sec 5) already exists to gate. No API key was requested, fabricated, or assumed to exist.'
  },
  {
    // Phase 11 (2026-08-21) speech provider discovery: the master directive's Speech-to-Text and
    // TTS/Voice categories, filled the same way TEXT and IMAGE were -- Cloudflare's own catalog,
    // same already-authenticated free-tier account, same Neuron billing model already accepted for
    // every other Cloudflare provider in this registry (confirmed against
    // developers.cloudflare.com/workers-ai/platform/pricing/, not assumed free). Whisper is
    // OpenAI's MIT-licensed model (commercial use permitted, confirmed via WebSearch against its
    // own license file) -- Cloudflare hosts inference, FTN never downloads or redistributes weights.
    id:'cloudflare-workers-ai-whisper',name:'Cloudflare Workers AI — Whisper large-v3-turbo',categories:['audio'],capabilities:['AUDIO_TRANSCRIPTION','SPEECH_TO_TEXT'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'SUPABASE_FUNCTION_DEPLOYED_AWAITING_DURABLE_CLOUDFLARE_SECRET',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'VERIFIED_MIT_LICENSE',redistribution:'MIT_PERMITS_REDISTRIBUTION',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    modelId:'@cf/openai/whisper-large-v3-turbo',
    weightsAvailable:'YES_MIT_OPENAI_OFFICIAL_REPO',sourceAvailable:'YES_GITHUB_OPENAI_WHISPER',selfHostable:false,deploymentMethod:'CLOUDFLARE_HOSTED_INFERENCE_REST_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_BY_CLOUDFLARE',verificationSource:'Real round-trip test against the live Cloudflare account, 2026-08-21 (see IBIS-MAP.md) -- MIT license confirmed via WebSearch against the official openai/whisper repository',
    lifecycleState:'EXECUTABLE',
    note:'Real, human-verified round trip: a real TTS clip synthesized via cloudflare-workers-ai-aura-tts (below) for the phrase "FTN Platform connects the Caribbean." was fed to this model and returned "FTN platform connects the Caribbean." -- word-for-word correct except capitalization -- with real per-word timestamps and a real WebVTT payload in the same response (satisfies the master directive\'s SRT/VTT/word-timestamp requirement natively, no separate WhisperX deployment needed for this tier of quality). supabase/functions/ibis-speech-cloudflare is genuinely DEPLOYED and gateway-verified (a real request returns the function\'s own honest 503 fail-closed response, confirmed, not guessed) -- same as the IMAGE providers, enabled stays false and lifecycleState stops at EXECUTABLE (not ELIGIBLE) until the same durable, dashboard-issued Cloudflare API Token used to unblock IMAGE is supplied and set as CLOUDFLARE_API_TOKEN -- one credential unblocks IMAGE, AUDIO_TRANSCRIPTION and TEXT_TO_SPEECH together, since all three route through the same account.'
  },
  {
    id:'cloudflare-workers-ai-aura-tts',name:'Cloudflare Workers AI — Deepgram Aura-2',categories:['audio'],capabilities:['TEXT_TO_SPEECH'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'SUPABASE_FUNCTION_DEPLOYED_AWAITING_DURABLE_CLOUDFLARE_SECRET',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'ZERO_COST_TO_IBIS',
    website:'https://developers.cloudflare.com/workers-ai/',apiUrl:'https://developers.cloudflare.com/workers-ai/models/aura-2-en/',pricingUrl:'https://developers.cloudflare.com/workers-ai/platform/pricing/',affiliateProgramUrl:null,
    commercialUse:'HOSTED_VIA_CLOUDFLARE_WORKERS_AI_GOVERNED_BY_CLOUDFLARE_AND_DEEPGRAM_HOSTED_MODEL_TERMS_NOT_A_SELF_HOST_LICENSE',redistribution:'NOT_APPLICABLE_CLOSED_HOSTED_MODEL',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    modelId:'@cf/deepgram/aura-2-en',
    weightsAvailable:'NOT_APPLICABLE_CLOSED_HOSTED_MODEL',sourceAvailable:'NOT_APPLICABLE_CLOSED_HOSTED_MODEL',selfHostable:false,deploymentMethod:'CLOUDFLARE_HOSTED_INFERENCE_REST_API',hardwareRequirements:'NOT_APPLICABLE_HOSTED_BY_CLOUDFLARE',verificationSource:'Real generation test against the live Cloudflare account, 2026-08-21 (see IBIS-MAP.md) -- a real ~15KB MP3 clip was generated, decoded and fed straight into cloudflare-workers-ai-whisper above as the actual test input, not a synthetic byte check',
    lifecycleState:'EXECUTABLE',
    note:'This is a generic narration voice (39 stock speaker presets, e.g. "luna"), deliberately distinct from FTN\'s own authorized-identity VOICE_SYNTHESIS work (chatterbox-tts/qwen3-tts, IAN/SARAFINA groundwork) -- do not conflate the two capabilities. Same Phase 11 deployment status as cloudflare-workers-ai-whisper: real generation proven, Supabase function deployed and gateway-verified, enabled stays false pending the same durable Cloudflare API Token every other Cloudflare provider in this registry is waiting on.'
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
    lifecycleState:'ELIGIBLE',
    note:'Autocorrelation-based tempo (BPM) detection over an onset-strength envelope, entirely FTN-authored, no third-party model or dataset involved. Deliberately not wired into any specific FTN node UI this pass (see IBIS-MAP.md) -- registered and tested as a real, complete, working capability first; /riddim/daw/ integration is the flagged next step, following the same "ship a tested vertical slice, flag the next integration point" pattern already used for TEXT and IMAGE.'
  },
  {
    // Phase 13 (2026-08-21) Caribbean Intelligence directive: the smallest genuinely eligible
    // Caribbean capability found after real research (see CARIBBEAN-LEDGER.md) -- every other
    // serious candidate researched this pass was either AGPL-licensed (ineligible for this
    // commercial product), hardware-blocked (no GPU/Python for any real Creole ASR/translation
    // model), or its actual code repository could not be located after a genuine search. This one
    // needed none of that: a small, cited, deterministic lexical-marker list, same
    // "prefer local/deterministic operations" philosophy already used for ibis-local-dsp above.
    id:'ibis-local-caribbean-language-id',name:'ibis local Caribbean Language ID (client-side, no model)',categories:['text'],capabilities:['CARIBBEAN_LANGUAGE_ID'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus:'LIVE',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:true,costToIbis:'ZERO_COST_TO_IBIS',
    website:null,apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPLICABLE_FTN_OWNED_CODE_NO_THIRD_PARTY_MODEL',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_NO_MODEL',sourceAvailable:'YES_FTN_OWNED_js/ibis-caribbean-language-id.js',selfHostable:true,deploymentMethod:'BROWSER_CLIENT_SIDE_JAVASCRIPT_NO_SERVER',hardwareRequirements:'NONE_RUNS_IN_VISITOR_BROWSER',verificationSource:'js/ibis-caribbean-language-id.js and tests/ibis-caribbean-language-id-audit.mjs (this repository); underlying vocabulary cited from https://en.wikipedia.org/wiki/Trinidadian_Creole and https://en.wikipedia.org/wiki/Trinidadian_and_Tobagonian_English',
    lifecycleState:'ELIGIBLE',
    note:'A small (7-term), explicitly-cited lexical-marker detector for Trinidad English/Creole vocabulary, entirely FTN-authored, no third-party model, dataset or weights involved -- so no license firewall issue at all, unlike every other Caribbean candidate researched this pass. Its output is always RESEARCH_DERIVED evidence (never VERIFIED cultural fact) per the Caribbean Evidence/Authenticity System, and it degrades honestly to INSUFFICIENT_EVIDENCE when no marker is found rather than guessing. It only ever analyzes text a caller supplies -- it does not generate or insert Trinidadian expressions into anything, avoiding the directive\'s own stereotyping/fake-authenticity warning by construction. Deliberately not wired into any specific FTN node UI this pass, same honest "tested vertical slice first, integration point flagged next" pattern as ibis-local-dsp -- a real candidate integration point is /facethenation/\'s topic/guest suggestion forms or the ibis widget\'s own language handling, not decided here without a concrete product call.'
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
    lifecycleState:'DEPLOYED',
    note:'enabled stays false NOT because the capability is unreal or costly -- it genuinely works today at /riddim/fire/ -- but because "NO FAKE REDUNDANCY" requires a real, callable adapter before js/ibis-eligibility.js.attemptInOrder() may select it, and js/ftn-fire.js\'s schedule()/play()/exportWav() functions are tightly bound to that page\'s own DOM (fire-style/fire-bpm/etc. element ids), not exposed as a portable, other-node-callable function today. Extracting the procedural engine into a shared module (the same refactor pattern js/charts.js\'s trendGlyph() already proved for a smaller case, RC3 Sec 7.7) is the concrete next step to make this genuinely IBIS-orchestrable beyond its own page -- flagged, not rushed, per this codebase\'s standing "ship real, flag next" discipline. Phase 6: not attempted this pass either -- this repository\'s Node-based test tooling has no OfflineAudioContext/WebAudio implementation, so real execution genuinely cannot be verified here; real browser verification (e.g. Playwright) is the concrete prerequisite before this changes.'
  },
  {
    // Phase 6 (FTNScreen Screenwriter directive): a real, deterministic, zero-cost local
    // calculation -- see js/ibis-runtime-estimator.js. No AI model, no network call, genuinely
    // live today, same standard already established by ibis-local-dsp.
    id:'ibis-local-script-runtime-estimator',name:'ibis local script runtime estimator (client-side, no model)',categories:['text'],capabilities:['RUNTIME_ESTIMATION'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus:'LIVE',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:true,costToIbis:'ZERO_COST_TO_IBIS',
    website:null,apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPLICABLE_FTN_OWNED_CODE_NO_THIRD_PARTY_MODEL',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_NO_MODEL',sourceAvailable:'YES_FTN_OWNED_js/ibis-runtime-estimator.js',selfHostable:true,deploymentMethod:'BROWSER_CLIENT_SIDE_JAVASCRIPT_NO_SERVER',hardwareRequirements:'NONE_RUNS_ANYWHERE_JS_RUNS',verificationSource:'js/ibis-runtime-estimator.js and tests/ibis-runtime-estimator-audit.mjs (this repository)',
    lifecycleState:'ELIGIBLE',
    note:'Standard screenwriting-industry heuristic (~235 words/page, ~1 page/minute) applied to raw screenplay text -- an honest approximation, not real pagination software, and documented as such in the module itself.'
  },
  {
    // Pass 16: IBIS Live Intelligence. Calls Hacker News' Algolia search API and GitHub's public
    // repository search API directly from the browser -- both send permissive CORS headers, need
    // no API key/cookie/login of any kind, so this is genuinely live today with zero deployment
    // step, unlike every PENDING_ACCOUNT_SETUP provider elsewhere in this registry. Reddit/X and
    // any other cookie-gated platform are explicitly excluded this pass -- see
    // SCOUT-INTELLIGENCE-LEDGER.md's Agent Reach / last30days findings for why.
    id:'ibis-local-live-research',name:'ibis Live Intelligence (Hacker News + GitHub, client-side, no model)',categories:['text'],capabilities:['LIVE_INTELLIGENCE'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus:'LIVE',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:true,costToIbis:'ZERO_COST_TO_IBIS',
    website:null,apiUrl:'https://hn.algolia.com/api/v1/search, https://api.github.com/search/repositories',pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPLICABLE_PUBLIC_SEARCH_APIS_NO_THIRD_PARTY_MODEL',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_NO_MODEL',sourceAvailable:'YES_FTN_OWNED_js/ibis-live-research.js',selfHostable:true,deploymentMethod:'BROWSER_CLIENT_SIDE_JAVASCRIPT_NO_SERVER',hardwareRequirements:'NONE_RUNS_IN_VISITOR_BROWSER',verificationSource:'js/ibis-live-research.js and tests/ibis-live-research-audit.mjs (this repository); real browser interaction verified 2026-08-21',
    lifecycleState:'ELIGIBLE',
    note:'Deterministic aggregation of real, current, timestamped Hacker News and GitHub results, scored via js/ftn-source-provenance.js -- no LLM call, no synthesis beyond a factual summary of what was actually returned, no fabricated trending claim.'
  },
  {
    // Phase 6 voice directive: VOICE_SYNTHESIS candidates, researched and license-verified this
    // pass against primary sources, correctly NOT deployed -- both require a GPU this environment
    // does not have. Recorded so a founder infrastructure decision starts from real options, not
    // from zero. See js/ibis-voice-registry.js for the IAN/SARAFINA identity model (kept separate
    // from provider selection on purpose -- swapping the engine must never mean re-deriving the
    // voice identities).
    id:'chatterbox-tts',name:'Chatterbox (Resemble AI)',categories:['voice'],capabilities:['VOICE_SYNTHESIS'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://huggingface.co/ResembleAI/chatterbox',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'VERIFIED_MIT_COMMERCIAL_USE_PERMITTED',redistribution:'MIT_PERMITS_REDISTRIBUTION',lastVerified:'2026-08-21',
    weightsAvailable:'YES_MIT_VERIFIED_ON_OFFICIAL_MODEL_CARD',sourceAvailable:'YES_HUGGING_FACE_RESEMBLE_AI',selfHostable:true,deploymentMethod:'PYTHON_TRANSFORMERS_SELF_HOST_GPU',hardwareRequirements:'GPU_REQUIRED_500M_PARAM_MODEL_EXACT_VRAM_NOT_QUANTIFIED_BY_PRIMARY_SOURCE',verificationSource:'https://huggingface.co/ResembleAI/chatterbox',
    lifecycleState:'LICENSE_VERIFIED',
    note:'MIT license confirmed directly against the official Hugging Face model card 2026-08-21. Supports reference-audio voice cloning -- the realistic path to IAN/SARAFINA speech once real, authorized reference recordings exist (not requested yet, per the directive\'s own explicit ordering). WOULD_REQUIRE_IBIS_COMPUTE_SPEND: correctly ineligible without a founder-budgeted GPU decision, regardless of the license being fully permissive.'
  },
  {
    id:'qwen3-tts',name:'Qwen3-TTS (Alibaba Cloud / Qwen team)',categories:['voice'],capabilities:['VOICE_SYNTHESIS'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/QwenLM/Qwen3-TTS',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'VERIFIED_APACHE_2_0_COMMERCIAL_USE_PERMITTED',redistribution:'APACHE_2_0_PERMITS_REDISTRIBUTION_NOTICE_FILE_OBLIGATION_APPLIES',lastVerified:'2026-08-21',
    weightsAvailable:'YES_APACHE_2_0_VERIFIED_DIRECTLY_AGAINST_LICENSE_FILE',sourceAvailable:'YES_GITHUB_QWENLM',selfHostable:true,deploymentMethod:'PYTHON_SELF_HOST_GPU',hardwareRequirements:'GPU_REQUIRED_0.6B_OR_1.7B_VARIANT_EXACT_VRAM_NOT_QUANTIFIED_BY_PRIMARY_SOURCE',verificationSource:'https://github.com/QwenLM/Qwen3-TTS/blob/main/LICENSE',
    lifecycleState:'LICENSE_VERIFIED',
    note:'Apache 2.0 confirmed by fetching the actual LICENSE file on GitHub (not an aggregator summary) 2026-08-21. Supports 3-second reference-audio voice cloning per the official repository. A real alternative to Chatterbox, not evaluated as deeply this pass -- recorded honestly as a second real candidate, not a confirmed runner-up.'
  },
  {
    // Phase 6 continuation: the one remaining SCREENWRITING-group capability (QC) with no
    // provider at all. Real, deterministic, zero-cost structural completeness checking over a
    // real js/ibis-project-graph.js project -- no AI model, no network call. Deliberately scoped
    // to STORY-level checks only; see js/ibis-project-qc.js's own header for why PRODUCTION/
    // TECHNICAL QC are not claimed.
    id:'ibis-local-project-qc',name:'ibis local project QC (client-side, no model)',categories:['text'],capabilities:['QC'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus:'LIVE',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:true,costToIbis:'ZERO_COST_TO_IBIS',
    website:null,apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPLICABLE_FTN_OWNED_CODE_NO_THIRD_PARTY_MODEL',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_NO_MODEL',sourceAvailable:'YES_FTN_OWNED_js/ibis-project-qc.js',selfHostable:true,deploymentMethod:'BROWSER_CLIENT_SIDE_JAVASCRIPT_NO_SERVER',hardwareRequirements:'NONE_RUNS_ANYWHERE_JS_RUNS',verificationSource:'js/ibis-project-qc.js and tests/ibis-project-qc-audit.mjs (this repository)',
    lifecycleState:'ELIGIBLE',
    note:'Checks real project-graph asset state (stage completeness, runtime-target match, continuity-check presence) and returns the directive\'s own status vocabulary -- READY_FOR_REVIEW or NOT_READY_ISSUES_REQUIRE_ATTENTION. Never claims a capability is ready when the underlying assets do not exist.'
  },
  {
    // Phase 7 provider activation: real, deterministic, zero-cost procedural instrumental
    // synthesis -- see js/ibis-music-engine.js. Deliberately independent of js/ftn-fire.js's
    // browser-only WebAudio engine (still documented separately, still not adapter-connected --
    // see ftn-fire-local-procedural below) so that a genuinely testable, Node-verifiable route
    // exists without waiting on browser verification. Real execution test:
    // tests/ibis-music-engine-audit.mjs generates actual audio for all 4 styles, WAV-encodes it,
    // decodes the bytes back and verifies header correctness, non-silence, no clipping,
    // determinism and genuine rhythmic distinctness between styles.
    id:'ibis-local-music-engine',name:'ibis local music engine (client-side, no model)',categories:['instrumental'],capabilities:['INSTRUMENTAL_GENERATION'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus:'LIVE',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:true,costToIbis:'ZERO_COST_TO_IBIS',
    website:null,apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPLICABLE_FTN_OWNED_CODE_NO_THIRD_PARTY_MODEL',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_NO_MODEL',sourceAvailable:'YES_FTN_OWNED_js/ibis-music-engine.js',selfHostable:true,deploymentMethod:'BROWSER_OR_NODE_PURE_JAVASCRIPT_NO_AUDIOCONTEXT_NO_SERVER',hardwareRequirements:'NONE_RUNS_ANYWHERE_JS_RUNS',verificationSource:'js/ibis-music-engine.js and tests/ibis-music-engine-audit.mjs (this repository)',
    lifecycleState:'ELIGIBLE',
    note:'Four real, distinct 16-step rhythmic patterns (soca/reggae/dancehall/calypso) via pure additive synthesis (sine/triangle oscillators, noise bursts, real exponential envelopes) -- not a claim of production-grade genre authenticity, a claim of genuinely distinct, deterministic, testable output per named style. No AudioContext dependency, so it runs and is verifiable in both the browser and this repository\'s Node-based CI, unlike ftn-fire-local-procedural.'
  },
  {
    // Phase 7 provider activation: the SFX_GENERATION capability had zero providers of any kind
    // (the taxonomy itself had no SFX entry until this pass). Real procedural synthesis of four
    // named effect shapes, reusing ibis-music-engine's own synthesis primitives (no duplicated
    // DSP code) and WAV encoder. tests/ibis-sfx-engine-audit.mjs generates real audio for all 4
    // presets and verifies the same real properties as the music engine test.
    id:'ibis-local-sfx-engine',name:'ibis local SFX engine (client-side, no model)',categories:['sample'],capabilities:['SFX_GENERATION'],integration:'LOCAL_DETERMINISTIC_NO_PROVIDER',
    apiStatus:'LIVE',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:true,costToIbis:'ZERO_COST_TO_IBIS',
    website:null,apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPLICABLE_FTN_OWNED_CODE_NO_THIRD_PARTY_MODEL',redistribution:'NOT_APPLICABLE',lastVerified:'2026-08-21',
    userAuthorizationRequired:false,
    weightsAvailable:'NOT_APPLICABLE_NO_MODEL',sourceAvailable:'YES_FTN_OWNED_js/ibis-sfx-engine.js',selfHostable:true,deploymentMethod:'BROWSER_OR_NODE_PURE_JAVASCRIPT_NO_AUDIOCONTEXT_NO_SERVER',hardwareRequirements:'NONE_RUNS_ANYWHERE_JS_RUNS',verificationSource:'js/ibis-sfx-engine.js and tests/ibis-sfx-engine-audit.mjs (this repository)',
    lifecycleState:'ELIGIBLE',
    note:'Four fixed, real, deterministic effect presets (chime/riser/blip/thud) -- honestly scoped as procedural synthesis of specific named shapes, not a generative model that can synthesize an arbitrary text-described sound (that would need a real audio-generation model this environment cannot deploy).'
  },
  {
    // Phase 7 LIP_SYNC research: license-checked directly against the official repository, not an
    // aggregator. Explicitly, unambiguously commercial-use-prohibited by its own README --
    // correctly ineligible regardless of any infrastructure question.
    id:'wav2lip',name:'Wav2Lip',categories:['video'],capabilities:['LIP_SYNC'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'NOT_APPLICABLE_LICENSE_BLOCKS_USE',
    website:'https://github.com/Rudrabha/Wav2Lip',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'EXPLICITLY_PROHIBITED_BY_OFFICIAL_README',redistribution:'NOT_APPROVED',lastVerified:'2026-08-21',
    weightsAvailable:'YES_BUT_NONCOMMERCIAL',sourceAvailable:'YES_GITHUB_RUDRABHA',selfHostable:true,deploymentMethod:'PYTHON_SELF_HOST_GPU',hardwareRequirements:'GPU_LIKELY_REQUIRED_NOT_QUANTIFIED_BY_PRIMARY_SOURCE',verificationSource:'https://github.com/Rudrabha/Wav2Lip',
    lifecycleState:'BLOCKED',
    note:'The official README states plainly: "any form of commercial use is strictly prohibited" and directs commercial requests to the authors\' separate paid Sync Labs service. LICENSE_BLOCKED, not evaluated for infrastructure feasibility since the license gate alone is disqualifying -- exactly the "do not assume open source = commercially unrestricted" discipline the directive requires.'
  },
  {
    // A real, better-licensed alternative found in the same research pass -- recorded honestly
    // rather than stopping at the first (disqualified) candidate.
    id:'sadtalker',name:'SadTalker',categories:['video'],capabilities:['LIP_SYNC'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/OpenTalker/SadTalker',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'VERIFIED_APACHE_2_0_COMMERCIAL_USE_PERMITTED',redistribution:'APACHE_2_0_PERMITS_REDISTRIBUTION',lastVerified:'2026-08-21',
    weightsAvailable:'YES_APACHE_2_0_VERIFIED_ON_OFFICIAL_REPOSITORY',sourceAvailable:'YES_GITHUB_OPENTALKER',selfHostable:true,deploymentMethod:'PYTHON_SELF_HOST_GPU',hardwareRequirements:'GPU_REQUIRED_3D_FACE_RENDERING_PIPELINE_EXACT_VRAM_NOT_QUANTIFIED_BY_PRIMARY_SOURCE',verificationSource:'https://github.com/OpenTalker/SadTalker',
    lifecycleState:'LICENSE_VERIFIED',
    note:'Official repository confirms the non-commercial restriction was explicitly removed and the project relicensed to Apache 2.0 -- a real, commercially-usable candidate, unlike Wav2Lip. Still WOULD_REQUIRE_IBIS_COMPUTE_SPEND: a talking-head/3D-face-rendering pipeline genuinely needs a GPU this environment does not have. Correctly ineligible pending a founder-budgeted GPU decision, not a license problem.'
  },
  {
    // Phase 11 (2026-08-21) LIP_SYNC re-investigation: the master directive asked whether newer,
    // better-licensed alternatives to Wav2Lip/SadTalker exist. Both found here are real, current,
    // and commercially usable -- recorded honestly alongside sadtalker rather than replacing it,
    // since IBIS should have real model-level failover once any of these becomes eligible.
    id:'musetalk',name:'MuseTalk (TMElyralab)',categories:['video'],capabilities:['LIP_SYNC'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/TMElyralab/MuseTalk',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'MIT_LICENSE_CODE_COMMERCIALLY_USABLE_MODEL',redistribution:'MIT_PERMITS_REDISTRIBUTION',lastVerified:'2026-08-21',
    weightsAvailable:'YES_HUGGING_FACE_TMELYRALAB',sourceAvailable:'YES_GITHUB_TMELYRALAB',selfHostable:true,deploymentMethod:'PYTHON_SELF_HOST_GPU',hardwareRequirements:'GPU_REQUIRED_MINIMUM_TESTED_4GB_VRAM_RTX_3050_TI_LAPTOP_FP16_ABOUT_5MIN_PER_8S_CLIP_TRUE_30FPS_REALTIME_NEEDS_TESLA_V100_CLASS',verificationSource:'https://github.com/TMElyralab/MuseTalk (MIT LICENSE file); real-time/VRAM figures from the project\'s own README and arXiv paper (2410.10122)',
    lifecycleState:'LICENSE_VERIFIED',
    note:'MIT licensed, real-time-capable (30fps+ on a Tesla V100-class GPU) latent-space lip-sync, with the lowest confirmed minimum VRAM of any lip-sync candidate researched (4GB, tested on a laptop RTX 3050 Ti, though far from real-time at that tier -- ~5 minutes for an 8-second clip in fp16). Still WOULD_REQUIRE_IBIS_COMPUTE_SPEND: this machine has no NVIDIA GPU and no Python, so even the lightest tested configuration is out of reach here. A genuinely better candidate than SadTalker if/when a founder approves GPU infrastructure, given the real-time headroom.'
  },
  {
    id:'latentsync',name:'LatentSync (ByteDance)',categories:['video'],capabilities:['LIP_SYNC'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND',
    website:'https://github.com/bytedance/LatentSync',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'VERIFIED_APACHE_2_0_COMMERCIAL_USE_PERMITTED',redistribution:'APACHE_2_0_PERMITS_REDISTRIBUTION',lastVerified:'2026-08-21',
    weightsAvailable:'YES_HUGGING_FACE_BYTEDANCE',sourceAvailable:'YES_GITHUB_BYTEDANCE',selfHostable:true,deploymentMethod:'PYTHON_DIFFUSERS_SELF_HOST_GPU',hardwareRequirements:'GPU_REQUIRED_V1_5_ABOUT_8GB_VRAM_INFERENCE_V1_6_ABOUT_18GB',verificationSource:'https://github.com/bytedance/LatentSync/blob/main/LICENSE; project README for VRAM figures',
    lifecycleState:'LICENSE_VERIFIED',
    note:'Apache 2.0, diffusion-based (Stable-Diffusion-derived) lip-sync at 512px resolution -- the highest visual-quality candidate researched, at a real VRAM cost (v1.5 ~8GB, the newer v1.6 ~18GB) higher than MuseTalk\'s real-time tier but still well below SadTalker\'s unquantified 3D-rendering pipeline. Same hardware blocker as every other entry in this group. The three LIP_SYNC self-host candidates now form a real quality/speed/VRAM spread (MuseTalk: fastest/lowest-VRAM/real-time-capable; LatentSync: highest fidelity; SadTalker: full head-motion via 3DMM) for a founder to choose from once GPU infrastructure is ever budgeted -- not a single arbitrary pick.'
  }
];
// Phase 4A additive schema (routing config gap closed): no provider row above declares a
// timeout/retry policy or a privacy/attribution classification -- rather than hand-stamping the
// same value onto 34 object literals, one small default-filling pass runs at read time, here, the
// single place every accessor already goes through. A future entry that DOES have a real reason
// to differ (e.g. a slower provider needing a longer timeout) can still set its own value
// directly on the object literal above; this only fills in what's genuinely unset.
var DEFAULT_TIMEOUT_MS=20000; // matches the one proven, deployed timeout (supabase/functions/ibis-query)
function withDefaults(p){
  return Object.assign({
    timeoutMs:DEFAULT_TIMEOUT_MS,
    // Local/deterministic providers never leave the browser and never see the raw prompt/content
    // leave FTN's control; everything else is a third-party network call and is classified
    // THIRD_PARTY_NETWORK_CALL by default until a real per-provider review says otherwise.
    privacyClassification:p.integration==='LOCAL_DETERMINISTIC_NO_PROVIDER'?'LOCAL_NO_EXTERNAL_TRANSMISSION':'THIRD_PARTY_NETWORK_CALL',
    attributionRequired:p.integration!=='LOCAL_DETERMINISTIC_NO_PROVIDER',
  },p);
}
global.FTN=global.FTN||{};
global.FTN.IbisProviders={all:function(){return providers.map(withDefaults);},byCategory:function(category){return providers.filter(function(p){return p.categories.indexOf(category)>=0;}).map(withDefaults);},byCapability:function(capability){return providers.filter(function(p){return(p.capabilities||[]).indexOf(capability)>=0;}).map(withDefaults);},get:function(id){var p=providers.filter(function(x){return x.id===id;})[0];return p?withDefaults(p):null;},verifiedAt:VERIFIED};
})(window);
