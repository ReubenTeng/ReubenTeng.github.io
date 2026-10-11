import { defaultSong, validSong, TRACKS, STEPS, stepDuration, stepOffset, clamp } from './music-score.js';
const SONG_KEY='rt-after-hours-v1',PREF_KEY='rt-music-settings';
const copy=value=>JSON.parse(JSON.stringify(value));

// One audio engine owns the site's soundtrack. Opening/closing the editor never restarts it.
export class MuseumMusic {
  constructor(storage=globalThis.localStorage){
    this.storage=storage;this.song=defaultSong();this.volume=.32;this.enabled=true;this.playing=false;this.listeners=new Set();this.history=[];this.future=[];this.sources=new Set();this.queue=[];this.step=-1;this.nextStep=0;this.error='';this.saved=true;this.request=0;
    try{const saved=JSON.parse(storage.getItem(SONG_KEY));if(validSong(saved))this.song=saved;const prefs=JSON.parse(storage.getItem(PREF_KEY));if(prefs){this.enabled=prefs.enabled!==false;if(Number.isFinite(prefs.volume))this.volume=clamp(prefs.volume,0,1);}}catch{}
  }
  subscribe(fn){this.listeners.add(fn);fn();return()=>this.listeners.delete(fn);}
  emit(){for(const fn of this.listeners)fn();}
  save(){try{this.storage.setItem(SONG_KEY,JSON.stringify(this.song));this.saved=true;}catch{this.saved=false;}}
  savePrefs(){try{this.storage.setItem(PREF_KEY,JSON.stringify({enabled:this.enabled,volume:this.volume}));}catch{}}
  edit(fn){const before=copy(this.song);fn(this.song);if(!validSong(this.song)){this.song=before;return false;}if(JSON.stringify(before)===JSON.stringify(this.song))return false;this.history.push(before);if(this.history.length>60)this.history.shift();this.future=[];this.save();this.syncMix();this.emit();return true;}
  undo(){if(!this.history.length)return;this.future.push(copy(this.song));this.song=this.history.pop();this.save();this.syncMix();this.emit();}
  redo(){if(!this.future.length)return;this.history.push(copy(this.song));this.song=this.future.pop();this.save();this.syncMix();this.emit();}
  reset(){this.edit(song=>Object.assign(song,defaultSong()));}
  initialize(){
    if(this.context)return;
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Audio)throw new Error('This browser cannot play the synthesizer. You can still edit and export MIDI.');
    const c=this.context=new Audio();
    this.master=c.createGain();this.master.gain.value=this.volume*.65;
    const compressor=c.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=18;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.2;
    compressor.connect(this.master);this.master.connect(c.destination);this.output=compressor;
    const verb=c.createConvolver(),impulse=c.createBuffer(2,Math.floor(c.sampleRate*.65),c.sampleRate);
    for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)*.45;}
    verb.buffer=impulse;const wet=c.createGain();wet.gain.value=.16;verb.connect(wet);wet.connect(compressor);this.verb=verb;
    this.buses=TRACKS.map((t,i)=>{const bus=c.createGain();bus.connect(compressor);if(i===0||i===2)bus.connect(verb);return bus;});
    this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    this.syncMix();
  }
  syncMix(){if(!this.context)return;this.song.tracks.forEach((t,i)=>this.buses[i].gain.setTargetAtTime(t.muted?0:t.volume,this.context.currentTime,.015));}
  setVolume(volume){this.volume=clamp(volume,0,1);this.savePrefs();if(this.context)this.master.gain.setTargetAtTime(this.volume*.65,this.context.currentTime,.015);this.emit();}
  async play(user=true){
    if(this.playing)return;const request=++this.request;
    if(user){this.enabled=true;this.savePrefs();}
    try{
      this.initialize();await this.context.resume();if(request!==this.request)return;
      if(this.context.state!=='running')throw new Error('Tap Play to enable sound in this browser.');
      this.error='';this.playing=true;this.nextStep=this.step<0?0:(this.step+1)%STEPS;this.nextTime=this.context.currentTime+.05;this.queue=[];
      clearInterval(this.timer);this.schedule();this.timer=setInterval(()=>this.schedule(),25);this.emit();
    }catch(error){this.error=error.message;this.playing=false;this.emit();}
  }
  pause(user=true){++this.request;if(user){this.enabled=false;this.savePrefs();}this.playing=false;clearInterval(this.timer);this.queue=[];this.silence();this.emit();}
  toggle(){if(this.playing)this.pause();else this.play();}
  silence(){for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();}
  schedule(){
    if(!this.playing||this.context.state!=='running')return;
    const now=this.context.currentTime;
    // A throttled tab drops missed beats instead of firing an accumulated burst of notes.
    if(this.nextTime<now-.15)this.nextTime=now+.03;
    while(this.nextTime<now+.12){
      const step=this.nextStep,time=this.nextTime;
      this.song.tracks.forEach((track,i)=>{if(!track.muted)for(const note of track.notes)if(note.step===step)this.voice(i,note,time,note.length*stepDuration(this.song.bpm)*.88);});
      this.queue.push({step,time});
      this.nextTime+=stepDuration(this.song.bpm)*(step%2?1-this.song.swing:1+this.song.swing);this.nextStep=(step+1)%STEPS;
    }
    let changed=false;while(this.queue.length&&this.queue[0].time<=now){this.step=this.queue.shift().step;changed=true;}
    if(changed)this.emit();
  }
  async preview(track,note){
    try{this.initialize();await this.context.resume();this.voice(track,note,this.context.currentTime+.008,.18);}catch(error){this.error=error.message;this.emit();}
  }
  voice(track,note,time,duration){
    const c=this.context,bus=this.buses[track],velocity=note.velocity;
    const start=(source,gain,filter)=>{source.connect(gain);if(filter){gain.connect(filter);filter.connect(bus);}else gain.connect(bus);source.start(time);this.sources.add(source);source.onended=()=>{source.disconnect();gain.disconnect();filter?.disconnect();this.sources.delete(source);};};
    const tone=(type,freq,amplitude,decay,release=.045,slide)=>{
      const osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,time);if(slide)osc.frequency.exponentialRampToValueAtTime(slide,time+decay);
      gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amplitude*velocity),time+.004);gain.gain.exponentialRampToValueAtTime(.0001,time+Math.max(.01,decay));
      start(osc,gain);osc.stop(time+decay+release);
    };
    const noise=(amplitude,decay,freq,type)=>{
      const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();source.buffer=this.noise;filter.type=type;filter.frequency.value=freq;filter.Q.value=.65;gain.gain.setValueAtTime(amplitude*velocity,time);gain.gain.exponentialRampToValueAtTime(.0001,time+decay);start(source,gain,filter);source.stop(time+decay+.02);
    };
    if(track===3){
      if(note.pitch===36){tone('sine',135,.8,.19,.03,45);tone('triangle',75,.12,.045);}
      if(note.pitch===38){noise(.38,.13,1700,'highpass');tone('triangle',175,.16,.08);}
      if(note.pitch===37){tone('sine',780,.25,.025);tone('triangle',1450,.07,.017);}
      if(note.pitch===42)noise(.24,.045,6800,'highpass');
      if(note.pitch===46)noise(.2,.085,9000,'highpass');
      return;
    }
    const f=440*Math.pow(2,(note.pitch-69)/12);
    if(track===0){tone('sine',f,.19,Math.min(.7,duration+.13));tone('sine',f*2,.048,.11);tone('sine',f*3,.012,.045);}
    if(track===1){tone('triangle',f,.27,Math.max(.1,duration));tone('sine',f,.26,Math.max(.1,duration));tone('sine',f*2,.035,.055);}
    if(track===2){tone('sine',f,.32,Math.min(.65,duration+.16));tone('sine',f*4,.05,.047);tone('sine',f*10,.008,.016);}
  }
  destroy(){this.pause(false);this.listeners.clear();this.context?.close();}
}

export function installMusicBar(music,root){
  root.innerHTML=`<button class="music-toggle" data-music-toggle aria-label="Play background music">▶</button><a href="#studio" class="music-title"><span class="music-eq" aria-hidden="true"><i></i><i></i><i></i></span><span><strong>Lobby after hours</strong><small data-music-state>FIRST CLICK STARTS THE GROOVE</small></span></a><label class="music-volume">Volume <input type="range" min="0" max="100" value="${Math.round(music.volume*100)}" aria-label="Background music volume"></label><a class="music-edit" href="#sequencer">Remix this ↗</a><span class="sr-only" data-music-error role="status"></span>`;
  root.querySelector('[data-music-toggle]').addEventListener('click',()=>music.toggle());
  root.querySelector('input').addEventListener('input',e=>music.setVolume(Number(e.target.value)/100));
  music.subscribe(()=>{const button=root.querySelector('[data-music-toggle]');button.textContent=music.playing?'Ⅱ':'▶';button.setAttribute('aria-label',music.playing?'Pause background music':'Play background music');root.classList.toggle('is-playing',music.playing);root.querySelector('[data-music-state]').textContent=music.error?'TAP PLAY TO RETRY':music.playing?`${music.song.bpm} BPM · YOUR MUSEUM SOUNDTRACK`:music.enabled&&music.step<0?'FIRST CLICK STARTS THE GROOVE':'PAUSED · PRESS PLAY';root.querySelector('[data-music-error]').textContent=music.error;root.querySelector('input').value=Math.round(music.volume*100);});
  const start=e=>{if(e.type==='keydown'&&['Tab','Shift','Alt','Control','Meta','Escape'].includes(e.key))return;if(e.type==='keydown'&&e.repeat)return;document.removeEventListener('click',start);document.removeEventListener('keydown',start);if(music.enabled&&!e.target.closest('[data-music-toggle],[data-transport]'))music.play(false);};
  document.addEventListener('click',start);document.addEventListener('keydown',start);
  let resume=false;
  document.addEventListener('visibilitychange',()=>{if(document.hidden){resume=music.playing;music.pause(false);}else if(resume&&music.enabled){resume=false;music.play(false);}});
  window.addEventListener('pagehide',()=>music.pause(false));
}
