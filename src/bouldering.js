// Small position-based climbing simulation. All distances are in wall coordinates.
export const holds = [
  [180,475],[280,475],[190,565],[270,565],
  [130,410],[235,400],[330,410],[170,335],[285,330],
  [105,270],[225,260],[335,265],[155,195],[285,185],
  [115,125],[240,115],[340,120],[230,55],
].map(([x,y],id)=>({x,y,id}));
const names=['Left hand','Right hand','Left foot','Right foot'];
export class Climber {
  constructor(){this.reset();}
  reset(){this.body={x:230,y:510,vx:0,vy:0};this.limbs=holds.slice(0,4).map((h,i)=>({x:h.x,y:h.y,hold:i,name:names[i]}));this.selected=-1;this.moves=0;this.state='climbing';this.message='Four limbs. One deeply questionable technique.';this.elapsed=0;this.best=0;}
  origin(i){return{x:this.body.x+(i%2?16:-16),y:this.body.y+(i<2?-25:25)};}
  reach(i){return i<2?112:120;}
  select(i){if(this.state!=='climbing')return;this.selected=i;this.limbs[i].hold=null;}
  target(x,y){if(this.selected<0)return;const i=this.selected,o=this.origin(i),d=Math.hypot(x-o.x,y-o.y),r=this.reach(i);Object.assign(this.limbs[i],{x:o.x+(x-o.x)*Math.min(1,r/(d||1)),y:o.y+(y-o.y)*Math.min(1,r/(d||1))});}
  available(h,i=this.selected){if(i<0)return false;const o=this.origin(i);return Math.hypot(h.x-o.x,h.y-o.y)<=this.reach(i)+3&&!this.limbs.some((l,j)=>j!==i&&l.hold===h.id&&h.id!==17);}
  release(){if(this.selected<0)return;const i=this.selected,l=this.limbs[i];const h=holds.filter(h=>this.available(h,i)).sort((a,b)=>Math.hypot(a.x-l.x,a.y-l.y)-Math.hypot(b.x-l.x,b.y-l.y))[0];if(h&&Math.hypot(h.x-l.x,h.y-l.y)<30){Object.assign(l,{x:h.x,y:h.y,hold:h.id});this.moves++;this.message=['Elegant? No. Higher? Yes.','The wall has requested a different partner.','That knee is doing its best.','Absolutely textbook. Wrong textbook.'][this.moves%4];}else this.message='Missed it. Gravity has entered the chat.';this.selected=-1;}
  step(dt){
    if(this.state!=='climbing')return;
    this.elapsed+=dt;const b=this.body,old={x:b.x,y:b.y};
    const hands=this.limbs.slice(0,2).filter(l=>l.hold!==null);
    if(hands.length){
      const anchored=this.limbs.map((l,i)=>({...l,i})).filter(l=>l.hold!==null);
      const tx=anchored.reduce((sum,l)=>sum+l.x-(l.i%2?16:-16),0)/anchored.length;
      const ty=anchored.reduce((sum,l)=>sum+l.y+(l.i<2?60:-80),0)/anchored.length;
      b.vx+=(tx-b.x)*25*dt;b.vy+=(ty-b.y)*25*dt;
    }
    b.vy+=220*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
    // Hands suspend the body; feet brace it. Feet alone cannot hold a climber up.
    if(hands.length)for(let pass=0;pass<8;pass++)this.limbs.forEach((l,i)=>{if(l.hold===null)return;const o=this.origin(i),dx=l.x-o.x,dy=l.y-o.y,d=Math.hypot(dx,dy),max=this.reach(i)*.79;if(d>max){b.x+=dx*(d-max)/d;b.y+=dy*(d-max)/d;}});
    else this.limbs.forEach(l=>{l.hold=null;});
    b.vx=(b.x-old.x)/dt*.85;b.vy=(b.y-old.y)/dt*.85;
    this.limbs.forEach((l,i)=>{if(l.hold!==null||i===this.selected)return;const o=this.origin(i);l.x+=(o.x+(i%2?30:-30)-l.x)*Math.min(1,dt*7);l.y+=(o.y+this.reach(i)*.8-l.y)*Math.min(1,dt*7);});
    this.best=Math.max(this.best,Math.min(100,Math.round((510-b.y)/390*100)));
    if(this.limbs[0].hold===17&&this.limbs[1].hold===17){this.state='won';this.best=100;this.message='TOPPED OUT. Unfortunately, someone saw all of that.';this.selected=-1;}
    if(b.y>575){b.y=575;this.state='fallen';this.selected=-1;this.message='A perfect landing. If the goal was the floor.';}
  }
}
export function mountBouldering(root){
  const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),status=root.querySelector('[role=status]'),stats=root.querySelector('[data-climb-stats]'),game=new Climber(),abort=new AbortController();
  let raf,previous=0,pointer=null,dragStart=null,dragged=false,lastStatus='',lastStats='';
  const listen=(target,event,fn)=>target.addEventListener(event,fn,{signal:abort.signal});
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*460/r.width,y:(e.clientY-r.top)*650/r.height};};
  function select(i){if(game.selected>=0)game.release();game.select(i);}
  listen(canvas,'pointerdown',e=>{if(pointer!==null)return;e.preventDefault();canvas.focus({preventScroll:true});const p=point(e);const i=game.limbs.findIndex(l=>Math.hypot(l.x-p.x,l.y-p.y)<28);if(i>=0){select(i);pointer=e.pointerId;dragStart=p;dragged=false;canvas.setPointerCapture(e.pointerId);}else if(game.selected>=0){game.target(p.x,p.y);game.release();}});
  listen(canvas,'pointermove',e=>{if(e.pointerId===pointer){const p=point(e);if(Math.hypot(p.x-dragStart.x,p.y-dragStart.y)>5)dragged=true;game.target(p.x,p.y);}});
  listen(canvas,'pointerup',e=>{if(e.pointerId!==pointer)return;if(dragged){const p=point(e);game.target(p.x,p.y);game.release();}pointer=null;});
  for(const event of ['pointercancel','lostpointercapture'])listen(canvas,event,()=>{if(pointer!==null){game.release();pointer=null;}});
  listen(canvas,'keydown',e=>{const key=e.key.toLowerCase(),i='qwop'.indexOf(key);if(key.length===1&&i>=0){e.preventDefault();select(i);return;}if(key==='r'){e.preventDefault();game.reset();return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();if(game.selected<0)return;if(e.key==='Enter'||e.key===' ')game.release();else{const l=game.limbs[game.selected];game.target(l.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0),l.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0));}}});
  listen(root.querySelector('[data-climb-reset]'),'click',()=>{game.reset();canvas.focus();});
  root.querySelectorAll('[data-limb]').forEach(button=>listen(button,'click',()=>{select(Number(button.dataset.limb));canvas.focus({preventScroll:true});}));
  const freeze=()=>{if(game.selected>=0)game.release();pointer=null;previous=0;};listen(window,'blur',freeze);listen(document,'visibilitychange',freeze);
  function line(points,color,width){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
  function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function draw(){
    const dpr=Math.min(window.devicePixelRatio||1,2),width=Math.round(canvas.clientWidth*dpr),height=Math.round(canvas.clientHeight*dpr);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}ctx.setTransform(width/460,0,0,height/650,0,0);
    ctx.fillStyle='#d9c8a6';ctx.fillRect(0,0,460,650);
    ctx.fillStyle='#cebb96';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(105,0);ctx.lineTo(170,340);ctx.lineTo(0,480);ctx.fill();ctx.fillStyle='#e4d7b8';ctx.beginPath();ctx.moveTo(460,0);ctx.lineTo(355,0);ctx.lineTo(300,430);ctx.lineTo(460,550);ctx.fill();
    for(let y=25;y<600;y+=30)for(let x=25;x<460;x+=30)circle(x,y,1.3,'#ab9875');
    ctx.fillStyle='#6b8061';ctx.fillRect(0,610,460,40);ctx.fillStyle='#93a583';ctx.fillRect(8,608,216,12);ctx.fillRect(230,608,222,12);
    ctx.font='10px monospace';ctx.textAlign='center';ctx.fillStyle='#40563f';ctx.fillText('THE UNNECESSARILY DIFFICULT WAY UP',230,24);
    holds.forEach(h=>{const active=game.available(h);if(active){circle(h.x,h.y,23,'#f6f0d7');}ctx.save();ctx.translate(h.x,h.y);ctx.rotate((h.id%3-1)*.3);ctx.fillStyle='#6d513d';ctx.fillRect(-13,-7,28,18);ctx.fillStyle=h.id===17?'#ecc55f':h.id<4?'#6f8870':'#b97450';ctx.fillRect(-15,-10,28,17);ctx.fillStyle='#ffffff50';ctx.fillRect(-11,-8,16,3);ctx.restore();circle(h.x+3,h.y,2,'#5a5847');});
    ctx.fillStyle='#485640';ctx.font='9px monospace';ctx.fillText('BOTH HANDS ↑',230,86);ctx.fillText('START',230,592);
    const b=game.body;circle(b.x+6,b.y+17,29,'#645b4220');
    game.limbs.forEach((l,i)=>{const o=game.origin(i),dx=l.x-o.x,dy=l.y-o.y,bend=(i%2?1:-1)*(i<2?23:28),d=Math.hypot(dx,dy)||1;const joint={x:(o.x+l.x)/2-dy/d*bend,y:(o.y+l.y)/2+dx/d*bend};line([o,joint,l],'#374c3d',13);line([o,joint,l],i<2?'#c69a70':'#6e8274',8);});
    line([{x:b.x,y:b.y-25},{x:b.x,y:b.y+25}],'#b77850',36);line([{x:b.x-10,y:b.y-24},{x:b.x-10,y:b.y+12}],'#d49a69',5);
    circle(b.x,b.y-49,19,'#dfb98b');ctx.fillStyle='#42503a';ctx.fillRect(b.x-19,b.y-65,37,13);ctx.fillRect(b.x-20,b.y-60,9,20);circle(b.x-6,b.y-48,2,'#354734');circle(b.x+7,b.y-48,2,'#354734');ctx.fillRect(b.x-3,b.y-39,7,3);
    game.limbs.forEach((l,i)=>{circle(l.x,l.y,game.selected===i?17:12,game.selected===i?'#f7ecc8':'#344e3e');circle(l.x,l.y,8,i<2?'#eac49a':'#b8c2a1');ctx.font='bold 9px monospace';ctx.fillStyle='#263e30';ctx.fillText('QWOP'[i],l.x,l.y+3);});
    if(game.state!=='climbing'){ctx.fillStyle='#203b32dd';ctx.fillRect(38,280,384,92);ctx.fillStyle='#f6efda';ctx.font='30px Georgia';ctx.fillText(game.state==='won'?'A very questionable send.':'Gravity: 1. You: 0.',230,318);ctx.font='12px monospace';ctx.fillText('Press R or “Try again”',230,347);}
    const message=game.message+(game.selected>=0?` ${names[game.selected]} selected. Choose a highlighted hold.`:'');if(message!==lastStatus){status.textContent=message;lastStatus=message;}
    const score=`${game.best}% UP · ${game.moves} MOVES · ${Math.floor(game.elapsed)}s`;if(score!==lastStats){stats.textContent=score;lastStats=score;}
    root.querySelectorAll('[data-limb]').forEach((button,i)=>button.setAttribute('aria-pressed',String(game.selected===i)));
  }
  function frame(t){if(!document.hidden){const dt=previous?Math.min((t-previous)/1000,.032):1/60;game.step(dt);draw();}previous=t;raf=requestAnimationFrame(frame);}raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);abort.abort();};
}
