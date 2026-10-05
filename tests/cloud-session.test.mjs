import test from 'node:test';
import assert from 'node:assert/strict';
import {GolfCloud} from '../dist/src/cloud.js';
import {writeSession,readSession} from '../dist/src/session-store.js';
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
const fixture=()=>{const cloud=Object.create(GolfCloud.prototype);cloud.session={access_token:'fixture-a',refresh_token:'fixture-r',user:{id:'fixture-user'},expires_at:1};cloud.detach=()=>{cloud.session=null;};writeSession(cloud.session);return cloud;};
test('transient refresh failures retain the saved session; explicit invalid token clears it',async()=>{
 const c=fixture();globalThis.fetch=async()=>new Response('{}',{status:503});await assert.rejects(c.refresh(),/reach/);assert.equal(readSession().refresh_token,'fixture-r');assert.ok(c.session);
 globalThis.fetch=async()=>{throw Error('offline');};await assert.rejects(c.refresh(),/reach/);assert.ok(readSession());
 globalThis.fetch=async()=>new Response('{}',{status:400});await assert.rejects(c.refresh(),/expired/);assert.equal(readSession(),null);assert.equal(c.session,null);
});
test('simultaneous refresh calls rotate once and persist the new token',async()=>{
 const c=fixture();let calls=0;globalThis.fetch=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return new Response(JSON.stringify({...c.session,refresh_token:'rotated',access_token:'new-access',expires_at:Date.now()/1000+3600}));};
 await Promise.all([c.refresh(),c.refresh(),c.refresh()]);assert.equal(calls,1);assert.equal(readSession().refresh_token,'rotated');
});
test('an in-flight account response cannot replace guest data after sign-out',async()=>{
 const c=fixture();c.session.expires_at=Date.now()/1000+3600;writeSession(c.session);let accept=0;c.accept=()=>accept++;
 globalThis.fetch=async()=>{c.session=null;return new Response('{"state":{"coins":999}}');};await c.call('me');assert.equal(accept,0);
});
