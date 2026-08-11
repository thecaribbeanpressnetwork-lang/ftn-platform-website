// ibis Creative Studio provider evidence. Public facts only: credentials, private unit costs,
// affiliate IDs and enablement remain server-side. No generic provider URL is an FTN affiliate link.
(function(global){
'use strict';
var VERIFIED='2026-08-10';
var providers=[
  {
    id:'pixverse',name:'PixVerse',categories:['image','video'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,
    website:'https://pixverse.ai/en',apiUrl:'https://docs.platform.pixverse.ai/',pricingUrl:'https://docs.platform.pixverse.ai/pricing-796039m0',affiliateProgramUrl:'https://pixverse.ai/en/affiliate',
    commercialUse:'REQUIRES_CONTRACT_AND_OUTPUT_TERMS_REVIEW',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    note:'Official API and affiliate programme exist. API generation is disabled until FTN has an approved account, customer-funded credits and completed output-rights review. The public programme link is not an FTN affiliate link.'
  },
  {
    id:'kling',name:'Kling AI',categories:['image','video'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,
    website:'https://app.klingai.com/global/',apiUrl:'https://kling.ai/document-api/guides/get-started/overview',pricingUrl:'https://kling.ai/dev/pricing',affiliateProgramUrl:'https://app.klingai.com/global/commission-share',
    commercialUse:'REQUIRES_CONTRACT_AND_OUTPUT_TERMS_REVIEW',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    note:'Official API and affiliate programme surfaces exist. Current API packages require pre-purchase, so Kling is not enabled for an FTN zero-upfront-cost launch.'
  },
  {
    id:'musicapi-producer',name:'MusicAPI Producer · Lyria 3 Pro',categories:['instrumental'],integration:'NATIVE_API_CANDIDATE',
    apiStatus:'VERIFIED',affiliateStatus:'VERIFIED_PROGRAM_NO_FTN_LINK',payAsYouGo:false,prepaidRequired:true,enabled:false,
    website:'https://musicapi.ai/producer-ai-api',apiUrl:'https://docs.musicapi.ai/',pricingUrl:'https://musicapi.ai/lyria-3-pro-pricing',affiliateProgramUrl:'https://musicapi.ai/affiliates',
    commercialUse:'PROVIDER_STATES_COMMERCIAL_RIGHTS_INCLUDED_TERMS_REVIEW_REQUIRED',redistribution:'PROVIDER_STATES_CUSTOMER_DELIVERY_ALLOWED_TERMS_REVIEW_REQUIRED',lastVerified:VERIFIED,
    note:'Official Producer API is 12 provider credits per task and supports instrumental prompts. The official affiliate programme advertises 30% lifetime commission. FTN has no approved API account or affiliate link configured, so both paths remain off.'
  },
  {
    id:'ace-step',name:'ACE-Step',categories:['instrumental'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,
    website:'https://github.com/ace-step/ACE-Step',apiUrl:null,pricingUrl:'https://github.com/ace-step/ACE-Step/blob/main/LICENSE',affiliateProgramUrl:null,
    commercialUse:'APACHE_2_CODE_AND_MODEL_CANDIDATE_REVIEW_REQUIRED',redistribution:'ORIGINALITY_AND_MODEL_RELEASE_REVIEW_REQUIRED',lastVerified:VERIFIED,
    note:'Official project and model card identify Apache 2.0 and support instrumental workflows. Self-hosting remains disabled until GPU cost, exact model version, safety, cultural-quality and release-rights testing pass.'
  },
  {
    id:'stable-audio-3',name:'Stable Audio 3',categories:['instrumental','sample'],integration:'SELF_HOST_CANDIDATE',
    apiStatus:'OPEN_MODEL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,
    website:'https://stability.ai/stable-audio',apiUrl:'https://platform.stability.ai/',pricingUrl:'https://stability.ai/license',affiliateProgramUrl:null,
    commercialUse:'CONDITIONAL_STABILITY_COMMUNITY_LICENSE',redistribution:'REQUIRES_LICENSE_REVIEW',lastVerified:VERIFIED,
    note:'Stability states that Small/Medium are open weights trained on licensed data and outputs may be commercialized under its Community License, with Enterprise licensing above its threshold. FTN deployment still needs exact-version and cost validation.'
  },
  {
    id:'musicgen',name:'MusicGen',categories:['instrumental'],integration:'RESEARCH_ONLY',
    apiStatus:'OPEN_MODEL_WEIGHTS_NONCOMMERCIAL',affiliateStatus:'NOT_APPLICABLE',payAsYouGo:false,prepaidRequired:false,enabled:false,
    website:'https://github.com/facebookresearch/audiocraft',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'NOT_APPROVED_FOR_FTN_CUSTOMER_OUTPUT',redistribution:'NOT_APPROVED',lastVerified:VERIFIED,
    note:'AudioCraft code and model weights have different licences. MusicGen is excluded from commercial FTN generation unless a later rights review establishes a permitted path.'
  },
  {
    id:'producer-ai',name:'Producer.ai',categories:['instrumental','production'],integration:'PARTNER_REVIEW',
    apiStatus:'UNVERIFIED',affiliateStatus:'UNVERIFIED',payAsYouGo:null,prepaidRequired:null,enabled:false,
    website:'https://producer.ai/',apiUrl:null,pricingUrl:null,affiliateProgramUrl:null,
    commercialUse:'UNVERIFIED',redistribution:'UNVERIFIED',lastVerified:VERIFIED,
    note:'Never automate a consumer login or subscription. FTN will integrate only after a permitted API, partner or referral arrangement and export rights are documented.'
  }
];
global.FTN=global.FTN||{};
global.FTN.IbisProviders={all:function(){return providers.map(function(p){return Object.assign({},p);});},byCategory:function(category){return providers.filter(function(p){return p.categories.indexOf(category)>=0;}).map(function(p){return Object.assign({},p);});},verifiedAt:VERIFIED};
})(window);
