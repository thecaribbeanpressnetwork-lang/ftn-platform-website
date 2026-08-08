/* Concrete stem provider for DJ-owned/licensed audio.
 * Backend: Supabase Edge Function dj-tube-stems -> Replicate Demucs.
 * Replicate's documented Demucs model provides vocals, drums, bass and other outputs.
 */
export class ReplicateDemucsProvider {
  constructor({endpoint}={}){this.endpoint=endpoint || 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/dj-tube-stems';}
  async separate(source,{stems=['vocals','drums','bass','other'],model='htdemucs'}={}){
    const audio=source?.url || source?.authorizedUrl || source;
    if(typeof audio!=='string'||!/^https:\/\//i.test(audio)) throw new Error('Stem separation requires an authorized HTTPS audio URL');
    const r=await fetch(this.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({audio,model_name:model})});
    const data=await r.json(); if(!r.ok)throw new Error(data.error||`Stem service ${r.status}`);
    return {provider:'replicate-demucs',stems:Object.fromEntries(stems.filter(s=>data.output?.[s]).map(s=>[s,data.output[s]])),raw:data};
  }
}
