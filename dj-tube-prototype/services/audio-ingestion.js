/* Authorized audio ingestion. Accepts local DJ-owned files and approved direct audio URLs.
 * No YouTube extraction, downloading, or ad/playback bypassing is performed here.
 */
export class AuthorizedAudioIngestion {
  constructor(audioEngine){this.audioEngine=audioEngine;this.sources=new Map();}
  async loadFile(deckId,file){if(!file?.type?.startsWith('audio/'))throw new Error('Audio file required');await this.audioEngine.init();const url=URL.createObjectURL(file);const audio=new Audio();audio.crossOrigin='anonymous';audio.preload='auto';audio.src=url;await new Promise((res,rej)=>{audio.oncanplay=()=>res();audio.onerror=()=>rej(new Error('Unable to decode audio file'));});const node=this.audioEngine.connectMediaElement(deckId,audio);this.sources.set(deckId,{type:'local',file,url,audio,node,revoke:()=>URL.revokeObjectURL(url)});return this.sources.get(deckId);}
  async loadAuthorizedUrl(deckId,url){if(!/^https:\/\//i.test(url))throw new Error('HTTPS audio URL required');await this.audioEngine.init();const audio=new Audio();audio.crossOrigin='anonymous';audio.preload='auto';audio.src=url;await new Promise((res,rej)=>{audio.oncanplay=()=>res();audio.onerror=()=>rej(new Error('Audio source unavailable or CORS blocked'));});const node=this.audioEngine.connectMediaElement(deckId,audio);const src={type:'authorized-url',url,audio,node};this.sources.set(deckId,src);return src;}
  get(deckId){return this.sources.get(deckId);}
  unload(deckId){const s=this.sources.get(deckId);if(s?.revoke)s.revoke();this.sources.delete(deckId);}
}
