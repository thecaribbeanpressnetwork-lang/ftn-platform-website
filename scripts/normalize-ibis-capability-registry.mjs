import fs from 'node:fs';

const path = new URL('../data/ibis-capability-registry.json', import.meta.url);
const registry = JSON.parse(fs.readFileSync(path, 'utf8'));

const additions = [
  ['openai-chatgpt','OpenAI / ChatGPT','Hosted model provider','Text, vision and structured model inference','https://platform.openai.com/docs','Commercial service; exact model terms apply','CANDIDATE','READ_ONLY'],
  ['anthropic-claude','Anthropic / Claude','Hosted model provider','Text, vision and document reasoning','https://docs.anthropic.com/','Commercial service; exact model terms apply','SOURCE_READY','READ_ONLY'],
  ['google-gemini','Google Gemini','Hosted model provider','Text, vision and multimodal reasoning','https://ai.google.dev/gemini-api/docs','Commercial service; exact model terms apply','SOURCE_READY','READ_ONLY'],
  ['perplexity','Perplexity','Research provider','Current web research with citations through an approved API','https://docs.perplexity.ai/','Commercial service; exact model terms apply','CANDIDATE','READ_ONLY'],
  ['apiqik','APIQIK','Hosted model aggregator','Optional routed model access','https://apiqik.com/','UNKNOWN_REQUIRES_PRIMARY_TERMS_REVIEW','DISCOVERY','READ_ONLY'],
  ['bytez','Bytez','Hosted model aggregator','Optional routed open-model access','https://docs.bytez.com/','Commercial service; per-model terms apply','DISCOVERY','READ_ONLY'],
  ['venice-ai','Venice AI','Hosted model provider','Optional privacy-positioned model access','https://docs.venice.ai/','Commercial service; per-model terms apply','DISCOVERY','READ_ONLY'],
  ['gemma-model-family','Gemma model family','Model family','Candidate local text and vision checkpoints','https://ai.google.dev/gemma/docs','REQUIRES_EXACT_CHECKPOINT_AND_GEMMA_TERMS_REVIEW','DISCOVERY','LOCAL_UI'],
  ['qwen-model-family','Qwen model family','Model family','Candidate local text and vision checkpoints','https://qwen.readthedocs.io/','REQUIRES_EXACT_CHECKPOINT_LICENCE_REVIEW','DISCOVERY','LOCAL_UI'],
  ['llama-model-family','Llama model family','Model family','Candidate local text and vision checkpoints','https://www.llama.com/docs/','REQUIRES_EXACT_CHECKPOINT_AND_LLAMA_TERMS_REVIEW','DISCOVERY','LOCAL_UI'],
  ['openf5-tts','OpenF5-TTS','Speech synthesis','Candidate local consented-voice synthesis','https://github.com/SWivid/F5-TTS','Apache-2.0 code; checkpoint/dataset terms separate','CANDIDATE','PRIVATE_DATA_REVIEW'],
  ['fish-speech','Fish Speech','Speech synthesis','Candidate multilingual local speech synthesis','https://github.com/fishaudio/fish-speech','Apache-2.0 code; checkpoint/dataset terms separate','CANDIDATE','PRIVATE_DATA_REVIEW'],
  ['piper-tts','Piper','Speech synthesis','Lightweight local text-to-speech fallback','https://github.com/OHF-Voice/piper1-gpl','GPL-3.0 code; voice model terms separate','CANDIDATE','LOCAL_UI'],
  ['vidrender','VidRender','Media rendering','Candidate programmatic video rendering service','https://vidrender.com/','UNKNOWN_REQUIRES_PRIMARY_TERMS_REVIEW','DISCOVERY','ASK_FOR_PUBLISHING'],
  ['pixverse','PixVerse','Creative media provider','Image and video generation for approved creative work','https://pixverse.ai/','Commercial service; output and input terms apply','CANDIDATE','ASK_FOR_PUBLISHING'],
  ['kling-ai','Kling AI','Creative media provider','Image-to-video and video generation','https://klingai.com/','Commercial service; output and input terms apply','CANDIDATE','ASK_FOR_PUBLISHING'],
  ['elevenlabs','ElevenLabs','Speech synthesis','Hosted consented-voice and narration generation','https://elevenlabs.io/docs','Commercial service; voice/output terms apply','CANDIDATE','PRIVATE_DATA_REVIEW'],
  ['suno','Suno','Music generation','Music ideation and generation subject to rights review','https://help.suno.com/','Commercial service; plan/output terms apply','CANDIDATE','ASK_FOR_PUBLISHING'],
  ['youka','Youka','Lyrics and karaoke','Candidate lyric-video and karaoke workflow','https://youka.io/','UNKNOWN_REQUIRES_PRIMARY_TERMS_REVIEW','DISCOVERY','ASK_FOR_PUBLISHING'],
  ['canirun-ai','CanIRun.ai','Hardware feasibility','Estimate whether local hardware can run a selected model','https://canirun.ai/','UNKNOWN_REQUIRES_PRIMARY_TERMS_REVIEW','DISCOVERY','READ_ONLY'],
  ['searxng','SearXNG','Search and retrieval','Self-hostable metasearch for research retrieval','https://github.com/searxng/searxng','AGPL-3.0','CANDIDATE','READ_ONLY'],
  ['playwright','Playwright','Browser testing','Browser acceptance and authorized automation','https://github.com/microsoft/playwright','Apache-2.0','SOURCE_READY','VARIES_BY_OPERATION'],
  ['n8n','n8n','Workflow and connectors','Workflow automation candidate where its licence and deployment fit','https://github.com/n8n-io/n8n','Sustainable Use License / Enterprise License','CANDIDATE','VARIES_BY_OPERATION'],
  ['tesseract','Tesseract OCR','Document intelligence','Local optical character recognition','https://github.com/tesseract-ocr/tesseract','Apache-2.0','CANDIDATE','LOCAL_UI'],
  ['ocrmypdf','OCRmyPDF','Document intelligence','Add searchable OCR layers to permitted PDFs','https://github.com/ocrmypdf/OCRmyPDF','MPL-2.0','CANDIDATE','PRIVATE_DATA_REVIEW'],
  ['apache-tika','Apache Tika','Document intelligence','Extract text and metadata from permitted documents','https://github.com/apache/tika','Apache-2.0','CANDIDATE','PRIVATE_DATA_REVIEW'],
  ['comfyui','ComfyUI','Creative media runtime','Local node-based image and media workflows','https://github.com/Comfy-Org/ComfyUI','GPL-3.0 code; model terms separate','CANDIDATE','PRIVATE_DATA_REVIEW'],
  ['essentia','Essentia','Audio analysis','Local audio descriptors, rhythm and music analysis','https://github.com/MTG/essentia','AGPL-3.0; alternative commercial licence available','CANDIDATE','LOCAL_UI'],
  ['microfish','MicroFish','Research candidate','Named candidate awaiting primary-project identity verification','https://github.com/search?q=MicroFish&type=repositories','UNKNOWN_REQUIRES_PRIMARY_PROJECT_VERIFICATION','DISCOVERY','NOT_ELIGIBLE'],
  ['nanochat','NanoChat','Model research candidate','Named small-chat-system candidate awaiting exact project review','https://github.com/search?q=NanoChat&type=repositories','UNKNOWN_REQUIRES_PRIMARY_PROJECT_VERIFICATION','DISCOVERY','NOT_ELIGIBLE'],
  ['impeccable','Impeccable','UX/UI candidate','Named interface-quality candidate awaiting exact project review','https://github.com/search?q=Impeccable&type=repositories','UNKNOWN_REQUIRES_PRIMARY_PROJECT_VERIFICATION','DISCOVERY','NOT_ELIGIBLE'],
  ['heretic','Heretic','Model research candidate','Named model-modification candidate quarantined for licence and safety review','https://github.com/search?q=Heretic+AI&type=repositories','UNKNOWN_REQUIRES_PRIMARY_PROJECT_VERIFICATION','DISCOVERY','NOT_ELIGIBLE'],
  ['graphrag','GraphRAG','Retrieval architecture','Graph-grounded retrieval pattern and implementation candidate','https://github.com/microsoft/graphrag','MIT code; model/data terms separate','CANDIDATE','PRIVATE_DATA_REVIEW'],
  ['wam','WAM','Commerce and payments','FTN commerce checkout and payment handoff','https://ftnplatform.org/ibis/pricing/','FTN integration; provider terms apply','SOURCE_READY','ASK_FOR_PAYMENT'],
  ['supabase','Supabase','Data and backend platform','FTN database, authentication and Edge Function runtime','https://supabase.com/docs','Apache-2.0 components plus hosted-service terms','LIVE','VARIES_BY_OPERATION'],
  ['cloudflare-pages','Cloudflare Pages','Hosting and edge platform','Public FTN static hosting and deployment','https://developers.cloudflare.com/pages/','Commercial hosted service; platform terms apply','LIVE','ASK_FOR_PUBLISHING']
];

for (const [id,name,category,role,sourceUrl,license,status,permissionClass] of additions) {
  if (!registry.tools.some((tool) => tool.id === id)) registry.tools.push({
    id, name, category, role, sourceUrl, license, decision: status === 'DISCOVERY' ? 'DEFER' : 'EXPERIMENT',
    status, integration: 'Replaceable ibis adapter or isolated service', automaticUse: 'No until an adapter, health check and permission gate exist',
    permissionClass, notes: 'Named project candidate; runtime status is deliberately independent from source or licence verification.'
  });
}

const legacyStatus = { APPROVED: 'SOURCE_READY', VERIFIED: 'CANDIDATE' };
const ioFor = (category) => {
  const value = category.toLowerCase();
  if (/audio|speech|music/.test(value)) return [['TEXT','AUDIO'],['AUDIO','STRUCTURED_DATA']];
  if (/media|vision/.test(value)) return [['TEXT','IMAGE','VIDEO'],['IMAGE','VIDEO','STRUCTURED_DATA']];
  if (/document|ocr/.test(value)) return [['DOCUMENT','IMAGE'],['TEXT','STRUCTURED_DATA']];
  if (/browser/.test(value)) return [['TEXT','URL'],['PAGE_STATE','STRUCTURED_DATA']];
  return [['TEXT','URL','STRUCTURED_DATA'],['TEXT','STRUCTURED_DATA']];
};

registry.policy.lifecycle = ['DISCOVERY','CANDIDATE','SOURCE_READY','ENABLED','LIVE','BLOCKED','FAILED','DEFERRED'];
registry.policy.statusRule = 'Status describes executable reality. Source or licence review is recorded separately and never promotes a tool to LIVE.';
registry.taskLanes = ['research','URLs','photos','documents','audio','voice','video','trade','importing','commerce','grants','jobs','music release','business building','property','civic work','browser action','monitoring','funding'];
registry.tools = registry.tools.map((tool) => {
  const verificationState = tool.verificationState || tool.status;
  const status = tool.id === 'ibis-intelligence-gateway' ? 'SOURCE_READY' : (legacyStatus[tool.status] || tool.status);
  const [inputTypes, outputTypes] = ioFor(tool.category || 'General');
  return {
    ...tool,
    purpose: tool.purpose || tool.role,
    exactModelTerms: tool.exactModelTerms || (/model|speech|music|media/i.test(tool.category || '') ? 'Exact checkpoint/model and dataset/output terms require separate review before enablement.' : 'NOT_APPLICABLE'),
    taskTypes: tool.taskTypes || [String(tool.category || 'GENERAL').toUpperCase().replace(/[^A-Z0-9]+/g,'_')],
    inputTypes: tool.inputTypes || inputTypes,
    outputTypes: tool.outputTypes || outputTypes,
    runtime: tool.runtime || tool.integration,
    status,
    verificationState,
    privacyClass: tool.privacyClass || (/PRIVATE|PAYMENT|MESSAGE|PUBLISH/i.test(tool.permissionClass || '') ? 'SENSITIVE_USER_DATA' : 'PUBLIC_OR_USER_PROVIDED'),
    cost: tool.cost || 'VARIABLE_OR_SELF_HOSTED; verify current price and spending ceiling before enablement',
    healthCheck: tool.healthCheck || (status === 'LIVE' || status === 'ENABLED' ? 'Registered adapter/runtime health check required before each use' : 'Not executable; source, licence and identity verification only'),
    fallbackRole: tool.fallbackRole || 'Optional replaceable capability; ibis must degrade honestly when unavailable',
    provenanceRequirements: tool.provenanceRequirements || 'Record source URL, version/model, timestamp, provider, request ID and evidence state where applicable',
    caribbeanRelevance: tool.caribbeanRelevance || 'Evaluate regional access, latency, language, payment compatibility and Trinidad & Tobago usefulness before promotion',
    ownershipConcerns: tool.ownershipConcerns || tool.notes || 'Keep FTN routing, memory, permissions and data contracts portable',
    rollbackMethod: tool.rollbackMethod || 'Disable the registry entry/adapter and return to the prior FTN-owned route',
    relevantTest: tool.relevantTest || (tool.id === 'ibis-intelligence-gateway' ? 'tests/ibis-intelligence-gateway-audit.mjs' : 'tests/ibis-tool-catalog-audit.mjs')
  };
});

registry.lastReviewed = '2026-09-09';
fs.writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`);
