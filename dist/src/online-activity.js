import { SUPABASE_URL, PUBLISHABLE_KEY } from './cloud.js';
export function activityRange(base) { const n=Math.max(0,Math.min(1000000,Math.trunc(Number(base)||0)));return {min:Math.ceil(n*.95),max:Math.floor(n*1.05)}; }
export function activityCount(base, phase) {
  const {min,max}=activityRange(base), value=Math.round(min+(max-min)*(.5+.5*Math.sin(phase)));
  return Math.min(max,Math.max(min,value));
}
export function installActivity(ui) {
  if(ui.cloud.localPreview)return;
  let message=null,base=null,enabled=true,nextFetch=0,failures=0,busy=false;
  const offset=Math.random()*Math.PI*2;
  function paint(){const splash=document.querySelector('#home-splash');if(splash){const config=homeMessage(message);splash.hidden=!config.text;splash.textContent=config.text;splash.style.color=config.color;splash.style.fontSize=config.size+'px';splash.style.transform=`rotate(${config.rotation}deg)`;}const node=document.querySelector('#online-estimate');if(!node)return;node.hidden=!enabled||base===null;const count=node.querySelector('b');if(count&&base!==null)count.textContent=activityCount(base,Date.now()/55000+offset).toLocaleString();}
  async function update(){
    paint();if(document.hidden||busy||Date.now()<nextFetch)return;
    busy=true;nextFetch=Date.now()+60000;
    try{const r=await fetch(SUPABASE_URL+'/rest/v1/golf_site_settings?id=eq.activity&select=online_base,enabled,home_message,home_message_color,home_message_size,home_message_rotation',{headers:{apikey:PUBLISHABLE_KEY},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();const rows=await r.json();if(rows[0]){message=rows[0];base=rows[0].online_base;enabled=rows[0].enabled;}failures=0;paint();}
    catch{nextFetch=Date.now()+Math.min(600000,60000*2**++failures);}finally{busy=false;}
  }
  const render=ui.render.bind(ui);ui.render=()=>{render();paint();};
  update();setInterval(update,15000);
}

export function homeMessage(row) {
  const angle=Number(row?.home_message_rotation ?? -3);
  return {text:typeof row?.home_message==='string'?row.home_message.trim().slice(0,140):'',
    color:/^#[0-9a-f]{6}$/i.test(row?.home_message_color)?row.home_message_color:'#f1d982',
    size:Math.max(12,Math.min(40,Number(row?.home_message_size)||20)),
    rotation:Number.isFinite(angle)?Math.max(-180,Math.min(180,angle)):-3};
}
