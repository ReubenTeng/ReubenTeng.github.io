import { Museum } from './game.js';
import { photoMotion } from './photo-motion.js';
import { intro, journey, skills, interests, certification, favouriteSites, photographyInstagram, contactLinks } from './content.js';

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const attr = escapeHTML;
let albums=[],loadError=false,worldRoute='#lobby',modalReturn='#lobby',activePhoto=null;
const dialog=$('#panel');
const motion=photoMotion(dialog);
let routeVersion=0;
let seen;
try{const stored=JSON.parse(localStorage.getItem('rt-museum-visited')||'[]');seen=new Set(Array.isArray(stored)?stored.filter(x=>typeof x==='string'):[]);}catch{seen=new Set();}
const totalPhotos=()=>albums.reduce((sum,a)=>sum+a.photos.length,0);
const coverOf=(album)=>album.photos.find(p=>p.id===album.cover)||album.photos[0];
const albumById=(id)=>albums.find(a=>a.id===id);
const photoKey=(a,p)=>`${a.id}/${p.id}`;
const iconArrow='<span aria-hidden="true">↗</span>';
const instagramLink=()=>`<a class="instagram-link" href="${attr(photographyInstagram.url)}" target="_blank" rel="noopener noreferrer">Photography on Instagram <strong>${escapeHTML(photographyInstagram.handle)} ↗</strong></a>`;
const museum=new Museum($('#world'),{
  onInteract:exhibit=>dispatch(exhibit.action),
  onNear:exhibit=>{const button=$('#interact');button.hidden=!exhibit;if(exhibit){button.querySelector('span').textContent=exhibit.label;button.setAttribute('aria-label',exhibit.label);} },
});

function navigate(hash){if(location.hash===hash)route();else location.hash=hash;}
function markSeen(album,photo){seen.add(photoKey(album,photo));try{localStorage.setItem('rt-museum-visited',JSON.stringify([...seen]));}catch{}updateCount();}
function updateCount(){const count=albums.reduce((sum,a)=>sum+a.photos.filter(p=>seen.has(photoKey(a,p))).length,0);$('#visit-count').textContent=count?`${count} / ${totalPhotos()} MOMENTS DISCOVERED`:'YOUR VISIT STARTS HERE';}
function skillMarkup(){return Object.entries(skills).map(([group,items])=>`<section class="skill-group"><h3>${escapeHTML(group)}</h3><div class="tags">${items.map(item=>`<span>${escapeHTML(item)}</span>`).join('')}</div></section>`).join('');}
function entryMarkup(entry){return `<p class="eyebrow">${entry.date}</p><h3>${escapeHTML(entry.name)}</h3><p class="role">${escapeHTML(entry.role)}</p>${entry.description?`<p>${escapeHTML(entry.description)}</p>`:''}<ul>${entry.bullets.map(b=>`<li>${escapeHTML(b)}</li>`).join('')}</ul>`;}
function button(action,label,style='secondary-button',extra=''){return `<button class="${style}" data-action="${action}" ${extra}>${label}</button>`;}
function showPanel(kicker,body,viewer=false){
  const wasOpen=dialog.open,wasViewer=wasOpen&&dialog.classList.contains('viewer');
  motion.reset();
  museum.setPaused(true);dialog.classList.toggle('viewer',viewer);$('#panel-kicker').textContent=kicker;$('#panel-body').innerHTML=body;
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  $('#panel-title')?.setAttribute('tabindex','-1');$('#panel-title')?.focus({preventScroll:true});
  if(viewer&&!wasViewer)motion.open(!wasOpen);
}
function closePanel(){motion.reset();if(dialog.open){dialog.close();museum.setPaused(false);$('#world').focus({preventScroll:true});}activePhoto=null;}
function closeToMap(){navigate(activePhoto?`#album/${activePhoto.album.id}`:modalReturn);}
dialog.addEventListener('cancel',event=>{event.preventDefault();closeToMap();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeToMap();}});
dialog.addEventListener('keydown',event=>{if(activePhoto&&['ArrowLeft','ArrowRight'].includes(event.key)&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){event.preventDefault();changePhoto(event.key==='ArrowRight'?1:-1);}});

function renderGuide(){
  const isLobby=museum.scene==='lobby';
  $('#room-label').textContent=isLobby?'The lobby':museum.scene==='museum'?'The album hall':museum.album.title;
  $('#floor-label').textContent=isLobby?'GROUND FLOOR':'PHOTO MUSEUM';
  document.querySelectorAll('nav a').forEach(link=>link.classList.toggle('active',link.hash===(isLobby?'#lobby':'#museum')));
  if(isLobby){$('#guide').innerHTML=`<p class="guide-eyebrow">A GOOD PLACE TO START</p><h2>Hello, I’m Reuben.</h2><p class="guide-intro">I build technology that makes a meaningful difference. Here’s a little of the journey so far.</p><p class="guide-subtitle">THE JOURNEY <span aria-hidden="true">↓</span></p><div class="journey-list">${journey.map(entry=>`<button class="journey-stop" data-action="exhibit" data-id="${entry.id}"><span class="stop-dot"></span><span><strong>${entry.label}</strong><small>${entry.short}${entry.id==='speedback'?' · BUILDING HEALTHCARE':''}</small></span><span class="arrow">↗</span></button>`).join('')}</div><div class="side-links">${button('skills','⌘ &nbsp; The toolkit','')}${button('interests','♫ &nbsp; Off the clock','')}${button('certification','AWS · 2025','')}</div>${button('museum',`Into the photo museum ${iconArrow}`,'primary-button')}<p class="guide-footnote">${albums.length} ALBUMS · ${totalPhotos()} LITTLE MOMENTS</p>`;}
  else if(museum.scene==='museum'){
    $('#guide').innerHTML=`<p class="guide-eyebrow">THE ART OF NOTICING</p><h2>Moments, collected.</h2><p class="guide-intro">Some places stay with you. Step into a room, or pick up a booklet and see where it takes you.</p><p class="guide-subtitle">CHOOSE A PLACE</p><div class="room-list">${albums.map(a=>{const cover=coverOf(a);return `<button class="room-link" data-action="room" data-id="${attr(a.id)}">${cover?`<img src="${attr(cover.thumbnail)}" alt="">`:''}<span><strong>${escapeHTML(a.title)}</strong><small>${a.photos.length} PHOTOGRAPHS</small></span><span>↗</span></button>`;}).join('')}</div>${albums.length>3?`<div class="section-controls"><button data-action="hallSection" data-section="${museum.section-1}" ${museum.section===0?'disabled':''} aria-label="Previous hall section">←</button><span>HALL ${museum.section+1} / ${Math.ceil(albums.length/3)}</span><button data-action="hallSection" data-section="${museum.section+1}" ${(museum.section+1)*3>=albums.length?'disabled':''} aria-label="Next hall section">→</button></div>`:''}${button('albums',`Browse all albums ${iconArrow}`,'primary-button')}${button('lobby','← Back to the lobby','guide-footnote')}`;
  }else{
    const a=museum.album,cover=coverOf(a),count=a.photos.filter(p=>seen.has(photoKey(a,p))).length;
    $('#guide').innerHTML=`<p class="guide-eyebrow">A PLACE, REMEMBERED</p><h2>${escapeHTML(a.title)}</h2><p class="guide-intro">${escapeHTML(a.description)}</p>${cover?`<img class="guide-photo" src="${attr(cover.thumbnail)}" alt="${attr(cover.alt)}">`:''}<p class="guide-subtitle">${count} OF ${a.photos.length} MOMENTS DISCOVERED</p><p class="guide-intro">Walk up to a frame to take a closer look. The booklet keeps the whole collection in one place.</p>${a.photos.length>6?`<div class="section-controls"><button data-action="section" data-section="${museum.section-1}" ${museum.section===0?'disabled':''} aria-label="Previous gallery section">←</button><span>ROOM ${museum.section+1} / ${Math.ceil(a.photos.length/6)}</span><button data-action="section" data-section="${museum.section+1}" ${(museum.section+1)*6>=a.photos.length?'disabled':''} aria-label="Next gallery section">→</button></div>`:''}${button('booklet',`Open the album booklet ${iconArrow}`,'primary-button',`data-id="${attr(a.id)}"`)}<p class="guide-footnote">${button('museum','← Back to the album hall','')}</p>`;
  }
  if(isLobby)$('#guide .side-links').insertAdjacentHTML('beforeend',button('links','↗ Internet shelf','')+button('contact','☎ Say hello',''));
  else $('#guide').insertAdjacentHTML('beforeend',instagramLink());
}

function showContact(){
  showPanel('THE LOBBY / THE TELEPHONE',`<div class="panel-content"><div class="welcome-symbol" aria-hidden="true">☎</div><p class="eyebrow">LET’S KEEP IN TOUCH</p><h2 id="panel-title">Say hello.</h2><p>Have something in mind? Drop me a message on LinkedIn, or take a look at what I’m building on GitHub.</p><div class="bookmark-grid">${contactLinks.map(link=>`<a class="bookmark-card" href="${attr(link.url)}" target="_blank" rel="noopener noreferrer"><h3>${escapeHTML(link.title)} <span aria-hidden="true">↗</span></h3><p>${escapeHTML(link.description)}</p><small>Opens in a new tab</small></a>`).join('')}</div></div>`);
}
function showLinks(){
  showPanel('THE LOBBY / THE INTERNET SHELF',`<div class="panel-content"><p class="eyebrow">GOOD CORNERS OF THE INTERNET</p><h2 id="panel-title">Worth a little detour.</h2><p>A collection of cool sites I like. Pick something off the shelf and see where it takes you.</p><div class="bookmark-grid">${favouriteSites.map((site,i)=>`<a class="bookmark-card" href="${attr(site.url)}" target="_blank" rel="noopener noreferrer"><span class="bookmark-category">${String(i+1).padStart(2,'0')} / ${escapeHTML(site.category)}</span><h3>${escapeHTML(site.title)} <span aria-hidden="true">↗</span></h3><p>${escapeHTML(site.description)}</p><small>${escapeHTML(new URL(site.url).hostname.replace(/^www\./,''))}</small></a>`).join('')}</div><div class="instagram-card"><p class="eyebrow">AND A LITTLE CORNER OF MY OWN</p><h3>More through my lens.</h3><p>My photography, over on Instagram.</p>${instagramLink()}</div></div>`);
}
function showAlbums(){
  showPanel('THE PHOTO MUSEUM',`<div class="panel-content"><p class="eyebrow">A PRACTICE IN PAYING ATTENTION</p><h2 id="panel-title">Places & little moments.</h2><p>Each collection is a room. Each photograph, a reason to pause.</p>${loadError?`<div class="empty-state">The albums couldn’t load. Please try again.${button('retry','Try again')}</div>`:!albums.length?'<div class="empty-state">The first collection is on its way. Come back for a little wander soon.</div>':`<div class="album-grid">${albums.map(a=>{const cover=coverOf(a);return `<button class="album-card" data-action="booklet" data-id="${attr(a.id)}">${cover?`<img src="${attr(cover.thumbnail)}" alt="${attr(cover.alt)}" loading="lazy">`:'<div class="empty-state">A room for future memories.</div>'}<strong>${escapeHTML(a.title)} <span>↗</span></strong><small>${a.photos.length} PHOTOGRAPHS</small></button>`;}).join('')}</div>`}</div>`);
}
function showBooklet(album){
  activePhoto=null;
  showPanel('THE ALBUM BOOKLET',`<div class="panel-content"><p class="eyebrow">${album.photos.length} MOMENTS, COLLECTED</p><div class="album-intro"><div><h2 id="panel-title">${escapeHTML(album.title)}</h2><p>${escapeHTML(album.description)}</p></div>${button('room','Walk through this room ↗','secondary-button',`data-id="${attr(album.id)}"`)}</div>${album.photos.length?`<div class="booklet-grid">${album.photos.map((photo,i)=>`<button class="photo-card" data-action="photo" data-id="${attr(album.id)}" data-photo="${attr(photo.id)}"><img src="${attr(photo.thumbnail)}" alt="${attr(photo.alt)}" loading="lazy" width="${photo.width}" height="${photo.height}"><span>${String(i+1).padStart(2,'0')} ${seen.has(photoKey(album,photo))?'· DISCOVERED':''}</span><small>${escapeHTML(photo.title)}</small></button>`).join('')}</div>`:'<div class="empty-state">There are no photographs in this room yet.</div>'}<div class="panel-actions">${button('albums','← All albums')}</div></div>`);
}
function showPhoto(album,photo){
  const previous=motion.previousPhoto();
  activePhoto={album,photo};markSeen(album,photo);const index=album.photos.indexOf(photo);
  showPanel(`${album.title.toUpperCase()} / ${String(index+1).padStart(2,'0')} OF ${String(album.photos.length).padStart(2,'0')}`,`<div class="viewer-content"><img id="full-photo" class="viewer-image" src="${attr(photo.src)}" alt="${attr(photo.alt)}" width="${photo.width}" height="${photo.height}"><div class="viewer-caption"><div><h2 id="panel-title">${escapeHTML(photo.title)}</h2><p>${escapeHTML(photo.caption||album.title)}</p></div><span aria-label="Discovered">✳</span></div><div class="viewer-controls"><button data-action="previous-photo" ${index===0?'disabled':''}>← Previous</button><button class="back-booklet" data-action="booklet" data-id="${attr(album.id)}">▤ &nbsp; Back to booklet</button><button data-action="next-photo" ${index===album.photos.length-1?'disabled':''}>Next →</button></div></div>`,true);
  const image=$('#full-photo'),stage=document.createElement('div');stage.className='viewer-stage';image.before(stage);stage.append(image);
  motion.reveal(image,previous);
  for(const next of [album.photos[index-1],album.photos[index+1]])if(next){const img=new Image();img.src=next.src;}
}
function changePhoto(delta){if(!activePhoto)return;const{album,photo}=activePhoto;const next=album.photos[album.photos.indexOf(photo)+delta];if(next)navigate(`#photo/${album.id}/${next.id}`);}
function showExhibit(id){const entry=journey.find(x=>x.id===id);if(!entry){navigate('#lobby');return;}showPanel('THE LOBBY / THE JOURNEY',`<div class="panel-content"><p class="eyebrow">${entry.date}</p><h2 id="panel-title">${escapeHTML(entry.name)}</h2><p class="role">${escapeHTML(entry.role)}</p><h3>${entry.summary}</h3>${entry.description?`<p>${escapeHTML(entry.description)}</p>`:''}<ul>${entry.bullets.map(b=>`<li>${escapeHTML(b)}</li>`).join('')}</ul><div class="panel-actions">${button('resume','Read the full résumé ↗')}${button('close','Back to exploring')}</div></div>`);}
function showResume(){showPanel('THE LOBBY / RÉSUMÉ',`<div class="panel-content"><p class="eyebrow">PRODUCT ENGINEER · SINGAPORE</p><h2 id="panel-title">Reuben Teng</h2><p>${intro}</p>${journey.map(e=>`<section class="resume-entry">${entryMarkup(e)}</section>`).join('')}<section class="resume-entry"><p class="eyebrow">2025</p><h3>${certification}</h3></section><h3>The toolkit</h3>${skillMarkup()}<h3>Off the clock</h3><p>Bouldering, dodgeball, photography, and music.</p><div class="panel-actions">${button('museum','Explore the photo museum ↗','primary-button')}</div></div>`);}
function showHelp(){showPanel('A FEW POINTERS',`<div class="panel-content"><p class="eyebrow">NO HIGH SCORES. JUST GOOD COMPANY.</p><h2 id="panel-title">Take the scenic route.</h2><p>This is a little world to wander through. Start with the journey in the lobby, then follow the door to the photographs.</p><div class="help-rows"><div><strong>Move around</strong><span>Click the floor, or focus the museum and use WASD / arrow keys. On a phone, use the directional pad.</span></div><div><strong>Take a closer look</strong><span>Click an exhibit, or walk nearby and press E / Enter. On a phone, tap A.</span></div><div><strong>The photo rooms</strong><span>Each room holds one collection. Open the booklet at the entrance to browse every photograph.</span></div><div><strong>Your own pace</strong><span>Use the guide to open any exhibit directly. Résumé and album views work without walking.</span></div><div><strong>Photo viewer</strong><span>Use the left / right arrows to browse. Escape returns to the booklet; Escape again closes it.</span></div></div><div class="panel-actions">${button('close','Let’s wander ↗','primary-button')}</div></div>`);}

async function route(){
  const version=++routeVersion;
  const pieces=location.hash.slice(1).split('/');const[type,id,detail]=pieces;const previousMap=worldRoute;
  motion.reset();
  if(dialog.open&&dialog.classList.contains('viewer')&&type!=='photo'){
    await motion.leave(['lobby','museum','room',''].includes(type));
    if(version!==routeVersion)return;
  }
  if(['lobby','museum','room'].includes(type)||!type){
    closePanel();
    if(type==='room'){
      const album=albumById(id);if(!album){navigate('#museum');return;}
      const section=Math.min(Math.max(0,parseInt(detail,10)||0),Math.max(0,Math.ceil(album.photos.length/6)-1));
      if(museum.scene!=='room'||museum.album?.id!==id||museum.section!==section)museum.configure('room',album,section);
      worldRoute=`#room/${id}/${section}`;
    }else if(type==='museum'){
      const section=Math.min(Math.max(0,parseInt(id,10)||0),Math.max(0,Math.ceil(albums.length/3)-1));
      if(museum.scene!=='museum'||museum.section!==section)museum.configure('museum',null,section);
      worldRoute=section?`#museum/${section}`:'#museum';
    }else{if(museum.scene!=='lobby')museum.configure('lobby');worldRoute='#lobby';}
    modalReturn=worldRoute;renderGuide();return;
  }
  modalReturn=previousMap;activePhoto=null;
  if(type==='albums'){showAlbums();return;}
  if(type==='links'){showLinks();return;}
  if(type==='contact'){showContact();return;}
  if(type==='album'||type==='photo'){
    const album=albumById(id);if(!album){showPanel('A SMALL DETOUR',`<div class="panel-content"><h2 id="panel-title">That room isn’t here.</h2><p>The album may have moved. The rest of the museum is still open.</p>${button('albums','Browse the collection ↗','primary-button')}</div>`);return;}
    if(type==='album'){showBooklet(album);return;}
    const photo=album.photos.find(p=>p.id===detail);if(!photo){navigate(`#album/${album.id}`);return;}showPhoto(album,photo);return;
  }
  if(type==='resume')showResume();
  else if(type==='exhibit')showExhibit(id);
  else if(type==='skills')showPanel('THE LOBBY / THE TOOLKIT',`<div class="panel-content"><p class="eyebrow">TOOLS FOR TURNING IDEAS INTO THINGS</p><h2 id="panel-title">The toolkit.</h2><p>From the interface to the infrastructure, and everything in between.</p>${skillMarkup()}</div>`);
  else if(type==='interests')showPanel('THE LOBBY / OFF THE CLOCK',`<div class="panel-content"><p class="eyebrow">THERE’S MORE TO LIFE THAN A TERMINAL</p><h2 id="panel-title">A few other obsessions.</h2><div class="interest-grid">${interests.map(i=>`<article class="interest-card"><span aria-hidden="true">${i.icon}</span><h3>${i.name}</h3><p>${i.text}</p></article>`).join('')}</div><div class="panel-actions">${button('museum','See what’s on the camera ↗','primary-button')}</div></div>`);
  else if(type==='certification')showPanel('THE LOBBY / A MILESTONE',`<div class="panel-content"><p class="eyebrow">CERTIFIED IN 2025</p><div class="welcome-symbol" aria-hidden="true">✳</div><h2 id="panel-title">${certification}</h2><p>A milestone in designing and building cloud infrastructure.</p>${button('skills','Explore the rest of the toolkit ↗')}</div>`);
  else if(type==='welcome')showPanel('THE LOBBY / SAY HELLO',`<div class="panel-content"><div class="welcome-symbol" aria-hidden="true">✳</div><p class="eyebrow">ENGINEER, PHOTOGRAPHER, CURIOUS HUMAN.</p><h2 id="panel-title">Hello, I’m Reuben.</h2><p>${intro}</p><p>This little museum brings together my engineering journey and the moments I’ve collected with my camera. Look around, pick up a booklet, or stay for a while.</p><div class="panel-actions">${button('resume','Get to know me','primary-button')}${button('museum','Take me to the photographs ↗')}</div></div>`);
  else if(type==='help')showHelp();else navigate('#lobby');
}
function dispatch(action){
  const type=action.type;
  if(type==='close'){closeToMap();return;}
  if(type==='reset'){museum.reset();return;}
  if(type==='interact'){museum.interact();return;}
  if(type==='next-photo'||type==='previous-photo'){changePhoto(type==='next-photo'?1:-1);return;}
  if(type==='retry'){loadAlbums();return;}
  if(type==='room'){navigate(`#room/${action.albumId||action.id}/0`);return;}
  if(type==='booklet'){navigate(`#album/${action.albumId||action.id||museum.album?.id}`);return;}
  if(type==='photo'){navigate(`#photo/${action.albumId||action.id}/${action.photoId}`);return;}
  if(type==='section'){navigate(`#room/${museum.album.id}/${action.section}`);return;}
  if(type==='hallSection'){navigate(`#museum/${action.section}`);return;}
  if(type==='exhibit'){navigate(`#exhibit/${action.id}`);return;}
  navigate(`#${type}`);
}
document.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(!target||target.disabled)return;dispatch({type:target.dataset.action,id:target.dataset.id,photoId:target.dataset.photo,section:Number(target.dataset.section)});});
$('#interact').addEventListener('click',()=>museum.interact());
$('.skip-link').addEventListener('click',event=>{event.preventDefault();$('#world').focus();});
$('#instagram-footer').href=photographyInstagram.url;
$('#instagram-footer').textContent=`Photography · ${photographyInstagram.handle} ↗`;
$('#contact-link').href=contactLinks.find(link=>link.title==='LinkedIn').url;
window.addEventListener('hashchange',route);
async function loadAlbums(){
  try{const response=await fetch('./albums.json');if(!response.ok)throw new Error(`Album request failed: ${response.status}`);albums=await response.json();loadError=false;}
  catch(error){console.error('Could not load museum collection',error);loadError=true;albums=[];$('#announcement').textContent='The photographs could not load. You can still explore the résumé.';}
  museum.setAlbums(albums);renderGuide();updateCount();route();
}
renderGuide();
await loadAlbums();
