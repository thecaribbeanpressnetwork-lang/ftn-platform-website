/* Sample/beat-accurate scheduler. Uses AudioContext time and an external beat grid. */
export class BeatScheduler {
  constructor(ctx){this.ctx=ctx;this.queue=[];this.timer=null;this.lookahead=.1;this.interval=25;}
  start(){if(this.timer)return;this.timer=setInterval(()=>this._tick(),this.interval);}
  stop(){clearInterval(this.timer);this.timer=null;this.queue=[];}
  scheduleAtBeat({beatTime,beatDuration,fn,label='event'}){this.queue.push({at:beatTime,beatDuration,fn,label});this.queue.sort((a,b)=>a.at-b.at);this.start();return this.queue[this.queue.length-1];}
  schedulePhrase({startBeat,bars=8,bpm,fn,label='phrase'}){const beat=60/bpm;return this.scheduleAtBeat({beatTime:startBeat,beatDuration:beat*bars*4,fn,label});}
  _tick(){const now=this.ctx.currentTime;while(this.queue.length&&this.queue[0].at<=now+this.lookahead){const e=this.queue.shift();try{e.fn({audioTime:Math.max(now,e.at),beatDuration:e.beatDuration,label:e.label});}catch(err){console.error('DJ Tube scheduler event',err);}}if(!this.queue.length)this.stop();}
}
