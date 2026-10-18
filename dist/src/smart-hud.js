import * as THREE from '../vendor/three.module.js';
import { button } from './views.js';
import { terrainHeight } from './golf-courses.js';

export const hudStyle = settings => settings?.hudStyle === 'smart' ? 'smart' : 'classic';
export function hudStylePicker(settings) {
  const style=hudStyle(settings);
  return `<section class="hud-style-picker" aria-label="Equip HUD style"><span>HUD style</span>${button(style==='classic'?'Classic · equipped':'Equip Classic','hud-style','data-style="classic" aria-pressed="'+(style==='classic')+'"','arcade-button')}${button(style==='smart'?'Clear View · equipped':'Equip Clear View','hud-style','data-style="smart" aria-pressed="'+(style==='smart')+'"','arcade-button')}<small>Clear View uses transparent cards that fade when they cover the ball or aiming line. Hover or focus to bring controls back.</small></section>`;
}
export function obstructs(points,rect,padding=35) {
  return points.some(p=>p.visible&&p.x>rect.left-padding&&p.x<rect.right+padding&&p.y>rect.top-padding&&p.y<rect.bottom+padding);
}
export function installSmartHud(ui) {
  const render=ui.render.bind(ui),tick=ui.tick.bind(ui),action=ui.action.bind(ui);
  const vector=new THREE.Vector3(),points=Array.from({length:7},()=>({x:0,y:0,visible:false}));
  let panels=[],hud=null;
  ui.render=()=>{
    render();hud=ui.root.querySelector('.play-hud');panels=hud?[...hud.querySelectorAll('.ph-left,.ph-center,.golfer-nameplate')]:[];
    if(hud)hud.dataset.hudStyle=hudStyle(ui.progress.data.settings);
    if(ui.game.state==='menu'&&ui.screen==='garage'){
      const heading=ui.root.querySelector('.garage-equipped');
      if(heading)heading.insertAdjacentHTML('afterend',hudStylePicker(ui.progress.data.settings));
    }
  };
  ui.action=async(name,data={})=>{
    if(name==='more-course-page'){ui.moreCoursePage=Number(data.page)===1?1:0;ui.render();return;}
    if(name==='hud-style'){
      ui.progress.data.settings.hudStyle=data.style==='smart'?'smart':'classic';ui.world.settingsChanged(ui.progress.data.settings);ui.progress.save();ui.render();ui.modalRoot.querySelectorAll('.hud-style-picker').forEach(el=>el.outerHTML=hudStylePicker(ui.progress.data.settings));
      ui.toast(data.style==='smart'?'Clear View equipped · controls return on hover or focus.':'Classic HUD equipped.');return;
    }
    return action(name,data);
  };
  ui.tick=()=>{
    tick();if(!hud?.isConnected||hudStyle(ui.progress.data.settings)!=='smart'||ui.game.state!=='playing')return;
    const g=ui.game,b=g.physics.ball,w=ui.world,canvas=w.canvas.getBoundingClientRect(),direction=g.direction;
    for(let i=0;i<points.length;i++){
      const d=i===0?0:(i-1)*9, x=b.x+direction.x*d,z=b.z+direction.z*d;
      vector.set(x,i===0?b.y+1:(g.mode==='golf'?terrainHeight(g.hole,x,z):w.renderGround(x,z))+1+d*.12,z).project(w.camera);
      points[i].x=canvas.left+(vector.x+1)*canvas.width/2;points[i].y=canvas.top+(1-vector.y)*canvas.height/2;points[i].visible=vector.z>-1&&vector.z<1;
    }
    for(const panel of panels)panel.classList.toggle('hud-obscuring',!g.charging&&!g.pendingSwing&&obstructs(points,panel.getBoundingClientRect()));
  };
}
