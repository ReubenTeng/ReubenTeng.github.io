import test from 'node:test';
import assert from 'node:assert/strict';
import { Climber, holds } from '../src/bouldering.js';
const settle=(game,seconds=2)=>{for(let i=0;i<seconds*60;i++)game.step(1/60);};

test('starting holds support the climber without input',()=>{
  const game=new Climber();settle(game,30);
  assert.equal(game.state,'climbing');assert.ok(Number.isFinite(game.body.y));assert.equal(game.moves,0);
});
test('route can be completed using legal limb moves, and requires both hands on the finish',()=>{
  const game=new Climber();settle(game);
  for(const [limb,hold] of [[0,5],[2,0],[3,6],[1,8],[2,7],[0,10],[3,11],[1,13],[2,12],[0,15],[3,16],[2,17],[1,17],[3,17],[0,17]]){
    assert.equal(game.state,'climbing');assert.ok(game.available(holds[hold],limb),`limb ${limb} can reach hold ${hold}`);
    game.select(limb);game.target(holds[hold].x,holds[hold].y);game.release();assert.equal(game.limbs[limb].hold,hold);settle(game);
  }
  assert.equal(game.state,'won');assert.equal(game.best,100);const time=game.elapsed;settle(game);assert.equal(game.elapsed,time);
});
test('unreachable and occupied holds cannot be grabbed, and losing both hands causes a recoverable fall',()=>{
  const game=new Climber();assert.equal(game.available(holds[17],0),false);assert.equal(game.available(holds[1],0),false);
  for(const i of [0,1]){game.select(i);game.target(10,620);game.release();assert.equal(game.limbs[i].hold,null);}
  settle(game,4);assert.equal(game.state,'fallen');game.reset();settle(game);assert.equal(game.state,'climbing');assert.equal(game.moves,0);assert.equal(game.selected,-1);
});
