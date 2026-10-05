import { ITEMS, ITEM_BY_ID } from './catalog.js';
import { button, esc } from './views.js';
import { icon } from './icons.js';
export function ownedEmotes(data) {
  return ITEMS.filter(item => item.category === 'emote' && data.owned.includes(item.id))
    .sort((a,b) => Number(b.id === data.equipment.emote) - Number(a.id === data.equipment.emote));
}
export const emoteKind = item => /love|heart/i.test(item.id) ? 'love' : /cheer|victory|champion/i.test(item.id) ? 'cheer' : /dance|disco|party/i.test(item.id) ? 'dance' : 'wave';
export function installEmotes(ui) {
  let wheel = null, page = 0, bubble = null, lastUse = -Infinity, previousFocus;
  const action = ui.action.bind(ui), tick = ui.tick.bind(ui);
  const ready = () => ui.game.state === 'playing' && !ui.game.physics.active && !ui.game.charging && !ui.game.pendingSwing && !ui.modalRoot.children.length;
  const close = () => { if (!wheel) return; wheel.remove(); wheel = null; ui.root.inert = false; previousFocus?.isConnected && previousFocus.focus({preventScroll:true}); };
  const draw = () => {
    const items = ownedEmotes(ui.progress.data), pages = Math.max(1,Math.ceil(items.length/6));
    page = (page+pages)%pages;
    wheel.innerHTML = `<section class="emote-panel" role="dialog" aria-modal="true" aria-label="Emote wheel"><header><h2>Emotes</h2><p>B or Esc to close · 1–6 to use</p></header><div class="emote-wheel">${items.slice(page*6,page*6+6).map((item,i)=>`<button class="emote-slot" style="--slot:${i};--emote:${item.color}" data-emote-id="${item.id}" aria-label="${esc(item.name)}"><small>${i+1}</small>${icon(emoteKind(item)==='love'?'heart':emoteKind(item)==='cheer'?'trophy':'star')}<span>${esc(item.name)}</span></button>`).join('')}<span class="emote-center">YOUR<br>EMOTES</span></div><footer>${button('←','emote-page','data-step="-1" '+(pages<2?'disabled':''),'button secondary')}<span>${page+1} / ${pages}</span>${button('→','emote-page','data-step="1" '+(pages<2?'disabled':''),'button secondary')}${button('Close','emote-close','','button secondary')}</footer></section>`;
    wheel.querySelector('button:not(:disabled)')?.focus();
  };
  const use = id => {
    const item = ITEM_BY_ID[id];
    if (!ready() || !item || item.category !== 'emote' || !ui.progress.data.owned.includes(id)) return;
    close();
    if (performance.now()-lastUse < 1000) return;
    lastUse = performance.now();
    ui.world.emotePose = {kind:emoteKind(item),time:0};
    bubble?.remove(); bubble=document.createElement('div');bubble.className='emote-bubble';bubble.setAttribute('role','status');
    bubble.style.setProperty('--emote',item.color);
    bubble.innerHTML = `${icon(emoteKind(item)==='love'?'heart':emoteKind(item)==='cheer'?'trophy':'star')}<span>${esc(item.name)}</span>`;
    document.body.append(bubble);ui.audio.play('reward');
  };
  const open = () => {
    if(wheel){close();return;}
    if(!ready()){ui.toast('Use emotes between shots.');return;}
    previousFocus=document.activeElement;page=0;wheel=document.createElement('div');wheel.className='emote-overlay';
    wheel.addEventListener('click',event=>{const slot=event.target.closest('[data-emote-id]');if(slot)use(slot.dataset.emoteId);else if(event.target===wheel)close();});
    document.body.append(wheel);ui.root.inert=true;draw();
  };
  ui.action = async (name,data={}) => {
    if(name==='emote-wheel'){open();return;}
    if(name==='emote-close'){close();return;}
    if(name==='emote-page'){page+=Number(data.step);draw();return;}
    if(name==='emote'){use(data.id || ui.progress.data.equipment.emote);return;}
    return action(name,data);
  };
  window.addEventListener('keydown',event=>{
    if(event.repeat && event.code==='KeyB'){event.preventDefault();return;}
    if(wheel){
      event.stopImmediatePropagation();
      if(event.code==='KeyB'||event.code==='Escape'){event.preventDefault();close();return;}
      if(/^Digit[1-6]$/.test(event.code)){event.preventDefault();const item=ownedEmotes(ui.progress.data)[page*6+Number(event.code.slice(-1))-1];if(item)use(item.id);return;}
      if(event.code==='Tab'){
        const all=[...wheel.querySelectorAll('button:not(:disabled)')],i=all.indexOf(document.activeElement);
        event.preventDefault();all[(i+(event.shiftKey?-1:1)+all.length)%all.length]?.focus();
      }
      return;
    }
    if(event.code==='KeyB'&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey && ui.game.state==='playing' && !event.target.closest('input,select,textarea,[contenteditable]')){event.preventDefault();event.stopImmediatePropagation();open();}
  },true);
  window.addEventListener('keyup',event=>{if(wheel)event.stopImmediatePropagation();},true);
  window.addEventListener('blur',close);
  ui.tick = () => {
    tick();
    if(wheel&&!ready())close();
    if(bubble){
      if(ui.game.state!=='playing'||performance.now()-lastUse>2800){bubble.remove();bubble=null;ui.world.emotePose=null;return;}
      const p=ui.game.mode==='golf'?ui.world.golferScreen():ui.world.ball.position.clone().project(ui.world.camera);
      const x=ui.game.mode==='golf'?p.x:(p.x+1)*innerWidth/2,y=ui.game.mode==='golf'?p.y:(1-p.y)*innerHeight/2;
      bubble.style.left=Math.max(100,Math.min(innerWidth-100,x))+'px';bubble.style.top=Math.max(55,y-32)+'px';
      bubble.hidden=ui.game.mode==='golf'&&!p.visible;
    }
  };
}
