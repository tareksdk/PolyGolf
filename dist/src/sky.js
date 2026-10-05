import * as THREE from '../vendor/three.module.js';
// A smooth atmosphere with broad cloud banks, rendered once as a background dome.
// No film grain, noise texture, per-frame geometry or transparent cloud sorting.
export function buildSky(w,h) {
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{zenith:{value:new THREE.Color(h.courseIndex===1?'#4586ae':'#699bb8')},horizon:{value:new THREE.Color(h.courseIndex===1?'#a9cdd8':'#b6d1d4')}},vertexShader:`varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
    uniform vec3 zenith; uniform vec3 horizon; varying vec3 vSky;
    void main(){vec3 d=normalize(vSky);float y=max(d.y,0.0);vec3 col=mix(horizon,zenith,smoothstep(0.0,.78,y));
      float a=atan(d.z,d.x);float banks=sin(a*4.0+.4)*.018+sin(a*9.0)*.012;
      float cloud=exp(-pow((y-.13-banks)/.027,2.0))*(.5+.5*sin(a*5.0+.8));
      cloud+=exp(-pow((y-.37-banks*.6)/.032,2.0))*.28*(.5+.5*sin(a*7.0));
      col=mix(col,vec3(.92,.95,.91),clamp(cloud*.64,0.0,.65));
      float sun=pow(max(0.0,dot(d,normalize(vec3(-.48,.55,.68)))),220.0);col+=vec3(.13,.11,.07)*sun;
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const dome=new THREE.Mesh(new THREE.SphereGeometry(2700,40,20),material);
  dome.position.set(0,-80,-h.length/2);dome.renderOrder=-100;dome.userData.ownedMaterial=true;dome.frustumCulled=false;
  w.group.add(dome);
}
