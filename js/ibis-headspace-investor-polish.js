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

  function exitFocus(card){
    if(!card)return;
    card.classList.remove('hs-focus');
    card.removeAttribute('aria-modal');
    document.body.classList.remove('hs-focus-active');
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

  function makeAnswerPrimary(){
    var answer=document.querySelector('.thought-answer');
    if(answer)answer.setAttribute('aria-label','ibis primary answer');
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
