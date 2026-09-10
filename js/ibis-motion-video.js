// ibis Motion Video — zero-cost, on-device deterministic motion renderer.
// This is NOT represented as native text-to-video AI. It converts an ibis-generated/owned still
// into a genuine WebM video artifact in the browser with no external video provider and no spend.
(function(global){
'use strict';
var FTN=global.FTN=global.FTN||{};
function supportedMime(){
  var choices=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  for(var i=0;i<choices.length;i++)if(global.MediaRecorder&&MediaRecorder.isTypeSupported(choices[i]))return choices[i];
  return 'video/webm';
}
function loadImage(src){return new Promise(function(resolve,reject){var img=new Image();img.onload=function(){resolve(img);};img.onerror=function(){reject(new Error('Could not load motion source image.'));};img.src=src;});}
function dimensions(format){var f=String(format||'').toLowerCase();if(f.indexOf('9:16')>=0||f.indexOf('portrait')>=0)return{w:720,h:1280};if(f.indexOf('1:1')>=0||f.indexOf('square')>=0)return{w:900,h:900};return{w:1280,h:720};}
async function render(source,options){
  options=options||{};
  if(!global.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('This browser cannot render on-device video.');
  var img=await loadImage(source),d=dimensions(options.format),seconds=Math.max(3,Math.min(8,Number(options.duration||5))),fps=30;
  var canvas=document.createElement('canvas');canvas.width=d.w;canvas.height=d.h;var ctx=canvas.getContext('2d',{alpha:false});
  var stream=canvas.captureStream(fps),mime=supportedMime(),chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});
  var finished=new Promise(function(resolve,reject){recorder.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data);};recorder.onerror=function(e){reject(e.error||new Error('Motion render failed.'));};recorder.onstop=function(){var blob=new Blob(chunks,{type:mime});if(!blob.size){reject(new Error('Motion render produced an empty artifact.'));return;}resolve({blob:blob,mimeType:mime,extension:'webm',duration:seconds,width:d.w,height:d.h,renderer:'ibis-on-device-motion-v1',aiNativeVideo:false});};});
  recorder.start(250);var started=performance.now(),durationMs=seconds*1000;
  await new Promise(function(resolve){function frame(now){var p=Math.min(1,(now-started)/durationMs),ease=p*p*(3-2*p),zoom=1+0.09*ease;var iw=img.naturalWidth,ih=img.naturalHeight,scale=Math.max(d.w/iw,d.h/ih)*zoom,dw=iw*scale,dh=ih*scale;var driftX=(ease-.5)*d.w*.035,driftY=Math.sin(ease*Math.PI)*d.h*.018;ctx.fillStyle='#000';ctx.fillRect(0,0,d.w,d.h);ctx.drawImage(img,(d.w-dw)/2+driftX,(d.h-dh)/2-driftY,dw,dh);if(typeof options.onProgress==='function')options.onProgress(p);if(p<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  recorder.stop();stream.getTracks().forEach(function(t){t.stop();});return finished;
}
FTN.IbisMotionVideo={render:render,kind:'DETERMINISTIC_MOTION_VIDEO',zeroCost:true,externalProvider:false};
})(window);
