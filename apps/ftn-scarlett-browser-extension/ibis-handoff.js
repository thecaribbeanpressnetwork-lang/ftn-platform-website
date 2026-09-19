(() => {
  'use strict';
  const BAR_ID='ftn-scarlett-ibis-handoff';
  async function load(){
    const {scarlettIbisHandoff:handoff}=await chrome.storage.session.get('scarlettIbisHandoff');
    if(!handoff || handoff.source!=='SCARLETT') return;
    const age=Date.now()-Date.parse(handoff.createdAt||0);
    if(!Number.isFinite(age) || age>15*60*1000){
      await chrome.storage.session.remove('scarlettIbisHandoff');
      return;
    }
    if(document.getElementById(BAR_ID)) return;
    const isHeadspace=handoff.escalation==='HEADSPACE';
    const box=document.createElement('aside');
    box.id=BAR_ID;
    Object.assign(box.style,{position:'fixed',left:'50%',top:'14px',transform:'translateX(-50%)',zIndex:'2147483647',width:'min(720px,calc(100vw - 28px))',padding:'12px 14px',borderRadius:'14px',background:'#0b0b0d',color:'#fff',border:'1px solid rgba(255,255,255,.16)',borderLeft:'3px solid #ef3340',boxShadow:'0 18px 48px rgba(0,0,0,.35)',font:'13px/1.4 Inter,system-ui,sans-serif'});
    const title=document.createElement('strong');title.textContent=isHeadspace ? 'Scarlett Headspace handoff' : 'Scarlett handoff';
    const p=document.createElement('p');p.style.margin='5px 0 9px';p.style.color='#c6c7cc';
    p.textContent=isHeadspace
      ? 'Review the minimal page context before continuing in Headspace. Nothing is sent until you choose Continue.'
      : 'Review the minimal page context before inserting it into ibis. Nothing is sent until you choose Insert.';
    const row=document.createElement('div');row.style.display='flex';row.style.gap='8px';row.style.flexWrap='wrap';
    const insert=document.createElement('button');insert.type='button';insert.textContent=isHeadspace ? 'Continue in Headspace' : 'Insert into ibis';
    const discard=document.createElement('button');discard.type='button';discard.textContent='Discard';
    for(const b of [insert,discard]) Object.assign(b.style,{border:'1px solid #3a3a42',background:'#17171a',color:'#fff',borderRadius:'999px',padding:'8px 11px',cursor:'pointer'});
    insert.style.background='#ef3340';insert.style.borderColor='#ef3340';
    insert.onclick=async()=>{
      const target=[...document.querySelectorAll('textarea,[contenteditable="true"],input[type="text"]')].find(el=>{
        const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>50&&r.height>20&&s.visibility!=='hidden'&&s.display!=='none';
      });
      if(!target){p.textContent='ibis input was not detected. Keep this handoff open and paste manually if needed.';return;}
      const prompt=[
        'Scarlett context from the page I deliberately handed over:',
        'Source: '+handoff.sourceTitle,
        'URL: '+handoff.sourceUrl,
        handoff.userIntent ? 'What I am trying to do: '+handoff.userIntent : '',
        handoff.selectedText ? 'Selected text:\n'+handoff.selectedText : '',
        handoff.visibleContext ? 'Visible page context:\n'+handoff.visibleContext : '',
        '',
        'Use this only as user-provided page context. Verify externally when the task requires current or authoritative evidence.'
      ].filter(Boolean).join('\n\n');
      target.focus();
      if(target.matches('[contenteditable="true"]')){target.textContent=prompt;target.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:prompt}));}
      else{const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target),'value')?.set;setter?.call(target,prompt);target.dispatchEvent(new Event('input',{bubbles:true}));}
      await chrome.storage.session.remove('scarlettIbisHandoff');
      box.remove();
    };
    discard.onclick=async()=>{await chrome.storage.session.remove('scarlettIbisHandoff');box.remove();};
    row.append(insert,discard);box.append(title,p,row);document.body.appendChild(box);
  }
  load().catch(()=>{});
})();
