// Backdrop landmarks are deliberately outside the playable bounds. They add no
// colliders or replay work; each Blender model is shared by all its instances.
export function scenicLayout(h) {
  const p = [];
  const add = (name,x,z,scale,angle,y) => p.push({name,x,z,scale,angle,y});
  const center = -h.length / 2;
  if(h.courseIndex === 1) {
    for(const [x,z,s,a] of [[345,-h.length*.86,1.1,.5],[-360,-h.length*.45,1.3,1.8],[510,-h.length-220,1.6,-.6],[-370,170,1.45,.7],[-470,-h.length-250,1.7,2.2],[520,270,1.6,1],[650,center,1.1,.2]])
      add('coastal-headland',x,z,s,a,-44);
    add('sea-arch',236,-h.length*.68,1.25,.45,-44);
    add('sea-arch',-228,-h.length*.12,.86,-.7,-44);
    add('harbor-jetty',194,-h.length*.86+20,1.1,-.2,-43.5);
    add('lighthouse',345,-h.length*.86,1.45,.4,36.3);
    for(let i=0;i<7;i++)add(i%2?'sailboat':'sailboat-red',265+(i%3)*36,80-i*(h.length+100)/7,1+(i%3)*.3,.5+i*1.3,-42.6);
    for(let i=0;i<18;i++)add('gull',190+(i%6)*17,-40-Math.floor(i/6)*125+(i%3)*10,1+(i%3)*.2,.6,15+(i%5)*3);
  } else {
    // Interlocking asymmetric ranges enclose the entire course, with lower
    // wooded shoulders in front of the pale rocky summits.
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5+.12;
      add(i%2?'alpine-massif':'alpine-ridge',Math.cos(a)*545,center+Math.sin(a)*(h.length/2+405),.9+(i%3)*.16,a+.7,-14);
    }
    add('waterfall-crag',-252,-h.length*.65,1,-.45,-2);
    add('alpine-lodge',h.courseIndex===2?190:-174,-h.length*.27,1.25,.9,null);
  }
  return p;
}
