import { halloweenActive, HALLOWEEN_END } from './season.js';

const DAY = 86400000, EPOCH = Date.UTC(2026, 9, 12);
export const EVENT_THEMES = [
  { id:'space', name:'Orbit Nine', subtitle:'A lunar outpost beneath a ringed planet.', sky:'#111731', grass:'#66728a', edge:'#424d69', water:'#43bfd2', accent:'#9debfa', color:'#8a9caf', fairway:'#a4b4cc', stripe:'#8c9fbc', green:'#b6d5cf', zenith:'#070c22', horizon:'#343261' },
  { id:'sky', name:'Cloudbreak', subtitle:'Sky gardens, airships and floating stone islands.', sky:'#8dcbe4', grass:'#4e975f', edge:'#6b8893', water:'#69cde3', accent:'#fff0bd', color:'#7bb982', fairway:'#88c97b', stripe:'#73b568', green:'#c4df89', zenith:'#398bc0', horizon:'#c6edf0' },
  { id:'medieval', name:'Crown & Keep', subtitle:'Castle ramparts, pennants and a winding royal moat.', sky:'#b5ccd7', grass:'#567c40', edge:'#6a725c', water:'#438c9b', accent:'#dbb35e', color:'#83995e', fairway:'#91ae61', stripe:'#7e9f50', green:'#bad27b', zenith:'#537b9e', horizon:'#cdd7c2' },
  { id:'cyberpunk', name:'Neon District', subtitle:'Electric canals under a violet city skyline.', sky:'#26223f', grass:'#425767', edge:'#263d50', water:'#ba63c9', accent:'#4befe0', color:'#60849a', fairway:'#619e9d', stripe:'#4b878f', green:'#9ed1b5', zenith:'#110e29', horizon:'#684a79' },
  { id:'future', name:'Tomorrow Gardens', subtitle:'Clean white arcologies and luminous blue reservoirs.', sky:'#a9dae2', grass:'#438c7b', edge:'#557b85', water:'#4abdda', accent:'#c3f3eb', color:'#70b7a4', fairway:'#88cbb2', stripe:'#70b69f', green:'#b6e2c1', zenith:'#467da4', horizon:'#c9ece4' },
];
const base = t => ({...t, theme:'forest', eventTheme:t.id, level:1, difficulty:'Adventure', tag:'FEATURED COURSE'});
export const EVENT_COURSES = [
  {...base({id:'halloween',name:'Hollow Lanterns',subtitle:'Moonlit ruins, giant pumpkins and the crooked manor.',sky:'#302747',grass:'#596044',edge:'#62506c',water:'#799b65',accent:'#f6ad51',color:'#ab814e',fairway:'#8e9857',stripe:'#7e874a',green:'#bec378',zenith:'#17172e',horizon:'#665176'}),slot:'seasonal',holeCount:3},
  ...EVENT_THEMES.map(t=>({...base(t),id:'weekly-'+t.id,slot:'weekly',holeCount:3})),
  ...EVENT_THEMES.map(t=>({...base(t),id:'daily-'+t.id,name:t.name+' Sprint',slot:'daily',holeCount:1})),
];
const mod=(a,b)=>((a%b)+b)%b;
export function rotationSlots(now=Date.now()) {
  const day=Math.floor((Number(now)-EPOCH)/DAY),week=Math.floor(day/7);
  return {seasonal:halloweenActive(now)?3:null,weekly:4+mod(week,5),daily:9+mod(day,5),day,week,
    dailyEnds:EPOCH+(day+1)*DAY,weeklyEnds:EPOCH+(week+1)*7*DAY,seasonalEnds:HALLOWEEN_END};
}
export function courseRotationKey(index,now=Date.now()) {
  const s=rotationSlots(now);
  return index===14?'':index===3?'halloween-2026':index>=9?'day-'+s.day:index>=4?'week-'+s.week:'';
}
export function courseAvailable(index,now=Date.now()) {
  const s=rotationSlots(now);
  return Number.isInteger(index)&&index>=0&&(index<3||index===14||[s.seasonal,s.weekly,s.daily].includes(index));
}
export function featuredCourses(now=Date.now()) {
  const s=rotationSlots(now);
  return [{index:s.seasonal,label:'Seasonal course',ends:s.seasonalEnds},{index:s.weekly,label:'Map of the week',ends:s.weeklyEnds},{index:s.daily,label:'Hole of the day',ends:s.dailyEnds},{index:14,label:'Long course'}].filter(x=>x.index!==null);
}
// Stable layouts: the date selects a course, never changes an in-progress replay.
export function eventLayout(course,index) {
  const theme=course.eventTheme,variation=['halloween',...EVENT_THEMES.map(t=>t.id)].indexOf(theme),daily=course.slot==='daily';
  const par=daily?3:[4,3,5][index],length=par===3?152+variation*7:par===4?315+variation*9:458+variation*8;
  const side=variation%2?-1:1,bend=par===3?10:34+variation*3;
  const end=side*(variation-2)*3;
  return {name:(daily?['Beacon Shot']:['The Arrival','Across the Rift','Last Light'])[index],par,
    points:[[0,0],[side*bend*.45,-length*.23],[side*bend,-length*.48],[side*bend*.6,-length*.74],[end,-length]],
    width:par===3?34:42,green:[end,-length+2,15,18],
    water:[[side*-43,-length*.56,17+variation,27]],
    bunkers:[[end+26,-length+15,8,12],[end-25,-length-12,8,9]],
    contour:theme==='sky'?.65:theme==='space'?.8:1,density:0,landmark:'event'};
}
