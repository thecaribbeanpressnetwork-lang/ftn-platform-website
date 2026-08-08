/* DJ Tube Download Manager
 * Supports downloads from sources the application is authorized to save.
 * It intentionally does NOT extract/download YouTube media or bypass YouTube playback/ad controls.
 * Transcoding (audio-only/video-only) is exposed as a provider contract for licensed/local media.
 */
export class DownloadManager {
  constructor({transcoder=null,onProgress=()=>{}}={}){this.transcoder=transcoder;this.onProgress=onProgress;this.jobs=new Map();}
  async downloadSource(source,{mode='original',filename='dj-tube-download',mime=null}={}){
    if(!source)throw new Error('No authorized source supplied');
    if(mode!=='original'&&!this.transcoder)throw new Error('Audio-only/video-only conversion requires an authorized transcoder');
    const id=crypto.randomUUID();this.jobs.set(id,{id,status:'downloading',mode,filename,progress:0});
    try{
      let blob;
      if(source.file instanceof Blob) blob=source.file;
      else if(source.url){const res=await fetch(source.url);if(!res.ok)throw new Error(`Download failed: ${res.status}`);const total=Number(res.headers.get('content-length')||0);const reader=res.body?.getReader();if(reader){const chunks=[];let received=0;while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.byteLength;const p=total?received/total:0;this.jobs.get(id).progress=p;this.onProgress({id,progress:p});}blob=new Blob(chunks,{type:mime||source.mime||res.headers.get('content-type')||'application/octet-stream'});}else blob=await res.blob();}
      else throw new Error('Source has no file or authorized URL');
      if(mode!=='original')blob=await this.transcoder.convert(blob,{mode});
      const ext=mode==='audio'?'mp3':mode==='video'?'mp4':this._extension(blob.type);const name=filename.replace(/\.[^.]+$/,'')+'.'+ext;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);this.jobs.get(id).status='complete';this.jobs.get(id).progress=1;this.onProgress({id,progress:1,status:'complete'});return {id,name,blob};
    }catch(error){this.jobs.get(id).status='error';this.jobs.get(id).error=error.message;this.onProgress({id,status:'error',error:error.message});throw error;}
  }
  async downloadMany(sources,options={}){return Promise.allSettled(sources.map(s=>this.downloadSource(s,options)));}
  _extension(type=''){const m={'audio/mpeg':'mp3','audio/wav':'wav','audio/mp4':'m4a','video/mp4':'mp4','video/webm':'webm','audio/webm':'webm'};return m[type]||'bin';}
  getJob(id){return this.jobs.get(id);}
}

export class AuthorizedTranscoderAdapter {
  constructor(provider){this.provider=provider;}
  convert(blob,{mode}){if(!this.provider?.convert)throw new Error('No authorized transcoder configured');return this.provider.convert(blob,{mode});}
}
