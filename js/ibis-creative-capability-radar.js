// FTN Platform — creative/specialist discovery radar.
// Discovery only: NONE of these providers are executable merely by appearing here.
// Hosted free tiers and credits are volatile; verify pricing, rights, API availability and region at use.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  var VERIFIED_AT='2026-09-07';
  var rows=[
    // Hosted/free-credit creative capacity — opportunistic, never architectural dependencies.
    {id:'pika',name:'Pika',category:'VIDEO_AUDIO',access:'FREE_TIER_PLUS_PAID_API',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO','VIDEO_TO_VIDEO','VIDEO_EFFECT','MUSIC_GENERATE','SFX_GENERATE','TTS','SOUNDTRACK'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P0'},
    {id:'leonardo',name:'Leonardo AI',category:'IMAGE_VIDEO',access:'FREE_TIER_PLUS_PAID',capabilities:['IMAGE_GENERATE','IMAGE_EDIT','VIDEO_GENERATE','UPSCALE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'ideogram',name:'Ideogram',category:'IMAGE',access:'FREE_TIER_PLUS_PAID',capabilities:['IMAGE_GENERATE','TEXT_IN_IMAGE','DESIGN_IMAGE','TRANSPARENT_IMAGE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'recraft',name:'Recraft',category:'IMAGE_DESIGN',access:'FREE_TIER_PLUS_PAID',capabilities:['IMAGE_GENERATE','VECTOR_GENERATE','ICON_GENERATE','BRAND_STYLE','IMAGE_EDIT'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'luma-dream-machine',name:'Luma Dream Machine',category:'VIDEO_IMAGE',access:'FREE_TIER_PLUS_PAID',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO','IMAGE_GENERATE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'kling',name:'Kling AI',category:'VIDEO_IMAGE',access:'FREE_CREDIT_OR_TIER_VERIFY',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO','VIDEO_GENERATE','IMAGE_GENERATE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'hailuo',name:'Hailuo AI',category:'VIDEO',access:'FREE_CREDIT_OR_TIER_VERIFY',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P2'},
    {id:'pixverse',name:'PixVerse',category:'VIDEO',access:'FREE_CREDIT_OR_TIER_VERIFY',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO','VIDEO_EFFECT'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P2'},
    {id:'vidu',name:'Vidu',category:'VIDEO',access:'FREE_CREDIT_OR_TIER_VERIFY',capabilities:['TEXT_TO_VIDEO','IMAGE_TO_VIDEO','REFERENCE_TO_VIDEO'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P2'},
    {id:'higgsfield',name:'Higgsfield',category:'VIDEO',access:'FREE_CREDIT_OR_TIER_VERIFY',capabilities:['VIDEO_GENERATE','CAMERA_CONTROL','CHARACTER_VIDEO'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P2'},
    {id:'heygen',name:'HeyGen',category:'AVATAR_VIDEO',access:'FREE_TIER_PLUS_PAID',capabilities:['AVATAR_VIDEO','LIP_SYNC','TTS','VIDEO_TRANSLATE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'elevenlabs',name:'ElevenLabs',category:'SPEECH_AUDIO',access:'FREE_TIER_PLUS_PAID_API',capabilities:['TTS','VOICE_CLONE','SFX_GENERATE','DUB','TRANSCRIBE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P0'},
    {id:'kits-ai',name:'Kits AI',category:'SINGING_VOICE',access:'FREE_TIER_PLUS_PAID',capabilities:['VOICE_CONVERT','SINGING_VOICE','STEM_TOOLS'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P2'},
    {id:'synthesizer-v',name:'Synthesizer V',category:'SINGING_VOICE',access:'FREE_BASIC_OR_PAID_VERIFY',capabilities:['SINGING_SYNTHESIS','MIDI_TO_VOCAL'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P2'},
    {id:'uberduck',name:'Uberduck',category:'VOICE_MUSIC',access:'FREE_CREDIT_OR_TIER_VERIFY',capabilities:['TTS','RAP_GENERATE','VOICE_GENERATE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P2'},
    {id:'controlla-voice',name:'Controlla Voice',category:'SINGING_VOICE',access:'FREE_CREDIT_OR_TIER_VERIFY',capabilities:['SINGING_VOICE','VOICE_SWAP','CUSTOM_VOICE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P2'},

    // Open/self-host creative infrastructure.
    {id:'krita',name:'Krita',category:'DESIGN',access:'OPEN_SOURCE_SELF_HOST',capabilities:['RASTER_EDIT','PAINT','COMPOSITE'],status:'DISCOVERED',priority:'P1'},
    {id:'gimp',name:'GIMP',category:'DESIGN',access:'OPEN_SOURCE_SELF_HOST',capabilities:['RASTER_EDIT','IMAGE_COMPOSITE','BATCH_IMAGE'],status:'DISCOVERED',priority:'P1'},
    {id:'inkscape',name:'Inkscape',category:'DESIGN',access:'OPEN_SOURCE_SELF_HOST',capabilities:['VECTOR_EDIT','SVG_CREATE','LOGO_CREATE'],status:'DISCOVERED',priority:'P1'},
    {id:'kdenlive',name:'Kdenlive',category:'VIDEO_EDIT',access:'OPEN_SOURCE_SELF_HOST',capabilities:['VIDEO_EDIT','TIMELINE_EDIT','CAPTION','RENDER'],status:'DISCOVERED',priority:'P1'},
    {id:'audacity',name:'Audacity',category:'AUDIO_EDIT',access:'OPEN_SOURCE_SELF_HOST',capabilities:['AUDIO_EDIT','RECORD','LOUDNESS','PLUGIN_PROCESS'],status:'DISCOVERED',priority:'P1'},
    {id:'lmms',name:'LMMS',category:'MUSIC_PRODUCTION',access:'OPEN_SOURCE_SELF_HOST',capabilities:['DAW','MIDI_SEQUENCE','BEAT_BUILD','MIX'],status:'DISCOVERED',priority:'P2'},
    {id:'real-esrgan',name:'Real-ESRGAN',category:'IMAGE_ENHANCE',access:'OPEN_MODEL_SELF_HOST',capabilities:['IMAGE_UPSCALE','IMAGE_RESTORE'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P0'},
    {id:'gfpgan',name:'GFPGAN',category:'IMAGE_ENHANCE',access:'OPEN_MODEL_SELF_HOST',capabilities:['FACE_RESTORE','IMAGE_RESTORE'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P1'},
    {id:'codeformer',name:'CodeFormer',category:'IMAGE_ENHANCE',access:'OPEN_MODEL_SELF_HOST',capabilities:['FACE_RESTORE','IMAGE_RESTORE'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P1'},
    {id:'rembg',name:'rembg',category:'IMAGE_EDIT',access:'OPEN_SOURCE_SELF_HOST',capabilities:['BACKGROUND_REMOVE','SEGMENT_PERSON_OBJECT'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P0'},
    {id:'segment-anything',name:'Segment Anything',category:'VISION_EDIT',access:'OPEN_MODEL_SELF_HOST',capabilities:['IMAGE_SEGMENT','OBJECT_MASK'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P1'},
    {id:'rife',name:'RIFE',category:'VIDEO_PROCESS',access:'OPEN_MODEL_SELF_HOST',capabilities:['FRAME_INTERPOLATE','SLOW_MOTION'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P1'},
    {id:'musetalk',name:'MuseTalk',category:'AVATAR_VIDEO',access:'OPEN_MODEL_SELF_HOST',capabilities:['LIP_SYNC','TALKING_HEAD'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P2'},
    {id:'tripo-sr',name:'TripoSR',category:'3D',access:'OPEN_MODEL_SELF_HOST',capabilities:['IMAGE_TO_3D'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P2'},
    {id:'trellis',name:'TRELLIS',category:'3D',access:'OPEN_MODEL_SELF_HOST',capabilities:['IMAGE_TO_3D','TEXTURE_3D'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P2'},
    {id:'hunyuan3d',name:'Hunyuan3D',category:'3D',access:'OPEN_WEIGHT_SELF_HOST',capabilities:['TEXT_TO_3D','IMAGE_TO_3D'],status:'DISCOVERED_LICENSE_REVIEW',priority:'P2'},

    // Specialist open/free faculties ibis should be able to call when relevant.
    {id:'searxng',name:'SearXNG',category:'RESEARCH',access:'OPEN_SOURCE_SELF_HOST',capabilities:['META_SEARCH','WEB_SEARCH'],status:'DISCOVERED',priority:'P1'},
    {id:'wikidata',name:'Wikidata',category:'KNOWLEDGE_GRAPH',access:'OPEN_DATA',capabilities:['ENTITY_LOOKUP','RELATION_QUERY'],status:'DISCOVERED',priority:'P1'},
    {id:'world-bank-data',name:'World Bank Open Data',category:'ECONOMIC_DATA',access:'OPEN_DATA_API',capabilities:['MACRO_DATA','DEVELOPMENT_DATA'],status:'DISCOVERED',priority:'P0'},
    {id:'imf-data',name:'IMF Data',category:'ECONOMIC_DATA',access:'PUBLIC_DATA_VERIFY_API_TERMS',capabilities:['MACRO_DATA','FX_DATA','BALANCE_OF_PAYMENTS'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'fred',name:'FRED',category:'ECONOMIC_DATA',access:'FREE_API_WITH_KEY',capabilities:['MACRO_DATA','RATES','TIME_SERIES'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'duckdb',name:'DuckDB',category:'DATA_COMPUTE',access:'OPEN_SOURCE_SELF_HOST',capabilities:['SQL_ANALYSIS','LOCAL_DATA_QUERY','PARQUET_QUERY'],status:'DISCOVERED',priority:'P0'},
    {id:'polars',name:'Polars',category:'DATA_COMPUTE',access:'OPEN_SOURCE_SELF_HOST',capabilities:['DATAFRAME','ETL','FAST_ANALYTICS'],status:'DISCOVERED',priority:'P1'},
    {id:'scipy',name:'SciPy stack',category:'DATA_SCIENCE',access:'OPEN_SOURCE_SELF_HOST',capabilities:['STATISTICS','OPTIMIZATION','SIGNAL_PROCESS','NUMERICAL_METHODS'],status:'DISCOVERED',priority:'P0'},
    {id:'networkx',name:'NetworkX',category:'GRAPH_COMPUTE',access:'OPEN_SOURCE_SELF_HOST',capabilities:['GRAPH_ANALYSIS','CENTRALITY','PATH_FIND','COMMUNITY_DETECT'],status:'DISCOVERED',priority:'P0'},
    {id:'qgis',name:'QGIS',category:'GEO',access:'OPEN_SOURCE_SELF_HOST',capabilities:['GIS_ANALYSIS','SPATIAL_OVERLAY','RASTER_VECTOR','MAP_EXPORT'],status:'DISCOVERED',priority:'P1'},
    {id:'nominatim',name:'Nominatim',category:'GEO',access:'OPEN_SOURCE_OR_PUBLIC_SERVICE_WITH_POLICY',capabilities:['GEOCODE','REVERSE_GEOCODE'],status:'DISCOVERED_VERIFY_AT_USE',priority:'P1'},
    {id:'pandoc',name:'Pandoc',category:'DOCUMENT',access:'OPEN_SOURCE_SELF_HOST',capabilities:['DOC_CONVERT','MARKDOWN_CONVERT','PDF_PIPELINE'],status:'DISCOVERED',priority:'P1'},
    {id:'libreoffice',name:'LibreOffice',category:'DOCUMENT',access:'OPEN_SOURCE_SELF_HOST',capabilities:['DOC_EDIT','SPREADSHEET_EDIT','PRESENTATION_EDIT','PDF_EXPORT'],status:'DISCOVERED',priority:'P1'},
    {id:'playwright',name:'Playwright',category:'BROWSER_AUTOMATION',access:'OPEN_SOURCE_SELF_HOST',capabilities:['BROWSER_CONTROL','SCREENSHOT','FORM_FILL','WEB_TEST'],status:'DISCOVERED',priority:'P0'},
    {id:'scrcpy',name:'scrcpy',category:'DEVICE_CONTROL',access:'OPEN_SOURCE_SELF_HOST',capabilities:['ANDROID_SCREEN_CONTROL','ANDROID_INPUT'],status:'DISCOVERED',priority:'P2'},
    {id:'home-assistant',name:'Home Assistant',category:'IOT',access:'OPEN_SOURCE_SELF_HOST',capabilities:['SMART_DEVICE_CONTROL','AUTOMATION','SENSOR_READ'],status:'DISCOVERED',priority:'P2'}
  ].map(function(x){x.verifiedAt=VERIFIED_AT;return x;});
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function all(){return rows.map(clone);}
  function byCategory(c){return rows.filter(function(x){return x.category===c;}).map(clone);}
  function byCapability(c){return rows.filter(function(x){return x.capabilities.indexOf(c)>=0;}).map(clone);}
  function freeCandidates(){return rows.filter(function(x){return /FREE|OPEN|SELF_HOST/.test(x.access||'');}).map(clone);}
  FTN.CreativeCapabilityRadar={all:all,byCategory:byCategory,byCapability:byCapability,freeCandidates:freeCandidates,verifiedAt:VERIFIED_AT};
})(typeof window!=='undefined'?window:globalThis);
