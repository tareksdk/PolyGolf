import * as THREE from '../vendor/three.module.js';
export class GolfWorld{
 constructor(container,onAim){
  this.container=container;this.onAim=onAim;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#d8e6d3');
  this.camera=new THREE.OrthographicCamera(-140,140,95,-95,.1,1000);this.camera.position.set(105,230,260);this.camera.lookAt(0,0,0);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;container.append(this.renderer.domElement);
  this.scene.add(new THREE.HemisphereLight('#ffffff','#6d9564',1.7));const sun=new THREE.DirectionalLight('#ffffff',2.1);sun.position.set(-60,160,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-160;sun.shadow.camera.right=160;sun.shadow.camera.top=160;sun.shadow.camera.bottom=-160;sun.shadow.normalBias=.25;sun.shadow.bias=-.0001;this.scene.add(sun);
  const floor=this.mesh(new THREE.PlaneGeometry(2000,2000),'#d8e6d3');floor.rotation.x=-Math.PI/2;floor.position.y=-7;floor.receiveShadow=true;this.scene.add(floor);
  this.board=new THREE.Group();this.scene.add(this.board);this.course=new THREE.Group();this.board.add(this.course);
  this.ball=this.mesh(new THREE.SphereGeometry(1.35,24,16),'#fffff8');this.ball.castShadow=true;this.scene.add(this.ball);
  this.ballRing=this.mesh(new THREE.RingGeometry(2.4,2.7,40),'#ffffff');this.ballRing.rotation.x=-Math.PI/2;this.ballRing.position.y=.5;this.ballRing.material.transparent=true;this.ballRing.material.opacity=.72;this.scene.add(this.ballRing);
  this.guide=new THREE.Group();this.scene.add(this.guide);this.particles=[];this.animating=false;this.clock=new THREE.Clock();
  this.raycaster=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);container.addEventListener('pointerdown',e=>{if(this.animating||e.button!==0)return;const rect=container.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);const p=new THREE.Vector3();if(this.raycaster.ray.intersectPlane(this.plane,p))onAim([p.x,p.z]);});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.loop();
 }
 mesh(geometry,color){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1}));m.receiveShadow=true;return m;}
 clear(group){while(group.children.length){const obj=group.children[0];group.remove(obj);obj.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});}}
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;this.renderer.setSize(w,h);const aspect=w/h,span=Math.max(155,235/aspect);this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;this.camera.top=span/2;this.camera.bottom=-span/2;this.camera.updateProjectionMatrix();}
 patch(x,z,rx,rz,color,y=.16){const o=this.mesh(new THREE.CircleGeometry(1,64),color);o.rotation.x=-Math.PI/2;o.scale.set(rx,rz,1);o.position.set(x,y,z);this.course.add(o);return o;}
 shapePath(points,color,y,depth=0){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],-p[1],0)),true,'catmullrom',.3);const shape=new THREE.Shape(curve.getPoints(100).map(p=>new THREE.Vector2(p.x,p.y)));const mesh=this.mesh(depth?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:1.4,bevelThickness:1.2,bevelSegments:3,steps:1}):new THREE.ShapeGeometry(shape),color);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.castShadow=depth>0;this.course.add(mesh);return mesh;}
 build(hole,index){
  this.clear(this.course);this.ball.visible=true;
  this.shapePath([[-95,-51],[-82,-61],[75,-61],[96,-47],[96,47],[80,61],[-82,61],[-96,44]],'#7f9c58',-6.5,4.8);
  this.shapePath([[-95,-51],[-82,-61],[75,-61],[96,-47],[96,47],[80,61],[-82,61],[-96,44]],'#8bb65a',.03);
  // Mown stripes are the playable turf, clipped inside the course edges.
  for(let i=-85;i<90;i+=18){const stripe=this.mesh(new THREE.PlaneGeometry(9,107),'#94bc63');stripe.rotation.x=-Math.PI/2;stripe.position.set(i,.05,0);this.course.add(stripe);}
  const mid=[(hole.tee[0]+hole.pin[0])/2,(hole.tee[1]+hole.pin[1])/2];
  this.shapePath([[hole.tee[0]-11,hole.tee[1]-14],[mid[0]-15,mid[1]-23],[hole.pin[0]-8,hole.pin[1]-21],[hole.pin[0]+19,hole.pin[1]-11],[hole.pin[0]+18,hole.pin[1]+14],[mid[0]+15,mid[1]+23],[hole.tee[0]-3,hole.tee[1]+18],[hole.tee[0]-17,hole.tee[1]+5]],'#aecb74',.1);
  this.patch(...hole.pin,19,15,'#c2d88b',.13);this.patch(...hole.pin,14,11,'#cbdc96',.15);
  for(const [x,z,rx,rz]of hole.sand){this.patch(x,z,rx+1.1,rz+1.1,'#8a9b54',.17);this.patch(x,z,rx,rz,'#dfc88d',.2);this.patch(x-1,z-1,rx*.88,rz*.84,'#eedcac',.22);for(let i=0;i<3;i++){const line=this.mesh(new THREE.TorusGeometry(rx*.4+i*.9,.07,3,35,Math.PI*.9),'#cbbb8c');line.rotation.x=-Math.PI/2;line.position.set(x,.24,z);this.course.add(line);}}
  for(const [x,z,rx,rz]of hole.water){this.patch(x,z,rx+1.6,rz+1.6,'#7fa577',.25);this.patch(x,z,rx,rz,'#77bdb5',.28);this.patch(x-1,z-1,rx*.93,rz*.9,'#8accc1',.3);for(let i=0;i<3;i++){const wave=this.mesh(new THREE.PlaneGeometry(rx*.55-i*2,.22),'#c6e6d3');wave.rotation.x=-Math.PI/2;wave.position.set(x-3+i*5,.32,z-4+i*4);this.course.add(wave);}}
  const tee=this.mesh(new THREE.BoxGeometry(9,.25,6),'#c2d58a');tee.position.set(hole.tee[0],.3,hole.tee[1]);this.course.add(tee);for(const delta of [-4,4]){const marker=this.mesh(new THREE.SphereGeometry(.65,10,8),'#f4f4db');marker.position.set(hole.tee[0]+delta,.8,hole.tee[1]);this.course.add(marker);}
  this.patch(...hole.pin,2.1,2.1,'#42633e',.4);this.patch(...hole.pin,1.5,1.5,'#233e30',.42);
  const pole=this.mesh(new THREE.CylinderGeometry(.24,.24,20,10),'#fcfbe6');pole.position.set(hole.pin[0],10.3,hole.pin[1]);pole.castShadow=true;this.course.add(pole);
  const flagShape=new THREE.Shape();flagShape.moveTo(0,0);flagShape.lineTo(8,-1.7);flagShape.lineTo(0,-5.5);flagShape.closePath();this.flag=this.mesh(new THREE.ShapeGeometry(flagShape),'#ef7850');this.flag.material.side=THREE.DoubleSide;this.flag.position.set(hole.pin[0]+.3,20,hole.pin[1]);this.flag.rotation.y=.3;this.course.add(this.flag);
  const trees=[[-79,-43,1.05],[-59,-47,.78],[-88,-20,.65],[86,30,.92],[67,49,.8],[85,49,1.1],[-46,51,.6],[-25,52,.82],[42,-50,.68]];
  for(const[x,z,s]of trees){if(Math.hypot(x-hole.pin[0],z-hole.pin[1])<22||Math.hypot(x-hole.tee[0],z-hole.tee[1])<16)continue;this.tree(x,z,s,index);}
  // Small boundary grasses are placed outside the playable landing area.
  for(let i=0;i<20;i++){const x=-85+i*9,z=i%2?56:-56;for(let j=0;j<3;j++){const grass=this.mesh(new THREE.ConeGeometry(.35,2+j*.5,4),'#789d4b');grass.position.set(x+j*.7,1,z);this.course.add(grass);}}
 }
 tree(x,z,s,index){const group=new THREE.Group();const trunk=this.mesh(new THREE.CylinderGeometry(.7,.95,9,7),'#837c4f');trunk.position.y=4.5;trunk.castShadow=true;group.add(trunk);for(const[dx,y,dz,r]of [[0,13,0,6.4],[-3.3,11,1.2,4.3],[2.7,12,1,4.9],[0,17,0,4.2]]){const crown=this.mesh(new THREE.IcosahedronGeometry(r,1),index===6?'#c0b362':'#658e4c');crown.position.set(dx,y,dz);crown.castShadow=true;group.add(crown);}group.position.set(x,0,z);group.scale.setScalar(s);this.course.add(group);}
 setBall(p){this.ball.position.set(p[0],1.6,p[1]);this.ballRing.position.set(p[0],.5,p[1]);this.ball.visible=true;}
 setGuide(shot){this.clear(this.guide);if(!shot)return;const n=21;for(let i=1;i<n;i++){const t=i/n;const dot=this.mesh(new THREE.SphereGeometry(.42,6,5),i%2?'#fcfbe8':'#f7fadc');dot.position.set(THREE.MathUtils.lerp(shot.start[0],shot.end[0],t),.9+Math.sin(t*Math.PI)*shot.height,THREE.MathUtils.lerp(shot.start[1],shot.end[1],t));dot.material.transparent=true;dot.material.opacity=.8;this.guide.add(dot);}const ring=this.mesh(new THREE.RingGeometry(2.8,3.3,40),shot.penalty?'#cf7450':'#fcffe8');ring.rotation.x=-Math.PI/2;ring.position.set(shot.end[0],.55,shot.end[1]);this.guide.add(ring);}
 animateShot(shot,onDone){this.animating=true;this.setGuide(null);this.ballRing.visible=false;this.flight={shot,onDone,start:performance.now(),duration:matchMedia('(prefers-reduced-motion: reduce)').matches?450:shot.height?1600:1100};}
 celebrate(position){for(let i=0;i<45;i++){const p=this.mesh(new THREE.BoxGeometry(.65,1.3,.2),['#f2d080','#fffce7','#ec8959','#dff599'][i%4]);p.position.set(position[0],3,position[1]);const a=Math.random()*Math.PI*2;p.userData={vx:Math.cos(a)*(6+Math.random()*14),vy:22+Math.random()*20,vz:Math.sin(a)*(6+Math.random()*14),life:2};this.scene.add(p);this.particles.push(p);}}
 loop(){this.raf=requestAnimationFrame(()=>this.loop());const dt=Math.min(this.clock.getDelta(),.05),time=performance.now();if(this.flag)this.flag.rotation.y=.3+Math.sin(time*.002)*.09;this.ballRing.scale.setScalar(1+Math.sin(time*.003)*.09);
  if(this.flight){const{shot,start,duration,onDone}=this.flight,t=Math.min(1,(time-start)/duration),e=1-(1-t)**1.6;this.ball.position.set(THREE.MathUtils.lerp(shot.start[0],shot.end[0],e),1.6+Math.sin(e*Math.PI)*shot.height,THREE.MathUtils.lerp(shot.start[1],shot.end[1],e));this.ball.rotation.z-=dt*5;if(t>=1){this.flight=null;this.animating=false;this.ballRing.visible=true;if(shot.holed)this.ball.visible=false;onDone();}}
  this.particles=this.particles.filter(p=>{const d=p.userData;d.life-=dt;if(d.life<=0){this.scene.remove(p);p.geometry.dispose();p.material.dispose();return false;}d.vy-=35*dt;p.position.x+=d.vx*dt;p.position.y+=d.vy*dt;p.position.z+=d.vz*dt;p.rotation.x+=dt*4;return true;});this.renderer.render(this.scene,this.camera);
 }
}
