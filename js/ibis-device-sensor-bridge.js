// FTN Platform — browser/device sensor bridge for ibis field intelligence.
// Every sensitive capability requires the browser/OS/user permission path. No thermal emulation:
// true thermal data is accepted only from a real thermal-capable device/adapter.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{},adapters=new Map(),activeStreams=new Set();
  function supported(){var n=global.navigator||{};return{
    camera:!!(n.mediaDevices&&n.mediaDevices.getUserMedia),microphone:!!(n.mediaDevices&&n.mediaDevices.getUserMedia),mediaEnumerate:!!(n.mediaDevices&&n.mediaDevices.enumerateDevices),
    geolocation:!!n.geolocation,orientation:'DeviceOrientationEvent'in global,motion:'DeviceMotionEvent'in global,
    usb:!!n.usb,hid:!!n.hid,serial:!!n.serial,bluetooth:!!n.bluetooth,midi:!!n.requestMIDIAccess,nfc:'NDEFReader'in global,
    screenCapture:!!(n.mediaDevices&&n.mediaDevices.getDisplayMedia),webxr:!!n.xr
  };}
  async function enumerateMedia(){if(!supported().mediaEnumerate)return[];var rows=await navigator.mediaDevices.enumerateDevices();return rows.map(function(d){return{kind:d.kind,label:d.label||null,deviceId:d.deviceId||null,groupId:d.groupId||null};});}
  async function camera(options){if(!supported().camera)throw new Error('Camera API unavailable.');var stream=await navigator.mediaDevices.getUserMedia({video:options&&options.video||{facingMode:(options&&options.facingMode)||'environment'},audio:!!(options&&options.audio)});activeStreams.add(stream);return stream;}
  async function microphone(options){if(!supported().microphone)throw new Error('Microphone API unavailable.');var stream=await navigator.mediaDevices.getUserMedia({audio:options&&options.audio||true,video:false});activeStreams.add(stream);return stream;}
  async function screen(options){if(!supported().screenCapture)throw new Error('Screen capture unavailable.');var stream=await navigator.mediaDevices.getDisplayMedia(options||{video:true,audio:false});activeStreams.add(stream);return stream;}
  function stopStream(stream){if(stream&&stream.getTracks)stream.getTracks().forEach(function(t){t.stop();});activeStreams.delete(stream);}
  function stopAll(){Array.from(activeStreams).forEach(stopStream);}
  async function location(options){if(!supported().geolocation)throw new Error('Geolocation unavailable.');return new Promise(function(resolve,reject){navigator.geolocation.getCurrentPosition(function(p){resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,altitude:p.coords.altitude,altitudeAccuracy:p.coords.altitudeAccuracy,heading:p.coords.heading,speed:p.coords.speed,timestamp:p.timestamp});},reject,options||{enableHighAccuracy:true,timeout:10000,maximumAge:0});});}
  function watchLocation(callback,options){if(!supported().geolocation)throw new Error('Geolocation unavailable.');var id=navigator.geolocation.watchPosition(function(p){callback(null,{latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,altitude:p.coords.altitude,heading:p.coords.heading,speed:p.coords.speed,timestamp:p.timestamp});},function(e){callback(e);},options||{enableHighAccuracy:true,maximumAge:1000});return function(){navigator.geolocation.clearWatch(id);};}
  function orientation(callback){if(!supported().orientation)throw new Error('Orientation sensor unavailable.');var fn=function(e){callback({alpha:e.alpha,beta:e.beta,gamma:e.gamma,absolute:!!e.absolute,timestamp:Date.now()});};global.addEventListener('deviceorientation',fn);return function(){global.removeEventListener('deviceorientation',fn);};}
  function motion(callback){if(!supported().motion)throw new Error('Motion sensor unavailable.');var fn=function(e){callback({acceleration:e.acceleration,accelerationIncludingGravity:e.accelerationIncludingGravity,rotationRate:e.rotationRate,interval:e.interval,timestamp:Date.now()});};global.addEventListener('devicemotion',fn);return function(){global.removeEventListener('devicemotion',fn);};}
  async function requestUsb(filters){if(!supported().usb)throw new Error('WebUSB unavailable.');return navigator.usb.requestDevice({filters:filters||[]});}
  async function requestHid(filters){if(!supported().hid)throw new Error('WebHID unavailable.');return navigator.hid.requestDevice({filters:filters||[]});}
  async function requestSerial(filters){if(!supported().serial)throw new Error('Web Serial unavailable.');return navigator.serial.requestPort(filters&&filters.length?{filters:filters}:undefined);}
  async function requestBluetooth(options){if(!supported().bluetooth)throw new Error('Web Bluetooth unavailable.');return navigator.bluetooth.requestDevice(options||{acceptAllDevices:true});}
  async function requestMidi(options){if(!supported().midi)throw new Error('Web MIDI unavailable.');return navigator.requestMIDIAccess(options||{});}
  function registerInstrument(type,adapter){type=String(type||'').trim().toLowerCase();if(!type||!adapter||typeof adapter.connect!=='function')throw new Error('Instrument adapter requires type and connect().');adapters.set(type,adapter);return true;}
  async function connectInstrument(type,options){type=String(type||'').toLowerCase();var a=adapters.get(type);if(!a)return{success:false,blocked:true,code:'NO_INSTRUMENT_ADAPTER',type:type};var result=await a.connect(options||{});return{success:true,type:type,data:result};}
  function thermalPolicy(input){var source=input&&input.sourceType||'',real=!!(input&&input.realThermalSensor);if(!real)return{allowed:false,code:'THERMAL_SENSOR_REQUIRED',reason:'ibis will not infer or fabricate true thermal measurements from an ordinary RGB camera.'};return{allowed:true,sourceType:source||'THERMAL_SENSOR'};}
  function capabilityReport(){var s=supported();return{browser:s,requiresLocalBridge:Object.keys(s).filter(function(k){return!s[k];}),thermalRequiresPhysicalSensor:true,permissioned:true};}
  FTN.DeviceSensorBridge={supported:supported,capabilityReport:capabilityReport,enumerateMedia:enumerateMedia,camera:camera,microphone:microphone,screen:screen,stopStream:stopStream,stopAll:stopAll,location:location,watchLocation:watchLocation,orientation:orientation,motion:motion,requestUsb:requestUsb,requestHid:requestHid,requestSerial:requestSerial,requestBluetooth:requestBluetooth,requestMidi:requestMidi,registerInstrument:registerInstrument,connectInstrument:connectInstrument,thermalPolicy:thermalPolicy};
})(typeof window!=='undefined'?window:globalThis);
