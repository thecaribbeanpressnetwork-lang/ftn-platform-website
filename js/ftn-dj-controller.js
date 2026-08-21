// FTN DJ Tube -- fullscreen + Web MIDI bridge. Pass 16: simplified after the DJ Tube consolidation
// removed the /dj-tube-prototype/ iframe boundary this file previously had to reach across via
// contentDocument. Every control it maps is now in the same document, so this is plain,
// same-page DOM access -- no more iframe indirection.
const $=id=>document.getElementById(id);
$('back').onclick=()=>location.href='../';
$('openFullscreen').onclick=()=>{const el=document.querySelector('.console')||document.body;if(el.requestFullscreen)el.requestFullscreen();};
function click(id){const e=$(id);if(e)e.click();}
function setRange(id,v){const e=$(id);if(e){e.value=Math.round(v*100);e.dispatchEvent(new Event('input',{bubbles:true}));}}
async function connectMIDI(){
  if(!navigator.requestMIDIAccess){$('devices')&&($('devices').innerHTML='<span class="hint">Web MIDI is unavailable here. The on-screen controller still works.</span>');return;}
  try{
    const access=await navigator.requestMIDIAccess({sysex:false});
    const render=()=>{
      if(!$('devices'))return;
      $('devices').innerHTML='';
      [...access.inputs.values()].forEach(i=>{
        const d=document.createElement('div');d.className='device';
        d.innerHTML='<span><b>'+((i.name||'DJ controller').replace(/[<>&"]/g,''))+'</b><br><small>'+((i.manufacturer||'MIDI')+' · MIDI input').replace(/[<>&"]/g,'')+'</small></span><span class="badge">CONNECTED</span>';
        $('devices').appendChild(d);
        i.onmidimessage=e=>handleMIDI(e.data);
      });
      if(!$('devices').children.length)$('devices').innerHTML='<span class="hint">No MIDI inputs found.</span>';
    };
    access.onstatechange=render;render();
    $('connect').classList.add('connected');$('connect').textContent='CONNECTED';
  }catch(e){if($('devices'))$('devices').innerHTML='<span class="hint">Controller permission was not granted.</span>';}
}
function handleMIDI(data){
  const status=data[0]&240,n=data[1],v=data[2]||0;
  if(status===144&&v>0){if(n===36)click('playA');if(n===37)click('playB');if(n===38)click('cueA');if(n===39)click('cueB');if(n===40)click('mix');}
  if(status===176){if(n===0)setRange('faderA',v/127);if(n===1)setRange('faderB',v/127);if(n===2)setRange('cross',v/127);if(n===3)setRange('master',v/127);}
}
$('connect').onclick=connectMIDI;
