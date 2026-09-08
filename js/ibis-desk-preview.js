const canvas=document.getElementById('canvas');
const cards=[...document.querySelectorAll('.desk-card')];
let topZ=10;
function makeDraggable(card){
  let startX=0,startY=0,startLeft=0,startTop=0,active=false;
  card.addEventListener('pointerdown',(event)=>{
    if(event.target.closest('button')) return;
    if(window.matchMedia('(max-width:760px)').matches) return;
    active=true;card.setPointerCapture(event.pointerId);card.classList.add('dragging');card.style.zIndex=String(++topZ);
    const rect=card.getBoundingClientRect();const host=canvas.getBoundingClientRect();
    startX=event.clientX;startY=event.clientY;startLeft=rect.left-host.left;startTop=rect.top-host.top;
  });
  card.addEventListener('pointermove',(event)=>{
    if(!active) return;
    const maxX=canvas.clientWidth-card.offsetWidth;const maxY=canvas.clientHeight-card.offsetHeight;
    const x=Math.min(Math.max(0,startLeft+event.clientX-startX),Math.max(0,maxX));
    const y=Math.min(Math.max(0,startTop+event.clientY-startY),Math.max(0,maxY));
    card.style.left=`${x}px`;card.style.top=`${y}px`;card.style.right='auto';card.style.bottom='auto';
  });
  card.addEventListener('pointerup',(event)=>{active=false;card.releasePointerCapture(event.pointerId);card.classList.remove('dragging')});
}
cards.forEach((card)=>{makeDraggable(card);card.querySelector('[data-close]')?.addEventListener('click',()=>card.classList.add('hidden'));card.querySelector('[data-pin]')?.addEventListener('click',(event)=>{card.classList.toggle('pinned');event.currentTarget.textContent=card.classList.contains('pinned')?'Pinned':'Pin';});});
const query=document.getElementById('deskQuery');
const dock=document.getElementById('queryDock');
const grip=document.getElementById('dockGrip');
document.getElementById('clearDesk')?.addEventListener('click',()=>cards.forEach(card=>card.classList.add('hidden')));
document.getElementById('tellButton')?.addEventListener('click',()=>{query.value='I might sell my business if the right buyer appears.';query.focus();});
document.getElementById('queryDock')?.addEventListener('submit',(event)=>{event.preventDefault();cards.forEach((card,index)=>{setTimeout(()=>{card.classList.remove('hidden');card.classList.add('fade-in');setTimeout(()=>card.classList.remove('fade-in'),500)},index*90)});});
document.querySelectorAll('[data-preset]').forEach((button)=>button.addEventListener('click',()=>{const preset=button.dataset.preset;cards.forEach(card=>card.classList.add('hidden'));const show=(names)=>names.forEach((name,index)=>setTimeout(()=>document.querySelector(`[data-card="${name}"]`)?.classList.remove('hidden'),index*100));if(preset==='blank')return;if(preset==='opportunity')show(['answer','opportunity','synapse']);else if(preset==='place'||preset==='mayor')show(['answer','context','graph','synapse']);else show(['answer','graph','opportunity','context','synapse']);}));
if(grip&&dock){let active=false,sx=0,sy=0,startLeft=0,startTop=0;grip.addEventListener('pointerdown',(event)=>{if(window.matchMedia('(max-width:760px)').matches)return;active=true;grip.setPointerCapture(event.pointerId);const rect=dock.getBoundingClientRect();sx=event.clientX;sy=event.clientY;startLeft=rect.left;startTop=rect.top;dock.style.transform='none';dock.style.bottom='auto';dock.style.left=`${rect.left}px`;dock.style.top=`${rect.top}px`;});grip.addEventListener('pointermove',(event)=>{if(!active)return;const x=Math.min(Math.max(220,startLeft+event.clientX-sx),window.innerWidth-dock.offsetWidth-14);const y=Math.min(Math.max(8,startTop+event.clientY-sy),window.innerHeight-dock.offsetHeight-8);dock.style.left=`${x}px`;dock.style.top=`${y}px`;});grip.addEventListener('pointerup',(event)=>{active=false;grip.releasePointerCapture(event.pointerId)});}
