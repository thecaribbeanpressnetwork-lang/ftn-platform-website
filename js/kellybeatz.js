const form=document.getElementById('brief-form');form?.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const values=new FormData(form);const message=['Hello KellyBeatz,','Inquiry: '+values.get('type'),String(values.get('project')).trim(),values.get('budget')?'Budget: '+String(values.get('budget')).trim():'',values.get('timing')?'Timing: '+String(values.get('timing')).trim():''].filter(Boolean).join('\n');document.getElementById('message-preview').textContent=message;document.getElementById('send-message').href='sms:+17047838313?body='+encodeURIComponent(message);const ready=document.getElementById('prepared');ready.hidden=false;ready.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});});

if(form)form.hidden=false;

document.querySelectorAll('.release-preview').forEach(button=>button.addEventListener('click',()=>{
 const box=button.nextElementSibling;const opening=box.hidden;
 document.querySelectorAll('.release-embed').forEach(other=>{other.replaceChildren();other.hidden=true;other.previousElementSibling.setAttribute('aria-expanded','false');});
 if(!opening)return;
 window.dispatchEvent(new Event('pause-kelly-video'));
 const iframe=document.createElement('iframe');iframe.src=button.dataset.embed;iframe.title=button.closest('article').querySelector('h4').textContent+' audio preview';iframe.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';iframe.loading='eager';iframe.referrerPolicy='strict-origin-when-cross-origin';box.append(iframe);box.hidden=false;button.setAttribute('aria-expanded','true');
}));
