// FTN Screen — cinema-only positioning and reusable festival submission package.
(function (global) {
  'use strict';
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function init(){
    var content=document.getElementById('workspace-content');
    if(!content){setTimeout(init,120);return;}
    if(document.getElementById('screen-festival-package'))return;

    document.title='FTN Screen — Caribbean Movies & Cinema | FTN Platform';
    var desc=document.querySelector('meta[name="description"]'); if(desc)desc.content='FTN Screen is the Caribbean movie and cinema home for films, documentaries, shorts, premieres, discovery and filmmaker submissions.';
    var hero=content.querySelector('.screen-hero');
    if(hero){var h=hero.querySelector('h2');var p=hero.querySelector('p');if(h)h.textContent='Turn a Caribbean movie into a complete cinema record.';if(p)p.textContent='Capture the creative identity, origin, story, credits, rights and distribution details that make a film ready for discovery, programming and festival submission.';}
    var studio=content.querySelector('.screen-panel h3'); if(studio)studio.textContent='Build the movie package';

    var panel=document.createElement('section');
    panel.className='screen-panel'; panel.id='screen-festival-package';
    panel.innerHTML='<span class="screen-kicker">Festival Package</span><h3>Prepare one package. Adapt it to many festivals.</h3><p class="workspace-muted">Create a reusable submission record for international, Caribbean and independent film festivals. FTN Festival Scout can later match this package against live calls.</p>'+
      '<form id="screen-festival-form" class="screen-form" data-ftn-draft="true">'+
      '<div class="workspace-field"><label>Film title</label><input name="title" required></div><div class="workspace-field"><label>Director</label><input name="director" required></div>'+
      '<div class="workspace-field"><label>Producer / production company <span class="workspace-field__hint">(optional)</span></label><input name="producer"></div><div class="workspace-field"><label>Country / territory</label><input name="country" required></div>'+
      '<div class="workspace-field"><label>Runtime</label><input name="runtime" placeholder="1h 42m" required></div><div class="workspace-field"><label>Production year</label><input name="year" inputmode="numeric"></div>'+
      '<div class="workspace-field"><label>Genre / category</label><input name="genre" placeholder="Feature, documentary, short, animation..."></div><div class="workspace-field"><label>Language(s)</label><input name="language"></div>'+
      '<div class="workspace-field workspace-field--wide"><label>Logline</label><textarea name="logline" required></textarea></div><div class="workspace-field workspace-field--wide"><label>Synopsis</label><textarea name="synopsis" required></textarea></div>'+
      '<div class="workspace-field workspace-field--wide"><label>Cast / key crew <span class="workspace-field__hint">(optional)</span></label><textarea name="credits"></textarea></div><div class="workspace-field workspace-field--wide"><label>Director bio <span class="workspace-field__hint">(optional)</span></label><textarea name="directorBio"></textarea></div>'+
      '<div class="workspace-field"><label>Trailer URL <span class="workspace-field__hint">(optional)</span></label><input name="trailer" type="url"></div><div class="workspace-field"><label>Private/public screener URL <span class="workspace-field__hint">(optional)</span></label><input name="screener" type="url"></div>'+
      '<div class="workspace-field"><label>Poster / key art URL <span class="workspace-field__hint">(optional)</span></label><input name="poster" type="url"></div><div class="workspace-field"><label>Stills / press-kit URL <span class="workspace-field__hint">(optional)</span></label><input name="stills" type="url"></div>'+
      '<div class="workspace-field"><label>Subtitle availability</label><input name="subtitles" placeholder="English, French, Spanish, SRT available..."></div><div class="workspace-field"><label>Premiere status</label><input name="premiere" placeholder="World premiere, Caribbean premiere, already released..."></div>'+
      '<div class="workspace-field workspace-field--wide"><label>Festival history / awards <span class="workspace-field__hint">(optional)</span></label><textarea name="festivalHistory"></textarea></div><div class="workspace-field workspace-field--wide"><label>Rights / territories / restrictions</label><textarea name="rights" required></textarea></div>'+
      '<div class="workspace-field"><label>Submission contact</label><input name="contact" autocomplete="email" required></div><div class="workspace-field"><label>What are you trying to achieve? <span class="workspace-field__hint">(optional)</span></label><textarea name="intent" placeholder="Premiere, distribution, awards qualification, sales agent, Caribbean exposure..."></textarea></div>'+
      '<div class="screen-form__actions"><button type="submit" class="btn btn-primary">Build Festival Package</button></div></form><div id="screen-festival-output"></div>';
    var history=content.querySelector('.screen-history-panel'); if(history)content.insertBefore(panel,history);else content.appendChild(panel);

    var form=panel.querySelector('form'),out=panel.querySelector('#screen-festival-output');
    form.addEventListener('submit',function(e){e.preventDefault();var data={schemaVersion:1,recordType:'screen_festival_package',generatedAt:new Date().toISOString()};Array.prototype.forEach.call(form.elements,function(el){if(el.name)data[el.name]=el.value.trim();});if(!data.title||!data.director||!data.country||!data.runtime||!data.logline||!data.synopsis||!data.rights||!data.contact){out.innerHTML='<div class="workspace-output"><h3>Complete the essentials</h3><p>Title, director, country, runtime, logline, synopsis, rights and contact are required.</p></div>';return;}
      var text=['FTN Screen — Festival Submission Package',''];Object.keys(data).forEach(function(k){if(k==='schemaVersion'||k==='recordType')return;text.push(k.replace(/([A-Z])/g,' $1').replace(/^./,function(s){return s.toUpperCase();})+': '+(data[k]||'(not provided)'));});
      out.innerHTML='<div class="workspace-output"><h3>'+esc(data.title)+' — Festival Package</h3><p>'+esc(data.country)+' · '+esc(data.runtime)+' · '+esc(data.genre||'Film')+'</p><p>'+esc(data.logline)+'</p><p><strong>Package ready:</strong> reusable metadata, rights, assets and creator intent can now be adapted to individual festival requirements.</p></div>';
      if(global.FTN&&global.FTN.SmartExport&&global.FTN.SmartExport.registerArtifact){global.FTN.SmartExport.registerArtifact({id:'screen-festival-package',productId:'screen',label:data.title+' — Festival Package',description:'Reusable FTN Screen festival-submission package.',formats:[{id:'txt',label:'TXT',filename:data.title+'-festival-package.txt',makeFile:function(){return new Blob([text.join('\n')],{type:'text/plain'});}},{id:'json',label:'JSON',filename:data.title+'-festival-package.json',makeFile:function(){return new Blob([JSON.stringify(data,null,2)],{type:'application/json'});}}]});}
      try{localStorage.setItem('ftn-screen-festival-latest',JSON.stringify(data));}catch(err){}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
