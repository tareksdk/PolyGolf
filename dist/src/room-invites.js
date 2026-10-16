import { button, esc } from './views.js';
import { rotationSlots } from './rotating-courses.js';
export function inviteCode(url) {
  const code=new URL(url).searchParams.get('invite')?.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code||'')?code:null;
}
export function roomInviteUrl(code,origin) {
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw Error('Invalid room code');
  const url=new URL('/',origin);url.searchParams.set('invite',code);return url.href;
}
export function installInvites(ui) {
  const code=inviteCode(location.href);
  if(code){ui.inviteCode=code;ui.navigate('multiplayer');ui.toast('Your invite is ready. Select Join room to play.');}
  const original=ui.action.bind(ui);
  ui.action=async(action,data={})=>{
    if(action!=='copy-room-link')return original(action,data);
    if(!ui.cloud.room)return;
    const url=roomInviteUrl(ui.cloud.room.code,location.origin);
    try{await navigator.clipboard.writeText(url);ui.toast('Invite link copied. Send it to a friend.');}
    catch {ui.modal(`<h2>Invite a friend</h2><p>Copy this link and send it to your friend.</p><input class="invite-link" readonly aria-label="Room invite link" value="${esc(url)}">${button('Done','close-modal','','button yellow')}`);}
  };
  let stamp=JSON.stringify(rotationSlots());
  setInterval(()=>{const next=JSON.stringify(rotationSlots());if(stamp===next)return;stamp=next;if(ui.game.state==='menu'&&ui.screen==='courses')ui.render();},30000);
}
