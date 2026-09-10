// FTN Platform — ibis Bytez universal capability/orchestration contract.
// Bytez is treated as a broad execution substrate, not a single video provider.
// IMPORTANT: capability declarations are routing intents only. A task/model is executable only
// after runtime discovery, licensing review, provider health, and E2E proof. Unverified routes fail closed.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};

  var BYTEZ_TASKS={
    TEXT:['chat','text-generation','text2text-generation','summarization','translation','question-answering','text-classification','zero-shot-classification','token-classification','fill-mask'],
    IMAGE:['text-to-image','unconditional-image-generation','image-to-text','image-classification','image-feature-extraction','image-segmentation','mask-generation','object-detection','zero-shot-image-classification','zero-shot-object-detection','depth-estimation'],
    AUDIO:['automatic-speech-recognition','text-to-speech','text-to-audio','audio-classification'],
    VIDEO:['text-to-video','video-classification','video-text-to-text'],
    MULTIMODAL:['visual-question-answering','image-text-to-text','document-question-answering'],
    EMBEDDINGS:['feature-extraction','sentence-similarity']
  };

  // High-level IBIS actions compose multiple proven Bytez/FTN capabilities.
  // These are workflows, not claims that Bytez exposes a one-call "movie" or "song" endpoint.
  var WORKFLOWS={
    SONG:{
      id:'song',
      stages:['concept','lyrics','music_or_audio_generation','voice_or_vocal_generation','mix_or_dsp','metadata','cover_art','caption_or_lyric_assets','export'],
      bytezTasks:['chat','text-generation','text-to-audio','text-to-speech','audio-classification','text-to-image'],
      status:'ORCHESTRATION_AWAITING_E2E'
    },
    MUSIC_VIDEO:{
      id:'music_video',
      stages:['treatment','storyboard','image_generation','video_generation','audio_sync','captions','assembly','render','export'],
      bytezTasks:['chat','text-to-image','text-to-video','image-to-text','video-text-to-text','automatic-speech-recognition'],
      status:'ORCHESTRATION_AWAITING_E2E'
    },
    SHORT_FILM:{
      id:'short_film',
      stages:['script','shot_plan','character_and_scene_assets','video_generation','voiceover','sfx_or_audio','continuity_check','captions','edit','render','export'],
      bytezTasks:['chat','text-generation','text-to-image','text-to-video','text-to-speech','text-to-audio','video-text-to-text','automatic-speech-recognition'],
      status:'ORCHESTRATION_AWAITING_E2E'
    },
    MOVIE:{
      id:'movie',
      stages:['story_bible','screenplay','scene_breakdown','asset_bible','shot_generation','voice_and_audio','continuity_and_qc','assembly','captions','render','export'],
      bytezTasks:['chat','text-generation','text-to-image','text-to-video','text-to-speech','text-to-audio','image-text-to-text','video-text-to-text','automatic-speech-recognition'],
      status:'ORCHESTRATION_AWAITING_E2E'
    },
    CREATIVE_STUDIO:{
      id:'creative_studio',
      stages:['intent','model_discovery','generation','validation','provenance','download_or_publish'],
      bytezTasks:['chat','text-generation','text-to-image','text-to-video','text-to-speech','text-to-audio'],
      status:'ROUTING_CONTRACT_READY'
    }
  };

  function allTasks(){
    var out=[];
    Object.keys(BYTEZ_TASKS).forEach(function(group){ BYTEZ_TASKS[group].forEach(function(task){ if(out.indexOf(task)<0)out.push(task); }); });
    return out;
  }

  function normalizeCapability(name){
    return String(name||'').trim().toLowerCase().replace(/[\s_]+/g,'-');
  }

  function taskCandidates(capability){
    var c=normalizeCapability(capability);
    var aliases={
      'generate-text':['chat','text-generation','text2text-generation'],
      'write':['chat','text-generation'],
      'generate-image':['text-to-image'],
      'image':['text-to-image'],
      'transcribe':['automatic-speech-recognition'],
      'speech-to-text':['automatic-speech-recognition'],
      'voice':['text-to-speech'],
      'text-to-speech':['text-to-speech'],
      'generate-audio':['text-to-audio'],
      'sound-effect':['text-to-audio'],
      'generate-video':['text-to-video'],
      'video':['text-to-video'],
      'describe-video':['video-text-to-text','video-classification'],
      'describe-image':['image-text-to-text','image-to-text'],
      'embedding':['feature-extraction'],
      'similarity':['sentence-similarity'],
      'document-qa':['document-question-answering']
    };
    return (aliases[c]||[c]).filter(function(x){return allTasks().indexOf(x)>=0;});
  }

  function workflow(name){
    var key=String(name||'').trim().toUpperCase().replace(/[\s-]+/g,'_');
    return WORKFLOWS[key]?JSON.parse(JSON.stringify(WORKFLOWS[key])):null;
  }

  function executionPolicy(){
    return {
      provider:'bytez',
      preferredFor:['free_open_model_execution','broad_model_discovery','multimodal_execution'],
      requireRuntimeDiscovery:true,
      requireProviderHealth:true,
      requireLicenseReview:true,
      requireE2EProofBeforeClaim:true,
      closedProviderModelsRequireSeparateAuthorization:true,
      paidFallbackAllowed:false,
      autoTopUpAllowed:false,
      failClosed:true,
      secretStorage:'SERVER_SIDE_ONLY',
      perUserBYOKTarget:true
    };
  }

  FTN.BytezCapabilityOrchestrator={
    tasks:JSON.parse(JSON.stringify(BYTEZ_TASKS)),
    workflows:JSON.parse(JSON.stringify(WORKFLOWS)),
    allTasks:allTasks,
    taskCandidates:taskCandidates,
    workflow:workflow,
    executionPolicy:executionPolicy
  };
})(typeof window!=='undefined'?window:globalThis);
