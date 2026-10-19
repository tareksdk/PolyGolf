// Map of the month: the Shattered Crown, a ruined sky kingdom broken into floating isles.
// Pure data shared by the renderer, physics and replay verifier. Island outlines use the
// same rotated, scalloped ovals as bunkers: {x, z, rx, rz, angle, scallop, y}. A ball that
// leaves every island falls into the clouds (+1 stroke, back to the last shot).
export const SKY_ISLES = {
  id:'monthly-sky-isles', name:'Shattered Crown', subtitle:'Castle ruins and waterfalls on floating isles above a sea of clouds.',
  eventTheme:'isles', slot:'monthly', holeCount:3,
  sky:'#f1d5c4', zenith:'#4f7fc1', horizon:'#f7d9bd', grass:'#7fae5a', fairway:'#93c56b', stripe:'#86b862', green:'#b9dc84',
  edge:'#9a8d8a', water:'#8fdcf0', accent:'#f4cf74', color:'#9fbfe0',
};
export const VOID_HEIGHT = -26;
const isle = (x,z,rx,rz,y,angle=0,scallop=.07,extra={}) => ({x,z,rx,rz,y,angle,scallop,...extra});
export const SKY_ISLE_LAYOUTS = [
  {
    name:'The Broken Gate', par:4,
    points:[[0,0],[-6,-80],[-16,-180],[-8,-262],[6,-326]], width:40,
    green:[6,-324,14,17], water:[],
    bunkers:[[-38,-238,7,14,.4,.15],[27,-312,7,10,.2,.14]],
    islands:[
      isle(0,-18,28,44,8,.08,.07),
      isle(-16,-188,48,84,0,.12,.06,{land:[-14,-206]}),
      isle(6,-326,36,38,4,-.2,.08,{land:[6,-324]}),
      isle(78,-120,15,17,22,.4,.12,{decor:true}),
    ],
    falls:[[1,-.35,7],[0,2.6,4],[3,3.4,5],[2,.6,4]],
    decor:[
      ['ruin-arch',-50,-142,1,.55],['rubble',-40,-150,1.1,0],['isle-banner',-41,-128,1,.3],
      ['ruin-tower',-23,-347,.95,.4],['rubble',-12,-352,1,1],['ruin-wall',36,-196,.9,-1.45],
      ['bridge-end',13,-60,1,0],['bridge-end',-24,-108,1,Math.PI],
      ['sky-crystal',-46,-266,1.2,0],['crystal-rock',-46,-266,1.1,0],['sky-crystal',30,-342,.9,1],['crystal-rock',30,-342,.9,1],
      ['ruin-tower',79,-122,.8,2.2],['isle-cypress',70,-114,1,0],
    ],
  },
  {
    name:'Veil Falls', par:3,
    points:[[0,0],[-2,-40],[-5,-80],[-7,-120],[-8,-162]], width:30,
    green:[-8,-160,15,16], water:[],
    bunkers:[[15,-170,6,9,.3,.14]],
    islands:[
      isle(0,-6,22,26,10,.0,.08),
      isle(-8,-160,34,34,2,.3,.1,{land:[-8,-160]}),
      isle(74,-96,26,30,30,-.3,.1,{land:[72,-98]}),
      isle(-78,-60,14,16,18,.7,.12,{decor:true}),
    ],
    falls:[[2,3.1,9],[2,2.4,6],[0,-2.4,4],[1,2.2,5],[3,-.3,4]],
    decor:[
      ['ruin-columns',-34,-178,1,.3],['isle-banner',-40,-158,1,.9],['rubble',-24,-189,.9,2],
      ['ruin-tower',84,-108,1.05,1.2],['ruin-wall',64,-78,.75,.5],['sky-crystal',58,-110,1,0],['crystal-rock',58,-110,1,0],
      ['bridge-end',12,-30,.9,0],['isle-cypress',-79,-61,1.1,0],['rubble',-74,-56,.8,0],
    ],
  },
  {
    name:'Crown Keep', par:5,
    points:[[0,0],[14,-120],[10,-240],[-8,-330],[8,-452]], width:42,
    green:[8,-450,15,18], water:[],
    bunkers:[[40,-206,8,15,-.3,.15],[-30,-336,7,13,.5,.14],[30,-444,7,11,-.2,.15],[-14,-470,9,6,.1,.13]],
    islands:[
      isle(0,-14,26,40,6,0,.07),
      isle(16,-172,46,90,2,-.1,.06,{land:[12,-226]}),
      isle(-8,-322,40,46,7,.2,.07,{land:[-6,-322]}),
      isle(8,-452,38,40,12,0,.08,{land:[8,-450]}),
      isle(-14,-546,30,26,34,.15,.1,{decor:true}),
      isle(-84,-240,16,18,20,.5,.12,{decor:true}),
    ],
    falls:[[1,-2.7,6],[2,.25,7],[4,.4,8],[4,2.6,6],[5,.1,5],[3,-3.6,4]],
    decor:[
      ['ruin-tower',-14,-548,1.55,.2],['ruin-wall',4,-536,1.1,0],['ruin-wall',-32,-534,.9,-.5],['isle-banner',-24,-532,1.3,.4],
      ['ruin-wall',38,-468,.85,-1.5],['rubble',30,-480,1,0],
      ['ruin-columns',-38,-298,.9,.8],['ruin-arch',48,-140,.95,-.6],['rubble',40,-126,1,2],
      ['bridge-end',12,-50,1,0],['bridge-end',-20,-268,1,Math.PI],
      ['sky-crystal',-28,-366,1.1,0],['crystal-rock',-28,-366,1,0],['sky-crystal',44,-100,1,0],['crystal-rock',44,-100,1,0],
      ['ruin-columns',-84,-242,.7,1.4],
    ],
  },
];
// Every island list is part of the layout so the replay verifier sees identical land.
export function skyIsleLayout(index) {
  const l=SKY_ISLE_LAYOUTS[index];
  return {...l,contour:.32,density:0,landmark:'isles',wind:{x:[1.1,-.8,1.5][index],z:[-.4,.3,.6][index]},
    islands:l.islands.map(i=>({...i})),points:l.points.map(p=>[...p])};
}
