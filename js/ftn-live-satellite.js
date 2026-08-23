// FTN Live — source-backed Caribbean satellite surface.
(function(global){
  'use strict';
  var ENDPOINT='https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-live-sources';
  var PUBLISHABLE_KEY='sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';

  function addStyles(){
    if(document.getElementById('ftn-live-satellite-style'))return;
    var s=document.createElement('style');s.id='ftn-live-satellite-style';s.textContent='\
.ftn-sat{background:#05070b;color:#fff;border-bottom:1px solid #242831}.ftn-sat__wrap{width:min(1240px,calc(100% - 32px));margin:auto;padding:22px 0 30px}.ftn-sat__head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:14px}.ftn-sat__head h1{margin:4px 0 0;font:800 clamp(28px,4vw,50px)/1 Montserrat,Inter,sans-serif}.ftn-sat__kicker{color:#ff4651;font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.ftn-sat__status{font-size:11px;color:#aab1bc;text-align:right}.ftn-sat__grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.55fr);gap:14px}.ftn-sat__image{position:relative;min-height:240px;border:1px solid #303641;border-radius:16px;overflow:hidden;background:linear-gradient(145deg,#11151c,#07090d);display:grid;place-items:center}.ftn-sat__image img{display:block;width:100%;height:100%;min-height:240px;max-height:70vh;object-fit:cover}.ftn-sat__loading{color:#aeb6c1;font-weight:700}.ftn-sat__badge{position:absolute;left:12px;top:12px;background:rgba(5,7,11,.82);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:900}.ftn-sat__panel{border:1px solid #303641;border-radius:16px;background:#0d1117;padding:16px;display:flex;flex-direction:column;gap:13px}.ftn-sat__panel h2{font-size:18px;margin:0}.ftn-sat__panel p{margin:0;color:#b0b7c2;line-height:1.55;font-size:12px}.ftn-sat__meta{display:grid;gap:8px}.ftn-sat__meta div{display:flex;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid #242a33;font-size:11px}.ftn-sat__meta span{color:#8993a0}.ftn-sat__actions{display:grid;gap:7px;margin-top:auto}.ftn-sat__actions button,.ftn-sat__actions a{display:block;text-align:center;text-decoration:none;border:1px solid #3a424e;border-radius:9px;background:#171d26;color:#fff;padding:10px;font-weight:850;cursor:pointer}.ftn-sat__actions .primary{background:#e10613;border-color:#e10613}.ftn-sat__note{font-size:10px!important;color:#7f8996!important}.ftn-sat__error{padding:28px;color:#ff8790;max-width:60ch}@media(max-width:780px){.ftn-sat__head{align-items:flex-start;flex-direction:column}.ftn-sat__status{text-align:left}.ftn-sat__grid{grid-template-columns:1fr}.ftn-sat__image,.ftn-sat__image img{min-height:180px}.ftn-sat__panel{padding:13px}}';document.head.appendChild(s);
  }
  function mount(){
    if(document.querySelector('.ftn-sat'))return;
    var hero=document.querySelector('.observatory-hero');if(!hero)return;
    addStyles();
    var sec=document.createElement('section');sec.className='ftn-sat';sec.setAttribute('aria-label','Current Caribbean satellite imagery');
    sec.innerHTML='<div class="ftn-sat__wrap"><div class="ftn-sat__head"><div><div class="ftn-sat__kicker">FTN LIVE · TRINIDAD AND TOBAGO OBSERVATION ROOM</div><h2>See Trinidad and Tobago as it is unfolding.</h2></div><div class="ftn-sat__status" id="ftn-sat-status">Connecting to NOAA GOES-19…</div></div><div class="ftn-sat__grid"><div class="ftn-sat__image" id="ftn-sat-image"><span class="ftn-sat__loading">Loading current Caribbean satellite image…</span></div><aside class="ftn-sat__panel"><div><div class="ftn-sat__kicker">CURRENT PUBLISHED VIEW</div><h2>GOES-19 · Caribbean</h2></div><p>Current NOAA GeoColor satellite imagery covering Trinidad and Tobago and the wider Caribbean: approximately true colour by day and multispectral infrared at night.</p><div class="ftn-sat__meta"><div><span>Official source</span><strong>NOAA / NESDIS / STAR</strong></div><div><span>Product</span><strong>GeoColor</strong></div><div><span>Source timestamp</span><strong id="ftn-sat-time">Checking…</strong></div><div><span>Expected cadence</span><strong>~10 min</strong></div></div><div class="ftn-sat__actions"><button type="button" class="primary" id="ftn-sat-refresh">Refresh image</button><button type="button" id="ftn-sat-loop" hidden>Animate recent imagery</button><a id="ftn-sat-source" href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=car&src=nav" target="_blank" rel="noopener noreferrer">Open original NOAA source</a><a href="https://www.metoffice.gov.tt/observations/satellite-imagery" target="_blank" rel="noopener noreferrer">T&amp;T Met Office satellite views</a></div><p class="ftn-sat__note">Informational situational awareness only. Use official meteorological and emergency authorities for operational warnings and decisions.</p></aside></div></div>';
    // Inserted after the compact Observer Console (Status/Correlation), not before the page
    // hero -- a full satellite panel gating the entire first 1366x768 viewport above any compact
    // multi-signal overview is exactly the "long stack of large website cards" pattern Observer
    // is meant to move away from. Falls back to right after the hero if the console isn't found.
    var console=document.getElementById('observer-console');
    if(console&&console.parentNode){console.parentNode.insertBefore(sec,console.nextSibling);}
    else{hero.parentNode.insertBefore(sec,hero.nextSibling);}
    document.getElementById('ftn-sat-refresh').addEventListener('click',function(){load(true);});
  }
  function load(force){
    var status=document.getElementById('ftn-sat-status'),host=document.getElementById('ftn-sat-image');if(!status||!host)return;
    status.textContent='Refreshing NOAA GOES-19…';
    var controller=typeof AbortController==='function'?new AbortController():null;
    var timer=controller?setTimeout(function(){controller.abort();},18000):0;
    fetch(ENDPOINT+(force?'?t='+Date.now():''),{headers:{'Accept':'application/json','apikey':PUBLISHABLE_KEY},signal:controller?controller.signal:undefined}).then(function(r){return r.json().then(function(b){if(!r.ok)throw new Error(b.error||'Satellite source unavailable');return b;});}).then(function(data){
      if(timer)clearTimeout(timer);
      var sat=data.satellite||{};if(!sat.imageUrl)throw new Error('Current satellite image was not returned by NOAA.');
      var img=new Image();img.alt='Current GOES-19 GeoColor satellite view of the Caribbean';img.decoding='async';img.onload=function(){host.innerHTML='';host.appendChild(img);var badge=document.createElement('span');badge.className='ftn-sat__badge';badge.textContent='CURRENT NOAA IMAGE';host.appendChild(badge);};img.onerror=function(){host.innerHTML='<p class="ftn-sat__error">The NOAA image could not be loaded in this browser. Use the NOAA source link while FTN retries.</p>';};img.src=sat.imageUrl+(sat.imageUrl.indexOf('?')===-1?'?':'&')+'ftn='+Date.now();
      document.getElementById('ftn-sat-time').textContent=sat.sourceTimestamp||'Latest published image';document.getElementById('ftn-sat-source').href=sat.sourceUrl||document.getElementById('ftn-sat-source').href;status.textContent=(sat.sourceTimestamp?'NOAA image · '+sat.sourceTimestamp:'Latest NOAA Caribbean image');
      var loop=document.getElementById('ftn-sat-loop');if(sat.loopUrl){loop.hidden=false;loop.onclick=function(){img.src=sat.loopUrl+(sat.loopUrl.indexOf('?')===-1?'?':'&')+'ftn='+Date.now();loop.textContent='Showing recent loop';};}
    }).catch(function(err){if(timer)clearTimeout(timer);status.textContent='NOAA connection unavailable';var message=err&&err.name==='AbortError'?'FTN stopped waiting for the upstream source after 18 seconds.':String(err.message||err);host.innerHTML='<div class="ftn-sat__error"><strong>Satellite source temporarily unavailable.</strong><br>'+message+'<br><br>FTN has kept the direct NOAA source available at right.</div>';});
  }
  function init(){mount();load(false);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
