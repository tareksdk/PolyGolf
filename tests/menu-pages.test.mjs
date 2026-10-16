import test from 'node:test';
import assert from 'node:assert/strict';
import {menuRange} from '../dist/src/menu-pages.js';

test('menu pages expose every item exactly once, including the last partial page',()=>{
 for(const total of [0,1,7,112,629]) for(const size of [1,2,3]) {
  const seen=[];
  for(let p=0;p<menuRange(total,size).pages;p++) {
   const {start,end}=menuRange(total,size,p);
   for(let i=start;i<end;i++)seen.push(i);
  }
  assert.deepEqual(seen,Array.from({length:total},(_,i)=>i));
 }
});
test('filtering and resizing clamp a saved menu page to the remaining items',()=>{
 assert.deepEqual(menuRange(2,3,100),{page:0,pages:1,start:0,end:2});
 assert.deepEqual(menuRange(7,3,100),{page:2,pages:3,start:6,end:7});
 assert.equal(menuRange(7,3,-2).page,0);
});
