// FTN Platform — ibis Headspace spatial window manager.
// Investor recovery: cards can snap, tile, stack AND return to genuine freeform spatial movement.
(function(global){
  'use strict';
  var GAP=18,MIN_W=260,MOBILE='(max-width:760px)';

  function manager(field){
    var mode='grid',drag=null,z=30;
    function visible(){return Array.from(field.querySelectorAll('.thought:not(.dematerialized):not(.hs-minimized)'));}
    function imp(node,prop,value){node.style.setProperty(prop,value,'important');}
    function hint(text){var h=document.getElementById('commandHint');if(h)h.textContent=text;}
    function clearSpatial(node){['left','right','top','bottom','width','height','max-width','max-height','grid-column','grid-row','transform'].forEach(function(p){node.style.removeProperty(p);});}
    function gridColumns(count){field.style.setProperty('display','grid','important');field.style.setProperty('position','relative','important');field.style.setProperty('gap',GAP+'px','important');field.style.setProperty('align-items','stretch','important');field.style.setProperty('overflow','visible','important');field.style.setProperty('grid-template-columns','repeat('+count+', minmax('+MIN_W+'px, 1fr))','important');field.style.removeProperty('min-height');}
    function colsFor(layout){if(global.matchMedia&&global.matchMedia(MOBILE).matches)return 1;var width=field.clientWidth||global.innerWidth||1200;if(layout==='stack')return 1;if(layout==='tile')return width>=980?2:1;return width>=1180?3:width>=760?2:1;}

    function snapNode(node,i,cols,layout){
      clearSpatial(node);imp(node,'position','relative');imp(node,'inset','auto');imp(node,'overflow','visible');imp(node,'resize','none');imp(node,'min-width','0');imp(node,'width','auto');imp(node,'height','auto');imp(node,'max-height','none');imp(node,'min-height',layout==='tile'?'260px':layout==='stack'?'140px':'220px');imp(node,'grid-column',String((i%cols)+1));imp(node,'grid-row',String(Math.floor(i/cols)+1));node.style.zIndex=String(++z);return node;
    }
    function arrange(layout){mode=layout==='tile'||layout==='stack'?layout:'grid';field.dataset.layout=mode;var nodes=visible(),cols=colsFor(mode);gridColumns(cols);nodes.forEach(function(node,i){snapNode(node,i,cols,mode);});hint(mode==='tile'?'Tiled Headspace. Drag any card to unsnap, or choose Freeform.':mode==='stack'?'Stacked Headspace. Drag any card to unsnap, or choose Freeform.':'Snapped Headspace to grid. Drag any card to unsnap, or choose Freeform.');}
    function freeform(){if(global.matchMedia&&global.matchMedia(MOBILE).matches){arrange('stack');return;}var nodes=visible(),fr=field.getBoundingClientRect();mode='freeform';field.dataset.layout='freeform';field.style.setProperty('display','block','important');field.style.setProperty('position','relative','important');field.style.removeProperty('grid-template-columns');field.style.setProperty('min-height',Math.max(760,Math.ceil(nodes.length/3)*330)+'px','important');nodes.forEach(function(node,i){var r=node.getBoundingClientRect(),w=Math.max(260,Math.min(r.width||360,Math.max(280,fr.width*.34))),col=i%3,row=Math.floor(i/3),left=Math.min(Math.max(0,col*(fr.width/3)+10),Math.max(0,fr.width-w)),top=row*310+10;clearSpatial(node);imp(node,'position','absolute');imp(node,'inset','auto');imp(node,'left',left+'px');imp(node,'top',top+'px');imp(node,'width',w+'px');imp(node,'height','auto');imp(node,'max-height','none');imp(node,'overflow','visible');imp(node,'resize','both');node.style.zIndex=String(++z);});hint('Freeform Headspace is active. Drag any card by its title bar; resize from its lower-right edge. Snap Grid returns to alignment.');}
    function place(node){if(mode==='freeform'){node.classList.remove('dematerialized','hs-minimized');var fr=field.getBoundingClientRect();clearSpatial(node);imp(node,'position','absolute');imp(node,'inset','auto');imp(node,'left',Math.max(10,(fr.width-360)/2)+'px');imp(node,'top','30px');imp(node,'width',Math.min(420,Math.max(280,fr.width-20))+'px');imp(node,'height','auto');imp(node,'resize','both');node.style.zIndex=String(++z);return;}arrange(mode);}
    function minimize(node){node.classList.add('hs-minimized');node.setAttribute('aria-hidden','true');var shelf=document.getElementById('windowShelf');if(shelf){var b=shelf.querySelector('[data-restore="'+node.dataset.thought+'"]');if(!b){b=document.createElement('button');b.type='button';b.dataset.restore=node.dataset.thought;b.textContent=node.dataset.thought;b.onclick=function(){restore(node);};shelf.appendChild(b);}shelf.hidden=false;}if(mode!=='freeform')arrange(mode);}
    function restore(node){node.classList.remove('hs-minimized','dematerialized');node.removeAttribute('aria-hidden');var b=document.querySelector('[data-restore="'+node.dataset.thought+'"]');if(b)b.remove();var shelf=document.getElementById('windowShelf');if(shelf&&!shelf.children.length)shelf.hidden=true;place(node);}
    function tile(){arrange('tile');}
    function stack(){arrange('stack');}

    function startDrag(e){
      if(global.matchMedia&&global.matchMedia(MOBILE).matches)return;
      var bar=e.target.closest('.thought-bar');if(!bar||e.target.closest('button,a,input,select,textarea'))return;var node=bar.closest('.thought');if(!node)return;
      // Direct manipulation is an implicit unsnap: dragging any card enters freeform instead of
      // snapping the card back after release.
      if(mode!=='freeform')freeform();
      e.preventDefault();e.stopImmediatePropagation();var nr=node.getBoundingClientRect(),fr=field.getBoundingClientRect();drag={node:node,id:e.pointerId,sx:e.clientX,sy:e.clientY,left:nr.left-fr.left,top:nr.top-fr.top};node.style.zIndex=String(++z);node.classList.add('dragging');field.setPointerCapture&&field.setPointerCapture(e.pointerId);
    }
    function moveDrag(e){if(!drag||e.pointerId!==drag.id)return;e.preventDefault();var node=drag.node,maxX=Math.max(0,field.clientWidth-node.offsetWidth),maxY=Math.max(0,field.scrollHeight-node.offsetHeight),left=Math.max(0,Math.min(maxX,drag.left+e.clientX-drag.sx)),top=Math.max(0,Math.min(maxY,drag.top+e.clientY-drag.sy));imp(node,'left',left+'px');imp(node,'top',top+'px');}
    function endDrag(e){if(!drag||e.pointerId!==drag.id)return;drag.node.classList.remove('dragging');drag=null;hint('Card moved. Headspace remains freeform until you choose Snap Grid, Tile or Stack.');}
    field.addEventListener('pointerdown',startDrag,true);field.addEventListener('pointermove',moveDrag,true);field.addEventListener('pointerup',endDrag,true);field.addEventListener('pointercancel',endDrag,true);

    return{place:place,snap:function(){arrange('grid');},snapNode:snapNode,organize:function(){arrange('grid');},tile:tile,stack:stack,freeform:freeform,minimize:minimize,restore:restore,visible:visible,arrange:arrange,getMode:function(){return mode;}};
  }

  function wireOpacity(field){var slider=document.getElementById('headspaceOpacity');if(!slider||slider.dataset.ibisOpacityReady==='true')return;slider.dataset.ibisOpacityReady='true';function apply(raw){var value=Math.max(50,Math.min(100,Number(raw||slider.value||100)))/100;slider.value=String(Math.round(value*100));field.style.setProperty('--thought-opacity',String(value));document.querySelectorAll('.thought:not(.dematerialized)').forEach(function(n){n.style.setProperty('opacity',String(value),'important');});}slider.addEventListener('input',function(){apply();});slider.addEventListener('change',function(){apply();});field.__ibisSetOpacity=apply;apply();}

  function init(){var field=document.getElementById('field');if(!field)return;var api=manager(field);global.FTN=global.FTN||{};global.FTN.HeadspaceWindowManager=api;
    var stackBtn=document.querySelector('[data-arrange="stack"]');if(stackBtn&&!document.querySelector('[data-arrange="freeform"]')){var free=document.createElement('button');free.type='button';free.dataset.arrange='freeform';free.textContent='Freeform';free.title='Unsnap cards and move them freely';stackBtn.insertAdjacentElement('afterend',free);}
    document.querySelectorAll('[data-arrange]').forEach(function(button){button.addEventListener('click',function(e){e.preventDefault();var a=button.dataset.arrange;if(a==='tile')api.tile();else if(a==='stack')api.stack();else if(a==='freeform')api.freeform();else api.organize();});});
    document.querySelectorAll('[data-minimize]').forEach(function(button){button.addEventListener('click',function(e){e.stopPropagation();var n=button.closest('.thought');if(n)api.minimize(n);});});wireOpacity(field);
    global.addEventListener('resize',function(){if(api.getMode()==='freeform'||global.matchMedia&&global.matchMedia(MOBILE).matches)return;clearTimeout(global.__ibisHeadspaceWindowResize);global.__ibisHeadspaceWindowResize=setTimeout(function(){api.arrange(api.getMode());},120);});setTimeout(function(){api.organize();},150);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
