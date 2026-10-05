import { canStand, movePlayer, nearestExhibit, findPath, sectionPhotos } from './geometry.js';
const C = { dark:'#39503d', floor:'#d8c7a0', seam:'#cbbb98', wall:'#f0edce', trim:'#b3ad86', plant:'#597653', lightPlant:'#8ba16b', pot:'#b48662', rug:'#79946d', rugLight:'#b1c099', wood:'#9d7656', shadow:'#52603928' };
const bounds = { left:80, right:920, top:207, bottom:573 };
const locations = [150,365,585,800];
const gallerySlots = [{x:195,y:166},{x:480,y:166},{x:765,y:166},{x:195,y:361},{x:480,y:361},{x:765,y:361}];
// Frame the walls and floor closely, rather than the old decorative outer canvas.
const roomView = { x:46, y:65, width:936, height:558 };
const rectHit = (p,r) => p.x >= r.x && p.x <= r.x+r.w && p.y >= r.y && p.y <= r.y+r.h;
export class Museum {
  constructor(canvas, { onInteract, onNear, onMove }) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onInteract=onInteract;this.onNear=onNear;this.onMove=onMove;
    this.player={x:500,y:494,facing:'down',walking:false};this.keys=new Set();this.images=new Map();this.path=[];this.scene='lobby';this.section=0;this.albums=[];this.exhibits=[];this.obstacles=[];this.hover=null;this.paused=false;
    this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
    this.installInputs();this.configure('lobby');this.previous=0;this.animationFrame=requestAnimationFrame(t=>this.tick(t));
  }
  resize() {
    const r=this.canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);
    this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.width=r.width;this.height=r.height;this.dpr=dpr;
    this.followPlayer = window.matchMedia('(max-width:760px)').matches;
    this.scale = this.followPlayer ? (r.height-16)/roomView.height : Math.min((r.width-16)/roomView.width,(r.height-16)/roomView.height);
  }
  installInputs() {
    const directions={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
    this.canvas.addEventListener('keydown',e=>{
      if(this.paused)return;
      const direction=directions[e.key]||directions[e.key.toLowerCase()];
      if(direction){e.preventDefault();if(!e.repeat)this.nudge(direction);this.keys.add(direction);this.path=[];}
      if((e.key.toLowerCase()==='e'||e.key==='Enter')&&!e.repeat){e.preventDefault();this.interact();}
    });
    window.addEventListener('keyup',e=>this.keys.delete(directions[e.key]||directions[e.key.toLowerCase()]));
    window.addEventListener('blur',()=>this.clearInput());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearInput();});
    this.canvas.addEventListener('blur',()=>this.clearInput());
    this.canvas.addEventListener('pointermove',e=>{const p=this.worldPoint(e);this.hover=this.exhibits.find(x=>rectHit(p,x.rect))?.id||null;this.canvas.style.cursor=this.hover?'pointer':'crosshair';});
    this.canvas.addEventListener('pointerleave',()=>{this.hover=null;});
    this.canvas.addEventListener('pointerdown',e=>{
      if(this.paused)return;
      this.canvas.focus({preventScroll:true});const p=this.worldPoint(e);const exhibit=this.exhibits.find(x=>rectHit(p,x.rect));
      if(exhibit){this.onInteract(exhibit);return;}
      this.path=findPath(this.player,p,this.obstacles,bounds);
    });
    document.querySelectorAll('[data-direction]').forEach(button=>{
      button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.nudge(button.dataset.direction);this.keys.add(button.dataset.direction);this.path=[];});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>this.keys.delete(button.dataset.direction));
    });
  }
  clearInput(){this.keys.clear();this.path=[];this.player.walking=false;}
  nudge(direction){if(this.paused)return;const delta={up:[0,-9],down:[0,9],left:[-9,0],right:[9,0]}[direction];this.player.facing=direction;movePlayer(this.player,...delta,this.obstacles,bounds);}
  setPaused(paused){this.paused=paused;this.clearInput();}
  worldPoint(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left-this.offsetX)/this.scale,y:(e.clientY-r.top-this.offsetY)/this.scale};}
  setAlbums(albums){this.albums=albums;if(this.scene==='museum')this.configure('museum',null,this.section);}
  reset(){this.player={x:500,y:510,facing:'down',walking:false};this.clearInput();this.canvas.focus({preventScroll:true});}
  configure(scene,album=null,section=0){
    this.scene=scene;this.album=album;this.section=section;this.clearInput();this.player={x:500,y:525,facing:'up',walking:false};this.exhibits=[];this.obstacles=[];
    const add=(id,label,x,y,w,h,action,approach)=>this.exhibits.push({id,label,rect:{x,y,w,h},action,approach:approach||{x:x+w/2,y:y+h+34}});
    if(scene==='lobby'){
      ['nus','hackertrail','illumina','speedback'].forEach((id,i)=>add(id,['NUS · 2019–2023','HackerTrail · 2021–2022','Illumina · 2023–2025','Speedback · 2025–now'][i],locations[i]-55,101,110,100,{type:'exhibit',id},{x:locations[i],y:236}));
      add('welcome','Hello, I’m Reuben',397,342,205,73,{type:'welcome'},{x:500,y:443});this.obstacles.push({x:397,y:342,w:205,h:74});
      add('skills','The toolkit',100,360,130,92,{type:'skills'});this.obstacles.push({x:100,y:385,w:130,h:68});
      add('links','The internet shelf',259,366,60,85,{type:'links'},{x:287,y:479});this.obstacles.push({x:259,y:398,w:60,h:53});
      add('interests','Outside of work',738,407,121,72,{type:'interests'},{x:770,y:510});this.obstacles.push({x:738,y:407,w:121,h:72});
      add('museum','Enter the photo museum',873,245,74,126,{type:'museum'},{x:839,y:340});
      add('aws','AWS · Certified in 2025',778,273,57,56,{type:'certification'},{x:783,y:355});
      this.obstacles.push({x:414,y:257,w:169,h:35});
    }else if(scene==='museum'){
      const selected=this.albums.slice(section*3,section*3+3);
      selected.forEach((album,i)=>{const x=220+i*280;add(album.id,`Enter ${album.title}`,x-65,155,130,115,{type:'room',albumId:album.id},{x,y:304});add(`book-${album.id}`,`${album.title} · album booklet`,x-46,331,90,55,{type:'booklet',albumId:album.id},{x,y:415});this.obstacles.push({x:x-46,y:343,w:90,h:42});});
      add('lobby','Return to the lobby',445,555,110,52,{type:'lobby'},{x:500,y:545});
      if(section>0)add('previous','Previous albums',75,432,70,60,{type:'hallSection',section:section-1},{x:151,y:479});
      if((section+1)*3<this.albums.length)add('next','More albums',855,432,70,60,{type:'hallSection',section:section+1},{x:834,y:479});
    }else{
      sectionPhotos(album.photos,section).forEach((photo,i)=>{const p=gallerySlots[i];add(photo.id,photo.title,p.x-74,p.y-65,148,110,{type:'photo',albumId:album.id,photoId:photo.id},{x:p.x,y:p.y+71});if(i>=3)this.obstacles.push({x:p.x-90,y:p.y-68,w:180,h:102});});
      add('booklet',`${album.title} · album booklet`,96,460,84,50,{type:'booklet',albumId:album.id},{x:218,y:508});this.obstacles.push({x:96,y:474,w:84,h:36});
      add('museum','Return to the album hall',445,555,110,50,{type:'museum'},{x:500,y:542});
      if(section>0)add('previous','Previous gallery section',75,266,65,57,{type:'section',section:section-1},{x:160,y:285});
      if((section+1)*6<album.photos.length)add('next','Next gallery section',865,266,65,57,{type:'section',section:section+1},{x:840,y:285});
    }
    this.obstacles.push({x:79,y:209,w:40,h:45},{x:884,y:514,w:40,h:46});
    this.lastNear=undefined;
  }
  interact(){if(!this.paused){const near=nearestExhibit(this.player,this.exhibits);if(near)this.onInteract(near);}}
  tick(time){
    const dt=Math.min((time-this.previous)/1000||0,.04);this.previous=time;
    if(!this.paused&&!document.hidden){let dx=(this.keys.has('right')?1:0)-(this.keys.has('left')?1:0),dy=(this.keys.has('down')?1:0)-(this.keys.has('up')?1:0);
      if(!dx&&!dy&&this.path.length){const next=this.path[0],dist=Math.hypot(next.x-this.player.x,next.y-this.player.y);if(dist<5)this.path.shift();else{dx=(next.x-this.player.x)/dist;dy=(next.y-this.player.y)/dist;}}
      const length=Math.hypot(dx,dy);this.player.walking=length>0;
      if(length){this.player.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');movePlayer(this.player,dx/length*155*dt,dy/length*155*dt,this.obstacles,bounds);this.onMove?.();}
      const near=nearestExhibit(this.player,this.exhibits);this.near=near;
      if(near?.id!==this.lastNear){this.lastNear=near?.id;this.onNear(near);}
    }
    if(!document.hidden)this.draw(time);
    this.animationFrame=requestAnimationFrame(t=>this.tick(t));
  }
  rect(x,y,w,h,color){this.ctx.fillStyle=color;this.ctx.fillRect(Math.round(x),Math.round(y),w,h);}
  line(x,y,w,color,h=2){this.rect(x,y,w,h,color);}
  text(text,x,y,size=11,color=C.dark,align='center',font='monospace'){const c=this.ctx;c.fillStyle=color;c.textAlign=align;c.font=`${size}px ${font}`;c.fillText(text,x,y);}
  shadow(x,y,w,h){this.rect(x+7,y+8,w,h,C.shadow);}
  draw(time){
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);c.fillStyle='#e5e9d9';c.fillRect(0,0,this.width,this.height);
    this.offsetX=(this.width-roomView.width*this.scale)/2-roomView.x*this.scale;
    if(this.followPlayer&&roomView.width*this.scale>this.width-16)this.offsetX=Math.min(8-roomView.x*this.scale,Math.max(this.width-8-(roomView.x+roomView.width)*this.scale,this.width/2-this.player.x*this.scale));
    this.offsetY=(this.height-roomView.height*this.scale)/2-roomView.y*this.scale;
    c.translate(this.offsetX,this.offsetY);c.scale(this.scale,this.scale);c.imageSmoothingEnabled=false;
    this.drawRoom();
    if(this.scene==='lobby')this.drawLobby();else if(this.scene==='museum')this.drawHall();else this.drawGallery();
    this.plant(96,217);this.plant(901,526);
    const glow=this.exhibits.find(e=>e.id===this.hover)||this.near;
    if(glow&&!this.paused){const p=glow.approach;const bob=this.reduced.matches?0:Math.sin(time/270)*2;this.text('⌄',p.x,p.y-41+bob,22,'#5c7750');}
    this.drawPlayer(time);
    if(this.path.length){const p=this.path.at(-1);c.strokeStyle='#5e7d5580';c.lineWidth=2;c.strokeRect(p.x-5,p.y-4,10,8);}
    this.rect(63,594,904,10,'#b5b998');this.rect(63,604,904,8,'#cbd0b6');
  }
  drawRoom(){
    this.shadow(62,82,905,513);this.rect(57,76,915,519,'#9ca486');this.rect(64,83,901,510,C.floor);
    for(let row=0;row<12;row++)for(let col=0;col<15;col++){
      const x=65+col*64-(row%2)*32,y=181+row*35;
      if(y>590)continue;
      const left=Math.max(65,x),right=Math.min(964,x+63);
      this.rect(left,y,right-left,34,['#d8c7a0','#dccba6','#d4c39c','#dfcfa9'][(row*7+col*3)%4]);
      this.line(left+6,y+10,Math.max(0,right-left-18),'#bcaa8526',1);
      this.line(left+15,y+24,Math.max(0,right-left-22),'#f0e2bf45',1);
    }
    this.rect(64,83,901,95,C.wall);this.rect(64,172,901,10,'#ded8b8');this.rect(64,182,901,9,C.trim);this.rect(64,191,901,9,'#aa9e7e');this.rect(64,200,901,9,'#8d8e6920');
    for(let x=67;x<965;x+=90)this.rect(x,84,1,87,'#d5d1b53b');
    this.rect(64,84,8,509,'#b3b295');this.rect(956,84,9,509,'#a4a788');
    this.rect(74,202,22,391,'#efdfb630');this.rect(72,577,885,16,'#b5a583');
    [275,692].forEach(x=>{this.rect(x,82,3,23,'#a8ac8b');this.rect(x-14,104,32,7,'#96a37d');this.rect(x-10,111,24,5,'#d8dabb');this.rect(x-3,116,9,5,'#f7efd2');});
  }
  plaque(x,y,title,subtitle){const w=142;this.rect(x-w/2,y,w,31,'#f4efd7');this.rect(x-w/2,y+30,w,2,'#b8aa83');this.text(title,x,y+13,10);if(subtitle)this.text(subtitle,x,y+24,7,'#8a8d6e');}
  frame(x,y,w,h,color='#81916c') {this.shadow(x,y,w,h);this.rect(x,y,w,h,'#806b50');this.rect(x+4,y+4,w-8,h-8,'#cabd8f');this.rect(x+8,y+8,w-16,h-16,'#f4f0d8');this.rect(x+13,y+13,w-26,h-26,color);}
  exhibitIcon(type,x,y){
    const c=this.ctx;c.fillStyle='#e9e8c9';
    if(type===0){this.rect(x-26,y-5,53,9,'#e9e8c9');this.rect(x-18,y+5,8,20,'#e9e8c9');this.rect(x-3,y+5,8,20,'#e9e8c9');this.rect(x+12,y+5,8,20,'#e9e8c9');this.rect(x-26,y+25,53,5,'#e9e8c9');for(let i=0;i<4;i++)this.rect(x-23+i*5,y-10-i*4,47-i*10,4,'#e9e8c9');}
    if(type===1){this.rect(x-27,y-20,54,39,'#d6e0bf');this.rect(x-22,y-15,44,27,'#416454');this.text('>_',x,y+4,23,'#ced8ad');this.rect(x-7,y+19,14,6,'#c6d0aa');this.rect(x-18,y+25,36,4,'#e0dfbd');}
    if(type===2){for(let i=0;i<8;i++){const shift=Math.round(Math.sin(i*.8)*16/4)*4;this.rect(x+shift-3,y-24+i*7,6,6,'#e8e7ca');this.rect(x-shift-3,y-24+i*7,6,6,'#c2d0b8');this.rect(x-Math.abs(shift),y-22+i*7,Math.abs(shift)*2,2,'#afbe9f');}}
    if(type===3){const rows=['01100110','11111111','11111111','01111110','00111100','00011000'];rows.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')this.rect(x-24+i*6,y-17+j*6,6,6,'#efdfb8');}));}
  }
  drawLobby(){
    const titles=['NUS','HACKERTRAIL','ILLUMINA','SPEEDBACK'],dates=['2019 — 2023','2021 — 2022','2023 — 2025','2025 — NOW'];
    locations.forEach((x,i)=>{this.frame(x-45,102,90,80,['#7e9368','#658378','#829395','#a58767'][i]);this.exhibitIcon(i,x,140);this.plaque(x,192,titles[i],dates[i]);});
    this.line(170,239,615,'#b5ac892f',2);[265,475,695].forEach(x=>this.text('→',x,246,18,'#a69c7a'));
    this.rug(332,318,337,196);this.text('MAKE YOURSELF AT HOME',500,490,8,'#dce2c1');
    this.bench(414,259);
    this.shadow(397,344,205,72);this.rect(397,344,205,64,'#a68057');this.rect(397,344,205,18,'#c8aa75');this.rect(397,362,205,7,'#90724d');this.rect(407,376,184,27,'#b89361');this.rect(407,401,184,7,'#99794e');
    this.rect(467,373,70,21,'#e9dfb9');this.text('HELLO THERE',502,387,8,'#6d704c');
    this.rect(425,330,38,23,'#e5e1bc');this.rect(427,333,15,16,'#f4efce');this.rect(446,333,15,16,'#d2d2ae');this.rect(443,333,2,19,'#b7b797');this.rect(473,339,29,11,'#738361');
    this.rect(549,328,20,24,'#d2b795');this.rect(552,324,14,6,'#fbf1d0');this.rect(569,332,6,12,'#ba9f7c');
    this.bookshelf(108,357);this.plaque(166,456,'THE TOOLKIT','SKILLS & THINGS I USE');
    this.internetShelf(259,366);
    this.turntable(745,410);this.plaque(793,481,'OFF THE CLOCK','A FEW OTHER OBSESSIONS');
    this.door(885,253,65,111,'#638776');this.rect(878,235,79,16,'#e8e6c9');this.text('MUSEUM →',917,247,8);this.text('PHOTOGRAPHS',906,382,7,'#7d8263');
    this.frame(783,274,47,46,'#b9ab71');this.text('AWS',806,299,10,'#f7f0d2');this.text('2025',806,338,8,'#877f60');
    this.plant(326,276);this.plant(680,414);this.plant(237,531,true);
    this.rect(475,558,53,22,'#c4b083');this.line(482,565,40,'#b29b73',1);this.line(482,570,40,'#b29b73',1);
    this.text('YOU ARE HERE',500,556,7,'#a38e68');
  }
  rug(x,y,w,h){this.rect(x+4,y+4,w,h,'#8b8f6935');this.rect(x,y,w,h,C.rug);this.rect(x+8,y+8,w-16,h-16,'#a6b58b');this.rect(x+11,y+11,w-22,h-22,C.rug);this.rect(x+17,y+17,w-34,h-34,'#829a73');for(let a=x+22;a<x+w-20;a+=11){this.rect(a,y-3,2,4,'#b3be91');this.rect(a,y+h,2,4,'#b3be91');}for(let a=x+30;a<x+w-22;a+=21)this.rect(a,y+30,2,h-60,'#a3b48b20');}
  internetShelf(x,y){
    this.shadow(x,y,60,85);this.rect(x,y,60,85,'#a18c64');this.rect(x+4,y+4,52,69,'#d3c59c');
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){
      const px=x+8+col*25,py=y+10+row*31;
      this.rect(px,py,19,25,['#7d9375','#9caeba','#bd9271','#d3bb75'][row*2+col]);
      this.rect(px+3,py+5,13,2,'#f4edcd');this.rect(px+3,py+10,8,2,'#f4edcd');
    }
    this.rect(x+4,y+35,52,4,'#927b54');this.rect(x+4,y+66,52,4,'#927b54');
    this.rect(x-4,y+87,68,18,'#f4efd7');this.text('INTERNET ↗',x+30,y+99,8);
  }
  bench(x,y){this.shadow(x,y,169,32);this.rect(x+9,y+24,8,19,'#796c4b');this.rect(x+149,y+24,8,19,'#796c4b');this.rect(x,y,169,29,'#a89365');for(let i=0;i<3;i++)this.rect(x+3,y+3+i*8,163,5,'#c0aa78');}
  plant(x,y,small=false){const c=this.ctx;c.save();c.translate(x,y);if(small)c.scale(.75,.75);this.rect(-17,26,40,10,'#636a4b26');this.rect(-11,6,25,29,C.pot);this.rect(-14,4,31,8,'#c69c76');this.rect(-7,14,4,16,'#d4ab81');this.rect(-2,-22,5,31,'#526c42');const leaves=[[-22,-26,20,15],[-9,-40,19,18],[5,-27,22,14],[-24,-10,20,14],[5,-8,20,13],[-7,-23,16,17]];leaves.forEach(([x,y,w,h],i)=>{this.rect(x,y,w,h,i%2?C.lightPlant:C.plant);this.rect(x+3,y-3,w-6,h+5,i%2?C.lightPlant:C.plant);});c.restore();}
  bookshelf(x,y){this.shadow(x,y,116,91);this.rect(x,y,116,91,'#927c57');this.rect(x+5,y+6,106,76,'#706848');for(let row=0;row<2;row++){for(let i=0;i<8;i++){const h=18+(i*7%13);this.rect(x+10+i*12,y+34+row*37-h,8,h,['#a2b18a','#d4bd85','#c58c6b','#8a9c93'][i%4]);this.rect(x+11+i*12,y+36+row*37-h,6,2,'#e0d3a677');}this.rect(x+4,y+36+row*37,109,5,'#b9a178');}this.rect(x+65,y-27,45,27,'#5a6d5b');this.rect(x+69,y-23,37,18,'#a6b990');this.text('>_',x+87,y-10,12,'#536c50');this.rect(x+76,y,21,4,'#596849');}
  turntable(x,y){this.shadow(x,y,111,64);this.rect(x,y+10,111,48,'#a2875c');this.rect(x+4,y+3,103,27,'#bfab7d');this.rect(x+5,y+32,101,16,'#8f7852');this.rect(x+12,y+37,62,6,'#756b4f');this.rect(x+83,y+35,14,10,'#c9bd90');this.rect(x+5,y+57,8,10,'#766a48');this.rect(x+95,y+57,8,10,'#766a48');const c=this.ctx;c.fillStyle='#445746';c.beginPath();c.ellipse(x+38,y+11,22,12,0,0,Math.PI*2);c.fill();c.fillStyle='#c7ac78';c.beginPath();c.ellipse(x+38,y+11,7,4,0,0,Math.PI*2);c.fill();this.rect(x+79,y-1,4,22,'#6a7657');this.rect(x+68,y+18,15,3,'#6a7657');this.rect(x+96,y-14,8,16,'#a4b885');}
  door(x,y,w,h,color){this.shadow(x,y,w,h);this.rect(x-6,y-6,w+12,h+12,'#b0a780');this.rect(x-3,y-3,w+6,h+6,'#e5debd');this.rect(x,y,w,h,color);this.rect(x+7,y+7,w-14,h-17,'#aac0a055');this.rect(x+w/2-2,y+6,4,h-9,'#d1d3a5');this.rect(x+7,y+h*.56,w-14,4,'#d1d3a5');this.rect(x+w/2-8,y+h*.64,3,7,'#e9db9e');this.rect(x+w/2+5,y+h*.64,3,7,'#e9db9e');this.rect(x-9,y+h+5,w+18,11,'#baa882');}
  book(x,y){this.shadow(x-30,y,60,35);this.rect(x-30,y,60,30,'#9d875e');this.rect(x-22,y-7,45,27,'#637e5b');this.rect(x-18,y-4,36,19,'#e8e4c4');this.rect(x,y-4,2,19,'#b8b898');this.rect(x-14,y,10,2,'#c7c6a5');this.rect(x+5,y,10,2,'#c7c6a5');this.rect(x-7,y+30,14,17,'#8d7d57');}
  drawHall(){
    this.text('MOMENTS, COLLECTED.',520,122,20,'#5d7252','center','Georgia');this.text('A ROOM FOR EVERY PLACE',520,143,8,'#8a9273');
    this.rug(366,430,300,110);
    this.albums.slice(this.section*3,this.section*3+3).forEach((album,i)=>{const x=220+i*280;this.door(x-50,167,100,105,album.color);this.plaque(x,290,album.title.toUpperCase(),`${album.photos.length} PHOTOGRAPHS`);this.book(x,344);this.text('ALBUM BOOKLET',x,405,8,'#807c5d');const cover=album.photos.find(p=>p.id===album.cover);if(cover)this.photo(cover,x-32,177,64,47);});
    if(!this.albums.length){this.text('THE COLLECTION IS GROWING',520,300,17);this.text('There are no albums here yet.',520,330,12);}
    this.text('↓ LOBBY',500,584,10,'#617252');
    if(this.section>0)this.text('← MORE',110,474,10);
    if((this.section+1)*3<this.albums.length)this.text('MORE →',890,474,10);
    this.plant(117,490,true);this.plant(899,315,true);
  }
  photo(photo,x,y,w,h){
    let img=this.images.get(photo.thumbnail);if(!img){img=new Image();img.src=photo.thumbnail;this.images.set(photo.thumbnail,img);}
    if(img.complete&&img.naturalWidth){const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight);const dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio;this.ctx.save();this.ctx.imageSmoothingEnabled=true;this.ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);this.ctx.restore();}else this.rect(x,y,w,h,'#abb396');
  }
  drawGallery(){
    const photos=sectionPhotos(this.album.photos,this.section);
    photos.forEach((photo,i)=>{const p=gallerySlots[i];if(i>=3){this.shadow(p.x-90,p.y-73,180,99);this.rect(p.x-90,p.y-73,180,100,'#ece8ce');this.rect(p.x-90,p.y+21,180,7,'#b2a783');}
      this.frame(p.x-70,p.y-62,140,103,'#e5e2ce');this.photo(photo,p.x-55,p.y-48,110,75);this.plaque(p.x,p.y+45,`${String(this.section*6+i+1).padStart(2,'0')} / ${String(this.album.photos.length).padStart(2,'0')}`,photo.title.length>24?photo.title.slice(0,22)+'…':photo.title);
    });
    if(!photos.length){this.text('A ROOM FOR FUTURE MEMORIES',520,300,19);this.text('This album has no photographs yet.',520,335,12);}
    this.book(138,480);this.text('THE BOOKLET',138,536,8,'#827e5b');this.text('↓ ALBUM HALL',500,584,10,'#617252');
    if(this.section>0)this.text('← PREV',105,307,10);
    if((this.section+1)*6<this.album.photos.length)this.text('NEXT →',897,307,10);
  }
  drawPlayer(time){
    const{x,y,facing,walking}=this.player;const c=this.ctx;c.save();c.translate(Math.round(x),Math.round(y));
    const stride=walking&&!this.reduced.matches?(Math.floor(time/120)%2?3:-3):0;
    c.fillStyle='#4b58443b';c.beginPath();c.ellipse(0,2,16,6,0,0,Math.PI*2);c.fill();
    this.rect(-9,-10,7,12+stride,'#475649');this.rect(3,-10,7,12-stride,'#475649');this.rect(-10,1+stride,9,4,'#454c3c');this.rect(3,1-stride,9,4,'#454c3c');
    this.rect(-12,-29,25,23,'#b7754d');this.rect(-16,-27,5,15+stride,'#d2996a');this.rect(13,-27,5,15-stride,'#d2996a');this.rect(-8,-28,17,3,'#dca777');
    this.rect(-9,-45,20,19,'#d9aa79');this.rect(-12,-47,24,9,'#4b5141');this.rect(-10,-51,19,6,'#4b5141');this.rect(-12,-40,5,9,'#4b5141');
    if(facing==='up'){this.rect(-9,-42,20,12,'#4b5141');this.rect(-8,-26,17,17,'#8b956d');this.rect(-6,-23,13,10,'#b3b893');this.rect(-3,-13,7,4,'#7c8a62');}
    else {if(facing!=='right')this.rect(-6,-36,3,3,'#464c3c');if(facing!=='left')this.rect(5,-36,3,3,'#464c3c');this.rect(-1,-29,5,2,'#b38360');this.rect(-7,-19,4,9,'#ca966b');}
    c.restore();
  }
}
