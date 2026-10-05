import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFrame } from '../dist/src/render-frame.js';
import { buildSky } from '../dist/src/sky.js';
import * as THREE from '../dist/vendor/three.module.js';

function renderer() {
  const state = { target:'preview', scissor:true, depth:false, color:false, stencil:0, clears:0 };
  return {
    snapshot:state,
    state:{buffers:{depth:{setMask:v=>state.depth=v},color:{setMask:v=>state.color=v},stencil:{setMask:v=>state.stencil=v}}},
    setRenderTarget:v=>state.target=v, setScissorTest:v=>state.scissor=v,
    setViewport:(...v)=>state.viewport=v, setScissor:(...v)=>state.rect=v,
    setClearColor:v=>state.background=v,
    clear:(...flags)=>{
      assert.deepEqual(flags,[true,true,true]);
      assert.equal(state.target,null);assert.equal(state.scissor,false);
      assert.equal(state.depth,true);assert.equal(state.color,true);assert.equal(state.stencil,0xffffffff);
      state.clears++;
    },
    render:(scene)=>{assert.equal(scene.background,null);state.draw={scissor:state.scissor,rect:state.rect,viewport:state.viewport};},
  };
}

test('first frame clears stale depth and scissor state before drawing a course',()=>{
  const r=renderer(), scene={background:new THREE.Color('#b6d1d4')}, background=scene.background;
  renderFrame(r,scene,{},1280,720);
  assert.equal(r.snapshot.clears,1);assert.equal(r.snapshot.draw.scissor,false);
  assert.deepEqual(r.snapshot.draw.viewport,[0,0,1280,720]);assert.equal(scene.background,background);
});

test('caddie viewport is clipped, then fully restored for the next multiplayer frame',()=>{
  const r=renderer(),scene={background:new THREE.Color('#b6d1d4')};
  renderFrame(r,scene,{},1280,720,{left:20,right:500,top:-30,bottom:250,width:480,height:280});
  assert.deepEqual(r.snapshot.draw.rect,[20,470,480,250]);
  assert.equal(r.snapshot.scissor,false);assert.deepEqual(r.snapshot.viewport,[0,0,1280,720]);
  renderFrame(r,scene,{},1280,720);
  assert.equal(r.snapshot.draw.scissor,false);assert.equal(r.snapshot.clears,2);
});

test('a failed preview still restores background and viewport',()=>{
  const r=renderer(),scene={background:new THREE.Color('#b6d1d4')},background=scene.background;
  r.render=()=>{throw Error('test render failure');};
  assert.throws(()=>renderFrame(r,scene,{},1280,720,{left:20,right:500,top:0,bottom:250,width:480,height:250}));
  assert.equal(scene.background,background);assert.equal(r.snapshot.scissor,false);
  assert.deepEqual(r.snapshot.viewport,[0,0,1280,720]);
});

test('sky renders behind the scene without reading or writing the object depth buffer',()=>{
  const w={group:new THREE.Group()};buildSky(w,{courseIndex:0,length:400});
  const sky=w.group.children[0];
  assert.equal(sky.material.depthTest,false);assert.equal(sky.material.depthWrite,false);
  assert.ok(sky.renderOrder<0);assert.equal(sky.castShadow,false);
  sky.geometry.dispose();sky.material.dispose();
});
