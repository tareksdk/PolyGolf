import { button, coins, esc, header } from './views.js';
import { icon } from './icons.js';
import { GOLF_COURSES, getGolfHole, golfHoleCount, courseRecordKey } from './golf-courses.js';
import { COURSES, getHole, relative } from './courses.js';
import { featuredCourses } from './rotating-courses.js';
export function courseMenu(ui) {
  const golf=ui.mode==='golf',courses=golf?GOLF_COURSES:COURSES;
  const card=(i,feature)=>{
    const c=courses[i],count=golf?golfHoleCount(i):9,unlocked=ui.progress.level.level>=c.level;
    const best=ui.progress.data.bests[courseRecordKey(ui.mode,i)],par=Array.from({length:count},(_,j)=>(golf?getGolfHole:getHole)(i,j).par).reduce((a,b)=>a+b,0);
    const reset=feature?new Date(feature.ends).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
    return `<article class="arcade-course ${feature?'featured-course':''}" data-card>${feature?`<div class="course-slot">${esc(feature.label)}<small>${feature.label==='Seasonal course'?'Ends':'Changes'} ${esc(reset)}</small></div>`:''}<img data-course-preview="${ui.mode}:${i}" src="${ui.world.thumbnail(i,ui.mode)}" alt="${esc(c.name)}"><div class="arcade-course-copy"><span>${count} ${count===1?'hole':'holes'} · Par ${par}</span><h2>${esc(c.name)}</h2><p>${esc(c.subtitle)}</p><div class="arcade-course-record"><span>${unlocked?esc(c.difficulty):'Level '+c.level+' · Practice available'}</span><span>Best ${best?relative(best.score):'-'}</span></div>${button(icon('play')+(unlocked?'Play':'Practice'),unlocked?'start':'practice',`data-course="${i}" data-card-primary aria-label="${unlocked?'Play':'Practice'} ${esc(c.name)}"`,'arcade-button arcade-primary')}</div></article>`;
  };
  const featured=ui.courseCollection!=='classic',miniPage=ui.miniCoursePage===1?1:0;
  const cards=golf?(featured?featuredCourses().map(f=>card(f.index,f)):[0,1,2].map(i=>card(i))):courses.map((_,i)=>i).slice(miniPage*3,miniPage*3+3).map(i=>card(i));
  const choices=golf?[['featured','Featured'],['classic','Classics']]:[['0','1–3'],['1','4–5']];
  const selected=golf?(featured?'featured':'classic'):String(miniPage);
  return `${header(ui)}<main class="arcade-page course-menu"><header class="arcade-page-header">${button('← Back','home','','arcade-button')}<h1>Courses</h1><span>${coins(ui.progress.data.coins)}</span></header><section class="arcade-page-content"><nav class="arcade-switch" aria-label="Golf mode">${[['golf','Full golf'],['mini','Mini-golf']].map(([id,label])=>button(label,'mode',`data-id="${id}" aria-pressed="${ui.mode===id}"`,'arcade-button')).join('')}<span class="course-collection" role="group" aria-label="Course collection">${choices.map(([id,label])=>button(label,'course-collection',`data-id="${id}" aria-pressed="${selected===id}"`,'arcade-button')).join('')}</span></nav><div class="arcade-courses" style="--course-count:${cards.length}">${cards.join('')}</div><footer class="arcade-course-footer"><div>${button('Community maps','community','','arcade-button')}${button('Map editor · Level 10','editor','','arcade-button')}</div><small>Daily courses change at midnight UTC. Weekly courses change Monday at midnight UTC. Practice and custom maps do not award coins or leaderboard results.</small></footer></section></main>`;
}
