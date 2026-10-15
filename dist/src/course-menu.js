import { button, coins, esc, header } from './views.js';
import { icon } from './icons.js';
import { GOLF_COURSES, getGolfHole, golfHoleCount, courseRecordKey } from './golf-courses.js';
import { COURSES, getHole, relative } from './courses.js';

export function courseMenu(ui) {
  const golf = ui.mode === 'golf', courses = golf ? GOLF_COURSES : COURSES;
  return `${header(ui)}<main class="arcade-page course-menu"><header class="arcade-page-header">${button('← Back','home','','arcade-button')}<h1>Courses</h1><span>${coins(ui.progress.data.coins)}</span></header><section class="arcade-page-content"><nav class="arcade-switch" aria-label="Golf mode">${[['golf','Full golf'],['mini','Mini-golf']].map(([id,label])=>button(label,'mode',`data-id="${id}" aria-pressed="${ui.mode===id}"`,'arcade-button')).join('')}</nav><div class="arcade-courses">${courses.map((course,i)=>{
    const count = golf ? golfHoleCount(i) : 9, unlocked = ui.progress.level.level >= course.level, best = ui.progress.data.bests[courseRecordKey(ui.mode,i)], par=Array.from({length:count},(_,j)=>(golf?getGolfHole:getHole)(i,j).par).reduce((a,b)=>a+b,0);
    return `<article class="arcade-course" data-card><img data-course-preview="${ui.mode}:${i}" src="${ui.world.thumbnail(i,ui.mode)}" alt="${esc(course.name)}"><div class="arcade-course-copy"><span>${count} holes · Par ${par}</span><h2>${esc(course.name)}</h2><p>${esc(course.subtitle)}</p><div class="arcade-course-record"><span>${unlocked?esc(course.difficulty):'Level '+course.level+' · Practice available'}</span><span>Best ${best?relative(best.score):'-'}</span></div>${button(icon('play')+(unlocked?'Play':'Practice'),unlocked?'start':'practice',`data-course="${i}" data-card-primary aria-label="${unlocked?'Play':'Practice'} ${esc(course.name)}"`,'arcade-button arcade-primary')}</div></article>`;
  }).join('')}</div><footer class="arcade-course-footer"><div>${button('Community maps','community','','arcade-button')}${button('Map editor · Level 10','editor','','arcade-button')}</div><small>Practice and custom maps don’t award coins or ranked results.</small></footer></section></main>`;
}
