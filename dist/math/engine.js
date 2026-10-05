export const SAVE_KEY='parabola.golf.v1';
export const CLUBS=[{id:'putter',name:'Putter',max:28},{id:'iron',name:'Iron',max:78},{id:'driver',name:'Driver',max:125}];
export const HOLES=[
 {name:'First light',par:3,tee:[-69,33],pin:[62,-30],water:[],sand:[[-8,-29,18,12],[45,23,14,9]]},
 {name:'A gentle bend',par:3,tee:[-70,30],pin:[66,-30],water:[[-4,-20,20,13]],sand:[[17,22,18,10]]},
 {name:'Across the blue',par:3,tee:[-70,35],pin:[66,-30],water:[[0,0,22,32]],sand:[[53,25,15,10]]},
 {name:'The long way',par:4,tee:[-78,43],pin:[76,-40],water:[[-40,-30,25,15]],sand:[[21,0,20,12]]},
 {name:'Pocket green',par:3,tee:[-66,30],pin:[57,-27],water:[[-15,27,20,13]],sand:[[39,-15,12,10],[61,-44,15,8]]},
 {name:'Island time',par:4,tee:[-74,35],pin:[69,-33],water:[[-10,-9,20,27],[33,31,21,15]],sand:[[-43,-30,14,12]]},
 {name:'Golden hour',par:3,tee:[-73,33],pin:[64,-35],water:[],sand:[[-9,-6,24,15],[43,15,17,11]]},
 {name:'Thread the needle',par:4,tee:[-77,39],pin:[75,-36],water:[[-15,-25,22,17],[24,26,22,17]],sand:[[50,-16,14,8]]},
 {name:'Home sweet hole',par:3,tee:[-69,35],pin:[67,-33],water:[[0,25,20,13]],sand:[[0,-28,20,12]]},
];
export const UPGRADES=[
 {id:'power',name:'A little more drive',description:'+12 m for long clubs. +2 m for putts.',icon:'club',cost:70},
 {id:'touch',name:'The velvet touch',description:'A wider sweet spot around the cup.',icon:'target',cost:90},
 {id:'coins',name:'Lucky little ball',description:'+20% hole coins per level.',icon:'spark',cost:80},
];
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function makeEquation(club,difficulty='classic',random=Math.random){
 const n=(lo,hi)=>lo+Math.floor(random()*(hi-lo+1));
 const x=n(2,difficulty==='expert'?22:difficulty==='chill'?9:12),a=n(2,difficulty==='expert'?12:9),b=n(2,12);
 if(difficulty==='chill'||club==='putter')return{text:`x + ${a} = ${x+a}`,answer:x,hint:`Subtract ${a} from ${x+a}.`};
 if(club==='iron'&&difficulty!=='expert')return{text:`${a} × x = ${a*x}`,answer:x,hint:`Divide ${a*x} by ${a}.`};
 return{text:`${a}x + ${b} = ${a*x+b}`,answer:x,hint:`Subtract ${b}, then divide by ${a}.`};
}
export function createSave(){return{coins:0,upgrades:{power:0,touch:0,coins:0},difficulty:'classic',sound:false,completedRounds:0,best:null,round:{hole:0,ball:[...HOLES[0].tee],strokes:0,scores:[],streak:0,misses:0,finished:false}};}
export function sanitizeSave(raw){
 const out=createSave(),integer=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
 if(!raw||typeof raw!=='object')return out;
 if(integer(raw.coins,0,1e8))out.coins=raw.coins;
 for(const id of ['power','touch','coins'])if(integer(raw.upgrades?.[id],0,4))out.upgrades[id]=raw.upgrades[id];
 if(['chill','classic','expert'].includes(raw.difficulty))out.difficulty=raw.difficulty;
 out.sound=raw.sound===true;
 if(integer(raw.completedRounds,0,1e6))out.completedRounds=raw.completedRounds;
 if(integer(raw.best,-27,99999))out.best=raw.best;
 const r=raw.round;
 if(r&&integer(r.hole,0,8)&&Array.isArray(r.ball)&&r.ball.length===2&&r.ball.every(v=>Number.isFinite(v)&&Math.abs(v)<110)&&integer(r.strokes,0,999)&&Array.isArray(r.scores)&&r.scores.length===(r.finished?9:r.hole)&&r.scores.every(v=>integer(v,1,999))){
  out.round={hole:r.hole,ball:[...r.ball],strokes:r.strokes,scores:[...r.scores],streak:integer(r.streak,0,999)?r.streak:0,misses:integer(r.misses,0,999)?r.misses:0,finished:r.finished===true};
 }
 return out;
}
export function maxDistance(club,upgrades,lie='fairway'){const base=CLUBS.find(c=>c.id===club).max;return Math.round((base+(club==='putter'?upgrades.power*2:upgrades.power*12))*(lie==='sand'?.65:1));}
export function terrainAt(position,hole){
 if(Math.abs(position[0])>91||Math.abs(position[1])>57)return'out';
 for(const e of hole.water)if(((position[0]-e[0])/e[2])**2+((position[1]-e[1])/e[3])**2<1)return'water';
 for(const e of hole.sand)if(((position[0]-e[0])/e[2])**2+((position[1]-e[1])/e[3])**2<1)return'sand';
 return'fairway';
}
export function planShot({ball,angle,power,club,hole,upgrades}){
 const start=[...ball],end=[ball[0]+Math.cos(angle)*power,ball[1]+Math.sin(angle)*power];
 let terrain=terrainAt(end,hole);
 // Putts roll along the ground; a putter cannot jump a pond.
 if(club==='putter')for(let i=1;i<=Math.ceil(power*2);i++){const t=i/Math.ceil(power*2),p=[start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t];if(terrainAt(p,hole)==='water'){end[0]=p[0];end[1]=p[1];terrain='water';break;}}
 const cupRadius=2.5+upgrades.touch*.7;
 const holed=terrain!=='water'&&terrain!=='out'&&distance(end,hole.pin)<=cupRadius;
 if(holed){end[0]=hole.pin[0];end[1]=hole.pin[1];}
 return{start,end,terrain,holed,penalty:terrain==='water'||terrain==='out',height:club==='putter'?0:Math.min(power*.3,club==='iron'?30:38)};
}
export function scoreName(strokes,par){return strokes===1?'Hole in one!':strokes-par<=-2?'Eagle!':strokes-par===-1?'Birdie!':strokes===par?'Lovely par.':strokes===par+1?'Bogey. Still lovely.':'In the cup!';}
export function rewardFor(strokes,par,misses,upgrades){return Math.round((35+Math.max(0,par-strokes+1)*15+(misses===0?15:0))*(1+.2*upgrades.coins));}
export const upgradeCost=(item,level)=>item.cost*(level+1);
export function buyUpgrade(save,id){const item=UPGRADES.find(v=>v.id===id);if(!item)return false;const level=save.upgrades[id],cost=upgradeCost(item,level);if(level>=4||save.coins<cost)return false;save.coins-=cost;save.upgrades[id]++;return true;}
