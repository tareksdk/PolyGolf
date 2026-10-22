// Original volcanic fairways, based on the player's four concept paintings.
// The same channel outlines drive the lava mesh, terrain cuts and ball penalties.
export const VOLCANIC_COURSE_INDEX = 18;
export const VOLCANIC_COURSE = {
  id:'cinder-crown', name:'Cinder Crown', subtitle:'Basalt fairways, molten rivers and a rather overheated clubhouse.',
  tag:'MAP OF THE DAY', theme:'volcanic', eventTheme:'volcanic', slot:'spotlight',
  level:1, holeCount:3, difficulty:'Lava carries',
  sky:'#ddb4a0', zenith:'#7286ac', horizon:'#eac29e',
  grass:'#66656a', edge:'#383738', fairway:'#b1b0ad', stripe:'#9f9e9e', green:'#cdcbc2',
  sand:'#ecc24d', sandEdge:'#ac7837', water:'#ff7822', accent:'#efb849', color:'#827b70',
};

const layouts = [
  {
    name:'The Cinder Cut', par:4, points:[[0,0],[-9,-74],[17,-159],[30,-241],[6,-332]],
    width:43, green:[6,-331,15,19],
    bunkers:[[-33,-80,8,13,.25,.16],[50,-230,9,16,-.3,.2],[-20,-318,8,13,.4,.15],[30,-349,8,9,0,.2]],
    elevation:[[0,3],[.28,0],[.48,5],[.7,9],[1,6]], contour:.35,
    mounds:[[-57,-75,30,56,7],[62,-192,34,65,12],[-48,-289,38,44,8]],
    lavaLevel:-3,
    lavaChannels:[
      [[-170,-119,9],[-73,-124,11],[3,-128,13],[73,-137,12],[164,-181,14]],
      [[-89,55,7],[-62,-49,7],[-73,-124,11],[-68,-232,9],[-54,-371,12]],
      [[151,51,15],[104,-68,10],[73,-137,12],[91,-271,15],[63,-393,14]],
    ],
    volcanoes:[[-140,-690,91,126],[240,-570,76,104]],
    tip:'Carry the glowing cut. The wide shelf beyond it leaves a clean approach.',
  },
  {
    name:'Furnace Island', par:3, points:[[0,0],[4,-40],[-8,-97],[7,-168]],
    width:38, green:[7,-167,16,19],
    bunkers:[[-18,-155,7,12,-.2,.15],[31,-177,8,10,.4,.2]],
    elevation:[[0,13],[.26,7],[.58,1],[1,5]], contour:.22,
    mounds:[[50,-161,26,39,10],[-46,-165,26,34,8],[-54,-7,26,38,9]],
    lavaLevel:-4,
    lavaChannels:[
      [[-165,-79,22],[-56,-91,29],[-2,-91,30],[60,-84,25],[165,-118,18]],
      [[-63,49,8],[-56,-91,29],[-54,-166,9],[-25,-219,10],[48,-217,10],[65,-160,9],[60,-84,25],[80,48,10]],
    ],
    volcanoes:[[95,-540,84,112],[-240,-485,77,108]],
    tip:'An elevated tee, one bold carry. Aim for the broad centre of the ash island.',
  },
  {
    name:'The Crown Foundry', par:5, points:[[0,0],[24,-109],[-34,-234],[-7,-357],[16,-496]],
    width:46, green:[16,-494,16,20],
    bunkers:[[52,-104,9,16,-.2,.18],[-61,-238,9,19,.25,.14],[18,-337,8,18,-.35,.2],[-11,-477,9,14,.3,.16],[45,-505,10,10,0,.2]],
    elevation:[[0,3],[.22,8],[.46,2],[.7,14],[1,22]], contour:.4,
    mounds:[[-72,-145,43,75,12],[64,-264,38,73,16],[-51,-403,36,64,12]],
    lavaLevel:-3,
    lavaChannels:[
      [[-178,-153,10],[-80,-160,11],[10,-164,10],[95,-199,13],[176,-235,13]],
      [[-86,58,8],[-80,-160,11],[-91,-290,11],[-75,-431,12],[-48,-559,17]],
      [[125,35,12],[95,-199,13],[67,-314,12],[65,-422,10],[88,-558,18]],
      [[-91,-290,11],[-12,-298,7],[67,-314,12]],
    ],
    volcanoes:[[-112,-695,108,138],[234,-550,86,124]],
    tip:'Two lava cuts, then a rising finish. Leave a full shot for the summit green.',
  },
];

export function volcanicLayout(index) {
  if(!Number.isInteger(index)||!layouts[index])throw Error('Unknown volcanic hole');
  return {...structuredClone(layouts[index]),water:[],density:0,landmark:'volcanic',volcanic:true,
    wind:{x:[.7,-.5,1.1][index],z:[.2,.35,-.4][index]},
    atmosphere:{zenith:'#7286ac',horizon:'#eac29e',sun:'#ffe0ad',intensity:2.15}};
}

export function lavaSample(h,x,z) {
  if(!h.volcanic)return null;
  let best=Infinity,width=0;
  for(const channel of h.lavaChannels)for(let i=1;i<channel.length;i++){
    const a=channel[i-1],b=channel[i],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    const radius=a[2]+(b[2]-a[2])*t,d=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)-radius;
    if(d<best){best=d;width=radius;}
  }
  return {edge:best,width,level:h.lavaLevel};
}

export function volcanicGround(h,x,z,y) {
  const sample=lavaSample(h,x,z);
  if(!sample||sample.edge>=5)return y;
  const u=Math.max(0,Math.min(1,sample.edge/5)),blend=u*u*(3-2*u);
  return (sample.level-1.3)*(1-blend)+y*blend;
}
