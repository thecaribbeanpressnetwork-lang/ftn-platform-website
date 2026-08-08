/* DJ-owned drop scheduler. Drops are local/user-provided assets only. */
export class DropScheduler {
  constructor(audio){this.audio=audio;this.drops=[];this.rules=new Map();}
  add(id,audio,meta={}){this.drops[id]={id,audio,meta};}
  rule(id,rule){this.rules.set(id,rule);}
  findWindow(track,now,{energyMin=0,beforeDrop=false}={}) {
    return (track.phrases||[]).filter(p=>p.start>=now && p.start-now<30 && (p.type==='instrumental'||p.type==='drop'||p.type==='break'))
      .find(p=>(track.energy||0)>=energyMin && (!beforeDrop||p.type==='drop'));
  }
  async fire(id,when){const d=this.drops[id];if(!d)return false; if(when)this.audio?.schedule?.(d.audio,when); else d.audio.play?.(); return true;}
}
