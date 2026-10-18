// Backdrop landmarks are deliberately outside the playable bounds. They add no
// colliders or replay work; each Blender model is shared by all its instances.
import { coastWaterLevel } from './golf-courses.js';
export function scenicLayout(h) {
  const p = [];
  const add = (name,x,z,scale,angle,y) => p.push({name,x,z,scale,angle,y});
  const center = -h.length / 2;
  if (h.backdrop) {
    const ranges = {
      meadow: [[-530,center,0.6,0.4], [260,-h.length-350,0.6,1.1], [550,center+160,0.4,2]],
      garden: [[-430,-h.length-200,0.45,0.6], [420,-h.length-270,0.4,1.6], [-510,200,0.35,1.8]],
      "alpine-pass": [[-410,center,1.05,0.3], [440,center-120,1.15,2.1], [0,-h.length-430,1.2,1.2], [310,230,0.72,2.4]],
      wetland: [[-540,center,0.5,0.5], [70,-h.length-390,0.6,1.4], [560,center-180,0.38,2.3], [-300,320,0.4,0.8]],
      lookout: [[-390,center-60,1.1,0.1], [-110,-h.length-365,0.9,0.9], [490,-h.length-420,0.35,1.8]],
      lake: [[-440,center,0.95,0.2], [-180,-h.length-390,0.8,1], [-450,230,0.65,0.5]],
    };
    (ranges[h.backdrop] || []).forEach(([x,z,s,a],i) => add(i%2?'alpine-ridge':'alpine-massif',x,z,s,a,-14));
    if (h.backdrop === "alpine-pass") {
      add('waterfall-crag',-220,-h.length*.63,1.7,0.7,-10);
      add('alpine-lodge',-205,-h.length*.34,1.2,1.4,-7);
    }
    if (h.backdrop === "lookout") {
      add('alpine-ridge',-340,110,0.6,0.8,-8);
      add('waterfall-crag',-205,-h.length*.8,0.8,0.2,-12);
    }
    if (h.backdrop === "lake") {
      for (const [x,z,s,a] of [[430,-h.length*.32,.6,.7], [650,-h.length*.85,.7,1.8], [440,-h.length-230,.5,.3]])
        add('coastal-headland',x,z,s,a,-7.1);
      for (let i=0;i<6;i++) add(i%2?'sailboat-red':'sailboat',270+(i%3)*70,80-i*(h.length+150)/6,.85+(i%2)*.2,i*.7,-5.7);
      for (let i=0;i<10;i++) add('gull',205+(i%5)*26,-100-Math.floor(i/5)*220,1+(i%3)*.2,.7,13+(i%4)*3);
    }
    return p;
  }
  if((h.layoutCourse ?? h.courseIndex) === 1) {
    const sea=coastWaterLevel(h),rise=sea+42.6;
    for(const [x,z,s,a] of [[345,-h.length*.86,1.1,.5],[-360,-h.length*.45,1.3,1.8],[510,-h.length-220,1.6,-.6],[-370,170,1.45,.7],[-470,-h.length-250,1.7,2.2],[520,270,1.6,1],[650,center,1.1,.2]])
      add('coastal-headland',x,z,s,a,-44+rise);
    add('sea-arch',236,-h.length*.68,1.25,.45,-44+rise);
    add('sea-arch',-228,-h.length*.12,.86,-.7,-44+rise);
    add('harbor-jetty',194,-h.length*.86+20,1.1,-.2,-43.5+rise);
    add('lighthouse',345,-h.length*.86,1.45,.4,36.3+rise);
    for(let i=0;i<7;i++)add(i%2?'sailboat':'sailboat-red',265+(i%3)*36,80-i*(h.length+100)/7,1+(i%3)*.3,.5+i*1.3,sea);
    for(let i=0;i<18;i++)add('gull',190+(i%6)*17,-40-Math.floor(i/6)*125+(i%3)*10,1+(i%3)*.2,.6,15+(i%5)*3);
  } else {
    // Interlocking asymmetric ranges enclose the entire course, with lower
    // wooded shoulders in front of the pale rocky summits.
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5+.12;
      add(i%2?'alpine-massif':'alpine-ridge',Math.cos(a)*545,center+Math.sin(a)*(h.length/2+405),.9+(i%3)*.16,a+.7,-14);
    }
    add('waterfall-crag',-252,-h.length*.65,1,-.45,-2);
    add('alpine-lodge',(h.layoutCourse ?? h.courseIndex) === 2?190:-174,-h.length*.27,1.25,.9,null);
  }
  return p;
}
