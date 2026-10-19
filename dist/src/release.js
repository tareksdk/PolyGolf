import { installTrails } from './trails.js';
import { button, esc } from './views.js';
import { socialView } from './social-view.js';
import { claimSocialReward } from './community-rewards.js';
import { buyMemberItem } from './equipment.js';
import { installNotifications } from './notifications.js';
import { courseMenu } from './course-menu.js';
import { patternDialog, equipPattern } from './pattern-ui.js';
import { ITEM_BY_ID } from './catalog.js';

// Course easter eggs: the physics event, its achievement, server claim and unlocks.
const DISCOVERIES={
  'pumpkin':{id:'pumpkin',claim:'claim_pumpkin',items:['ball-pumpkin-find','nameplate-pumpkin-find'],local:p=>p.discoverPumpkin(),
    message:'Pumpkin found! Lost Pumpkin ball and Pumpkin Hunter nameplate unlocked.'},
  'pirate-ship':{id:'pirate',claim:'claim_ship',items:['ball-pirate','nameplate-pirate'],local:p=>p.discoverPirate(),
    message:'Broadside! Pirate ball and nameplate unlocked.'},
  'darby':{id:'darby',claim:'claim_darby',items:['ball-darby','nameplate-darby'],local:p=>p.discoverDarby(),
    message:'You found Darby! Darby’s Tennis Ball and the Darby’s Best Friend nameplate are yours.'},
};

export function installRelease(ui) {
  installTrails(ui.world);
  const action=ui.action.bind(ui),event=ui.game.onEvent,render=ui.render.bind(ui);
  ui.render=()=>{if(ui.screen==='socials' && ui.game.state==='menu')ui.root.innerHTML=socialView(ui);else if(ui.screen==='courses' && ui.game.state==='menu')ui.root.innerHTML=courseMenu(ui);else render();};
  ui.action=async(name,data={})=>{
    if(name==='pattern-view' || (name==='item-detail' && ITEM_BY_ID[data.id]?.finish)){patternDialog(ui,data.id,data.seed===undefined?undefined:Number(data.seed));return;}
    if(name==='equip-pattern'){await equipPattern(ui,data.id,Number(data.seed));return;}
    if(name==='buy-member-item'){
      if(ui.memberPurchaseBusy)return;ui.memberPurchaseBusy=true;
      try{if(ui.cloud.session)await ui.cloud.call('buy_member_item',{id:data.id});else buyMemberItem(ui.progress,data.id);ui.revealItems([data.id]);ui.render();}catch(e){ui.toast(e.message);}finally{ui.memberPurchaseBusy=false;}return;
    }
    if(name==='socials'){if(ui.game.state!=='menu')return;ui.shopShelf='socials';ui.navigate('shop');return;}
    if(name==='visit-social'){
      // The real anchor opens immediately. Queue rewards so quick clicks cannot
      // race the account revision or silently drop a different link's reward.
      const id=data.id;
      if(ui.progress.data.socialRewards?.includes(id))return;
      ui.socialQueue=(ui.socialQueue||Promise.resolve()).then(async()=>{
        if(ui.progress.data.socialRewards?.includes(id))return;
        try {
          const result=ui.cloud.session ? (await ui.cloud.call('claim_social',{id})).outcome : claimSocialReward(ui.progress,id);
          if(result.coins)ui.toast('Thanks for visiting Room310! +1,000 coins');
          if(ui.screen==='socials'||(ui.screen==='shop'&&ui.shopShelf==='socials'))ui.render();
        } catch(e) {ui.toast(e.message+' Open the link again to retry the reward.');}
      });
      return;
    }
    if(name==='purchase-coming-soon'){
      ui.modal(`<div class="coming-soon"><span class="eyebrow">${esc(data.product || 'Coin shop')}</span><h2>Coming Soon</h2><p>Real-money purchases aren’t available yet. No payment will be taken.</p>${button('Got it','close-modal','','button yellow')}</div>`);
      return;
    }
    return action(name,data);
  };
  ui.game.onEvent=(name)=>{
    event(name);
    if(name==='pumpkin') ui.world.explodePumpkin?.();
    if(name==='darby') ui.world.greetDarby?.();
    const discovery=DISCOVERIES[name];
    if(!discovery || ui.game.round.practice || ui.game.customHole || ui.progress.data.achievementRewards?.includes(discovery.id))return;
    const {items,message}=discovery;
    if(ui.cloud.session && ui.game.round.cloudId){
      const payload={roundId:ui.game.round.cloudId,index:ui.game.index,transcript:structuredClone(ui.game.transcript),endTick:ui.game.ticks};
      ui.shipClaim=ui.cloud.call(discovery.claim,payload).then(()=>{
        ui.revealItems(items);ui.toast(message);
      }).catch(()=>ui.toast('Discovery found! Finish this hole to sync your rewards.')).finally(()=>{ui.shipClaim=null;});
    } else if(!ui.cloud.session && discovery.local(ui.progress)){
      ui.revealItems(items);ui.toast(message);
    }
  };
  const complete=ui.holeComplete.bind(ui);
  ui.holeComplete=async result=>{if(ui.shipClaim)await ui.shipClaim;return complete(result);};
  installNotifications(ui);
}
