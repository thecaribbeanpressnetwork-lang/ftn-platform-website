// ibis video gate: captures the meaningful cost variables before any provider handoff.
(function(){
  'use strict';
  function mode(root){var b=root.querySelector('[data-studio-mode][aria-pressed="true"]');return b?b.dataset.studioMode:'image';}
  function setup(root){
    var form=root.querySelector('#ibis-studio-form'),fields=form&&form.querySelector('.ibis-studio__fields');
    if(!form||!fields||form.querySelector('.ibis-video-spec'))return;
    var scope=document.createElement('fieldset');scope.className='ibis-video-spec';scope.hidden=true;
    scope.innerHTML='<legend>Video decision details</legend><label>Length<select name="videoDuration"><option value="4">4 seconds</option><option value="6">6 seconds</option><option value="10">10 seconds</option></select></label><label>Quality<select name="videoResolution"><option value="480p">480p</option><option value="720p" selected>720p</option><option value="1080p">1080p</option></select></label><label>Sound<select name="videoSound"><option>No sound</option><option>Sound requested</option></select></label><label>Provider<select name="videoProvider"><option value="PixVerse">PixVerse</option><option value="Kling AI">Kling AI</option></select></label><label>Maximum credits ibis may use<input name="videoCreditCap" inputmode="numeric" pattern="[0-9]*" placeholder="For example: 60"></label><small>ibis uses this as a ceiling, not a price. Before Generate is enabled, it must show the provider’s real quote and the user’s live available balance.</small>';
    fields.insertBefore(scope,fields.lastElementChild);
    function toggle(){scope.hidden=mode(root)!=='video';}
    root.querySelectorAll('[data-studio-mode]').forEach(function(b){b.addEventListener('click',function(){setTimeout(toggle,0);});});toggle();
    form.addEventListener('submit',function(){
      if(mode(root)!=='video')return;
      var d=new FormData(form),out=root.querySelector('#ibis-studio-output');
      setTimeout(function(){
        if(!out||out.querySelector('.ibis-video-gate'))return;
        var duration=d.get('videoDuration'),resolution=d.get('videoResolution'),sound=d.get('videoSound'),provider=d.get('videoProvider'),cap=d.get('videoCreditCap')||'not set';
        var gate=document.createElement('section');gate.className='ibis-video-gate';
        gate.innerHTML='<span class="workspace-kicker">VIDEO DECISION GATE</span><h4>Choose the exact spend before ibis routes the work.</h4><div class="ibis-video-gate__spec"><span>'+resolution+'</span><span>'+duration+' seconds</span><span>'+sound+'</span></div><p><strong>'+provider+'</strong> has not returned a live quote or balance to this FTN session.</p><p class="ibis-video-gate__note">Your credit ceiling: <strong>'+cap+' credits</strong>. ibis must show the actual quote, remaining balance, delivery terms and refund rule before Generate becomes available.</p><div class="ibis-video-gate__actions"><a class="btn btn-outline" href="'+(provider==='PixVerse'?'https://app.pixverse.ai/':'https://app.klingai.com/global/')+'" target="_blank" rel="noopener">Log in to '+provider+'</a><button class="btn btn-primary" type="button" disabled title="Requires a live provider quote and enough available credits">Generate after quote</button></div><p class="ibis-video-gate__status">No prompt was transferred and no credits were reserved.</p>';
        out.querySelector('.ibis-cost-lock').replaceWith(gate);
      },0);
    },true);
  }
  var observer=new MutationObserver(function(){var root=document.getElementById('ibis-creative-studio');if(root){setup(root);observer.disconnect();}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  var existing=document.getElementById('ibis-creative-studio');if(existing)setup(existing);
})();
