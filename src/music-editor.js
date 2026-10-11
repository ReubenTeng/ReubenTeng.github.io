import { TRACKS, STEPS, clamp, pitchLabel, updateNote, exportMidi } from './music-score.js';

export function editorMarkup(){return `<div class="music-studio">
  <header class="studio-heading"><div><p class="eyebrow">THE MUSIC ROOM / MAKE YOURSELF HEARD</p><h2 id="panel-title">Lobby after hours<span>VOL. 01</span></h2><p>Bouncy bass. Plucky keys. Absolutely no closing time.</p></div><span class="studio-disc" aria-hidden="true">♫</span></header>
  <div class="studio-transport"><button class="primary-button" data-transport>▶ Play</button><label>Tempo <input data-tempo type="range" min="60" max="160" step="1" aria-label="Tempo"><output data-tempo-value></output></label><label>Swing <input data-swing type="range" min="0" max="30" step="1" aria-label="Swing"><output data-swing-value></output></label><label>Volume <input data-master type="range" min="0" max="100" aria-label="Studio master volume"></label><span class="studio-position" data-position>01 / 08</span></div>
  <div class="studio-workspace"><aside class="studio-tracks" aria-label="Instrument tracks">${TRACKS.map((t,i)=>`<button data-track="${i}" aria-pressed="${i===2}"><span class="track-number">0${i+1}</span><span><strong>${t.name}</strong><small>${t.description}</small></span><span data-track-light="${i}" class="track-light" aria-hidden="true"></span></button>`).join('')}<p>Eight bars, on repeat.<br>Everything you change becomes the museum’s background music.</p></aside>
  <div class="studio-sequence"><div class="sequence-toolbar"><div class="bar-pages" aria-label="Choose bars">${[0,1,2,3].map(i=>`<button data-page="${i}" aria-pressed="${i===0}">${i*2+1}–${i*2+2}</button>`).join('')}</div><span class="sequence-scale" data-scale></span><button data-track-mute aria-pressed="false">Mute track</button></div>
  <div class="piano-scroll"><div class="piano-content"><div class="piano-ruler"><span>BARS</span><div data-ruler></div></div><div class="piano-body"><div class="piano-labels" data-labels aria-hidden="true"></div><div class="piano-roll" data-roll tabindex="0" role="group" aria-label="Piano roll. Arrow keys move the cursor. Enter adds a note. Select a note and use arrows to move it, Delete to remove it." aria-describedby="roll-help"><div data-notes></div><div class="roll-cursor" data-cursor aria-hidden="true"></div><div class="roll-playhead" data-playhead aria-hidden="true" hidden></div></div></div></div></div>
  <div class="note-tools"><span data-selection>Click an empty space to add a note</span><label>Length <select data-length aria-label="Note length"><option value="1">1/16</option><option value="2">1/8</option><option value="4">1/4</option><option value="8">1/2</option></select></label><button data-delete disabled>Delete note</button><label>Track level <input data-track-volume type="range" min="0" max="100" aria-label="Selected track volume"></label></div>
  <p id="roll-help" class="studio-help">Tap to add · drag notes to move · select + Delete to erase. Keyboard: arrows + Enter on the grid. Notes stay in C major; your ears are welcome.</p></div></div>
  <footer class="studio-footer"><div><button data-undo disabled>↶ Undo</button><button data-redo disabled>↷ Redo</button><button data-clear>Clear these 2 bars</button></div><span data-save>Saved on this device</span><div><button data-export>Export .mid ↓</button><button data-restore>↺ I ruined it</button></div></footer><p class="studio-feedback" data-feedback role="status" aria-live="polite">An original little tune. Make it yours.</p>
</div>`;}

export function mountMusicEditor(root,music){
  const $=s=>root.querySelector(s),abort=new AbortController(),listen=(target,event,fn)=>target.addEventListener(event,fn,{signal:abort.signal});
  let trackIndex=2,page=0,selected=null,length=2,cursor={step:0,row:7},drag=null,serial=0,renderedSong='';
  const config=()=>TRACKS[trackIndex],track=()=>music.song.tracks[trackIndex],rowHeight=()=>trackIndex===3?48:24;
  const message=text=>{$('[data-feedback]').textContent=text;};
  const selectedNote=()=>track().notes.find(n=>n.id===selected);
  function syncSelection(){
    const n=selectedNote();if(n){length=n.length;$('[data-selection]').textContent=`${pitchLabel(config().id,n.pitch)} · bar ${Math.floor(n.step/16)+1}, step ${n.step%16+1}`;}else{$('[data-selection]').textContent=`${pitchLabel(config().id,config().pitches[cursor.row])} · step ${cursor.step+1} — Enter to add`;}
    $('[data-delete]').disabled=!n;$('[data-length]').value=String(length);
    root.querySelectorAll('[data-note]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.note===selected)));
    Object.assign($('[data-cursor]').style,{left:`${cursor.step/32*100}%`,top:`${cursor.row*rowHeight()}px`,height:`${rowHeight()}px`});
  }
  function renderNotes(){
    const pitches=config().pitches,h=rowHeight();
    $('[data-roll]').style.height=`${pitches.length*h}px`;$('[data-roll]').style.setProperty('--row-height',`${h}px`);
    $('[data-labels]').innerHTML=pitches.map(p=>`<span style="height:${h}px">${pitchLabel(config().id,p)}</span>`).join('');
    $('[data-ruler]').innerHTML=Array.from({length:8},(_,i)=>`<span>${page*2+Math.floor(i/4)+1}<small>.${i%4+1}</small></span>`).join('');
    $('[data-notes]').innerHTML=track().notes.filter(n=>n.step>=page*32&&n.step<(page+1)*32).map(n=>`<button class="roll-note" data-note="${n.id}" style="left:${(n.step-page*32)/32*100}%;top:${pitches.indexOf(n.pitch)*h+3}px;width:calc(${Math.min(n.length,(page+1)*32-n.step)/32*100}% - 3px);height:${h-6}px" aria-label="${pitchLabel(config().id,n.pitch)}, bar ${Math.floor(n.step/16)+1}, step ${n.step%16+1}, length ${n.length} sixteenths" aria-pressed="${n.id===selected}"><span>${pitchLabel(config().id,n.pitch)}</span></button>`).join('');
    $('[data-scale]').textContent=trackIndex===3?'DRUM MACHINE':'C MAJOR · 1/16 GRID';
    root.querySelectorAll('[data-track]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.track)===trackIndex)));
    root.querySelectorAll('[data-page]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.page)===page)));
    $('[data-track-mute]').setAttribute('aria-pressed',String(track().muted));$('[data-track-mute]').textContent=track().muted?'Unmute track':'Mute track';$('[data-track-volume]').value=Math.round(track().volume*100);syncSelection();
  }
  function renderTransport(){
    $('[data-transport]').textContent=music.playing?'Ⅱ Pause':'▶ Play';$('[data-tempo]').value=music.song.bpm;$('[data-tempo-value]').textContent=`${music.song.bpm} BPM`;$('[data-swing]').value=Math.round(music.song.swing*100);$('[data-swing-value]').textContent=`${Math.round(music.song.swing*100)}%`;$('[data-master]').value=Math.round(music.volume*100);
    $('[data-position]').textContent=`${String(Math.floor(Math.max(0,music.step)/16)+1).padStart(2,'0')} / 08`;
    const playhead=$('[data-playhead]');playhead.hidden=!music.playing||music.step<page*32||music.step>=(page+1)*32;playhead.style.left=`${(music.step-page*32)/32*100}%`;
    root.querySelectorAll('[data-track-light]').forEach((el,i)=>{el.classList.toggle('muted',music.song.tracks[i].muted);el.classList.toggle('hit',music.playing&&!music.song.tracks[i].muted&&music.song.tracks[i].notes.some(n=>n.step===music.step));});
    $('[data-undo]').disabled=!music.history.length;$('[data-redo]').disabled=!music.future.length;$('[data-save]').textContent=music.saved?'Your remix · saved on this device':'Playing · device storage unavailable';
    if(music.error)message(music.error);
    const score=JSON.stringify(music.song);if(score!==renderedSong){renderedSong=score;renderNotes();}
  }
  const unsubscribe=music.subscribe(renderTransport);
  function add(step,row){
    const pitch=config().pitches[row],existing=track().notes.find(n=>n.step===step&&n.pitch===pitch);
    if(existing){selected=existing.id;syncSelection();return;}
    if(track().notes.length>=512){message('This track is full. Delete a few notes to make room.');return;}
    const n={id:`edit-${Date.now().toString(36)}-${serial++}`,step,pitch,length:Math.min(trackIndex===3?1:length,STEPS-step),velocity:.75};selected=n.id;
    music.edit(song=>song.tracks[trackIndex].notes.push(n));music.preview(trackIndex,n);message(`${pitchLabel(config().id,pitch)} added. Your remix is live.`);
  }
  function remove(){const n=selectedNote();if(!n)return;music.edit(song=>{song.tracks[trackIndex].notes=song.tracks[trackIndex].notes.filter(x=>x.id!==n.id);});selected=null;syncSelection();message('Note deleted. Undo can bring it back.');}
  function move(n,step,row){music.edit(song=>updateNote(song,config().id,n.id,{step,pitch:config().pitches[row]}));const updated=selectedNote();if(updated)music.preview(trackIndex,updated);}
  listen(root,'click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.hasAttribute('data-track')){trackIndex=Number(b.dataset.track);selected=null;cursor.row=Math.min(cursor.row,config().pitches.length-1);renderNotes();renderTransport();}
    if(b.hasAttribute('data-page')){page=Number(b.dataset.page);selected=null;renderNotes();renderTransport();}
    if(b.hasAttribute('data-transport'))music.toggle();
    if(b.hasAttribute('data-track-mute'))music.edit(song=>{song.tracks[trackIndex].muted=!track().muted;});
    if(b.hasAttribute('data-delete'))remove();
    if(b.hasAttribute('data-undo')){music.undo();message('Undone.');}
    if(b.hasAttribute('data-redo')){music.redo();message('Redone.');}
    if(b.hasAttribute('data-clear')){music.edit(song=>{song.tracks[trackIndex].notes=track().notes.filter(n=>n.step<page*32||n.step>=(page+1)*32);});selected=null;syncSelection();message('These two bars are clear. Undo is right there.');}
    if(b.hasAttribute('data-restore')){music.reset();selected=null;syncSelection();message('Original groove restored. Your last remix is still in Undo.');}
    if(b.hasAttribute('data-export')){const blob=new Blob([exportMidi(music.song)],{type:'audio/midi'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='lobby-after-hours.mid';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);message('MIDI exported with your notes, tempo, swing and track mix.');}
    // Native keyboard activation selects a note too; pointer selection happens on pointerdown.
    if(b.hasAttribute('data-note')){selected=b.dataset.note;syncSelection();}
  });
  listen($('[data-tempo]'),'input',e=>{$('[data-tempo-value]').textContent=`${e.target.value} BPM`;});
  listen($('[data-tempo]'),'change',e=>music.edit(song=>{song.bpm=Number(e.target.value);}));
  listen($('[data-swing]'),'input',e=>{$('[data-swing-value]').textContent=`${e.target.value}%`;});
  listen($('[data-swing]'),'change',e=>music.edit(song=>{song.swing=Number(e.target.value)/100;}));
  listen($('[data-master]'),'input',e=>music.setVolume(Number(e.target.value)/100));
  listen($('[data-track-volume]'),'change',e=>music.edit(song=>{song.tracks[trackIndex].volume=Number(e.target.value)/100;}));
  listen($('[data-length]'),'change',e=>{length=Number(e.target.value);const n=selectedNote();if(n)music.edit(song=>updateNote(song,config().id,n.id,{length}));});
  function cell(e){const r=$('[data-roll]').getBoundingClientRect();return{step:clamp(Math.floor((e.clientX-r.left)/r.width*32),0,31),row:clamp(Math.floor((e.clientY-r.top)/rowHeight()),0,config().pitches.length-1)};}
  listen($('[data-roll]'),'pointerdown',e=>{
    if(e.button!==0||drag)return;const el=e.target.closest('[data-note]'),n=el&&track().notes.find(n=>n.id===el.dataset.note);const pos=cell(e);cursor=pos;
    if(n){e.preventDefault();selected=n.id;el.focus({preventScroll:true});syncSelection();root.setPointerCapture(e.pointerId);}else{selected=null;syncSelection();}
    drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,el,n:n?{...n}:null,start:pos,target:pos,moved:false};
  });
  listen(root,'pointermove',e=>{
    if(!drag||drag.pointer!==e.pointerId)return;
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;
    if(!drag.n)return;
    e.preventDefault();const pos=cell(e),step=clamp(drag.n.step-page*32+pos.step-drag.start.step,0,31),row=clamp(config().pitches.indexOf(drag.n.pitch)+pos.row-drag.start.row,0,config().pitches.length-1);drag.target={step,row};
    drag.el.style.left=`${step/32*100}%`;drag.el.style.top=`${row*rowHeight()+3}px`;
  });
  listen(root,'pointerup',e=>{
    if(!drag||drag.pointer!==e.pointerId)return;const current=drag;drag=null;
    if(current.n){if(current.moved)move(current.n,page*32+current.target.step,current.target.row);else music.preview(trackIndex,current.n);renderNotes();$(`[data-note="${selected}"]`)?.focus({preventScroll:true});if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);}
    else if(!current.moved){add(page*32+current.start.step,current.start.row);$('[data-roll]').focus({preventScroll:true});}
  });
  const cancel=()=>{if(drag){drag=null;renderNotes();}};listen(root,'pointercancel',cancel);listen(root,'lostpointercapture',cancel);listen(window,'blur',cancel);
  listen(root,'keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,select')){e.preventDefault();if(e.shiftKey)music.redo();else music.undo();return;}
    if(!e.target.closest('[data-roll]'))return;
    const noteEl=e.target.closest('[data-note]'),n=noteEl&&track().notes.find(n=>n.id===noteEl.dataset.note);
    if(['Delete','Backspace'].includes(e.key)&&n){e.preventDefault();selected=n.id;remove();$('[data-roll]').focus();return;}
    if(['Enter',' '].includes(e.key)){e.preventDefault();if(n){selected=n.id;syncSelection();music.preview(trackIndex,n);}else add(page*32+cursor.step,cursor.row);return;}
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();
    const dx=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,dy=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;
    if(n){selected=n.id;move(n,clamp(n.step+dx,page*32,(page+1)*32-1),clamp(config().pitches.indexOf(n.pitch)+dy,0,config().pitches.length-1));$(`[data-note="${n.id}"]`)?.focus({preventScroll:true});}
    else{cursor={step:clamp(cursor.step+dx,0,31),row:clamp(cursor.row+dy,0,config().pitches.length-1)};syncSelection();}
  });
  return()=>{abort.abort();unsubscribe();};
}
