export const STEPS = 128;
const major = [0,2,4,5,7,9,11,12,14,16,17,19,21,23,24];
export const TRACKS = [
  { id:'keys', name:'Plucky keys', description:'The little chord stabs', program:4, channel:0, pitches:major.map(n=>n+60).reverse(), volume:.66 },
  { id:'bass', name:'Bouncy bass', description:'Extremely pleased to be here', program:33, channel:1, pitches:major.map(n=>n+36).reverse(), volume:.9 },
  { id:'marimba', name:'Marimba', description:'The tune stuck in your head', program:12, channel:2, pitches:major.map(n=>n+72).reverse(), volume:.68 },
  { id:'drums', name:'Pocket drums', description:'A polite amount of swagger', channel:9, pitches:[42,46,37,38,36], volume:.72 },
];
const drumNames={42:'Closed hat',46:'Shaker',37:'Rim click',38:'Snare',36:'Kick'};
export const noteName = pitch => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1);
export const pitchLabel = (track,pitch) => track==='drums'?drumNames[pitch]:noteName(pitch);
export const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
export const stepDuration = bpm => 60/bpm/4;
export const stepOffset = (step,bpm,swing) => (step+(step%2?swing:0))*stepDuration(bpm);

// Original eight-bar tune: Cmaj9 / Am9 / Dm9 / G13 / Fmaj9 / Em7 / Dm9 / G13.
export function defaultSong(){
  let id=0;const tracks=TRACKS.map(t=>({id:t.id,muted:false,volume:t.volume,notes:[]}));
  const add=(track,step,pitch,length=1,velocity=.8)=>tracks[track].notes.push({id:`n${++id}`,step,pitch,length,velocity});
  const chords=[[64,67,71,74],[60,64,67,71],[60,64,65,69],[65,69,71,76],[64,67,69,72],[62,67,71,74],[60,64,65,69],[65,69,71,74]];
  const roots=[36,45,38,43,41,40,38,43],fifths=[43,52,45,50,48,47,45,50];
  const tunes=[[[2,76],[5,79],[7,83],[10,81],[12,79]],[[0,76],[3,74],[6,72],[10,76],[14,79]],[[2,77],[4,81],[7,84],[10,83],[13,81]],[[0,79],[3,76],[6,74],[10,77],[14,74]],[[2,81],[5,84],[7,88],[10,86],[12,84]],[[0,83],[3,79],[6,76],[10,79],[14,74]],[[0,77],[3,81],[6,84],[9,81],[12,77]],[[0,79],[3,77],[6,74],[10,71+12],[14,74]]];
  for(let bar=0;bar<8;bar++){
    const base=bar*16;
    for(const beat of [0,6,10])chords[bar].forEach((p,i)=>add(0,base+beat,p,beat===0?3:2,.56+i*.035));
    for(const [s,p,l,v] of [[0,roots[bar],3,.92],[6,roots[bar]+12,1,.7],[8,fifths[bar],2,.83],[11,roots[bar]+12,1,.64],[14,roots[(bar+1)%8],2,.76]])add(1,base+s,p,l,v);
    tunes[bar].forEach(([s,p],i)=>add(2,base+s,p,i%3===0?2:1,i%2?.66:.82));
    [0,7,8,...(bar%2?[14]:[])].forEach(s=>add(3,base+s,36,1,s===0?.88:.66));
    [4,12].forEach(s=>add(3,base+s,38,1,.62));
    [2,6,10,14].forEach(s=>add(3,base+s,42,1,.38));
    [1,3,5,9,11,13,15].forEach(s=>add(3,base+s,46,1,s%4===3?.2:.12));
    if(bar%2)add(3,base+15,37,1,.4);
  }
  return {version:1,bpm:108,swing:.16,tracks};
}

export function validSong(value){
  if(!value||value.version!==1||!Number.isFinite(value.bpm)||value.bpm<60||value.bpm>160||!Number.isFinite(value.swing)||value.swing<0||value.swing>.3||!Array.isArray(value.tracks)||value.tracks.length!==4)return false;
  const ids=new Set();
  return value.tracks.every((t,i)=>t.id===TRACKS[i].id&&typeof t.muted==='boolean'&&Number.isFinite(t.volume)&&t.volume>=0&&t.volume<=1&&Array.isArray(t.notes)&&t.notes.length<=512&&t.notes.every(n=>{
    if(!n||typeof n.id!=='string'||!/^[\w-]{1,50}$/.test(n.id)||ids.has(n.id))return false;ids.add(n.id);
    return Number.isInteger(n.step)&&n.step>=0&&n.step<STEPS&&TRACKS[i].pitches.includes(n.pitch)&&Number.isInteger(n.length)&&n.length>=1&&n.length<=8&&n.step+n.length<=STEPS&&Number.isFinite(n.velocity)&&n.velocity>0&&n.velocity<=1;
  }));
}
export function updateNote(song,trackId,id,patch){
  const track=song.tracks.find(t=>t.id===trackId),config=TRACKS.find(t=>t.id===trackId);
  const note=track?.notes.find(n=>n.id===id);if(!note)return false;
  const next={...note,...patch};
  if(!Number.isFinite(next.step)||!Number.isFinite(next.length)||!Number.isFinite(next.velocity))return false;
  next.step=clamp(Math.round(next.step),0,STEPS-1);next.length=clamp(Math.round(next.length),1,Math.min(8,STEPS-next.step));next.velocity=clamp(next.velocity,.05,1);
  if(!config.pitches.includes(next.pitch)||track.notes.some(n=>n.id!==id&&n.step===next.step&&n.pitch===next.pitch))return false;
  Object.assign(note,{step:next.step,pitch:next.pitch,length:next.length,velocity:next.velocity});return true;
}

const ascii = s => [...s].map(c=>c.charCodeAt(0));
const u32 = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
function vlq(n){let bytes=[n&127];while((n>>>=7)>0)bytes.unshift((n&127)|128);return bytes;}
function chunk(events){
  events.sort((a,b)=>a.time-b.time||a.order-b.order);let last=0,bytes=[];
  for(const e of events){bytes.push(...vlq(e.time-last),...e.bytes);last=e.time;}
  bytes.push(...vlq(Math.max(0,STEPS*120-last)),255,47,0);
  return [...ascii('MTrk'),...u32(bytes.length),...bytes];
}
export function exportMidi(song){
  if(!validSong(song))throw new Error('Invalid music score');
  const tempo=Math.round(60000000/song.bpm);
  const conductor=chunk([{time:0,order:0,bytes:[255,81,3,(tempo>>>16)&255,(tempo>>>8)&255,tempo&255]},{time:0,order:1,bytes:[255,88,4,4,2,24,8]}]);
  const tracks=song.tracks.map((track,i)=>{
    const config=TRACKS[i],name=ascii(config.name),ch=config.channel;
    const events=[{time:0,order:-3,bytes:[255,3,name.length,...name]},{time:0,order:-2,bytes:[176+ch,7,Math.round(track.volume*127)]}];
    if(config.program!==undefined)events.push({time:0,order:-1,bytes:[192+ch,config.program]});
    if(!track.muted)for(const n of track.notes){
      const time=Math.round((n.step+(n.step%2?song.swing:0))*120);
      events.push({time,order:1,bytes:[144+ch,n.pitch,Math.round(n.velocity*127)]});
      events.push({time:Math.min(STEPS*120,time+Math.round(n.length*120*.88)),order:0,bytes:[128+ch,n.pitch,0]});
    }
    return chunk(events);
  });
  return new Uint8Array([...ascii('MThd'),0,0,0,6,0,1,0,5,1,224,...conductor,...tracks.flat()]);
}
