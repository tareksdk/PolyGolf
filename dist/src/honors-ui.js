import {AccoladeQueue,honorDefinition} from './honors.js';
import {accoladeChoices,accoladeConfirmation,accoladeCelebration,honorIcon,medalGuide} from './honors-view.js';
import {esc} from './views.js';

export function installHonors(ui){
 const queue=new AccoladeQueue(),action=ui.action.bind(ui),close=ui.closeModal.bind(ui);
 let nextPoll=0,pending=false,sending=false,active=null,lastState=ui.game.state;
 const actor=()=>ui.cloud.session?.user.id||null;
 function syncActor(){
  if(actor()===queue.actor)return;
  if(active){active=null;close();}
  queue.reset(actor());nextPoll=0;
 }
 async function acknowledgements(){
  const user=queue.actor;
  for(const id of [...queue.pendingAck]){
   await ui.cloud.call('ack_accolade',{id});
   if(actor()!==user)return;
   queue.pendingAck.delete(id);
  }
 }
 function showNext(){
  if(active)return;
  const award=queue.next({state:ui.game.state,modal:ui.modalRoot.children.length>0||!!document.getElementById('item-reveal'),hidden:document.hidden,roomPlaying:ui.cloud.room?.state?.phase==='playing'});
  if(!award)return;
  active=award;
  ui.modal(accoladeCelebration(award),{close:false,wide:true});
  ui.audio?.play('purchase');
 }
 ui.closeModal=()=>{
  if(active){
   const id=active.id;active=null;
   if(actor()===queue.actor){queue.dismiss(id);nextPoll=0;}
  }
  close();
 };
 async function tick(){
  syncActor();
  if(!queue.actor||document.hidden)return;
  if(active&&(ui.game.state!=='menu'||ui.cloud.room?.state?.phase==='playing')){active=null;close();}
  if(lastState!=='menu'&&ui.game.state==='menu')nextPoll=0;
  lastState=ui.game.state;
  showNext();
  if(pending||Date.now()<nextPoll)return;
  const user=queue.actor;pending=true;nextPoll=Date.now()+45000;
  try{
   await acknowledgements();
   if(actor()!==user)return;
   const data=await ui.cloud.call('honors_inbox');
   if(actor()!==user)return;
   queue.ingest(user,data.awards);showNext();
  }catch{nextPoll=Date.now()+90000;}
  finally{pending=false;}
 }
 // Polling is lightweight. The presentation gate excludes the entire round,
 // including pauses, hole results, final results, and multiplayer waiting on opponents.
 setInterval(tick,1500);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){nextPoll=0;tick();}});
 ui.action=async(name,data={})=>{
  if(name==='accolade-dismiss'){ui.closeModal();return;}
  if(name==='honor-guide'){ui.pauseForDialog();ui.modal(medalGuide(),{wide:true});return;}
  if(name==='honor-info'){
   const def=honorDefinition(data.type,data.kind);if(!def)return;
   ui.pauseForDialog();ui.modal(`<div class="honor-confirm">${honorIcon(def,data.type)}<h2>${esc(def.name)}</h2><p>${esc(def.desc)}</p></div>`);return;
  }
  if(!['accolade-options','accolade-confirm','accolade-send'].includes(name))return action(name,data);
  const p=ui.viewedProfile?.profile;
  if(!p||p.id!==data.user||!actor()||p.id===actor())return;
  if(name==='accolade-options'){ui.modal(accoladeChoices(p,ui.progress.data.coins),{wide:true});return;}
  const def=honorDefinition('accolade',data.kind);
  if(!def||!p.honors?.canGive?.includes(def.id)||p.honors.given?.includes(def.id))return;
  if(name==='accolade-confirm'){ui.modal(accoladeConfirmation(p,def.id));return;}
  if(sending)return;
  sending=true;const user=actor();
  const button=ui.modalRoot.querySelector('[data-action="accolade-send"]');if(button)button.disabled=true;
  try{
   const result=await ui.cloud.call('gift_accolade',{userId:p.id,kind:def.id,expectedCost:def.cost});
   if(actor()!==user)return;
   p.honors.given=[...(p.honors.given||[]),def.id];
   ui.closeModal();ui.render();ui.toast(result.duplicate?'You already gave this accolade to this golfer.':`${def.name} given to ${p.username}.`);
   await action('view-profile',{user:p.id});
  }catch(error){if(actor()===user){const el=ui.modalRoot.querySelector('#accolade-error');if(el)el.textContent=error.message;else ui.toast(error.message);}}
  finally{sending=false;if(button?.isConnected)button.disabled=false;}
 };
}
