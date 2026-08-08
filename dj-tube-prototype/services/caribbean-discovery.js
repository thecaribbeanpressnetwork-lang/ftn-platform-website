/* Caribbean discovery backend contract. It filters candidate metadata and can use DJ mixes
 * only as track-list leads; the mix itself is never returned as a playable track. */
export class CaribbeanDiscovery {
  constructor(provider=null){this.provider=provider;this.excluded=/\b(?:dj\s*)?mix(?:es|tape)?\b|\bfull\s+mix\b|\bmega\s+mix\b/i;}
  isAllowedTitle(title=''){const t=String(title).trim();if(!t)return false;const normalized=t.replace(/\bremix\b/gi,'__REMIX__');return !this.excluded.test(normalized);}
  filterCandidates(items=[]){return items.filter(x=>this.isAllowedTitle(x.title||'')).map(x=>({...x,sourceRole:x.sourceRole||'individual-track'}));}
  async search(query,{scene='Caribbean-wide',bpm=null}={}){if(!this.provider?.search)throw new Error('Discovery provider not configured');const raw=await this.provider.search({query,scene,bpm});return this.filterCandidates(raw);}
  async extractTrackLeadsFromMix(mix){if(!this.provider?.tracklist)throw new Error('Track-list provider not configured');const leads=await this.provider.tracklist(mix);return leads.filter(x=>this.isAllowedTitle(x.title||'')).map(x=>({...x,sourceRole:'track-list-lead',playableSource:null}));}
}
