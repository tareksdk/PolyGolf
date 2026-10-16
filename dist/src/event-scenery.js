import * as THREE from '../vendor/three.module.js';
let kit;
export async function loadAdventureAssets() {
  const r=await fetch(new URL('../assets/adventure-kit.json',import.meta.url));
  if(!r.ok)throw Error('Adventure scenery could not load.');
  const data=await r.json();kit={};
  for(const [id,a] of Object.entries(data.assets)){
    const colors=new Float32Array(a.p.length);
    a.c.forEach((c,i)=>{for(let v=0;v<3;v++)colors.set(data.palette[c],i*9+v*3);});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a.p,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();g.userData.shared=true;kit[id]=g;
  }
}
export function eventScenery(w,h) {
  const theme=h.course.eventTheme,night=['space','halloween','cyberpunk'].includes(theme);
  const ground=(x,z)=>w.surfaceHeight(x,z),groups=new Map();
  const add=(id,x,z,scale=1,y=null,angle=0)=>{if(!groups.has(id))groups.set(id,[]);groups.get(id).push({x,z,scale,y:y??ground(x,z),angle});};
  w.sun.intensity=night?1.6:2.5;w.hemi.intensity=night?1.35:1.8;
  w.scene.fog=new THREE.Fog(h.course.sky,night?550:800,2400);
  // The island skirt uses the terrain's exact edge, so there are no seams.
  const outline=w.coastOutline,p=[];
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length];
    const bottom=v=>[v[0]*.82,-54,-h.length/2+(v[2]+h.length/2)*.86];
    for(const v of [a,b,bottom(a),b,bottom(b),bottom(a)])p.push(...v);
  }
  const skirt=new THREE.BufferGeometry();skirt.setAttribute('position',new THREE.Float32BufferAttribute(p,3));skirt.computeVertexNormals();
  w.group.add(new THREE.Mesh(skirt,w.mat(h.course.edge,{side:THREE.DoubleSide,roughness:1})));
  if(!['space','sky'].includes(theme))w.mesh('box',h.course.edge,0,-55,-h.length/2,2400,2,2600);
  // A generous clear corridor surrounds every shot. All large set pieces stay outside it.
  for(let i=0;i<22;i++){
    const z=55-i*(h.length+110)/21;
    for(const side of [-1,1]){
      const x=side*(100+17*Math.sin(i*1.7)),y=ground(x,z);
      if(theme==='halloween'){
        add('jack-lantern',side*(43+i%3*8),z,.55+(i%3)*.15);
        add('grave',x,z,1.6, null,Math.sin(i));
        if(i%4===0)add('haunted-manor',side*155,z,1.6,null,side*.25);
        // Bare, branching silhouettes among the graves.
        w.mesh('cylinder','#453a49',x,y+5,z,.7,10,.7);
        for(const branch of [-1,1]){const b=w.mesh('box','#453a49',x+branch*1.5,y+6.8,z,.45,4,.45);b.rotation.z=-branch*.65;}
      }else if(theme==='space'){
        if(i%6===0)add('moon-station',x,z,1.25,null,-side*.35);
        else w.mesh('sphere','#727e91',x,y+2,z,3+i%4,2+i%3,4);
      }else if(theme==='medieval'){
        if(i%3===0)add('keep-tower',side*155,z,1.4);
        else add('castle-wall',side*155,z,1.7,null,Math.PI/2);
        if(i%4===0)add('castle-wall',x,z,.6,null,side*.4);
      }else if(theme==='cyberpunk'){
        add('neon-tower',x,z,1.1+(i%5)*.28);
        add('neon-tower',side*195,z,1.8+(i%4)*.5);
      }else if(theme==='future'){
        if(i%2===0)add('arcology',x,z,1.2+i%3*.4);
        const pillar=w.mesh('cylinder','#d4e5e0',side*54,y+2,z,.24,4,.24);
        w.mesh('sphere','#7adccc',pillar.position.x,y+4,z,.6,.3,.6);
      }
    }
  }
  if(theme==='halloween'){
    for(let i=0;i<120;i++){
      const side=i%2?1:-1,z=95-(i/120)*(h.length+220),x=side*(125+26*Math.sin(i*2.39));
      add('bare-tree',x,z,1.3+(i%4)*.35,null,i*.9);
    }
    add('haunted-manor',-91,-h.length*.43,2.5,null,.3);
    w.mesh('sphere','#ffe2a5',-500,430,-h.length-800,105,105,105,w.group,{emissive:'#cda76c',emissiveIntensity:.3});
  }
  if(theme==='space'){
    for(let i=0;i<36;i++)add('crystal',(i%2?1:-1)*(62+Math.sin(i*2.39)*13),45-i*(h.length+90)/36,.7+(i%3)*.3);
    add('rocket',-70,-h.length*.38,1.7);add('rocket',125,-h.length*.8,1.1);
    const planet=w.mesh('sphere','#8b6dbe',430,380,-h.length-650,160,160,160);
    const ring=new THREE.Mesh(new THREE.RingGeometry(205,255,96),w.mat('#bcabc9',{side:THREE.DoubleSide,roughness:1}));
    ring.position.copy(planet.position);ring.rotation.set(.95,.3,-.3);w.group.add(ring);
    const pts=[];for(let i=0;i<260;i++){const a=i*2.39996,b=.12+(i%31)/37;pts.push(Math.cos(a)*1900*Math.cos(b),Math.sin(b)*1700,Math.sin(a)*1900-h.length/2);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));const stars=new THREE.Points(g,new THREE.PointsMaterial({color:'#e4e3ff',size:2.5,sizeAttenuation:false,fog:false}));stars.userData.ownedMaterial=true;w.group.add(stars);
  }
  if(theme==='sky'){
    add('airship',-95,-h.length*.6,2.1,30,-.6);add('airship',230,-h.length-180,2.8,85,.7);
    for(let i=0;i<20;i++){
      const a=i/20*Math.PI*2,x=Math.cos(a)*(340+i%3*80),z=-h.length/2+Math.sin(a)*(h.length*.65+200),y=10+(i%5)*16;
      add('sky-island',x,z,1.3,y);
      if(i%4===0)add('keep-tower',x,z,.85,y);
      for(let j=0;j<5;j++)add('garden-tree',x+Math.cos(j*2.4)*23,z+Math.sin(j*2.4)*16,.9,y);
      if(i%3===0)for(let j=0;j<3;j++)w.mesh('sphere','#e2f1ef',x+j*24-30,y-38,z+22,32,8,20);
    }
  }
  if(['sky','medieval','future'].includes(theme)){
    for(let i=0;i<80;i++){
      const side=i%2?1:-1,z=55-i*(h.length+110)/80,x=side*(63+13*Math.sin(i*2.39));
      add('garden-tree',x,z,.8+(i%4)*.2,null,i*.7);
    }
  }
  if(theme==='future'){
    for(const z of [-h.length*.35,-h.length*.8]){
      const r=new THREE.Mesh(new THREE.TorusGeometry(35,1.2,6,40),w.mat('#a9ebe1'));
      r.position.set(-94,38,z);w.group.add(r);
    }
  }
  // Clear tee markers and runway lights reinforce direction at small screen sizes.
  for(const x of [-3,3])w.mesh('box',h.course.accent,x,ground(x,0)+.22,0,.6,.44,.6);
  for(let i=2;i<h.route.length-5;i+=5){const [x,z]=h.route[i];for(const side of [-1,1])w.mesh('cylinder',h.course.accent,x+side*28,ground(x+side*28,z)+.3,z,.22,.6,.22);}
  const material=w.mat('#ffffff',{vertexColors:true,roughness:.9}),dummy=new THREE.Object3D();
  for(const [id,items] of groups){
    if(!kit?.[id])continue;
    const batch=new THREE.InstancedMesh(kit[id],material,items.length);
    for(let i=0;i<items.length;i++){const a=items[i];dummy.position.set(a.x,a.y,a.z);dummy.rotation.set(0,a.angle,0);dummy.scale.setScalar(a.scale);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);}
    batch.castShadow=true;batch.receiveShadow=true;w.group.add(batch);
  }
}
