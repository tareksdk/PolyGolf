import { button } from './views.js';
import { installTrading } from './trading-ui.js';
import { installAuctions } from './auction-ui.js';
import { installActivity } from './online-activity.js';
import { installTheme } from './theme.js';
import { installDialogPages } from './dialog-pages.js';
import { installMenuPages } from './menu-pages.js';
import { installEmotes } from './emotes.js';
import { ITEMS, ITEM_BY_ID } from './catalog.js';

export function controlsDialog() {
  const keys = [['Hold mouse / Space','Step 1: build power, release to lock'],['Click / Space','Step 2: lock direction and swing'],['Pointer / ← →','Aim continuously · Shift + arrows: fine aim'],['Right / Ctrl drag · Q / E','Orbit the camera'],['Scroll','Zoom in or out'],['C','Change golf club'],['B · V · 1–6','Wheel · equipped emote · quick emotes'],['R','Return to last shot (+1 stroke)'],['Esc','Pause / resume']];
  return `<section class="controls-guide"><span class="menu-kicker">ON THE COURSE</span><h2>Make your shot.</h2><p>Choose your Shot meter in Club &amp; shot. <b>Classic:</b> hold and release to lock power, then click again to lock direction. <b>Flow:</b> the direction marker sweeps first; press to lock it, keep holding for power, then release to swing. Space works the same way.</p><div class="controls-meters"><div><strong>Power</strong><div class="demo-power"><i></i></div><small>More green, more distance. The meter bounces at both ends.</small></div><div><strong>Direction</strong><div class="accuracy-track demo-accuracy"><span></span><i></i></div><small>Centre is straight. Left or right adds a slight miss in that direction.</small></div></div><div class="controls-keys">${keys.map(([key,label])=>`<div><kbd>${key}</kbd><span>${label}</span></div>`).join('')}</div><div class="controls-notes"><p><b>Golf</b> The full shot path shows flight, bounce and roll to the landing marker. Choose Direction only in Settings for a shorter guide. Your caddie picks a club after each shot; shape and spin add draw, fade and backspin.</p><p><b>Mini golf</b> Bank off the walls and read the surfaces. Sand slows the ball; ice carries it farther. Water costs one stroke.</p></div>${button('Back to the game','close-modal','','button yellow wide')}</section>`;
}
export function installInterface(ui) {
  const render = ui.render.bind(ui), action = ui.action.bind(ui);
  const sizeHeader=()=>{const top=ui.root.querySelector('.topbar');if(top)ui.root.style.setProperty('--header-height',Math.ceil(top.getBoundingClientRect().height)+'px');};
  const headerObserver=new ResizeObserver(sizeHeader);
  ui.render = () => {
    render();
    ui.root.classList.toggle('clubhouse-menu', ui.game.state === 'menu' && ui.screen !== 'home');
    ui.root.dataset.screen = ui.screen;
    ui.world.caddieViewport = ui.root.querySelector('.caddie-stage');
    headerObserver.disconnect();const top=ui.root.querySelector('.topbar');if(top)headerObserver.observe(top);sizeHeader();
  };
  ui.action = async (name, data) => {
    if (name === 'toggle-shot-panel') { ui.shotPanelCollapsed = !ui.shotPanelCollapsed; ui.render(); return; }
    if (name === 'help') { ui.pauseForDialog(); ui.modal(controlsDialog(), {wide:true}); return; }
    const id = name === 'equip-preview' ? ui.previewId : data?.id;
    if (['equip','equip-preview'].includes(name) || (name === 'confirm-buy' && ui.progress.data.owned.includes(id))) {
      if (ui.equipping) return;
      const item = ITEM_BY_ID[id];
      if (!item || !ui.progress.data.owned.includes(id)) { ui.toast('That item is not in your Caddie.'); return; }
      ui.equipping = true;
      try {
        // Ownership authorizes equipment. Shop rotation only controls new purchases.
        if (ui.cloud.session) await ui.cloud.call('equip', {id});
        else if (!ui.progress.equip(id)) throw Error('Could not equip that item.');
        ui.previewId = null;
        ui.world.previewCategory = item.category;
        ui.world.equip(ui.progress.data.equipment, ITEMS);
        ui.closeModal(); ui.render(); ui.audio.play('purchase');
        ui.toast(item.name + ' equipped');
      } catch(error) { ui.toast(error.message); } finally { ui.equipping = false; }
      return;
    }
    return action(name, data);
  };
  installTrading(ui);
  installAuctions(ui);
  installActivity(ui);
  installTheme(ui);
  installEmotes(ui);
  installDialogPages(ui);
  installMenuPages(ui);
}
