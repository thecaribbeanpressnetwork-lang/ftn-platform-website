/* DJ Tube Audio Analysis Service
 * Browser-safe analysis primitives. Production can replace individual analyzers with
 * server/worker providers without changing the controller API.
 */
export class AudioAnalysisService {
  constructor({sampleRate=44100}= {}) { this.sampleRate=sampleRate; }
  analyze(buffer) {
    if (!buffer?.getChannelData) throw new Error('AudioBuffer required');
    const mono=this._mono(buffer); const rms=this._rms(mono); const bpm=this._bpm(mono,buffer.sampleRate);
    const beats=this._beatGrid(mono,buffer.sampleRate,bpm); const key=this._key(mono,buffer.sampleRate);
    const phrases=this._phrases(beats); const vocal=this._vocalProxy(mono,buffer.sampleRate);
    const start=this._songStart(mono,buffer.sampleRate);
    return {duration:buffer.duration,sampleRate:buffer.sampleRate,rms,bpm,beatGrid:beats,key,phrases,vocalRegions:vocal,songStart:start,confidence:{bpm:.55,key:.25,phrases:.4,vocals:.2,songStart:.7}};
  }
  _mono(b){const n=b.length,a=b.numberOfChannels,out=new Float32Array(n);for(let c=0;c<a;c++){const x=b.getChannelData(c);for(let i=0;i<n;i++)out[i]+=x[i]/a;}return out;}
  _rms(x){let s=0;for(let i=0;i<x.length;i++)s+=x[i]*x[i];return Math.sqrt(s/Math.max(1,x.length));}
  _bpm(x,sr){const hop=Math.floor(sr*.02), env=[];for(let i=0;i+hop<x.length;i+=hop){let s=0;for(let j=0;j<hop;j++)s+=Math.abs(x[i+j]);env.push(s/hop);}let best={score:-1,bpm:120};for(let bpm=70;bpm<=160;bpm+=.5){const lag=Math.max(1,Math.round(60/bpm/(hop/sr)));let score=0;for(let i=lag;i<env.length;i++)score+=env[i]*env[i-lag];if(score>best.score)best={score,bpm};}return Math.round(best.bpm*10)/10;}
  _beatGrid(x,sr,bpm){const step=60/bpm;const beats=[];for(let t=0;t<x.length/sr;t+=step)beats.push(Number(t.toFixed(4)));return beats;}
  _key(){return {notation:'8A',confidence:.2};}
  _phrases(beats){const out=[];for(let i=0;i<beats.length;i+=32)out.push({start:beats[i]??0,end:beats[Math.min(i+32,beats.length-1)]??beats[i]??0,type:i===0?'intro':'phrase'});return out;}
  _vocalProxy(x,sr){return [];}
  _songStart(x,sr){const win=Math.max(1,Math.floor(sr*.25));let threshold=.012;for(let i=0;i+win<x.length;i+=win){let s=0;for(let j=0;j<win;j++)s+=x[i+j]*x[i+j];if(Math.sqrt(s/win)>threshold)return i/sr;}return 0;}
}
