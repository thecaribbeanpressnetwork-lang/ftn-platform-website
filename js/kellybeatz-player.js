/* Visible YouTube adapter: Amari's native-audio source cannot be reused for third-party recordings. */
(() => {
  const loadButton=document.getElementById('load-player');
  if(!loadButton)return;
  const items=[...document.querySelectorAll('[data-track]')];
  const status=document.getElementById('player-status');
  const title=document.getElementById('current-track');
  const reason=document.getElementById('track-reason');
  const watch=document.getElementById('watch-current');
  let tracks=[],current=0,player=null,ready=false,loading=false,wantsPlayback=false;
  const data=fetch('/data/kellybeatz-listening.json').then(response=>{if(!response.ok)throw Error('Catalog unavailable');return response.json();}).then(value=>{tracks=value;return value;});
  function select(index){
    current=(index+tracks.length)%tracks.length;
    const track=tracks[current];
    title.textContent=track.title+' / '+track.artist;
    reason.textContent=track.reason;
    watch.href='https://www.youtube.com/watch?v='+encodeURIComponent(track.id);
    items.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===current)));
  }
  async function play(index){
    try{
      await data;select(index);wantsPlayback=true;
      if(ready){player.loadVideoById(tracks[current].id);return;}
      if(loading)return;
      loading=true;loadButton.hidden=true;status.textContent='Loading the selected release video…';
      window.onYouTubeIframeAPIReady=()=>{
        player=new YT.Player('youtube-player',{
          host:'https://www.youtube-nocookie.com',videoId:tracks[current].id,
          playerVars:{playsinline:1,controls:1,origin:location.origin,rel:0},
          events:{
            onReady:()=>{ready=true;status.textContent='Use the visible video controls for play, pause, volume and seeking.';if(wantsPlayback)player.playVideo();},
            onStateChange:event=>{if(event.data===YT.PlayerState.ENDED)play(current+1);},
            onError:event=>{document.getElementById('video-frame').dataset.playerError=String(event.data);status.textContent='This video cannot play here. Use “Watch on YouTube”, or choose another recording.';}
          }
        });
      };
      const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
      script.onerror=()=>{loading=false;loadButton.hidden=false;status.textContent='YouTube could not load. The direct listening links remain available.';};document.head.append(script);
    }catch(error){status.textContent='The listening session is unavailable. Use the direct YouTube links below.';loadButton.hidden=false;loading=false;}
  }
  items.forEach(button=>button.addEventListener('click',()=>play(Number(button.dataset.track))));
  loadButton.addEventListener('click',()=>play(current));
  document.getElementById('previous-track').addEventListener('click',()=>play(current-1));
  document.getElementById('next-track').addEventListener('click',()=>play(current+1));
  document.querySelector('.listening').addEventListener('keydown',event=>{
    if(event.code!=='Space'||!ready||/INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target.tagName))return;
    event.preventDefault();player.getPlayerState()===YT.PlayerState.PLAYING?player.pauseVideo():player.playVideo();
  });
  data.catch(()=>{status.textContent='Use the direct release links to listen.';});
})();
