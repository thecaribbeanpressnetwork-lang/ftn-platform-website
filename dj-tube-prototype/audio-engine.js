/* DJ Tube Audio Engine
 * Production architecture for lawful audio sources: DJ-owned files, licensed/authorized tracks,
 * or future source adapters that explicitly expose audio to the browser.
 * YouTube iframes remain display/playback sources and are NOT captured or bypassed here.
 */
export class DJAudioEngine {
  constructor() { this.ctx=null; this.master=null; this.cueBus=null; this.decks=new Map(); this.headphone={a:false,b:false,mix:.5,level:.8}; }
  async init() {
    if (!this.ctx) this.ctx=new AudioContext();
    if (this.ctx.state==='suspended') await this.ctx.resume();
    this.master=this.ctx.createGain(); this.master.gain.value=.8;
    this.cueBus=this.ctx.createGain(); this.cueBus.gain.value=.8;
    const out=this.ctx.createGain(); out.gain.value=1;
    this.master.connect(out); this.cueBus.connect(out); out.connect(this.ctx.destination);
  }
  createDeck(id) {
    if (!this.ctx) throw new Error('Call init() first');
    const input=this.ctx.createGain();
    const hi=this.ctx.createBiquadFilter(); hi.type='highshelf'; hi.frequency.value=8000;
    const mid=this.ctx.createBiquadFilter(); mid.type='peaking'; mid.frequency.value=1000; mid.Q.value=.8;
    const low=this.ctx.createBiquadFilter(); low.type='lowshelf'; low.frequency.value=120;
    const filter=this.ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=20000; filter.Q.value=.7;
    const channel=this.ctx.createGain(); const cue=this.ctx.createGain(); cue.gain.value=0;
    input.connect(hi).connect(mid).connect(low).connect(filter).connect(channel).connect(this.master);
    input.connect(cue).connect(this.cueBus);
    const deck={id,input,hi,mid,low,filter,channel,cue,analyser:this.ctx.createAnalyser()};
    channel.connect(deck.analyser); this.decks.set(id,deck); return deck;
  }
  setEQ(id,{hi=0,mid=0,low=0}={}) { const d=this.decks.get(id); if(!d)return; d.hi.gain.value=hi; d.mid.gain.value=mid; d.low.gain.value=low; }
  setFilter(id,frequency) { const d=this.decks.get(id); if(d)d.filter.frequency.value=Math.max(80,Math.min(20000,frequency)); }
  setChannel(id,value) { const d=this.decks.get(id); if(d)d.channel.gain.value=value; }
  setCue(id,on) { const d=this.decks.get(id); if(d)d.cue.gain.value=on?1:0; }
  setCrossfader(value) { const x=Math.max(0,Math.min(1,value)); this.setChannel('A',Math.cos(x*Math.PI/2)); this.setChannel('B',Math.sin(x*Math.PI/2)); }
  setHeadphoneMix(value) { this.headphone.mix=Math.max(0,Math.min(1,value)); }
  setHeadphoneLevel(value) { this.headphone.level=Math.max(0,Math.min(1,value)); this.cueBus.gain.value=this.headphone.level; }
  connectMediaElement(id,media) { const d=this.decks.get(id)||this.createDeck(id); const node=this.ctx.createMediaElementSource(media); node.connect(d.input); return node; }
}
