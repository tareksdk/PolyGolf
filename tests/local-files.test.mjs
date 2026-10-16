import test from 'node:test';
import assert from 'node:assert/strict';
import {readLocalFile} from '../scripts/local-files.mjs';

test('a canceled local asset read retries without reporting a missing file',async()=>{
 let calls=0;
 const value=await readLocalFile('asset.css','utf8',async()=>{
  if(calls++<2)throw Object.assign(Error('Read canceled'),{code:'ECANCELED'});
  return 'body{}';
 });
 assert.equal(value,'body{}');assert.equal(calls,3);
});
test('missing files are not retried and persistent transient errors remain bounded',async()=>{
 let calls=0;
 await assert.rejects(readLocalFile('missing',undefined,async()=>{calls++;throw Object.assign(Error('Missing'),{code:'ENOENT'});}),{code:'ENOENT'});
 assert.equal(calls,1);calls=0;
 await assert.rejects(readLocalFile('busy',undefined,async()=>{calls++;throw Object.assign(Error('Busy'),{code:'EBUSY'});}),{code:'EBUSY'});
 assert.equal(calls,4);
});
