import * as THREE from '../vendor/three.module.js';
import { buildSky } from './sky.js';
import { COURSE_WEATHER, weatherProfile } from './weather-config.js';
import { terrainAt } from './golf-courses.js';
import { SandEffects } from './sand-effects.js';

export function weatherControls(world) {
  const labels={normal:'Normal',night:'Night',rainy:'Rainy'},symbols={normal:'☀',night:'☾',rainy:'☂'};
  return `<div class="course-weather" role="group" aria-label="Course weather">${COURSE_WEATHER.map(mode=>`<button type="button" data-action="course-weather" data-id="${mode}" aria-pressed="${(world.weather||'normal')===mode}" title="${labels[mode]} mode"><span aria-hidden="true">${symbols[mode]}</span>${labels[mode]}</button>`).join('')}</div>`;
}

export class CourseAtmosphere {
  constructor(world) {
    this.world=world;this.wetMaterials=new Map();this.sand=new SandEffects(world);
    this.rainRoot=new THREE.Group();this.rainRoot.name='course-rain';world.scene.add(this.rainRoot);
    this.rainPositions=new Float32Array(500*6);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.rainPositions,3).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0,0);
    this.rain=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#dce9e9',transparent:true,opacity:.36,depthWrite:false}));this.rain.frustumCulled=false;this.rainRoot.add(this.rain);
    this.ripples=new THREE.InstancedMesh(new THREE.RingGeometry(.84,1,20),new THREE.MeshBasicMaterial({color:'#dcece6',transparent:true,opacity:.26,side:THREE.DoubleSide,depthWrite:false}),28);
    this.ripples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.ripples.frustumCulled=false;this.rainRoot.add(this.ripples);
    this.rippleSites=Array.from({length:28},()=>({x:0,y:0,z:0,cycle:-1}));this.dummy=new THREE.Object3D();
  }
  restoreMaterials(){for(const [m,r] of this.wetMaterials)m.roughness=r;this.wetMaterials.clear();}
  load(h) {
    this.sand.reset();
    if(!this.world.sky)buildSky(this.world,h);
    this.world.group.traverse(o=>{
      if(o.material?.isMeshStandardMaterial&&!this.wetMaterials.has(o.material))this.wetMaterials.set(o.material,o.material.roughness);
    });
    this.set('normal');
  }
  set(mode) {
    if(!COURSE_WEATHER.includes(mode))return false;
    const w=this.world,p=weatherProfile(w.hole,mode);w.weather=mode;
    w.sky.uniforms.zenith.value.set(p.zenith);w.sky.uniforms.horizon.value.set(p.horizon);w.sky.uniforms.night.value=Number(mode==='night');w.sky.uniforms.rain.value=Number(mode==='rainy');
    w.scene.background=new THREE.Color(p.horizon);w.scene.fog=new THREE.Fog(p.fog,p.near,p.far);
    w.sun.color.set(p.sun);w.sun.intensity=p.sunIntensity;w.hemi.color.set(p.skyLight);w.hemi.groundColor.set(p.groundLight);w.hemi.intensity=p.hemi;w.renderer.toneMappingExposure=p.exposure;
    for(const [material,roughness] of this.wetMaterials)material.roughness=mode==='rainy'?Math.min(.62,roughness):roughness;
    for(const material of w.nightWindows||[])material.emissiveIntensity=mode==='night'?2.7:mode==='rainy'?.45:0;
    for(const light of w.lanternLights||[])light.intensity=mode==='night'?65:mode==='rainy'?12:0;
    this.sand.grains.material.color.set(mode==='night'?'#969784':'#c49c62');
    this.sand.puffs.material.uniforms.tint.value.set(mode==='night'?'#7a8175':'#c3a171');
    this.rainRoot.visible=mode==='rainy';w.renderer.shadowMap.needsUpdate=true;
    if(typeof document!=='undefined')document.body.dataset.courseWeather=mode;
    return true;
  }
  update(dt,ball,physics) {
    const w=this.world;
    if(w.sky){w.sky.mesh.position.copy(w.camera.position);w.sky.uniforms.time.value=w.settings?.reducedMotion?0:w.clock;}
    const visible=w.mode!=='garage'&&!w.suspended;
    for(const p of w.scenicFloaters||[]){p.object.position.y=p.y+(w.settings?.reducedMotion?0:Math.sin(w.clock*1.1+p.phase)*.055);p.object.rotation.z=w.settings?.reducedMotion?0:Math.sin(w.clock*.8+p.phase)*.025;}
    this.sand.update(dt,ball,physics);
    this.rainRoot.visible=visible&&w.weather==='rainy';if(!this.rainRoot.visible)return;
    const golf=w.hole.mode==='golf',width=golf?76:36,height=golf?42:28;
    const count=w.settings?.reducedMotion?60:w.settings?.graphics==='low'?150:w.settings?.graphics==='high'?500:310;
    const speed=w.settings?.reducedMotion?8:19;
    for(let i=0;i<count;i++){
      const phase=(i*.61803398875)%1,x=w.camera.position.x+((i*.75487766)%1-.5)*width;
      const y=w.camera.position.y+height*.45-((phase*height+w.clock*speed)%height),z=w.camera.position.z+((i*.56984029)%1-.5)*width;
      this.rainPositions.set([x,y,z,x+.22,y-.9,z+.1],i*6);
    }
    this.rain.geometry.setDrawRange(0,count*2);this.rain.geometry.attributes.position.needsUpdate=true;
    const anchor=ball||{x:0,z:0};
    for(let i=0;i<this.rippleSites.length;i++){
      const cycle=Math.floor(w.clock*1.2+i*.713),phase=(w.clock*1.2+i*.713)%1,site=this.rippleSites[i];
      if(site.cycle!==cycle){
        site.cycle=cycle;const a=i*2.399+cycle*.7,r=(golf?2:1)+(i%7)*(golf?2.1:.8);site.x=anchor.x+Math.cos(a)*r;site.z=anchor.z+Math.sin(a)*r;
        site.y=golf?terrainAt(w.hole,site.x,site.z).height+.025:(w.renderGround?.(site.x,site.z)??0)+.025;
      }
      this.dummy.position.set(site.x,site.y,site.z);this.dummy.rotation.set(-Math.PI/2,0,0);this.dummy.scale.setScalar((golf?.08:.05)+phase*(golf?.32:.16));this.dummy.updateMatrix();this.ripples.setMatrixAt(i,this.dummy.matrix);
    }
    this.ripples.count=w.settings?.particles===false||w.settings?.reducedMotion?0:this.rippleSites.length;this.ripples.instanceMatrix.needsUpdate=true;
  }
}

export function installCourseAtmosphere(ui) {
  const w=ui.world,atmosphere=new CourseAtmosphere(w),load=w.load.bind(w),action=ui.action.bind(ui);
  w.atmosphere=atmosphere;w.sandBurst=contact=>atmosphere.sand.burst(contact);
  w.setWeather=mode=>atmosphere.set(mode);
  w.load=h=>{
    atmosphere.restoreMaterials();w.sky=null;w.nightWindows=[];w.lanternLights=[];w.scenicFloaters=[];
    load(h);atmosphere.load(h);
  };
  ui.action=async(name,data)=>{
    if(name==='course-weather'&&['playing','paused','complete'].includes(ui.game.state)){
      if(w.setWeather(data.id)){
        // Keep a currently focused weather button in place, and leave charge/aim alone.
        for(const b of ui.root.querySelectorAll('.course-weather button'))b.setAttribute('aria-pressed',String(b.dataset.id===w.weather));
      }
      return;
    }
    return action(name,data);
  };
  atmosphere.load(w.hole);
}
