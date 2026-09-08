// FTN Platform — discovery catalog for external/open/free ibis faculties.
// IMPORTANT: catalog membership does NOT mean an integration is live. Routing must only execute
// providers whose integrationState is LIVE. Free tiers/credits change; verify at use.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  var VERIFIED_AT='2026-09-07';
  var rows=[
    // MUSIC / AUDIO CREATION
    {id:'ace-step-1-5',name:'ACE-Step 1.5',kind:'OPEN_MODEL',category:'MUSIC',capabilities:['MUSIC_GENERATE','LYRICS_TO_SONG','VOCAL_MUSIC','COVER','REPAINT','AUDIO_TO_AUDIO','LORA_TRAIN'],access:'SELF_HOST_FREE',license:'Apache-2.0',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'stable-audio-3',name:'Stable Audio 3.0 Open Weights',kind:'OPEN_MODEL',category:'MUSIC',capabilities:['MUSIC_GENERATE','SFX_GENERATE','AUDIO_VARIATION','AUDIO_EDIT'],access:'SELF_HOST_FREE_UNDER_COMMUNITY_LICENSE',license:'Stability AI Community License',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'musicgen',name:'AudioCraft / MusicGen',kind:'OPEN_MODEL',category:'MUSIC',capabilities:['MUSIC_GENERATE','MELODY_CONDITION','STYLE_CONDITION'],access:'SELF_HOST',license:'CHECK_MODEL_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'yue',name:'YuE',kind:'OPEN_MODEL',category:'MUSIC',capabilities:['LYRICS_TO_SONG','VOCAL_MUSIC','MULTILINGUAL_SONG'],access:'SELF_HOST',license:'CHECK_MODEL_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'diffrhythm',name:'DiffRhythm',kind:'OPEN_MODEL',category:'MUSIC',capabilities:['LYRICS_TO_SONG','FULL_SONG_GENERATE'],access:'SELF_HOST',license:'CHECK_MODEL_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'musicgpt',name:'MusicGPT',kind:'HOSTED_API',category:'MUSIC',capabilities:['MUSIC_GENERATE','VOCAL_MUSIC','SFX_GENERATE','TTS','REMIX','EXTEND_AUDIO','INPAINT_AUDIO','STEM_EXTRACT','AUDIO_ENHANCE'],access:'FREE_TIER_PLUS_PAID_API',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'treblo',name:'Treblo / Melodia',kind:'HOSTED_API',category:'MUSIC',capabilities:['MUSIC_GENERATE','STREAM_MUSIC_GENERATE','WEBHOOK_GENERATION'],access:'FREE_TRIAL_PLUS_PAID_API',freePolicy:'VERIFY_AT_USE',attributionRequired:true,licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'mureka',name:'Mureka',kind:'HOSTED_API',category:'MUSIC',capabilities:['MUSIC_GENERATE','VOCAL_MUSIC','STEM_EXTRACT'],access:'PAID_API_WITH_CONSUMER_FREE_TIER',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'airmusic',name:'AirMusic',kind:'HOSTED_SERVICE',category:'MUSIC',capabilities:['MUSIC_GENERATE','LYRICS_TO_SONG','EXTEND_AUDIO','COVER','REMIX','VOICE_CLONE','MUSIC_VIDEO'],access:'FREE_TIER_PLUS_PAID',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P2',verifiedAt:VERIFIED_AT},

    // AUDIO POST / SPEECH / MUSIC ANALYSIS
    {id:'demucs',name:'Demucs',kind:'OPEN_TOOL',category:'AUDIO',capabilities:['STEM_SEPARATE'],access:'SELF_HOST_FREE',license:'CHECK_REPO_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'whisper',name:'Whisper / faster-whisper',kind:'OPEN_MODEL',category:'SPEECH',capabilities:['TRANSCRIBE','LANGUAGE_DETECT','CAPTION'],access:'SELF_HOST_FREE',license:'CHECK_IMPLEMENTATION_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'kokoro',name:'Kokoro',kind:'OPEN_MODEL',category:'SPEECH',capabilities:['TTS'],access:'SELF_HOST_FREE',license:'Apache-2.0',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'f5-tts',name:'F5-TTS',kind:'OPEN_MODEL',category:'SPEECH',capabilities:['TTS','VOICE_CLONE'],access:'SELF_HOST',license:'CHECK_MODEL_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'fish-speech',name:'Fish Speech',kind:'OPEN_MODEL',category:'SPEECH',capabilities:['TTS','VOICE_CLONE','DIALOGUE_VOICE'],access:'SELF_HOST',license:'CHECK_MODEL_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'piper',name:'Piper',kind:'OPEN_MODEL',category:'SPEECH',capabilities:['TTS_EDGE'],access:'SELF_HOST_FREE',license:'CHECK_REPO_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'basic-pitch',name:'Basic Pitch',kind:'OPEN_TOOL',category:'MUSIC_ANALYSIS',capabilities:['AUDIO_TO_MIDI','PITCH_TRANSCRIBE'],access:'SELF_HOST_FREE',license:'CHECK_REPO_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},

    // IMAGE
    {id:'flux-schnell',name:'FLUX.1 schnell',kind:'OPEN_MODEL',category:'IMAGE',capabilities:['IMAGE_GENERATE'],access:'SELF_HOST_FREE',license:'Apache-2.0',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'stable-diffusion',name:'Stable Diffusion family',kind:'OPEN_MODEL',category:'IMAGE',capabilities:['IMAGE_GENERATE','IMAGE_EDIT','INPAINT','OUTPAINT','CONTROL_IMAGE'],access:'SELF_HOST_FREE_UNDER_MODEL_LICENSE',license:'Stability AI Community License / checkpoint-specific',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'qwen-image',name:'Qwen Image family',kind:'OPEN_MODEL',category:'IMAGE',capabilities:['IMAGE_GENERATE','IMAGE_EDIT','TEXT_IN_IMAGE'],access:'SELF_HOST',license:'CHECK_MODEL_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'comfyui',name:'ComfyUI',kind:'OPEN_ORCHESTRATOR',category:'CREATIVE_WORKFLOW',capabilities:['IMAGE_PIPELINE','VIDEO_PIPELINE','AUDIO_PIPELINE','MODEL_GRAPH','CUSTOM_NODE_WORKFLOW'],access:'SELF_HOST_FREE',license:'GPL-3.0',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},

    // VIDEO
    {id:'wan-2-2',name:'Wan 2.2',kind:'OPEN_MODEL',category:'VIDEO',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO','VIDEO_GENERATE'],access:'SELF_HOST',license:'CHECK_MODEL_VARIANT_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'ltx-video',name:'LTX Video / LTX-2.x',kind:'OPEN_WEIGHT_MODEL',category:'VIDEO',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO','VIDEO_GENERATE','AUDIO_VIDEO_GENERATE'],access:'SELF_HOST',license:'LTX Community License',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'hunyuan-video',name:'HunyuanVideo',kind:'OPEN_WEIGHT_MODEL',category:'VIDEO',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO'],access:'SELF_HOST',license:'CHECK_MODEL_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'cogvideox',name:'CogVideoX',kind:'OPEN_WEIGHT_MODEL',category:'VIDEO',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO'],access:'SELF_HOST',license:'COGVIDEOX_MODEL_LICENSE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P2',verifiedAt:VERIFIED_AT},
    {id:'google-flow',name:'Google Flow',kind:'HOSTED_CREATIVE_SERVICE',category:'VIDEO',capabilities:['VIDEO_GENERATE','VIDEO_EDIT','IMAGE_GENERATE','IMAGE_EDIT','REFERENCE_TO_VIDEO','CAMERA_CONTROL','SCENE_BUILD','CREATIVE_AGENT'],access:'HOSTED_FREE_OR_CREDIT_AVAILABILITY_VERIFY_AT_USE',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'runway',name:'Runway',kind:'HOSTED_CREATIVE_API',category:'VIDEO',capabilities:['VIDEO_GENERATE','VIDEO_EDIT','IMAGE_GENERATE','IMAGE_EDIT','AUDIO_GENERATE','CREATIVE_WORKFLOW'],access:'FREE_TIER_OR_CREDITS_PLUS_PAID',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'openart',name:'OpenArt',kind:'HOSTED_CREATIVE_SERVICE',category:'CREATIVE_WORKFLOW',capabilities:['IMAGE_GENERATE','IMAGE_EDIT','VIDEO_GENERATE','VIDEO_EDIT','MULTI_MODEL_CREATIVE'],access:'FREE_CREDITS_PLUS_PAID',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},

    // 3D / DESIGN / PRODUCTION
    {id:'blender',name:'Blender',kind:'OPEN_TOOL',category:'3D',capabilities:['3D_MODEL','3D_ANIMATE','RENDER','COMPOSITE','VIDEO_EDIT'],access:'SELF_HOST_FREE',license:'GPL',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'ffmpeg',name:'FFmpeg',kind:'OPEN_TOOL',category:'MEDIA_PROCESSING',capabilities:['TRANSCODE','MUX','DEMUX','AUDIO_CONVERT','VIDEO_CONVERT','FRAME_EXTRACT','MEDIA_ASSEMBLE'],access:'SELF_HOST_FREE',license:'LGPL/GPL_BUILD_DEPENDENT',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'obs',name:'OBS Studio',kind:'OPEN_TOOL',category:'MEDIA_PRODUCTION',capabilities:['SCREEN_CAPTURE','RECORD','STREAM','SCENE_MIX','AUDIO_ROUTE'],access:'SELF_HOST_FREE',license:'GPL-2.0',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},

    // RESEARCH / MODEL GATEWAYS
    {id:'perplexity',name:'Perplexity',kind:'HOSTED_RESEARCH_API',category:'RESEARCH',capabilities:['WEB_RESEARCH','GROUNDED_ANSWER','DEEP_RESEARCH','CITATION_RETRIEVE'],access:'PAID_API_OR_ACCOUNT_TIER',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'openrouter',name:'OpenRouter',kind:'MODEL_GATEWAY',category:'MODEL_ROUTING',capabilities:['MULTI_MODEL_ROUTE','MODEL_FALLBACK','COST_ROUTE','LATENCY_ROUTE','PRIVACY_ROUTE'],access:'FREE_MODELS_PLUS_PAID_MODELS',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'huggingface-inference',name:'Hugging Face Inference Providers',kind:'MODEL_GATEWAY',category:'MODEL_ROUTING',capabilities:['MULTI_MODEL_INFERENCE','PROVIDER_ROUTE','OPEN_MODEL_ACCESS'],access:'FREE_ALLOWANCE_PLUS_PAID',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'groq',name:'Groq',kind:'MODEL_INFERENCE',category:'MODEL_ROUTING',capabilities:['FAST_LLM_INFERENCE','OPEN_MODEL_INFERENCE'],access:'FREE_DEVELOPER_ALLOWANCE_OR_PAID_VERIFY_AT_USE',freePolicy:'VERIFY_AT_USE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},

    // LOCAL MODEL / COMPUTER AGENCY
    {id:'ollama',name:'Ollama',kind:'OPEN_RUNTIME',category:'LOCAL_AI',capabilities:['LOCAL_LLM','LOCAL_VISION_MODEL','LOCAL_EMBEDDINGS'],access:'SELF_HOST_FREE',license:'MIT',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'llama-cpp',name:'llama.cpp',kind:'OPEN_RUNTIME',category:'LOCAL_AI',capabilities:['LOCAL_LLM','LOCAL_EMBEDDINGS'],access:'SELF_HOST_FREE',license:'MIT',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'vllm',name:'vLLM',kind:'OPEN_RUNTIME',category:'LOCAL_AI',capabilities:['LOCAL_LLM_SERVER','BATCH_INFERENCE'],access:'SELF_HOST_FREE',license:'Apache-2.0',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'open-interpreter',name:'Open Interpreter',kind:'OPEN_AGENT_RUNTIME',category:'COMPUTER_USE',capabilities:['DESKTOP_CONTROL','FILE_CONTROL','BROWSER_CONTROL','LOCAL_TOOL_EXECUTION'],access:'SELF_HOST_FREE',license:'Apache-2.0',licenseReviewRequired:false,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'browser-use',name:'browser-use',kind:'OPEN_AGENT_RUNTIME',category:'COMPUTER_USE',capabilities:['BROWSER_CONTROL','FORM_FILL','WEB_TASK_EXECUTION'],access:'SELF_HOST_FREE',license:'VERIFY_REPO_LICENSE',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},

    // OPEN DATA / MAP / TRANSLATION FACULTIES
    {id:'openstreetmap',name:'OpenStreetMap + Leaflet',kind:'OPEN_DATA_TOOL',category:'GEO',capabilities:['MAP_RENDER','GEO_CONTEXT','ROUTE_VISUALIZE'],access:'OPEN_DATA_FREE_WITH_USAGE_POLICIES',license:'ODbL / BSD-2-Clause Leaflet',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P0',verifiedAt:VERIFIED_AT},
    {id:'open-meteo',name:'Open-Meteo',kind:'OPEN_DATA_API',category:'WEATHER',capabilities:['WEATHER_FORECAST','HISTORICAL_WEATHER','CLIMATE_DATA'],access:'FREE_NONCOMMERCIAL_AND_PAID_OPTIONS_VERIFY_TERMS',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P1',verifiedAt:VERIFIED_AT},
    {id:'libretranslate',name:'LibreTranslate',kind:'OPEN_TOOL',category:'TRANSLATION',capabilities:['TRANSLATE'],access:'SELF_HOST_FREE',license:'AGPL-3.0',licenseReviewRequired:true,integrationState:'CANDIDATE',priority:'P2',verifiedAt:VERIFIED_AT}
  ];
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function all(){return rows.map(clone);}
  function byCategory(category){return rows.filter(function(x){return x.category===category;}).map(clone);}
  function byCapability(cap){return rows.filter(function(x){return x.capabilities.indexOf(cap)>=0;}).map(clone);}
  function freeOrOpen(){return rows.filter(function(x){return /FREE|OPEN|SELF_HOST/.test(String(x.access||''))||x.kind.indexOf('OPEN_')===0;}).map(clone);}
  function executable(){return rows.filter(function(x){return x.integrationState==='LIVE';}).map(clone);}
  FTN.ExternalCapabilityCatalog={all:all,byCategory:byCategory,byCapability:byCapability,freeOrOpen:freeOrOpen,executable:executable,verifiedAt:VERIFIED_AT};
})(typeof window!=='undefined'?window:globalThis);
