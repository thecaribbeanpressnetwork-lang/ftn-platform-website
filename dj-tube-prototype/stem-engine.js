/* Stem adapter boundary. Never fetches or extracts audio from YouTube iframes.
 * Connect an authorized/local/licensed source to a provider implementing separate stems.
 */
export class StemEngine {
  constructor(provider=null){this.provider=provider;this.cache=new Map();}
  async separate(source,{stems=['vocals','drums','bass','other']}={}) {
    if(!this.provider) return {status:'unavailable',stems:[],reason:'No authorized stem provider configured'};
    const key=source.id||source.url||String(source); if(this.cache.has(key))return this.cache.get(key);
    const result=await this.provider.separate(source,{stems}); this.cache.set(key,result); return result;
  }
  duckForTransition(stems,{vocal=.0,bass=.0,drums=0,other=0}={}) {
    return {vocals:1-vocal,bass:1-bass,drums:1-drums,other:1-other};
  }
}
