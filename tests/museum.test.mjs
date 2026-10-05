import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { discoverAlbums } from '../scripts/catalog.mjs';
import { canStand, movePlayer, nearestExhibit, sectionPhotos, findPath } from '../src/geometry.js';

test('albums discover mixed-case extensions, skip unrelated files, honor metadata, and retain empty rooms', async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'rt-catalog-'));
  try{
    await mkdir(path.join(temp,'A trip'));
    await mkdir(path.join(temp,'Empty'));
    await Promise.all(['2.JPG','10.png','notes.txt','1.webp'].map(name=>writeFile(path.join(temp,'A trip',name),'')));
    await writeFile(path.join(temp,'A trip','album.json'),JSON.stringify({title:'A different title',order:['10.png'],cover:'2.JPG',photos:{'2.JPG':{title:'Two',alt:'A descriptive caption'}}}));
    const albums=await discoverAlbums(temp);
    assert.equal(albums.length,2);assert.equal(albums[0].title,'A different title');
    assert.deepEqual(albums[0].photos.map(p=>p.filename),['10.png','1.webp','2.JPG']);
    assert.equal(albums[0].cover,albums[0].photos[2].id);assert.equal(albums[0].photos[2].alt,'A descriptive caption');assert.equal(albums[1].photos.length,0);
  }finally{if(!temp.startsWith(path.join(tmpdir(),'rt-catalog-')))throw new Error('Unsafe cleanup');await rm(temp,{recursive:true,force:true});}
});
test('stable identifiers disambiguate names that normalize to the same slug',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'rt-catalog-'));
  try{
    for(const folder of ['A trip','A-trip']){await mkdir(path.join(temp,folder));await writeFile(path.join(temp,folder,'same.JPG'),'');}
    const albums=await discoverAlbums(temp);assert.notEqual(albums[0].id,albums[1].id);
  }finally{if(!temp.startsWith(path.join(tmpdir(),'rt-catalog-')))throw new Error('Unsafe cleanup');await rm(temp,{recursive:true,force:true});}
});
test('missing photos root is a supported empty collection',async()=>{assert.deepEqual(await discoverAlbums(path.join(tmpdir(),'rt-no-such-photo-root-56d2')),[]);});
test('furniture and room walls stop movement even at high delta; unobstructed axes can slide',()=>{
  const obstacles=[{x:400,y:340,w:200,h:75}];const bounds={left:80,right:920,top:207,bottom:573};
  const player={x:500,y:450};movePlayer(player,0,-300,obstacles,bounds);assert.ok(player.y>=423);
  movePlayer(player,100,-50,obstacles,bounds);assert.ok(Math.abs(player.x-600)<0.001);assert.ok(player.y>=423);
  movePlayer(player,1000,0,obstacles,bounds);assert.ok(player.x<=920);
  assert.equal(canStand(500,360,obstacles,bounds),false);
});
test('click-to-walk finds a route around a desk and refuses blocked targets',()=>{
  const obstacles=[{x:400,y:320,w:200,h:90}],bounds={left:80,right:920,top:207,bottom:573};
  const route=findPath({x:500,y:500},{x:500,y:240},obstacles,bounds);
  assert.ok(route.length>0);assert.ok(route.every(p=>canStand(p.x,p.y,obstacles,bounds)));assert.deepEqual(route.at(-1),{x:500,y:240});assert.deepEqual(findPath({x:500,y:500},{x:500,y:360},obstacles,bounds),[]);
});
test('interaction chooses the nearest reachable prompt and gallery sections retain every photo',()=>{
  const exhibits=[{id:'far',approach:{x:800,y:500}},{id:'near',approach:{x:510,y:490}}];
  assert.equal(nearestExhibit({x:500,y:500},exhibits).id,'near');assert.equal(nearestExhibit({x:0,y:0},exhibits),null);
  const photos=Array.from({length:17},(_,i)=>i);assert.deepEqual([0,1,2].flatMap(i=>sectionPhotos(photos,i)),photos);
});
test('malformed album metadata fails with a useful error',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'rt-catalog-'));
  try{await mkdir(path.join(temp,'Bad metadata'));await writeFile(path.join(temp,'Bad metadata','album.json'),'{broken');await assert.rejects(discoverAlbums(temp),/Invalid album.json/);}
  finally{if(!temp.startsWith(path.join(tmpdir(),'rt-catalog-')))throw new Error('Unsafe cleanup');await rm(temp,{recursive:true,force:true});}
});
