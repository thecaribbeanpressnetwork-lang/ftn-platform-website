(function(){
 const btn=document.querySelector('[data-menu-toggle]'); const nav=document.getElementById('main-nav');
 if(btn&&nav){btn.addEventListener('click',function(){const on=this.getAttribute('aria-expanded')==='true';this.setAttribute('aria-expanded',String(!on));nav.classList.toggle('open',!on);});}
 const search=document.getElementById('resource-search');
 if(search){ const items=Array.from(document.querySelectorAll('[data-resource]')); const empty=document.querySelector('.no-results'); search.addEventListener('input',()=>{const q=search.value.toLocaleLowerCase().trim();let n=0; for(const el of items){const show=el.textContent.toLocaleLowerCase().includes(q);el.hidden=!show;if(show)n++;} if(empty)empty.classList.toggle('show',n===0);});}
})();
