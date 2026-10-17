import * as THREE from '../vendor/three.module.js';
import { weatherProfile } from './weather-config.js';

// One opaque dome. Noise shapes clouds, never a screen-space grain filter.
export function buildSky(w,h) {
  const profile=weatherProfile(h);
  const uniforms={zenith:{value:new THREE.Color(profile.zenith)},horizon:{value:new THREE.Color(profile.horizon)},time:{value:0},night:{value:profile.night||0},rain:{value:0},moon:{value:Number(!['halloween','space'].includes(h.course?.eventTheme))},seed:{value:(h.seed||1)%97}};
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthTest:false,depthWrite:false,fog:false,uniforms,
    vertexShader:`varying vec3 vSky;void main(){vSky=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}`,
    fragmentShader:`
      uniform vec3 zenith,horizon;uniform float time,night,rain,seed,moon;varying vec3 vSky;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float cloud(vec2 p){return .55*noise(p)+.28*noise(p*2.03)+.12*noise(p*4.07)+.05*noise(p*8.13);}
      void main(){vec3 d=normalize(vSky);float y=max(d.y,0.0);vec3 col=mix(horizon,zenith,smoothstep(0.0,.65,sqrt(y)));
        float sd=max(0.0,dot(d,normalize(vec3(-.5,.36,-.78))));
        col+=vec3(.3,.17,.055)*pow(sd,9.0)*(1.0-night)*(1.0-rain*.85);
        col=mix(col,vec3(1.0,.89,.62),smoothstep(.99965,.99985,sd)*(1.0-night)*(1.0-rain));
        vec2 uv=d.xz/(.25+y)*2.2+vec2(seed*.13,time*.004);
        float n=cloud(uv);
        float cover=smoothstep(.61-rain*.3,.76-rain*.25,n)*smoothstep(.025,.16,y)*(1.0-smoothstep(.76,.99,y));
        vec3 shade=mix(vec3(.84,.89,.90),vec3(1.0,.97,.91),smoothstep(.55,.8,n));
        shade=mix(shade,vec3(.31,.40,.47),rain*.83);shade=mix(shade,vec3(.18,.25,.39),night*.86);
        col=mix(col,shade,cover*(.82+rain*.13));
        if(night>.5){vec2 starUV=d.xz/max(.15,y+.25)*190.0,cell=floor(starUV),f=fract(starUV)-.5;
        float stars=step(.989,hash(cell))*exp(-dot(f,f)*95.0)*smoothstep(.09,.35,y);
        col+=vec3(.68,.80,1.0)*stars*night*(1.0-cover);
        float md=dot(d,normalize(vec3(.18,.18,-.96)));
        col+=vec3(.16,.23,.39)*pow(max(md,0.0),22.0)*night*moon;
        col=mix(col,vec3(.91,.93,.79)*(.92+.08*noise(d.xz*900.0)),smoothstep(.99915,.99935,md)*night*moon*(1.0-cover*.9));
        }
        gl_FragColor=vec4(col,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),material);
  dome.scale.setScalar(h.mode==='golf'?2600:190);dome.renderOrder=-100;dome.frustumCulled=false;dome.userData.ownedMaterial=true;dome.name='atmosphere-sky';
  w.sky={mesh:dome,uniforms};w.group.add(dome);
}
