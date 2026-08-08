/* Concrete discovery provider. Uses Supabase Edge Function dj-tube-discovery.
 * The function combines MusicBrainz metadata with YouTube Data API results when a key is configured.
 */
export class CaribbeanAPIProvider {
  constructor({endpoint}={}){this.endpoint=endpoint || 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/dj-tube-discovery';}
  async search({query,scene='Caribbean-wide',bpm=null}){const r=await fetch(this.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:`${query} ${scene}`,bpm})});const d=await r.json();if(!r.ok)throw new Error(d.error||`Discovery service ${r.status}`);return d.results||[];}
  async tracklist(mix){if(!mix?.playlistId)throw new Error('A YouTube playlistId is required for track-list lead extraction');const r=await fetch(this.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playlistId:mix.playlistId})});const d=await r.json();if(!r.ok)throw new Error(d.error||`Discovery service ${r.status}`);return d.results||[];}
}
