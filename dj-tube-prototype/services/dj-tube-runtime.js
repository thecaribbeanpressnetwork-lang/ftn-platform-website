import { AudioAnalysisService } from './audio-analysis.js';
import { AuthorizedAudioIngestion } from './audio-ingestion.js';
import { StemProcessor } from './stem-processor.js';
import { BeatScheduler } from './beat-scheduler.js';
import { CaribbeanDiscovery } from './caribbean-discovery.js';
import { DJControllerAdapter } from './midi-webhid.js';

export class DJTubeRuntime {
  constructor({audioEngine, stemProvider=null, discoveryProvider=null, onControllerEvent=()=>{}}={}) {
    this.audioEngine=audioEngine;
    this.analysis=new AudioAnalysisService();
    this.ingestion=new AuthorizedAudioIngestion(audioEngine);
    this.stems=new StemProcessor(stemProvider);
    this.discovery=new CaribbeanDiscovery(discoveryProvider);
    this.scheduler=new BeatScheduler(audioEngine?.ctx || new AudioContext());
    this.controller=new DJControllerAdapter({onControl:onControllerEvent});
    this.tracks={A:null,B:null};
  }
  async loadDJFile(deck,file){const source=await this.ingestion.loadFile(deck,file);const buffer=await source.file.arrayBuffer();const decoded=await this.scheduler.ctx.decodeAudioData(buffer.slice(0));const analysis=this.analysis.analyze(decoded);this.tracks[deck]={source,analysis};return this.tracks[deck];}
  planTransition(from='A',to='B',{bars=8}={}){const a=this.tracks[from]?.analysis,b=this.tracks[to]?.analysis;if(!a||!b)throw new Error('Both decks require analyzed audio');const bpm=Math.max(1,a.bpm);const ratio=b.bpm/bpm;const bpmDelta=Math.abs(b.bpm-a.bpm);const keyCompatible=a.key?.notation===b.key?.notation;return {bars,bpmFrom:a.bpm,bpmTo:b.bpm,bpmDelta,tempoRatio:ratio,keyCompatible,transition:'phrase-aligned-bass-swap',confidence:Math.max(0,Math.min(1,.55+(keyCompatible?.2:0)-bpmDelta*.02))};}
  scheduleTransition(plan,atTime=this.scheduler.ctx.currentTime+.5,fn=()=>{}){const beat=60/plan.bpmFrom;return this.scheduler.scheduleAtBeat({beatTime:atTime,beatDuration:beat*plan.bars*4,fn,label:'AI MIX'});}
  async enableHardware(){return {midi:await this.controller.enableMIDI()};}
}
