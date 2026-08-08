/* Physical DJ controller adapter. Web MIDI is the primary path; WebHID is optional for
 * controllers that expose HID reports rather than MIDI. Browser support varies by device. */
export class DJControllerAdapter {
  constructor({onControl=()=>{}}={}){this.onControl=onControl;this.access=null;this.inputs=new Map();this.devices=new Map();}
  async enableMIDI(){if(!navigator.requestMIDIAccess)throw new Error('Web MIDI is unavailable in this browser');this.access=await navigator.requestMIDIAccess({sysex:false});for(const input of this.access.inputs.values())this._attachMIDI(input);this.access.onstatechange=e=>{if(e.port.type==='input'&&e.port.state==='connected')this._attachMIDI(e.port);};return [...this.inputs.keys()];}
  _attachMIDI(input){if(this.inputs.has(input.id))return;input.onmidimessage=e=>this._parseMIDI(input,e.data);this.inputs.set(input.id,input);}
  _parseMIDI(input,data){const [status,note,value]=data;const type=status&0xf0;const channel=(status&0x0f)+1;if(type===0x90||type===0x80)this.onControl({device:input.name,kind:'pad',channel,note,value,pressed:type===0x90&&value>0});else if(type===0xb0)this.onControl({device:input.name,kind:'cc',channel,control:note,value,normalized:value/127});else if(type===0xe0)this.onControl({device:input.name,kind:'pitch',channel,value:((value<<7)+note)-8192,normalized:(((value<<7)+note)-8192)/8192});}
  async enableHID(){if(!navigator.hid)throw new Error('WebHID is unavailable in this browser');const devices=await navigator.hid.requestDevice({filters:[]});for(const d of devices){await d.open();d.addEventListener('input',e=>this.onControl({device:d.productName,kind:'hid',data:new Uint8Array(e.data.buffer)}));this.devices.set(d.productId,d);}return devices;}
  disconnect(){for(const i of this.inputs.values())i.onmidimessage=null;this.inputs.clear();}
}
