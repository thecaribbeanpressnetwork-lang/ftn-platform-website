const form=document.getElementById('askForm');
const input=document.getElementById('askInput');
const whisper=document.getElementById('whisper');
if(form&&input&&whisper){
  form.addEventListener('submit',(event)=>{
    event.preventDefault();
    const query=input.value.trim();
    if(!query){
      whisper.textContent='Tell ibis what you are trying to make happen.';
      input.focus();
      return;
    }
    document.body.classList.add('entering-headspace');
    whisper.textContent='Entering Headspace…';
    const destination='/ibis-headspace-preview/?q='+encodeURIComponent(query);
    setTimeout(()=>{window.location.href=destination;},420);
  });
  document.querySelectorAll('[data-fill]').forEach((button)=>{
    button.addEventListener('click',()=>{
      input.value=button.dataset.fill||'';
      input.focus();
      whisper.textContent='Ready.';
    });
  });
}
const capabilityStatus=document.getElementById('capabilityStatus');
if(capabilityStatus){
  fetch('/data/ibis-capability-registry.json',{headers:{Accept:'application/json'}}).then((response)=>{if(!response.ok)throw new Error('registry unavailable');return response.json();}).then((registry)=>{
    const order=['LIVE','ENABLED','SOURCE_READY','CANDIDATE','DISCOVERY','BLOCKED'];
    const counts=Object.fromEntries(order.map((status)=>[status,0]));
    (registry.tools||[]).forEach((tool)=>{if(Object.hasOwn(counts,tool.status))counts[tool.status]+=1;});
    capabilityStatus.replaceChildren(...order.map((status)=>{
      const card=document.createElement('article');card.className='system';
      const top=document.createElement('div');top.className='system__top';
      const label=document.createElement('span');label.className='system__tag';label.textContent=status.replace('_',' ');
      const count=document.createElement('span');count.className='system__signal';count.textContent=String(counts[status]);
      const heading=document.createElement('h3');heading.textContent=status==='LIVE'?'Deployed and verified':status==='ENABLED'?'Adapter enabled':status==='SOURCE_READY'?'Built; release gate open':status==='CANDIDATE'?'Reviewed candidate':status==='DISCOVERY'?'Identity/terms discovery':'Not eligible now';
      const note=document.createElement('p');note.textContent=status==='LIVE'?'Reachable production infrastructure.':status==='ENABLED'?'Usable only when its current health and permission checks pass.':status==='SOURCE_READY'?'Source exists, but deployment or live acceptance remains.':status==='CANDIDATE'?'Not executable until integration, health, licence and permission gates pass.':status==='DISCOVERY'?'A lead only; primary-source verification is incomplete.':'Explicitly unavailable or rejected by policy.';
      top.append(label,count);card.append(top,heading,note);return card;
    }));
  }).catch(()=>{capabilityStatus.querySelector('h3').textContent='Capability registry unavailable';capabilityStatus.querySelector('p').textContent='ibis will not guess which tools are live. Retry after the registry is reachable.';});
}
