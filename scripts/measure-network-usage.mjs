import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {backendFixture,A} from '../tests/helpers/backend-usage-fixture.mjs';
import {GolfCloud} from '../dist/src/cloud.js';
import {BACKGROUND_POLL_MS,SITE_SETTINGS_TTL_MS} from '../dist/src/network-policy.js';

const baselineIndex=process.argv.indexOf('--baseline');
if(baselineIndex<0||!process.argv[baselineIndex+1])throw Error('Supply --baseline <directory> containing the previous backend/ and dist/src/cloud.js. No live requests are made.');
const baseline=pathToFileURL(resolve(process.argv[baselineIndex+1])+'/');
let source=await readFile(new URL('dist/src/cloud.js',baseline),'utf8');
source=source.replace(/(from\s*)["'](\.\/[^"']+)["']/g,(_,prefix,name)=>prefix+JSON.stringify(new URL('../dist/src/'+name.slice(2),import.meta.url).href));
const {GolfCloud:PreviousCloud}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

async function measure(Cloud,sourceRoot,phase){
  const realNow=Date.now,start=Date.UTC(2026,10,17,12);let elapsed=0;
  Date.now=()=>start+elapsed;
  try{
    const f=await backendFixture({sourceRoot,largeSave:true});
    const room=f.rooms.get('room-fixture');room.state.phase=phase;
    if(phase==='playing'){
      room.state.deadline=start+7200000;room.state.botHoleStartedAt=start;
      Object.assign(room.state.members[0],{roundId:'round-fixture',scores:[],nextHole:0});
      f.rounds.push({id:'round-fixture',room_id:room.id,user_id:A,next_hole:0,holes:[],equipment:f.players.get(A).state.equipment});
    }
    const cloud=Object.create(Cloud.prototype);
    Object.assign(cloud,{session:{user:{id:A}},ui:{syncRoom:()=>{}},lastRoom:0});
    cloud.room=structuredClone(room);
    let invocations=0,replyBytes=0;
    cloud.call=async(action,body)=>{invocations++;const result=await f.call(action,body);replyBytes+=Buffer.byteLength(JSON.stringify(result));return result;};
    f.resetStats();
    for(elapsed=0;elapsed<3600000;elapsed+=500)await cloud.poll();
    return{edgeInvocations:invocations,upstreamRequests:f.stats.requests.length,roomWrites:f.stats.roomWrites,upstreamJsonBytes:f.stats.bytes,edgeReplyJsonBytes:replyBytes};
  }finally{Date.now=realNow;}
}
const workloads={};
for(const phase of ['waiting','playing']){
  const before=await measure(PreviousCloud,new URL('backend/',baseline),phase);
  const after=await measure(GolfCloud,new URL('../backend/',import.meta.url),phase);
  const reduction=Object.fromEntries(Object.keys(before).map(key=>[key,Math.round((1-after[key]/before[key])*1000)/10]));
  workloads[phase]={before,after,reductionPercent:reduction};
}
console.log(JSON.stringify({
  version:'1.12',
  method:'Execute previous and current client polling plus actual Edge handlers against an in-memory HTTP fixture for one simulated hour. Saves contain 100 KB of synthetic history; all bytes are uncompressed JSON bodies, excluding headers. These are workload measurements, not billing forecasts.',
  workloads,
  scheduledMenuRequestsPerHour:{before:{settings:60,friends:60,honors:80},after:{settings:3600000/SITE_SETTINGS_TTL_MS,friends:3600000/BACKGROUND_POLL_MS,honors:3600000/BACKGROUND_POLL_MS}}
},null,2));
