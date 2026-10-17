import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {createFullShotGuide} from '../dist/src/full-shot-guide.js';
import {getGolfHole,terrainHeight} from '../dist/src/golf-courses.js';
import {defaultSave,LocalSaveRepository,SAVE_KEY} from '../dist/src/save.js';

test('full shot path is the default for new and existing saves; the short option persists',()=>{
 const old=defaultSave();assert.equal(old.settings.shotGuide,'full');delete old.settings.shotGuide;
 const storage={getItem:()=>JSON.stringify(old)},repo=new LocalSaveRepository(storage);
 assert.equal(repo.load().settings.shotGuide,'full');old.settings.shotGuide='directional';assert.equal(repo.load().settings.shotGuide,'directional');
 old.settings.shotGuide='invalid';assert.equal(repo.load().settings.shotGuide,'full');
});
test('full guide predicts a complete flight and descent, reuses GPU buffers and clears stale jobs on reset',async()=>{
 const hole=getGolfHole(0,0),world={hole,clock:0,activeClub:'driver',renderGround:(x,z)=>terrainHeight(hole,x,z)};
 const guide=createFullShotGuide(world),line=guide.group.children[0],stroke=guide.group.children[1],geometry=line.geometry,strokeGeometry=stroke.geometry,attribute=geometry.attributes.position;
 guide.setAim(hole.start,{x:0,z:-1},.85,true);
 for(let i=0;i<100&&geometry.drawRange.count===0;i++)await wait(5);
 const count=geometry.drawRange.count;assert.ok(count>33);let maxY=-Infinity;for(let i=0;i<count;i++)maxY=Math.max(maxY,attribute.getY(i));
 assert.ok(maxY>attribute.getY(count-1)+2);assert.ok(Math.abs(attribute.getZ(count-1)-hole.start.z)>80);
 world.clock=1;guide.setAim(hole.start,{x:.1,z:-.995},.7,true);await wait(100);
 assert.equal(line.geometry,geometry);assert.equal(stroke.geometry,strokeGeometry);assert.equal(geometry.attributes.position,attribute);
 world.clock=2;guide.setAim(hole.start,{x:-.2,z:-.98},.9,true);guide.reset();await wait(150);
 assert.equal(geometry.drawRange.count,0);assert.equal(stroke.count,0);assert.equal(guide.group.visible,false);
});
