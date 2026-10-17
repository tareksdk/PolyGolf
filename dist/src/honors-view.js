import {ACCOLADES,MEDALS,honorDefinition} from './honors.js';
import {badgeSvg} from './nameplate-badges.js';
import {GOLF_COURSES} from './golf-courses.js';
import {COURSES} from './courses.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shapes={
 wings:'M12 11 2 4l3 10 7 6 7-6 3-10-10 7Zm0 0v9M3 8l6 5m12-5-6 5',
 mountain:'m2 21 7-16 5 9 3-5 5 12ZM6 12l3 2 3-2',
 hundred:'M4 7h2v12M13 10a3 3 0 0 0-6 0v6a3 3 0 0 0 6 0Zm8 0a3 3 0 0 0-6 0v6a3 3 0 0 0 6 0Z',
 infinity:'M12 12C7 3 2 7 2 12s5 9 10 0c5-9 10-5 10 0s-5 9-10 0Z',
 swords:'m3 3 17 17M3 3l6 2-4 4Zm18 0L4 20m17-17-6 2 4 4ZM2 15l7 7m6 0 7-7',
 summit:'m2 22 10-15 10 15ZM12 7V1l8 2-8 3M8 13l4 3 4-3',
 heart:'M12 21C-2 12 1 2 7 3c3 0 5 4 5 4s2-4 5-4c6-1 9 9-5 18Z',
 tree:'m12 2-7 8h4l-6 7h7v5h4v-5h7l-6-7h4Z',
 wave:'M2 10c3 0 3-5 6-5s3 5 6 5 3-5 6-5M2 18c3 0 3-5 6-5s3 5 6 5 3-5 6-5',
 leaf:'M4 21 18 5M4 18C-2 7 9 1 21 3c0 11-5 19-17 15Zm4-1 0-7m4 3h6',
 flag:'M5 22V3m0 0c5-4 9 4 15 0v10c-6 4-10-4-15 0M2 22h8',
 bird:'m2 8 7 5 3-8 4 3 6-1-4 5-1 6-6 2-5-2m3-5 3 4',
 sun:'M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
 trophy:'M7 3h10v7c0 7-10 7-10 0ZM7 5H3v4c0 3 4 4 5 4m9-8h4v4c0 3-4 4-5 4M12 16v6m-5 0h10',
};
export function honorIcon(def,type='medal'){
 const core=shapes[def.icon]?`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${shapes[def.icon]}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`:badgeSvg(def.icon);
 return `<span class="honor-emblem ${type==='accolade'?'honor-accolade':'honor-medal'} ${def.id==='studios'?'honor-prismatic':''}" style="--honor-color:${def.color}" aria-hidden="true"><span class="honor-ribbon"></span><span class="honor-coin">${core}</span></span>`;
}
function awardRow(entries,type){
 return entries.map(a=>{const d=honorDefinition(type,a.kind);if(!d)return '';return `<button class="honor-tile" data-action="honor-info" data-kind="${d.id}" data-type="${type}" title="${esc(d.name)}: ${esc(d.desc)}" aria-label="${esc(d.name)}${a.count>1?', '+a.count+' received':''}">${honorIcon(d,type)}${a.count>1?`<b class="honor-count">${a.count}</b>`:''}<span>${esc(d.name.replace(' accolade',''))}</span></button>`;}).join('');
}
export function profileAccolades(p){
 const accolades=p?.honors?.accolades||[];
 return `<section class="profile-accolades" aria-label="Accolades"><div class="honors-heading"><span>ACCOLADES</span></div><div class="honor-shelf">${awardRow(accolades,'accolade')}${!accolades.length?'<span class="honors-empty">No accolades yet</span>':''}</div></section>`;
}
export function profileMedals(p){
 const medals=p?.honors?.medals||[];
 return `<section class="profile-medals" aria-label="Medals"><div class="honors-heading"><span>MEDALS</span><button class="text-button" data-action="honor-guide" aria-label="Medal guide">Guide</button></div><div class="profile-medal-grid">${awardRow(medals,'medal')}${!medals.length?'<span class="honors-empty">Your first medal starts with a round.</span>':''}</div></section>`;
}
export function honorsCabinet(p,{own=false}={}){
 const h=p?.honors||{},medals=h.medals||[],accolades=h.accolades||[];
 return `<section class="honors-cabinet" aria-label="Medals and accolades"><div class="honors-heading"><span>MEDALS &amp; ACCOLADES</span><button class="text-button" data-action="honor-guide">Medal guide</button></div>${medals.length?`<div class="honor-shelf">${awardRow(medals,'medal')}</div>`:'<p class="honors-empty">Every collection starts with a round.</p>'}${accolades.length?`<div class="honor-shelf accolade-shelf">${awardRow(accolades,'accolade')}</div>`:''}${!own&&(h.canGive?.length)?`<button class="honor-gift-button button secondary" data-action="accolade-options" data-user="${esc(p.id)}">Give an accolade</button>`:''}</section>`;
}
export function profileBests(p){
 const rows=p?.bests||[];
 return `<section class="profile-bests-compact"><div class="honors-heading"><h3>Personal bests</h3><span>SCORE / RANK</span></div>${rows.length?`<div class="profile-bests-scroll" tabindex="0" aria-label="Personal bests by course"><table><thead><tr><th>Course</th><th>To par</th><th>Rank</th></tr></thead><tbody>${rows.map(r=>{
  const course=(r.mode==='golf'?GOLF_COURSES:COURSES)[r.course];if(!course)return '';
  const period=/^(day|week)-\d+$/.test(r.rotation)?`${r.rotation.startsWith('day-')?'Daily':'Weekly'} · ${new Date(Date.UTC(2026,9,12)+Number(r.rotation.split('-')[1])*86400000*(r.rotation.startsWith('week')?7:1)).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})}`:r.mode==='mini'?'Mini-golf':'';
  return `<tr><td>${esc(course.name)}${period?`<small>${esc(period)}</small>`:''}</td><td>${r.score===0?'E':r.score>0?'+'+r.score:r.score}</td><td><b>#${Number(r.rank)}</b><small>of ${Number(r.golfers)}</small></td></tr>`;
 }).join('')}</tbody></table></div>`:'<p class="honors-empty">Finish an online course to set a personal best.</p>'}</section>`;
}
export function accoladeChoices(p,balance){
 const h=p.honors||{};
 return `<div class="accolade-dialog"><p class="eyebrow">A LITTLE RECOGNITION</p><h2>For ${esc(p.username)}</h2><p>Give each accolade once to this golfer. Gifts are permanent.</p><div class="accolade-options">${ACCOLADES.filter(a=>h.canGive?.includes(a.id)).map(a=>{
  const sent=h.given?.includes(a.id),short=balance<a.cost;
  return `<button class="accolade-option" data-action="accolade-confirm" data-user="${esc(p.id)}" data-kind="${a.id}" ${sent||short?'disabled':''}>${honorIcon(a,'accolade')}<span><strong>${esc(a.name)}</strong><small>${sent?'Already given':short?'1,000,000 coins needed':a.cost?'1,000,000 coins':'Nameplate holder gift · Free'}</small></span><span aria-hidden="true">${sent?'✓':'→'}</span></button>`;
 }).join('')}</div></div>`;
}
export function accoladeConfirmation(p,kind){
 const a=honorDefinition('accolade',kind);if(!a)return '';
 return `<div class="honor-confirm">${honorIcon(a,'accolade')}<h2>Give ${esc(a.name)}?</h2><p>For <strong>${esc(p.username)}</strong></p><p>${a.cost?'This costs <strong>1,000,000 coins</strong>. The coins are spent, not transferred.':'Your matching nameplate lets you give this accolade for free.'}</p><p class="small-note">Permanent gift. One of this kind per golfer.</p><div class="modal-actions"><button class="button secondary" data-action="accolade-options" data-user="${esc(p.id)}">Back</button><button class="button yellow" data-action="accolade-send" data-user="${esc(p.id)}" data-kind="${a.id}">Give accolade</button></div><p class="form-error" id="accolade-error" role="alert"></p></div>`;
}
export function accoladeCelebration(award){
 const a=honorDefinition('accolade',award.kind);if(!a)return '';
 return `<div class="accolade-celebration"><div class="honor-rays" aria-hidden="true"></div><p class="eyebrow">A GOLFER RECOGNIZED YOU</p>${honorIcon(a,'accolade')}<h2>You received an accolade!</h2><h3>${esc(a.name)}</h3><p>From <strong>${esc(award.giver)}</strong></p><p class="small-note">A permanent place on your golfer profile.</p><button class="button yellow" data-action="accolade-dismiss">That means a lot</button></div>`;
}
export function medalGuide(){return `<h2>Medal cabinet</h2><p>Play, improve, and leave your mark. Earned medals are permanent.</p><div class="medal-guide">${MEDALS.map(d=>`<article>${honorIcon(d)}<div><h3>${d.name}</h3><p>${d.desc}</p></div></article>`).join('')}</div><p class="small-note">Champion medals settle within five minutes of a UTC rotation ending. Repeated wins add to your medal count.</p>`;}
