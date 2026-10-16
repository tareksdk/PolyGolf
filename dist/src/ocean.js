import * as THREE from '../vendor/three.module.js';
import { coastWaterLevel } from './golf-courses.js';
export function buildOcean(w,h) {
  const time={value:0};w.oceanTime=time;
  const material=new THREE.ShaderMaterial({uniforms:{time,deep:{value:new THREE.Color('#287b97')},light:{value:new THREE.Color('#62a8b5')}},vertexShader:`varying vec3 vOcean;void main(){vec4 p=modelMatrix*vec4(position,1.0);vOcean=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`
    uniform float time;uniform vec3 deep;uniform vec3 light;varying vec3 vOcean;
    void main(){vec2 p=vOcean.xz;float waves=sin(p.x*.035+p.y*.047+time*.16)*.5+sin(p.y*.09-p.x*.013-time*.12)*.25;
      vec3 col=mix(deep,light,.46+waves*.18);
      float line=abs(sin(p.y*.17+p.x*.06+sin(p.x*.035)*1.7-time*.22));
      float width=max(fwidth(line),.006);float glint=1.0-smoothstep(.94-width,.99+width,line);
      col+=vec3(.025,.035,.035)*(1.0-glint)*(.5+.5*sin(p.x*.071+p.y*.032));
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),material);
  surface.rotation.x=-Math.PI/2;surface.position.set(0,coastWaterLevel(h),-h.length/2);surface.userData.ownedMaterial=true;
  w.group.add(surface);
}
