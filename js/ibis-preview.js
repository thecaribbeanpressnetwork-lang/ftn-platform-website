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
