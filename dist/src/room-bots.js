import { DEFAULT_EQUIPMENT } from './catalog.js';
import { CLUB_MAX_YARDS } from './club-distances.js';
import { miniStats } from './equipment.js';
import { nearestPoint } from './courses.js';
import { GolfPhysics } from './golf-physics.js';
import { clamp, terrainAt } from './golf-courses.js';
import { PhysicsManager } from './physics.js';
import { nextPlanet, PLANETFALL_CLUBS } from './planetfall.js';

const YARD = .9144;
const BOT_STEP = 1 / 60;
const FRAME_TICKS = 6;
const PREVIEW_STEP = 1 / 30;

export const ROOM_BOT_SKILLS = {
  duffer: {
    name: 'Duffer', driverYards: 200, driverPower: .83, steady: .18, mishit: .32, angle: .123, power: .225, putt: .145, pace: .30,
    names: ['Chunk Mulligan', 'Divot Dave', 'Slice McGee', 'Duffer Dan', 'Three-Putt Pete', 'Topped Tom', 'Shank Hank'],
    outfit: ['#c88144', '#6e593f'], equipment: { ball: 'ball-stripe' },
  },
  weekend: {
    name: 'Weekend Warrior', driverYards: 250, driverPower: .958, steady: .30, mishit: .17, angle: .081, power: .151, putt: .135, pace: .27,
    names: ['Riley Rough', 'Morgan Fairway', 'Casey Brooks', 'Taylor Wedge', 'Cameron Reed', 'Jamie Green', 'Bunker Ben'],
    outfit: ['#679455', '#283e33'], equipment: { ball: 'ball-marble', club: 'club-wood', trail: 'trail-leaves', nameplate: 'nameplate-botanical' },
  },
  stick: {
    name: 'Stick', driverYards: 305, driverPower: 1, steady: .43, mishit: .11, angle: .052, power: .087, putt: .123, pace: .25,
    names: ['Quinn Archer', 'Elliot Banks', 'Parker Cole', 'Maya Links', 'Jordan Hale', 'Sage Pinwell', 'Oakley Wren'],
    outfit: ['#558dbc', '#1f3452'], equipment: { ball: 'ball-water', driver: 'driver-copper', club: 'club-carbon', trail: 'trail-ice', nameplate: 'nameplate-midnight' },
  },
  master: {
    name: 'Master', driverYards: 350, driverPower: 1, steady: .70, mishit: .07, angle: .025, power: .051, putt: .057, pace: .14,
    names: ['Avery Sterling', 'Jules Fairburn', 'Sloane Ryder', 'Marin Ace', 'Hollis Slate', 'Cleo Finch', 'Blair Locke'],
    outfit: ['#674675', '#d7b765'], equipment: { ball: 'ball-gold', driver: 'driver-prestige', club: 'club-gold', trail: 'trail-sparkles', nameplate: 'nameplate-prestige' },
  },
};

export function makeRoomBot(skill = 'weekend', index = 0) {
  const style = Object.hasOwn(ROOM_BOT_SKILLS, skill) ? ROOM_BOT_SKILLS[skill] : null;
  if (!style) throw Error('Choose a valid bot skill.');
  const id = crypto.randomUUID(), equipment = { ...DEFAULT_EQUIPMENT, ...style.equipment };
  return { id: 'bot-' + id, name: style.names[index % style.names.length], bot: true, ready: true,
    botSkill: skill, botDriverYards: style.driverYards, botSeed: id, delay: (.24 + index % 7 * .37), equipment,
    nameplate: equipment.nameplate, scores: [], nextHole: 0 };
}

function seedRandom(key) {
  let n = 2166136261;
  for (const c of key) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return () => {
    n += 0x6d2b79f5;
    let x = Math.imul(n ^ n >>> 15, 1 | n);
    x ^= x + Math.imul(x ^ x >>> 7, 61 | x);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function routeFor(hole) {
  return hole.mode === 'golf' ? hole.route.map(([x,z]) => ({x,z})) : hole.samples;
}

function leadingTarget(hole, from, route, maxDistance) {
  const closest = route.reduce((best, point, i) => distance(point, from) < distance(route[best], from) ? i : best, 0);
  let choice = null;
  for (let i = closest + 1; i < route.length; i++) {
    const candidate = route[i];
    const length = distance(from, candidate);
    if (length > maxDistance) break;
    if (hole.mode === 'golf') {
      const lie = terrainAt(hole, candidate.x, candidate.z);
      if (lie.hazard || lie.surface === 'sand') continue;
    } else if (distance(candidate, hole.cup) < 1.25) break;
    if (length > (hole.mode === 'golf' ? 8 : .55)) choice = candidate;
  }
  return choice ?? route[Math.min(closest + 1, route.length - 1)];
}

function chooseTarget(hole, from, route, style, reached, trouble, random) {
  const remaining = distance(from, hole.cup);
  if (hole.mode !== 'golf') {
    const progress = nearestPoint(hole,from.x,from.z).t;
    const onBridge = hole.bridge && progress >= hole.bridge[0]-.055 && progress < hole.bridge[1];
    const direct = remaining < 5.2 && progress > .70 && trouble < 2;
    const max = onBridge ? 2.5 : trouble ? 4 : remaining < 12 ? 5 : 12;
    return { target: direct ? hole.cup : leadingTarget(hole, from, route, max), club: 'putter' };
  }
  if (hole.space && reached < 8) {
    const target = nextPlanet(reached);
    const club = PLANETFALL_CLUBS.find(id => CLUB_MAX_YARDS[id] * YARD * .87 >= distance(from, target)) || '4i';
    return { target, club };
  }
  const { surface } = terrainAt(hole, from.x, from.z);
  if (surface === 'green' && remaining <= 34 || remaining < 5 && surface !== 'sand') return { target: hole.cup, club: 'putter' };
  const limit = style.driverYards * YARD;
  const approachAngle = random() * Math.PI * 2;
  const approachLeave = (4 + random() * 3.6) * clamp(remaining / 37, .28, 1.35);
  const center = { x: hole.green.x * .35 + hole.cup.x * .65, z: hole.green.z * .35 + hole.cup.z * .65 };
  const approach = {
    x: center.x + Math.cos(approachAngle) * Math.min(approachLeave,hole.green.rx*.58),
    z: center.z + Math.sin(approachAngle) * Math.min(approachLeave,hole.green.rz*.58),
  };
  const conservative = trouble && remaining > 160;
  const advance = limit * (surface === 'sand' ? .43 : surface === 'rough' ? .67 : conservative ? .65 : .90);
  const target = remaining > limit * .89 || conservative ? leadingTarget(hole, from, route, advance) : approach;
  const yards = distance(from, target) / YARD;
  if (surface === 'sand') return { target, club: yards <= 72 ? 'sw' : 'pw' };
  if (surface === 'tee' && yards > limit / YARD * .60 || yards > limit / YARD * .93) return { target, club: 'driver' };
  const bag = Object.entries(CLUB_MAX_YARDS).filter(([id,max]) => id !== 'putter' && max <= style.driverYards);
  const factoring = surface === 'rough' ? 1.36 : 1.12;
  const club = bag.findLast(([, max]) => max >= yards * factoring)?.[0] ?? 'driver';
  return { target, club };
}

function shotOptions(hole, member, style) {
  if (hole.mode !== 'golf') return { gear: miniStats(member.equipment) };
  return { gear: { driverYards: Math.max(265, style.driverYards) } };
}

function preview(base, aim, options) {
  const trial = new base.constructor();
  trial.load(base.hole);
  trial.ball = { ...base.ball };
  trial.reached = base.reached;
  trial.time = base.time;
  trial.clock = base.clock;
  trial.shoot(aim.dx, aim.dz, aim.power, { ...options, club: aim.club });
  const limit = (base.hole.mode === 'golf' ? 32 : 18) / PREVIEW_STEP;
  for (let i = 0; trial.active && i < limit; i++) trial.update(PREVIEW_STEP);
  return { ball: trial.ball, hazard: trial.events.includes('water') };
}

function fitShot(physics, target, club, style, options, trouble) {
  const { ball, hole } = physics;
  const x = target.x - ball.x, z = target.z - ball.z, length = Math.max(.02, Math.hypot(x,z));
  const heading = Math.atan2(z,x);
  const cap = club === 'driver' ? style.driverPower : 1;
  let angle = heading, power, exponent = .56;
  if (hole.mode !== 'golf') {
    power = Math.sqrt(6.1 * length) / 19.2;
    exponent = .50;
  } else if (club === 'putter') {
    const {surface,normal} = terrainAt(hole,ball.x,ball.z);
    const friction = surface === 'green' ? .5 : 1.1;
    const grade = 7 * normal.y * (normal.x * x + normal.z * z) / length;
    const brake = Math.max(.12,friction-grade);
    power = Math.sqrt(2 * brake * (length + .21)) / 6;
    const sideGrade = 7 * normal.y * (-normal.x * z + normal.z * x) / length;
    angle -= Math.atan2(sideGrade,brake);
    if (surface === 'green' && length < 5.6)
      return { dx: Math.cos(angle), dz: Math.sin(angle), power: clamp(power,.01,1), club };
    exponent = .50;
  } else {
    const max = club === 'driver' ? Math.max(265, style.driverYards) : CLUB_MAX_YARDS[club];
    power = (length / (max * YARD)) ** exponent;
  }
  const current = () => ({ dx: Math.cos(angle), dz: Math.sin(angle), power: clamp(power,.01,cap), club });
  const tries = trouble ? 4 : hole.mode === 'golf' ? 2 : 3;
  let best = null, bestError = Infinity;
  for (let i=0; i<tries; i++) {
    const aim = current();
    const trial = preview(physics,aim,options);
    const error = distance(trial.ball,target) + (trial.hazard ? length : 0);
    if (error < bestError) { best = aim; bestError = error; }
    const dx = trial.ball.x-ball.x, dz = trial.ball.z-ball.z;
    const forward = dx*Math.cos(heading)+dz*Math.sin(heading);
    const cross = -dx*Math.sin(heading)+dz*Math.cos(heading);
    if (error < (club === 'putter' ? .14 : 1.1)) break;
    const nextPower = aim.power * clamp((length / Math.max(length*.18, forward)) ** exponent,.58,1.65);
    angle -= clamp(Math.atan2(cross, Math.max(forward, length*.35)), -.32, .32);
    if (trial.hazard && trouble) {
      // Re-align with the safe target first. Alternate shorter and firmer recovery shots
      // if a corner or wet landing still catches the ball after the correction.
      power = i % 2 ? Math.min(nextPower,aim.power) * .77 : nextPower * 1.07;
      if (i > 0) angle += (i % 2 ? -.21 : .27) * (hole.mode === 'golf' ? .32 : 1);
    } else power = nextPower;
  }
  return best ?? current();
}

function playerError(aim, style, options, random) {
  const quality = random();
  const mishit = quality > 1 - style.mishit;
  const wide = quality < style.steady ? .40 : mishit ? 2.35 : 1;
  const putt = aim.club === 'putter';
  let aimError = random() - random();
  if (mishit) aimError = Math.sign(aimError) * Math.max(.42,Math.abs(aimError));
  const angle = Math.atan2(aim.dz,aim.dx) + aimError * (putt ? style.putt : style.angle) * wide;
  const cap = aim.club === 'driver' ? style.driverPower : 1;
  const power = clamp(aim.power * (1 + (random()-random()) * (putt ? style.pace : style.power) * wide),.01,cap);
  return { kind: 'shot', dx: Math.cos(angle), dz: Math.sin(angle), power, club: aim.club, shape: 0, spin: 0, ...options };
}

function recordShot(physics, shot, waitMs) {
  const origin = { ...physics.ball }, frames = [origin];
  const waitTicks = Math.round(waitMs / 1000 / BOT_STEP);
  if (physics.hole.mode === 'golf') physics.clock += waitTicks * BOT_STEP;
  else physics.time += waitTicks * BOT_STEP;
  physics.shoot(shot.dx, shot.dz, shot.power, shot);
  let ticks = 0;
  while (physics.active && ticks < Math.ceil(45 / BOT_STEP)) {
    physics.update(BOT_STEP);
    if (++ticks % FRAME_TICKS === 0) frames.push({ ...physics.ball });
  }
  const ball = { ...physics.ball }, penalty = physics.events.includes('water'), sunk = physics.sunk;
  if (penalty) physics.reset();
  else physics.events.length = 0;
  return { ...shot, waitMs, ticks, origin, frames, ball, settled: { ...physics.ball }, penalty, sunk };
}

const cachedPlans = new Map();

const planKey = (member, hole, index) =>
  [member.botSeed ?? member.id, member.botSkill, hole.mode, hole.courseIndex, index,
    hole.seed, hole.start.x, hole.start.z, hole.cup.x, hole.cup.z, hole.wind?.x, hole.wind?.z, hole.pirateSeed].join(':');

function cachePlan(key, plan) {
  if (cachedPlans.size >= 80) cachedPlans.delete(cachedPlans.keys().next().value);
  cachedPlans.set(key, plan);
}

export function planRoomBotHole(member, hole, index = hole.index) {
  const skill = ROOM_BOT_SKILLS[member.botSkill] ?? ROOM_BOT_SKILLS.weekend;
  const key = planKey(member,hole,index);
  const cached = cachedPlans.get(key);
  if (cached) return cached;
  const random = seedRandom(key), route = routeFor(hole), options = shotOptions(hole,member,skill);
  const physics = hole.mode === 'golf' ? new GolfPhysics() : new PhysicsManager();
  physics.load(hole);
  const shots = [];
  let strokes = 0, durationMs = 0, trouble = 0;
  while (!physics.sunk && strokes < Math.min(hole.strokeLimit ?? hole.par+8, 18)) {
    const waitMs = Math.round(820 + random() * 2420 + (shots.length === 0 ? random() * 680 : 0));
    const { target, club } = chooseTarget(hole, physics.ball, route, skill, physics.reached, trouble, random);
    const shot = playerError(fitShot(physics,target,club,skill,options,trouble),skill,options,random);
    const replay = recordShot(physics,shot,waitMs);
    trouble = replay.penalty || distance(replay.origin,replay.settled)<.11 ? trouble+1 : 0;
    strokes += replay.penalty ? 2 : 1;
    replay.durationMs = waitMs + Math.round(replay.ticks * BOT_STEP * 1000) + (replay.penalty ? 680 : 190);
    replay.distance = distance(replay.settled, hole.cup);
    replay.strokes = strokes;
    durationMs += replay.durationMs;
    shots.push(replay);
  }
  const plan = { shots, strokes, durationMs, finished: physics.sunk };
  cachePlan(key,plan);
  return plan;
}

let worker;
const requested = new Set();

function presentationPlan(member,hole,index) {
  const key = planKey(member,hole,index);
  const cached = cachedPlans.get(key);
  if (cached) return cached;
  if (worker === false || typeof Worker !== 'function') return planRoomBotHole(member,hole,index);
  if (!worker) {
    try {
      worker = new Worker(new URL('./room-bot-worker.js',import.meta.url), { type:'module' });
      worker.onmessage = ({data}) => {
        requested.delete(data.key);
        if (data.plan) cachePlan(data.key,data.plan);
        else { worker?.terminate(); worker = false; requested.clear(); }
      };
      worker.onerror = () => { worker?.terminate(); worker = false; requested.clear(); };
    } catch {
      worker = false;
      return planRoomBotHole(member,hole,index);
    }
  }
  if (!requested.has(key) && requested.size < 14) {
    requested.add(key);
    worker.postMessage({ key, member:{id:member.id,botSkill:member.botSkill,botSeed:member.botSeed,equipment:member.equipment},
      mode:hole.mode,course:hole.courseIndex,index });
  }
  return null;
}

function motionBall(shot, ticks) {
  const index = Math.floor(ticks / FRAME_TICKS);
  const a = shot.frames[index] || shot.ball, b = shot.frames[index+1] || shot.ball;
  const fraction = clamp((ticks - index * FRAME_TICKS) / Math.min(FRAME_TICKS, Math.max(1, shot.ticks - index * FRAME_TICKS)),0,1);
  return Object.fromEntries(Object.keys(a).map(axis => [axis, a[axis] + (b[axis]-a[axis])*fraction]));
}

export function roomBotPresentation(member, ui, time) {
  const room = ui.cloud.room?.state, hole = ui.game.hole;
  if (!room || !hole || !Number.isFinite(room.holeStartAt ?? room.botHoleStartedAt)) return null;
  const key = String(room.hole);
  if (ui.game.index !== room.hole) return { hole:key };
  const current = room.members?.find(golfer => golfer.id === member.id) ?? member;
  const plan = presentationPlan(current,hole,room.hole), at = Math.round(time);
  if (!plan) {
    const ball = { ...hole.start, y:(hole.start.y ?? ui.world.renderGround(hole.start.x,hole.start.z)) + (hole.mode === 'golf' ? .022 : .24), vx:0, vy:0, vz:0 };
    const dx = hole.cup.x-ball.x, dz = hole.cup.z-ball.z, length = Math.hypot(dx,dz) || 1;
    return {v:1,seq:at,at,hole:key,ball,anchor:ball,dx:dx/length,dz:dz/length,club:hole.mode === 'golf' ? 'driver' : 'putter',
      active:false,sunk:false,strokes:0,equipment:member.equipment};
  }
  const ordered = room.rule === 'turn' || room.rule === 'distance';
  let index = ordered ? (current.botShotsPlayed ?? 0) : 0;
  let started = ordered ? current.botShotStartedAt : (room.holeStartAt ?? room.botHoleStartedAt)+(member.delay ?? 0)*1000;
  if (!ordered) while (index < plan.shots.length && time-started >= plan.shots[index].durationMs) started += plan.shots[index++].durationMs;
  const shot = plan.shots[index] ?? plan.shots.at(-1);
  const settled = index >= plan.shots.length;
  if (!shot) return null;
  const elapsed = settled ? shot.durationMs : Number.isFinite(started) ? Math.max(0,time-started) : 0;
  const moving = elapsed >= shot.waitMs && elapsed < shot.waitMs + shot.ticks * BOT_STEP * 1000 && !settled;
  const struck = elapsed >= shot.waitMs;
  const ball = moving ? motionBall(shot,(elapsed-shot.waitMs)/1000/BOT_STEP) : struck ? shot.settled : shot.origin;
  const swingAt = Number.isFinite(started) ? Math.round(started + shot.waitMs - (shot.club === 'putter' ? 360 : 560)) : null;
  const previous = plan.shots[index-1]?.strokes ?? 0;
  return { v:1, seq:at, at, hole:key, ball, anchor:shot.origin, dx:shot.dx, dz:shot.dz, club:shot.club, active:moving,
    sunk:shot.sunk && struck && !moving, strokes:settled || struck && !moving ? shot.strokes : previous + (moving ? 1 : 0),
    equipment:member.equipment, swing:Number.isFinite(swingAt) && !settled && time>=swingAt ? { id:swingAt,at:swingAt } : null };
}
