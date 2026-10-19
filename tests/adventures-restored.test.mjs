import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GOLF_COURSES,getGolfHole,golfHoleCount,terrainAt,courseRecordKey} from '../dist/src/golf-courses.js';
import {featuredCourses,courseAvailable,courseRotationKey,rotationSlots} from '../dist/src/rotating-courses.js';
import {weatherProfile} from '../dist/src/weather-config.js';
import {roomInviteUrl,inviteCode} from '../dist/src/room-invites.js';
import {verifyHole} from '../dist/src/replay.js';
import {courseMenu} from '../dist/src/course-menu.js';
import {defaultSave,ProgressionManager} from '../dist/src/save.js';

const october=Date.parse('2026-10-16T12:00:00Z');
mock.timers.enable({apis:['Date'],now:october});

test('Halloween and rotating adventures coexist with the nine-hole Willow course',()=>{
 assert.equal(GOLF_COURSES.length,18);assert.equal(golfHoleCount(0),3);assert.equal(golfHoleCount(14),9);
 assert.equal(GOLF_COURSES[3].name,'Hollow Lanterns');assert.equal(golfHoleCount(3),3);
 const features=featuredCourses(october);assert.equal(features.length,7);assert.equal(features[0].index,17);
 assert.ok(courseAvailable(3,october));assert.equal(courseRotationKey(3,october),'halloween-2026');
 let holes=0;
 for(let course=0;course<GOLF_COURSES.length;course++)for(let index=0;index<golfHoleCount(course);index++){
  const h=getGolfHole(course,index);holes++;
  for(const point of [h.start,h.cup]){const t=terrainAt(h,point.x,point.z);assert.ok(Number.isFinite(t.height));assert.equal(t.hazard,null);}
  assert.equal(verifyHole({mode:'golf',course,equipment:{}},index,[{kind:'skip',tick:0}],0).strokes,h.par+6);
 }
 assert.equal(holes,62);
});

test('Normal keeps the Halloween sky and theme while optional weather remains available',()=>{
 const h=getGolfHole(3,0),normal=weatherProfile(h);
 assert.equal(normal.zenith,h.course.zenith);assert.equal(normal.horizon,h.course.horizon);assert.equal(normal.night,1);
 assert.notEqual(weatherProfile(h,'rainy').zenith,normal.zenith);
 assert.equal(weatherProfile(h,'night').mode,'night');
 const kit=JSON.parse(fs.readFileSync(new URL('../dist/assets/adventure-kit.json',import.meta.url),'utf8'));
 for(const name of ['jack-lantern','haunted-manor','grave','bare-tree']){
  assert.ok(kit.assets[name].p.length>0);assert.equal(kit.assets[name].p.length%9,0);
 }
});

test('season expiry hides Halloween without removing its replay layout or rotating slots',()=>{
 const november=Date.parse('2026-11-02T12:00:00Z');
 assert.equal(courseAvailable(3,november),false);assert.equal(featuredCourses(november).length,6);
 assert.equal(getGolfHole(3,0).course.eventTheme,'halloween');
 const today=rotationSlots(october),tomorrow=rotationSlots(october+86400000);
 assert.notEqual(today.daily,tomorrow.daily);assert.notEqual(courseRotationKey(today.daily,october),courseRotationKey(tomorrow.daily,october+86400000));
 assert.notEqual(courseRecordKey('golf',today.daily,'day-1'),courseRecordKey('golf',today.daily,'day-2'));
});

test('restored room invites retain valid codes and reject invalid invitations',()=>{
 for(const origin of ['https://littlelinks.study','https://polygolf.lol'])assert.equal(inviteCode(roomInviteUrl('ABC234',origin)),'ABC234');
 assert.equal(inviteCode('https://littlelinks.study/?invite=abc234'),'ABC234');
 assert.equal(inviteCode('https://littlelinks.study/?invite=INVALID'),null);
 assert.throws(()=>roomInviteUrl('bad-code','https://littlelinks.study'),/Invalid room code/);
});

test('one course screen contains both featured adventures and all three classics',()=>{
 const data=defaultSave(),progress=new ProgressionManager({load:()=>data,save:()=>true});
 const ui={mode:'golf',screen:'courses',progress,world:{thumbnail:()=>''}};
 const menu=courseMenu(ui);assert.match(menu,/Hollow Lanterns/);assert.match(menu,/Play Hollow Lanterns/);
 for(const name of ['Willow Park','Saltwind Links','Autumn Pines'])assert.ok(menu.includes(name));
 assert.match(courseMenu({...ui,moreCoursePage:1}),/9 holes · Par 36/);assert.equal((menu.match(/<article /g)||[]).length,10);
 assert.match(menu,/aria-labelledby="featured-courses-heading"/);assert.match(menu,/aria-labelledby="classic-courses-heading"/);
 assert.ok(!menu.includes('data-action="course-collection"'));
 ui.mode='mini';ui.miniCoursePage=1;assert.equal((courseMenu(ui).match(/<article /g)||[]).length,5);
});
