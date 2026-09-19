// FTN ibis Headspace — investor-facing interaction polish.
// Additive only: no intelligence, provider, or canonical-brain behavior is changed.
(function(global){
  'use strict';

  function status(message){
    var node=document.getElementById('commandHint');
    if(node)node.textContent=message;
  }

  function labelFor(card){
    var title=card&&card.querySelector('.thought-bar>span');
    return title&&title.textContent?title.textContent.trim().toLowerCase():'window';
  }

  // Live QA finding (2026-09-19): ibis-headspace-window-manager.js positions every card (including
  // while snapped to the grid) with a set of inline styles applied via setProperty(...,'important') --
  // position/inset/width/height/etc. Because inline !important outranks a stylesheet !important of
  // the same origin, `.thought.hs-focus{position:fixed !important; inset:... !important; ...}` in
  // ibis-headspace-investor-polish.css was being completely defeated: toggling focus mode added the
  // class and the aria-modal state correctly, but the card never visually left its grid cell. Fixed
  // by removing exactly the properties the focus-mode CSS needs to own, saving the card's prior
  // style string first so exiting focus restores it byte-for-byte (the window manager's own last
  // arranged/dragged position), never a redesign of the window manager's own layout logic.
  var FOCUS_OVERRIDE_PROPS=['position','inset','top','left','right','bottom','width','height','max-width','max-height','min-width','min-height','resize','grid-column','grid-row','grid-area','transform','z-index'];

  function exitFocus(card){
    if(!card)return;
    card.classList.remove('hs-focus');
    card.removeAttribute('aria-modal');
    document.body.classList.remove('hs-focus-active');
    if(card.dataset.hsFocusPrevStyle!==undefined){
      card.setAttribute('style',card.dataset.hsFocusPrevStyle);
      delete card.dataset.hsFocusPrevStyle;
    }
    var button=card.querySelector('[data-focus-window]');
    if(button){
      button.textContent='↗';
      button.setAttribute('aria-label','Expand '+labelFor(card));
      button.title='Expand';
      button.setAttribute('aria-pressed','false');
    }
  }

  function enterFocus(card){
    if(!card)return;
    document.querySelectorAll('.thought.hs-focus').forEach(function(other){
      if(other!==card)exitFocus(other);
    });
    card.dataset.hsFocusPrevStyle=card.getAttribute('style')||'';
    FOCUS_OVERRIDE_PROPS.forEach(function(prop){card.style.removeProperty(prop);});
    card.classList.add('hs-focus');
    card.setAttribute('aria-modal','true');
    document.body.classList.add('hs-focus-active');
    var button=card.querySelector('[data-focus-window]');
    if(button){
      button.textContent='↙';
      button.setAttribute('aria-label','Restore '+labelFor(card));
      button.title='Restore';
      button.setAttribute('aria-pressed','true');
    }
    card.focus({preventScroll:true});
    status('Focused '+labelFor(card)+'. Press Escape or the restore arrow to return.');
  }

  function toggleFocus(card){
    if(card.classList.contains('hs-focus'))exitFocus(card);else enterFocus(card);
  }

  function installFocusControls(){
    document.querySelectorAll('.thought').forEach(function(card){
      var actions=card.querySelector('.window-actions');
      if(!actions||actions.querySelector('[data-focus-window]'))return;
      var button=document.createElement('button');
      button.type='button';
      button.dataset.focusWindow='true';
      button.textContent='↗';
      button.title='Expand';
      button.setAttribute('aria-label','Expand '+labelFor(card));
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        toggleFocus(card);
      });
      var close=actions.querySelector('[data-close]');
      if(close)actions.insertBefore(button,close);else actions.appendChild(button);
    });
  }

  // Investor hardening fix (2026-09-19, live QA finding): ibis-headspace-window-manager.js's
  // arrange()/snapNode() treats every visible card uniformly, including the answer card, and pins
  // each one to a SINGLE grid cell via inline `grid-column`/`grid-row` (each set with `!important`).
  // Because an inline `!important` declaration outranks a stylesheet `!important` of the same
  // specificity tier, this silently defeated this file's own CSS (.thought-answer{grid-column:1/-1
  // !important}) -- the answer card was rendered at one column's width (441px on a 1440px-wide
  // screen) instead of spanning the full row as the primary surface. A live inspection with the
  // browser's computed-style tools confirmed the exact inline values before this fix. Removing the
  // window manager's own per-card grid placement from the answer card (never rewriting
  // ibis-headspace-window-manager.js itself, which correctly keeps doing this for every OTHER,
  // genuinely tileable/snappable card) lets the stylesheet rule apply normally again.
  function freeAnswerFromGridPlacement(answer){
    if(!answer)return;
    ['grid-column','grid-row','grid-area'].forEach(function(prop){
      if(answer.style.getPropertyValue(prop))answer.style.removeProperty(prop);
    });
  }

  function makeAnswerPrimary(){
    var answer=document.querySelector('.thought-answer');
    if(!answer)return;
    answer.setAttribute('aria-label','ibis primary answer');
    freeAnswerFromGridPlacement(answer);
    if(!answer.__hsPolishObserved){
      answer.__hsPolishObserved=true;
      new MutationObserver(function(){freeAnswerFromGridPlacement(answer);}).observe(answer,{attributes:true,attributeFilter:['style']});
    }
  }

  function keyboard(){
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape')return;
      var focused=document.querySelector('.thought.hs-focus');
      if(focused){
        e.preventDefault();
        exitFocus(focused);
        focused.focus({preventScroll:true});
        status('Returned to Headspace.');
      }
    });
  }

  function init(){
    installFocusControls();
    makeAnswerPrimary();
    keyboard();

    var field=document.getElementById('field');
    if(field){
      var observer=new MutationObserver(function(){
        installFocusControls();
      });
      observer.observe(field,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

  global.FTN=global.FTN||{};
  global.FTN.HeadspaceInvestorPolish={
    focus:function(name){
      var card=document.querySelector('[data-thought="'+String(name||'answer').replace(/"/g,'')+'"]');
      if(card)enterFocus(card);
    },
    restore:function(){
      var card=document.querySelector('.thought.hs-focus');
      if(card)exitFocus(card);
    }
  };
})(window);
