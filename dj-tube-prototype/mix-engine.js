/* DJ Tube Mix Engine
 * Deterministic orchestration layer. Analysis providers are adapters so the browser UI can
 * use real BPM/beat/phrase/stem services later without changing the controller.
 */
export class MixEngine {
  constructor({analysis, audio, scheduler}={}) { this.analysis=analysis; this.audio=audio; this.scheduler=scheduler; this.state='idle'; }
  async analyze(deckA,deckB) {
    const [a,b]=await Promise.all([this.analysis.analyze(deckA),this.analysis.analyze(deckB)]);
    return {a,b,compatibility:this.score(a,b)};
  }
  score(a,b) {
    const bpm=Math.max(0,1-Math.abs(a.bpm-b.bpm)/20);
    const energy=Math.max(0,1-Math.abs(a.energy-b.energy)/100);
    const key=a.camelot&&b.camelot ? (a.camelot===b.camelot||this.adjacent(a.camelot,b.camelot)?1:.55) : .6;
    const vocal=1-Math.min(1,(a.vocalOverlap||0));
    return Math.round((bpm*.3+energy*.2+key*.25+vocal*.25)*100);
  }
  adjacent(a,b) { const na=+a.slice(0,-1), nb=+b.slice(0,-1); const la=a.at(-1),lb=b.at(-1); return la===lb&&Math.abs(na-nb)<=1; }
  chooseWindow(a,b,{bars=8,style='Vocal Safe'}={}) {
    const candidates=(b.phrases||[]).filter(p=>p.type==='intro'||p.type==='instrumental'||p.type==='drop');
    const target=(a.phrases||[]).filter(p=>p.type==='outro'||p.type==='instrumental').at(-1);
    const start=candidates[0]?.start||0; const end=target?.end||start+bars*4*(60/(a.bpm||100));
    return {start,end,bars,style,reason:style==='Vocal Safe'?'avoid simultaneous vocal regions':'creative transition'};
  }
  async mix(a,b,opts={}) {
    this.state='analyzing'; const plan=await this.analyze(a,b); const window=this.chooseWindow(plan.a,plan.b,opts);
    this.state='armed'; const event={plan,window,tempoRatio:(plan.a.bpm||100)/(plan.b.bpm||100),status:'READY'};
    if(this.scheduler) this.scheduler.schedule(event); return event;
  }
  stop(){ this.state='idle'; this.scheduler?.cancel(); }
}
