const canvas=document.getElementById('canvas');
const cards=[...document.querySelectorAll('.desk-card')];
const query=document.getElementById('deskQuery');
const dock=document.getElementById('queryDock');
const grip=document.getElementById('dockGrip');
const undoButton=document.getElementById('undoDesk');
const redoButton=document.getElementById('redoDesk');
const hint=document.getElementById('commandHint');
let topZ=10;
let history=[];
let future=[];
let lastDismissed=null;

function snapshot(){return{cards:cards.map(card=>({name:card.dataset.card,hidden:card.classList.contains('hidden'),pinned:card.classList.contains('pinned'),left:card.style.left,top:card.style.top,right:card.style.right,bottom:card.style.bottom,z:card.style.zIndex})),dock:{left:dock.style.left,top:dock.style.top,bottom:dock.style.bottom,transform:dock.style.transform},query:query.value};}
function sameState(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function remember(){const state=snapshot();if(!history.length||!sameState(history[history.length-1],state)){history.push(state);if(history.length>40)history.shift();future=[];}updateHistoryButtons();}
function apply(state){if(!state)return;state.cards.forEach(saved=>{const card=document.querySelector(`[data-card="${saved.name}"]`);if(!card)return;card.classList.toggle('hidden',saved.hidden);card.classList.toggle('pinned',saved.pinned);const pin=card.querySelector('[data-pin]');if(pin)pin.textContent=saved.pinned?'Pinned':'Pin';['left','top','right','bottom','zIndex'].forEach(key=>{const source=key==='zIndex'?'z':key;card.style[key]=saved[source]||'';});});Object.assign(dock.style,state.dock);query.value=state.query||'';updateHistoryButtons();}
function updateHistoryButtons(){if(undoButton)undoButton.disabled=history.length<2;if(redoButton)redoButton.disabled=future.length===0;}
function mutate(fn,message){remember();fn();remember();if(message&&hint)hint.textContent=message;}
function showCards(names,message){mutate(()=>names.forEach((name,index)=>setTimeout(()=>{const card=document.querySelector(`[data-card="${name}"]`);if(card){card.classList.remove('hidden');card.classList.add('fade-in');setTimeout(()=>card.classList.remove('fade-in'),500);}},index*70)),message);}
function hideCards(names,message){mutate(()=>names.forEach(name=>document.querySelector(`[data-card="${name}"]`)?.classList.add('hidden')),message);}
function restoreLast(){if(lastDismissed){showCards([lastDismissed],`Recalled ${lastDismissed}.`);lastDismissed=null;return;}showCards(cards.map(card=>card.dataset.card),'Restored the desk.');}
function undo(){if(history.length<2)return;const current=history.pop();future.push(current);apply(history[history.length-1]);if(hint)hint.textContent='Went back one step.';}
function redo(){if(!future.length)return;const state=future.pop();history.push(state);apply(state);if(hint)hint.textContent='Moved forward one step.';}

function makeDraggable(card){let startX=0,startY=0,startLeft=0,startTop=0,active=false,startState=null;card.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;if(window.matchMedia('(max-width:760px)').matches)return;active=true;startState=snapshot();card.setPointerCapture(event.pointerId);card.classList.add('dragging');card.style.zIndex=String(++topZ);const rect=card.getBoundingClientRect();const host=canvas.getBoundingClientRect();startX=event.clientX;startY=event.clientY;startLeft=rect.left-host.left;startTop=rect.top-host.top;});card.addEventListener('pointermove',event=>{if(!active)return;const maxX=canvas.clientWidth-card.offsetWidth;const maxY=canvas.clientHeight-card.offsetHeight;const x=Math.min(Math.max(0,startLeft+event.clientX-startX),Math.max(0,maxX));const y=Math.min(Math.max(0,startTop+event.clientY-startY),Math.max(0,maxY));card.style.left=`${x}px`;card.style.top=`${y}px`;card.style.right='auto';card.style.bottom='auto';});card.addEventListener('pointerup',event=>{if(!active)return;active=false;card.releasePointerCapture(event.pointerId);card.classList.remove('dragging');if(startState&&!sameState(startState,snapshot())){history.push(startState);remember();}});}

cards.forEach(card=>{makeDraggable(card);card.querySelector('[data-close]')?.addEventListener('click',()=>mutate(()=>{lastDismissed=card.dataset.card;card.classList.add('hidden');},`Sent ${card.dataset.card} away. Say “put that back” to recall it.`));card.querySelector('[data-pin]')?.addEventListener('click',event=>mutate(()=>{card.classList.toggle('pinned');event.currentTarget.textContent=card.classList.contains('pinned')?'Pinned':'Pin';},card.classList.contains('pinned')?'Pinned to this desk.':'Updated pin state.'));});

document.getElementById('clearDesk')?.addEventListener('click',()=>hideCards(cards.map(card=>card.dataset.card),'Desk cleared. Your objects are still recallable.'));
document.getElementById('restoreDesk')?.addEventListener('click',restoreLast);
undoButton?.addEventListener('click',undo);redoButton?.addEventListener('click',redo);
document.getElementById('tellButton')?.addEventListener('click',()=>{query.value='I might sell my business if the right buyer appears.';query.focus();});
document.querySelectorAll('[data-recall]').forEach(button=>button.addEventListener('click',()=>showCards([button.dataset.recall],`Recalled ${button.dataset.recall}.`)));

document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{const preset=button.dataset.preset;mutate(()=>cards.forEach(card=>card.classList.add('hidden')));if(preset==='blank'){if(hint)hint.textContent='New blank desk.';return;}if(preset==='opportunity')showCards(['answer','opportunity','synapse'],'Opportunity workspace assembled.');else if(preset==='place'||preset==='mayor')showCards(['answer','context','graph','synapse'],`${preset==='mayor'?'Mayor':'Place'} workspace assembled.`);else showCards(['answer','graph','opportunity','context','synapse'],'Business workspace assembled.');}));

function interpret(text){const q=text.toLowerCase().trim();if(!q)return false;if(/^(go )?back$|undo|previous/.test(q)){undo();return true;}if(/forward|redo/.test(q)){redo();return true;}if(/put (that|it) back|bring (that|it) back|restore/.test(q)){restoreLast();return true;}if(/clear (the )?desk|hide everything|send everything away/.test(q)){hideCards(cards.map(card=>card.dataset.card),'Desk cleared.');return true;}const dictionary={graph:['graph','chart','demand'],opportunity:['opportunity','opportunities','funding','capital'],context:['context','signals','weather'],synapse:['connection','connections','synapse'],answer:['answer','response']};for(const [name,terms] of Object.entries(dictionary)){if(terms.some(term=>q.includes(term))){if(/hide|remove|send away|close/.test(q))hideCards([name],`Sent ${name} away.`);else showCards([name],`Recalled ${name}.`);return true;}}return false;}

document.getElementById('queryDock')?.addEventListener('submit',event=>{event.preventDefault();const text=query.value.trim();if(interpret(text))return;showCards(['answer','graph','opportunity','context','synapse'],'ibis assembled the objects this question appears to need. Prototype only — no live reasoning is connected.');});

if(grip&&dock){let active=false,sx=0,sy=0,startLeft=0,startTop=0,startState=null;grip.addEventListener('pointerdown',event=>{if(window.matchMedia('(max-width:760px)').matches)return;active=true;startState=snapshot();grip.setPointerCapture(event.pointerId);const rect=dock.getBoundingClientRect();sx=event.clientX;sy=event.clientY;startLeft=rect.left;startTop=rect.top;dock.style.transform='none';dock.style.bottom='auto';dock.style.left=`${rect.left}px`;dock.style.top=`${rect.top}px`;});grip.addEventListener('pointermove',event=>{if(!active)return;const x=Math.min(Math.max(220,startLeft+event.clientX-sx),window.innerWidth-dock.offsetWidth-14);const y=Math.min(Math.max(8,startTop+event.clientY-sy),window.innerHeight-dock.offsetHeight-8);dock.style.left=`${x}px`;dock.style.top=`${y}px`;});grip.addEventListener('pointerup',event=>{if(!active)return;active=false;grip.releasePointerCapture(event.pointerId);if(startState&&!sameState(startState,snapshot())){history.push(startState);remember();}});}

remember();