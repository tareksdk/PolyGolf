import test from 'node:test';
import assert from 'node:assert/strict';
import {musicStep,musicStyle,musicInterval,MUSIC_STYLES} from '../dist/src/music.js';
import {AudioManager} from '../dist/src/audio.js';
import {DEFAULT_SETTINGS} from '../dist/src/save.js';

test('three distinct original scores have bounded pitches, envelopes and voice counts',()=>{
  const scores=[];
  for(const style of MUSIC_STYLES){
    const score=Array.from({length:32},(_,i)=>musicStep(style,i));scores.push(JSON.stringify(score));
    const interval=musicInterval(style);let active=[];
    for(let step=0;step<160;step++){
      active=active.filter(end=>end>step*interval);
      for(const n of score[step%32]){
        assert.ok(n.frequency>=32&&n.frequency<=2200);
        assert.ok(n.duration>n.attack&&n.duration<=4.3);
        assert.ok(n.volume>0&&n.volume<=.25);
        active.push(step*interval+n.duration);
      }
      assert.ok(active.length<32,'Bounded simultaneous oscillator count');
    }
  }
  assert.equal(new Set(scores).size,3);
  assert.equal(musicStyle(undefined),'calm');assert.equal(musicStyle('invalid'),'calm');
});

test('music scheduling does not create a burst after tab suspension or while muted',()=>{
  const audio=new AudioManager({...DEFAULT_SETTINGS}),calls=[];
  audio.ctx={state:'running',currentTime:120};audio.tone=(...args)=>calls.push(args);
  audio.update(120,false);const first=calls.length;assert.ok(first>0&&first<=8);
  audio.update(.001,false);assert.equal(calls.length,first);
  audio.settings.music=0;audio.ctx.currentTime=240;audio.update(120,false);assert.equal(calls.length,first);
  audio.settings.music=.25;audio.update(.02,false);assert.ok(calls.length<=first+8);
});
