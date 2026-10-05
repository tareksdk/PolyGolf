import { PASS_TIERS, membership, tierClaimed } from './equipment.js';
import { ACHIEVEMENTS } from './save.js';

export function notificationSections(ui, seen={}) {
  const d=ui.progress.data,p=membership(ui.progress),f=ui.friendsData;
  return {
    'club-pass':PASS_TIERS.some(t=>d.xp>=t.xp&&!tierClaimed(ui.progress,t)),
    trades:(ui.tradeInbox||0)>0,
    friends:!!f && (f.incoming.length>0 || f.friends.some(x=>!(seen.friends||[]).includes(x.id))),
    garage:d.owned.some(id=>!(seen.owned||d.owned).includes(id)),
    achievements:ACHIEVEMENTS.some(a=>d.achievements.includes(a.id)&&!d.achievementRewards?.includes(a.id)),
  };
}
export function installNotifications(ui) {
  const render=ui.render.bind(ui);let account,seen={},pending=false,nextPoll=0,failures=0;
  function persist(){try{localStorage.setItem('polygolf-notices:'+account,JSON.stringify(seen));}catch{}}
  function refresh(){
    const id=ui.cloud.session?.user?.id||'guest';
    if(id!==account){account=id;ui.friendsData=null;nextPoll=0;failures=0;try{seen=JSON.parse(localStorage.getItem('polygolf-notices:'+id)||'{}');}catch{seen={};}if(!seen||typeof seen!=='object')seen={};if(!Array.isArray(seen.owned))seen.owned=[...ui.progress.data.owned];if(!Array.isArray(seen.friends))seen.friends=[];persist();}
    if(ui.screen==='garage'){seen.owned=[...ui.progress.data.owned];persist();}
    if(ui.screen==='friends'&&ui.friendsData){seen.friends=ui.friendsData.friends.map(x=>x.id);persist();}
    const flags=notificationSections(ui,seen);flags.shop=flags.achievements;flags.friends=flags.friends||flags.trades;
    for(const node of ui.root.querySelectorAll('[data-action]')){
      const on=!!flags[node.dataset.action];
      node.classList.toggle('has-notification',on);
      if(on&&!node.querySelector('.notification-dot')){const dot=document.createElement('span');dot.className='notification-dot';dot.setAttribute('role','img');dot.setAttribute('aria-label','New update');node.append(dot);}
      else if(!on)node.querySelector('.notification-dot')?.remove();
    }
  }
  ui.render=()=>{render();refresh();};
  setInterval(async()=>{
    refresh();
    if(!ui.cloud.session||document.hidden||ui.game.state!=='menu'||ui.screen==='friends'||pending||Date.now()<nextPoll)return;
    pending=true;const id=account;nextPoll=Date.now()+60000;
    try{const data=await ui.cloud.call('friends');if(account===id){ui.friendsData=data;failures=0;refresh();}}
    catch{failures++;nextPoll=Date.now()+Math.min(600000,60000*2**failures);}
    finally{pending=false;}
  },10000);
}
