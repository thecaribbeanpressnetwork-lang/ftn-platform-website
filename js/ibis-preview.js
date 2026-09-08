const form=document.getElementById('askForm');
const input=document.getElementById('askInput');
const whisper=document.getElementById('whisper');
if(form&&input&&whisper){
  form.addEventListener('submit',(event)=>{
    event.preventDefault();
    const query=input.value.trim();
    whisper.textContent=query
      ? `ibis preview captured your intent: “${query}” — live reasoning is not connected on this preview branch.`
      : 'Tell ibis what you are trying to make happen.';
  });
  document.querySelectorAll('[data-fill]').forEach((button)=>{
    button.addEventListener('click',()=>{
      input.value=button.dataset.fill||'';
      input.focus();
      whisper.textContent='Ready to ask. This preview does not store the information.';
    });
  });
}
const menu=document.getElementById('menu');
const rail=document.getElementById('rail');
if(menu&&rail){
  menu.addEventListener('click',()=>{
    const open=rail.classList.toggle('open');
    menu.setAttribute('aria-expanded',String(open));
  });
}
