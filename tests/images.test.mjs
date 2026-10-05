import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import sharp from 'sharp';
import {optimizePhoto} from '../scripts/images.mjs';

// Avoid retaining native image file handles during temporary-fixture cleanup on Windows.
sharp.cache({ files: 0 });

test('real PNG data with an uppercase extension produces two valid WebP images',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'rt-images-'));
  try{
    const input=path.join(temp,'camera.PNG'),thumb=path.join(temp,'thumb.webp'),display=path.join(temp,'display.webp');
    await sharp({create:{width:640,height:320,channels:4,background:{r:70,g:100,b:80,alpha:0.5}}}).png().toFile(input);
    const original=await readFile(input);
    assert.deepEqual(await optimizePhoto(input,thumb,display),{width:640,height:320});
    const small=await sharp(await readFile(thumb)).metadata(),large=await sharp(await readFile(display)).metadata();
    assert.equal(small.format,'webp');assert.equal(small.width,480);assert.equal(small.height,240);assert.equal(small.hasAlpha,true);
    assert.equal(large.format,'webp');assert.equal(large.width,640);
    assert.deepEqual(await readFile(input),original);
  }finally{if(!temp.startsWith(path.join(tmpdir(),'rt-images-')))throw new Error('Unsafe cleanup');await rm(temp,{recursive:true,force:true});}
});
test('LFS pointers and invalid files fail with the affected photo path',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'rt-images-'));
  try{
    const input=path.join(temp,'photo.png'),thumb=path.join(temp,'thumb.webp'),display=path.join(temp,'display.webp');
    await writeFile(input,'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 12345\n');
    await assert.rejects(optimizePhoto(input,thumb,display,'photos/Air show/photo.png'),error=>error.message.includes('photos/Air show/photo.png')&&error.message.includes('Git LFS pointer')&&error.message.includes('lfs: true'));
    await writeFile(input,'this is not a PNG');
    await assert.rejects(optimizePhoto(input,thumb,display,'photos/Broken/photo.png'),/Could not build photograph "photos\/Broken\/photo.png"/);
    await writeFile(input,'');
    await assert.rejects(optimizePhoto(input,thumb,display),/is empty/);
  }finally{if(!temp.startsWith(path.join(tmpdir(),'rt-images-')))throw new Error('Unsafe cleanup');await rm(temp,{recursive:true,force:true});}
});
