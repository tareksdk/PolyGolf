import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {defaultSave} from '../../dist/src/save.js';
import {RULES_VERSION} from '../../dist/src/golf-courses.js';

export const A='00000000-0000-0000-0000-000000000001';
export const B='00000000-0000-0000-0000-000000000002';
export const C='00000000-0000-0000-0000-000000000003';

// Model PostgREST's column/JSON projection, so a test cannot accidentally hide a
// broken lightweight query by returning a complete fixture row for every select.
function project(row,select){
  if(!select||select==='*')return structuredClone(row);
  const result={};
  for(const part of select.split(',')){
    const colon=part.indexOf(':'),path=colon<0?part:part.slice(colon+1);
    const keys=path.split(/->>?/),alias=colon<0?keys.at(-1):part.slice(0,colon);
    let value=row;for(const key of keys)value=value?.[key];
    result[alias]=value===undefined?null:structuredClone(value);
  }
  return result;
}

export async function backendFixture({sourceRoot=new URL('../../backend/',import.meta.url),largeSave=false}={}){
  const state=defaultSave();state.xp=20000;
  if(largeSave)state.fixtureHistory='x'.repeat(100*1024);
  const players=new Map([[A,{id:A,username:'fixture_a',is_guest:false,revision:1,state,bio:'A golfer',avatar:'',created_at:'2026-01-01'}],[B,{id:B,username:'fixture_b',is_guest:false,revision:1,state:defaultSave(),bio:'Another golfer',avatar:'',created_at:'2026-01-01'}]]);
  const rooms=new Map([['room-fixture',{id:'room-fixture',code:'ABC234',revision:5,state:{host:A,phase:'waiting',mode:'golf',course:0,rulesVersion:RULES_VERSION,hole:0,members:[{id:A,name:'fixture_a',nameplate:state.equipment.nameplate,ready:true,seen:Date.now()}],deadline:0}}]]);
  const rounds=[],friends=[{user_low:A,user_high:B,status:'accepted',requested_by:A}],maps=[{id:'map-fixture',user_id:A,name:'Saved fixture',layout:{name:'Saved fixture'}}];
  const stats={requests:[],bytes:0,roomWrites:0};
  const fixture={players,rooms,rounds,friends,maps,stats};
  const resetStats=()=>{stats.requests.length=0;stats.bytes=0;stats.roomWrites=0;};
  const fetch=async(raw,options={})=>{
    const url=new URL(raw);
    if(url.origin!=='https://usage-fixture.invalid')throw Error('External network is forbidden in usage fixtures.');
    const path=url.pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
    stats.requests.push({path,method,select:url.searchParams.get('select'),prefer:options.headers.Prefer});
    const reply=(value,status=200)=>{const json=JSON.stringify(value);stats.bytes+=Buffer.byteLength(json);return new Response(json,{status});};
    if(path==='/auth/v1/user'){
      const id=options.headers.Authorization?.slice(7);
      return players.has(id)?reply({id}):reply({message:'Unauthorized'},401);
    }
    if(path.endsWith('/rpc/golf_rate'))return reply(true);
    if(path.endsWith('/rpc/golf_room_cas')){
      const room=rooms.get(body.p_id);
      if(!room||room.revision!==body.p_revision)return reply({message:'Room changed. Try again.'},409);
      room.state=structuredClone(body.p_state);room.revision++;stats.roomWrites++;
      return reply(room.revision);
    }
    if(path.endsWith('/rpc/golf_accolade_inbox'))return reply([]);
    if(path.endsWith('/rpc/golf_profile_honors'))return reply({});
    if(path.endsWith('/rpc/golf_profile_bests'))return reply([]);
    if(path.endsWith('/rpc/golf_ranked_status'))return reply({rating:{elo:1000,wins:0,losses:0,matches:0},queued:false,match:null});
    if(path.endsWith('/golf_players')){
      const id=url.searchParams.get('id');
      let rows=id?.startsWith('eq.')?[players.get(id.slice(3))].filter(Boolean):id?.startsWith('in.(')?id.slice(4,-1).split(',').map(k=>players.get(k)).filter(Boolean):[...players.values()];
      if(method==='PATCH'){
        rows.forEach(p=>Object.assign(p,body));
        if(options.headers.Prefer==='return=minimal')return new Response(null,{status:204});
      }
      return reply(rows.map(p=>project(p,url.searchParams.get('select'))));
    }
    if(path.endsWith('/golf_friends'))return reply(friends.map(p=>project(p,url.searchParams.get('select'))));
    if(path.endsWith('/golf_trades'))return reply([]);
    if(path.endsWith('/golf_ratings'))return reply([]);
    if(path.endsWith('/golf_maps'))return reply(maps.filter(m=>m.user_id===url.searchParams.get('user_id')?.slice(3)));
    if(path.endsWith('/golf_rooms')){
      const id=url.searchParams.get('id')?.slice(3),code=url.searchParams.get('code')?.slice(3);
      return reply([...rooms.values()].filter(r=>id?r.id===id:code?r.code===code:true).map(r=>project(r,url.searchParams.get('select'))));
    }
    if(path.endsWith('/golf_rounds'))return reply(rounds.filter(r=>r.room_id===url.searchParams.get('room_id')?.slice(3)).map(r=>project(r,url.searchParams.get('select'))));
    throw Error('Unexpected fixture endpoint: '+path);
  };
  let handler;
  function activate(){globalThis.fetch=fetch;}
  activate();
  globalThis.Deno={env:{get:k=>k==='SUPABASE_URL'?'https://usage-fixture.invalid':'fixture-service-key'},serve:fn=>{handler=fn;}};
  const moduleCache=new Map();
  async function load(name){
    if(moduleCache.has(name))return moduleCache.get(name);
    let source=await readFile(new URL(name,sourceRoot),'utf8');
    source=source.replaceAll("'./shared/","'"+new URL('../../dist/src/',import.meta.url).href);
    for(const match of [...source.matchAll(/from\s*['"]\.\/([^'"]+\.ts)['"]/g)])source=source.replace(match[0], 'from '+JSON.stringify(await load(match[1])));
    // Each fixture needs its own serve registration despite Node's module cache.
    const url='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)+'\n// fixture '+Math.random()).toString('base64');
    moduleCache.set(name,url);return url;
  }
  await import(await load('index.ts'));
  async function response(action,data={},id=A){
    activate();
    return handler(new Request('https://game-fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json',...(id?{Authorization:'Bearer '+id}:{})},body:JSON.stringify({action,rulesVersion:RULES_VERSION,...data})}));
  }
  async function call(action,data={},id=A){const r=await response(action,data,id),value=await r.json();if(!r.ok)throw Error(value.error);return value;}
  return {...fixture,call,response,resetStats,options:()=>handler(new Request('https://game-fixture.invalid',{method:'OPTIONS',headers:{Origin:'https://littlelinks.study'}}))};
}
