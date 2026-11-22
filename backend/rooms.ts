import { courseAvailable, courseRotationKey } from './shared/rotating-courses.js';
import { levelInfo } from './shared/save.js';
import { GOLF_COURSES, getGolfHole, golfHoleCount, RULES_VERSION } from './shared/golf-courses.js';
import { COURSES, getHole } from './shared/courses.js';
import * as bots from './shared/bots.js';
import { replayRoomLie } from './shared/replay.js';

export const ROOM_ACTIONS = [
  'create_room', 'join_room', 'ready_room', 'replay_room', 'start_room', 'leave_room', 'room',
  'add_room_bot', 'fill_room_bots', 'remove_room_bot', 'loaded_room', 'room_shot',
];

const RULES = ['turn', 'free', 'distance', 'speed'];
const LOAD_LIMIT = 120_000;
const HOLE_LIMIT = 360_000;
const TURN_LIMIT = 90_000;
const isOrdered = (s:any) => s.rule === 'turn' || s.rule === 'distance';
const holeCount = (s:any) => s.holeCount ?? (s.mode === 'golf' ? golfHoleCount(s.course) : 9);
const courseHole = (s:any, index=s.hole) => (s.mode === 'golf' ? getGolfHole : getHole)(s.course, index);
const humans = (s:any) => s.members.filter((m:any) => !m.bot);
const eligible = (s:any, m:any) => (m.nextHole || 0) === s.hole;

function roomOptions(b:any, p:any) {
  const courseList = b.mode === 'golf' ? GOLF_COURSES : b.mode === 'mini' ? COURSES : [];
  if (!Number.isInteger(b.course) || !courseList[b.course]) throw Error('Unknown course.');
  if (b.rule !== undefined && !RULES.includes(b.rule)) throw Error('Choose a valid round format.');
  let course = b.course;
  if (b.rule && b.mode === 'golf' && course < 3 && b.holeCount > 3) {
    course = GOLF_COURSES.findIndex(c => c.layoutCourse === course && c.holeCount === 9);
  }
  const selected = courseList[course];
  if (!selected || selected.id === 'planetfall') throw Error('Choose a different course for multiplayer.');
  if (b.mode === 'golf' && !courseAvailable(course)) throw Error('This featured course has rotated. Choose the current course.');
  if (levelInfo(p.state.xp).level < selected.level) throw Error('Unlock this course before hosting it.');
  const full = b.mode === 'golf' ? golfHoleCount(course) : 9;
  const count = b.holeCount ?? full;
  if (!Number.isInteger(count) || count < 1 || count > full || (!b.rule && count !== full)) {
    throw Error(`Choose between 1 and ${full} holes on this course.`);
  }
  return { course, mode: b.mode, ...(b.rule ? { rule: b.rule, holeCount: count } : {}) };
}

function roomReply(r:any, s:any, revision:number, actor:string) {
  // Replays are needed by the actor on reconnect, not by this endpoint's other readers.
  const members = s.rule ? s.members.map((m:any) => {
    if (m.id === actor) return m;
    const { turnReplay, turnEndTick, roundEquipment, botPlan, ...visible } = m;
    return visible;
  }) : s.members;
  return { serverNow: Date.now(), room: { ...r, revision, state: { ...s, members } } };
}

function clearTurn(s:any) {
  s.turnId = null;
  s.turnDeadline = 0;
}

function prepareHole(s:any, now:number) {
  s.holeStartAt = null;
  s.holePreparedAt = now;
  s.loadDeadline = now + LOAD_LIMIT;
  s.deadline = 0;
  delete s.botHoleStartedAt;
  clearTurn(s);
  const h = courseHole(s);
  const distance = Math.hypot(h.start.x - h.cup.x, h.start.z - h.cup.z);
  for (const m of s.members) {
    m.loadedHole = m.bot ? s.hole : null;
    m.turnCommands = 0;
    m.distance = distance;
    delete m.turnReplay;
    delete m.turnEndTick;
    if (m.bot) {
      m.botShotsPlayed = 0;
      m.botShotStartedAt = null;
      m.times ??= [];
      delete m.botPlan;
    }
  }
}

function nextTurn(s:any, after:string|null, now:number) {
  if (!isOrdered(s)) return;
  const start = s.members.findIndex((m:any) => m.id === after) + 1;
  const order = s.members.slice(start).concat(s.members.slice(0, start)).filter((m:any) => eligible(s, m));
  // All golfers tee off in roster order. Once they have, play the farthest lie.
  const player = s.rule === 'distance'
    ? order.find((m:any) => !m.turnCommands) ?? order.reduce((far:any, m:any) => !far || m.distance > far.distance ? m : far, null)
    : order[0];
  if (!player) { clearTurn(s); return; }
  s.turnId = player.id;
  s.turnDeadline = now + TURN_LIMIT;
  if (player.bot) player.botShotStartedAt = now;
}

function archiveMember(s:any, id:string) {
  const member = s.members.find((m:any) => m.id === id);
  if (!member) return;
  if (s.rule && s.phase === 'playing') {
    const { name, nameplate, scores, times } = member;
    s.departed ??= [];
    s.departed.push({ id, name, nameplate, scores: scores || [], times: times || [], withdrawn: true });
  }
  const index = s.members.indexOf(member);
  const prior = s.members[(index + s.members.length - 1) % s.members.length]?.id || null;
  s.members.splice(index, 1);
  if (s.host === id) s.host = humans(s)[0]?.id || null;
  if (!humans(s).length) { s.members = []; s.phase = 'closed'; return; }
  if (s.turnId === id) nextTurn(s, prior, Date.now());
}

function normalizeTranscript(commands:any) {
  if (!Array.isArray(commands) || commands.length < 1 || commands.length > 40) throw Error('Invalid replay.');
  return commands.map(c => {
    if (!c || typeof c !== 'object') throw Error('Invalid replay command.');
    const { kind, tick, dx, dz, power, club, shape, spin } = c;
    return kind === 'shot' ? { kind, tick, dx, dz, power, club, shape, spin } : { kind, tick };
  });
}

function afterCommitted(member:any, commands:any[]) {
  const saved = member.turnReplay || [];
  if (commands.length < saved.length ||
      JSON.stringify(normalizeTranscriptPrefix(commands, saved.length)) !== JSON.stringify(normalizeTranscriptPrefix(saved, saved.length))) {
    throw Error('This shot does not match your saved turn. Rejoin to restore your ball.');
  }
  return commands.slice(saved.length);
}

const normalizeTranscriptPrefix = (commands:any[], length:number) => length ? normalizeTranscript(commands.slice(0, length)) : [];

export function verifyRoomSubmission(room:any, p:any, round:any, body:any, at:number, forceSkip=false) {
  const s = room?.state;
  const member = s?.members.find((m:any) => m.id === p.id && (!s.rule || m.roundId === round.id));
  if (!member || s.phase !== 'playing' || s.hole !== body.index) throw Error('This room is not playing that hole.');
  if (!s.rule) return { rule: undefined, raceTime: undefined };
  if (!forceSkip && (!Number.isFinite(s.holeStartAt) || at < s.holeStartAt)) throw Error('Wait for the room countdown.');
  const commands = normalizeTranscript(body.transcript);
  const skip = commands.at(-1).kind === 'skip';
  if (!forceSkip && !skip && at >= s.deadline) throw Error('Time expired on this hole.');
  if (!forceSkip && isOrdered(s)) {
    const remaining = afterCommitted(member, commands);
    const moves = skip ? remaining.slice(0, -1) : remaining;
    if (moves.length > 1 || (!skip && moves[0]?.kind !== 'shot') ||
        (moves.length > 0 && (s.turnId !== p.id || at >= s.turnDeadline)) || (skip && !remaining.length)) {
      throw Error('Wait for your turn before taking another shot.');
    }
  }
  return {
    rule: s.rule,
    raceTime: s.rule === 'speed' ? (skip ? null : Math.max(0, at - s.holeStartAt) / 1000) : undefined,
  };
}

function roundMember(m:any, row:any) {
  m.scores = row?.holes.map((h:any) => h.strokes) || [];
  m.times = row?.holes.map((h:any) => Number.isFinite(h.raceTime) ? h.raceTime : null) || [];
  m.nextHole = row?.next_hole || 0;
}

async function skipRoundMember(row:any, api:any) {
  if (!row) throw Error('Round not found.');
  const owner = await api.player(row.user_id);
  return api.submit(owner, { roundId: row.id, index: row.next_hole, transcript: [{kind:'skip',tick:0}], endTick: 0 }, true);
}

function prepareBot(s:any) {
  const waiting = s.members.filter((m:any) => m.bot && !m.botPlan && eligible(s, m));
  const bot = waiting.find((m:any) => m.id === s.turnId) || waiting[0];
  if (!bot) return;
  // Build one missing plan per request. Keep only the settled shot summaries in
  // room state so polling and cold Edge instances never need to replay every bot.
  const { durationMs, strokes, finished, shots } = bots.planRoomBotHole(bot, courseHole(s), s.hole);
  bot.botPlan = { durationMs, strokes, finished, shots: shots.map(({durationMs, distance}) => ({durationMs, distance})) };
}

async function progressRoom(s:any, now:number, api:any) {
  prepareBot(s);
  if (!Number.isFinite(s.holeStartAt)) {
    if (now >= s.loadDeadline) {
      for (const m of humans(s)) if (m.loadedHole !== s.hole) archiveMember(s, m.id);
      if (s.phase !== 'playing') return;
    }
    if (humans(s).every((m:any) => m.loadedHole === s.hole)) {
      s.holeStartAt = now + (s.hole === 0 ? 10_000 : 3000);
      s.botHoleStartedAt = s.holeStartAt;
      s.deadline = s.holeStartAt + HOLE_LIMIT * (isOrdered(s) ? s.members.length : 1);
      nextTurn(s, null, s.holeStartAt);
    }
    return;
  }
  if (now < s.holeStartAt) return;

  const ids = humans(s).map((m:any) => m.roundId).join(',');
  const rows = await api.table('rounds', 'id=in.(' + ids + ')&select=id,user_id,next_hole,holes');
  for (const m of humans(s)) {
    const row = rows.find((rr:any) => rr.id === m.roundId);
    roundMember(m, row);
    if (!eligible(s, m)) continue;
    const timingOut = now >= s.deadline || (s.turnId === m.id && s.turnDeadline && now >= s.turnDeadline);
    if (timingOut) {
      const result = await skipRoundMember(row, api);
      roundMember(m, { ...row, holes: [...row.holes, result.result], next_hole: s.hole + 1 });
    }
  }

  for (const m of s.members.filter((m:any) => m.botPlan && eligible(s, m))) {
    const plan = m.botPlan;
    const finish = () => {
      m.scores.push(plan.strokes);
      m.times.push(plan.finished ? (now >= s.deadline ? null : Math.max(0, now - s.holeStartAt) / 1000) : null);
      m.nextHole++;
    };
    if (isOrdered(s)) {
      if (s.turnId !== m.id || !Number.isFinite(m.botShotStartedAt)) continue;
      const shot = plan.shots[m.botShotsPlayed];
      if (shot && now < m.botShotStartedAt + shot.durationMs) continue;
      if (shot) {
        m.botShotsPlayed++;
        m.turnCommands++;
        m.distance = shot.distance;
      }
      m.botShotStartedAt = null;
      if (m.botShotsPlayed >= plan.shots.length) finish();
      nextTurn(s, m.id, now);
    } else {
      const duration = plan.durationMs + (m.delay || 0)*1000;
      if (now >= s.holeStartAt + duration || now >= s.deadline) {
        finish();
        m.times[s.hole] = plan.finished && duration <= HOLE_LIMIT ? duration / 1000 : null;
      }
    }
  }

  const turn = s.members.find((m:any) => m.id === s.turnId);
  if (isOrdered(s) && (!turn || !eligible(s, turn))) nextTurn(s, turn?.id || null, now);
  if (s.members.every((m:any) => m.nextHole > s.hole)) {
    s.hole++;
    if (s.hole >= holeCount(s)) {
      s.phase = 'finished';
      clearTurn(s);
    } else prepareHole(s, now);
  }
}

async function progressLegacyRoom(s:any, r:any, now:number, api:any) {
  const query = 'room_id=eq.' + r.id + '&select=id,user_id,next_hole,holes';
  let rounds = await api.table('rounds', query);
  if (now > s.deadline) {
    for (const rr of rounds.filter((row:any) => row.next_hole <= s.hole && s.members.some((m:any) => m.roundId === row.id))) {
      await skipRoundMember(rr, api);
    }
    rounds = await api.table('rounds', query);
  }
  for (const m of s.members) {
    if (m.bot) {
      if (m.nextHole === s.hole && now - s.botHoleStartedAt >= bots.botHoleDuration(m.plan[s.hole].strokes) + (m.delay || 0)*1000) {
        m.scores.push(m.plan[s.hole].strokes);
        m.nextHole++;
      }
    } else {
      const row = rounds.find((rr:any) => rr.id === m.roundId);
      m.scores = row?.holes.map((h:any) => h.strokes) || [];
      m.nextHole = row?.next_hole || 0;
    }
  }
  if (s.members.every((m:any) => m.nextHole > s.hole)) {
    s.hole++;
    s.botHoleStartedAt = now;
    s.deadline = now + HOLE_LIMIT;
    if (s.hole >= holeCount(s)) s.phase = 'finished';
  }
}

function turnShot(s:any, m:any, b:any, now:number) {
  if (!isOrdered(s) || s.phase !== 'playing' || b.hole !== s.hole || m.roundId !== b.roundId ||
      !Number.isFinite(s.holeStartAt) || now < s.holeStartAt || !eligible(s, m)) throw Error('This turn is no longer available.');
  const commands = normalizeTranscript(b.transcript);
  const extra = afterCommitted(m, commands);
  if (!extra.length) return; // Retry after the committed response was lost.
  if (s.turnId !== m.id || now >= s.turnDeadline || extra.length !== 1 || !['shot','reset'].includes(extra[0].kind)) {
    throw Error('Wait for your turn before taking another shot.');
  }
  if (!Number.isInteger(b.endTick) || b.endTick/120 > (now-s.holePreparedAt)/1000+3) throw Error('Replay time is ahead of the server.');
  const lie = replayRoomLie({ mode: s.mode, course: s.course, equipment: m.roundEquipment }, s.hole, commands, b.endTick);
  m.turnReplay = commands;
  m.turnCommands = commands.length;
  m.turnEndTick = b.endTick;
  m.distance = Math.round(lie.distance * 1000) / 1000;
  nextTurn(s, m.id, now);
}

function setupBot(s:any, skill:string, index:number) {
  if (s.rule) return bots.makeRoomBot(skill || 'weekend', index);
  const pars = Array.from({length: holeCount(s)}, (_, i) => courseHole(s, i).par);
  return bots.makeBot(pars, index);
}

function changeBots(s:any, p:any, b:any, action:string) {
  if (s.host !== p.id || s.phase !== 'waiting') throw Error('Only the host can change bots before the round starts.');
  if (action === 'remove_room_bot') {
    const i = s.members.findIndex((m:any) => m.bot && m.id === b.botId);
    if (i < 0) throw Error('Bot not found.');
    s.members.splice(i, 1);
    return;
  }
  if (s.members.length >= 8) throw Error('This room is full.');
  if (b.skill !== undefined && !Object.hasOwn(bots.ROOM_BOT_SKILLS, b.skill)) throw Error('Choose a valid bot skill.');
  const count = action === 'fill_room_bots' ? 8-s.members.length : 1;
  for (let i=0; i<count; i++) {
    if (s.rule) {
      let index = 0, bot = setupBot(s, b.skill, index);
      while (s.members.some((m:any) => m.name === bot.name) && index < 24) bot = setupBot(s, b.skill, ++index);
      s.members.push(bot);
    } else {
      const index = bots.BOT_NAMES.findIndex(name => !s.members.some((m:any) => m.name === name));
      s.members.push(setupBot(s, '', Math.max(0, index)));
    }
  }
}

export async function roomAction(action:string, p:any, b:any, api:any) {
  const { table, rpc, insert } = api;
  if (action === 'create_room') {
    const now = Date.now();
    const options = roomOptions(b,p);
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), v => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');
    const state = {
      ...options, host: p.id, phase: 'waiting', rulesVersion: RULES_VERSION,
      rotationKey: options.mode === 'golf' ? courseRotationKey(options.course) : '',
      hole: 0, members: [{ id: p.id, name: p.username, nameplate: p.state.equipment.nameplate, ready: true, seen: now }],
      deadline: 0,
    };
    return { serverNow: now, room:(await insert('rooms',{code,state}))[0] };
  }
  for (let attempt=0; attempt<4; attempt++) {
    const query = action === 'join_room'
      ? 'code=eq.' + encodeURIComponent(String(b.code).trim().toUpperCase())
      : 'id=eq.' + encodeURIComponent(b.roomId);
    const room = (await table('rooms',query))[0];
    if (!room) throw Error('Room not found. Check the six-character code.');
    const s = structuredClone(room.state), now = Date.now();
    let member = s.members.find((m:any) => m.id === p.id);
    if (action === 'join_room') {
      if (s.phase !== 'waiting') throw Error('This round has already started.');
      if (s.rule && b.roomProtocol !== 1 && !member) throw Error('Refresh PolyGolf to join this room.');
      if (!member) {
        if (s.members.length >= 8) {
          const bot = s.members.findIndex((m:any) => m.bot);
          if (bot < 0) throw Error('This room is full.');
          s.members.splice(bot,1);
        }
        member = { id: p.id, name: p.username, nameplate: p.state.equipment.nameplate, ready: false, seen: now };
        s.members.push(member);
      }
    }
    if (!member) throw Error('You are not a member of this room.');
    if (action !== 'leave_room' && s.rulesVersion !== RULES_VERSION) throw Error('This lobby uses an older course. Leave it and create a new room.');
    if (s.phase === 'starting') {
      if (action === 'room') return roomReply(room,s,room.revision,p.id);
      throw Error('The round is starting. Please wait.');
    }
    if (action !== 'room' || now-(member.seen || 0) >= 30_000) member.seen = now;
    member.nameplate = p.state.equipment.nameplate;
    if (action === 'leave_room') archiveMember(s,p.id);
    if (['add_room_bot','fill_room_bots','remove_room_bot'].includes(action)) changeBots(s,p,b,action);
    if (action === 'replay_room') {
      if (!['finished','waiting'].includes(s.phase)) throw Error('Finish the current match before playing again.');
      if (s.phase === 'finished') {
        s.phase = 'waiting';
        s.hole = 0;
        s.deadline = 0;
        delete s.botHoleStartedAt;
        delete s.holeStartAt;
        delete s.departed;
        s.members = s.members.map((m:any, i:number) => {
          if (!m.bot) return { id:m.id, name:m.name, nameplate:m.nameplate, seen:m.seen, ready:false };
          const bot = setupBot(s, m.botSkill, s.rule ? Math.max(0,i-1) : Math.max(0,bots.BOT_NAMES.indexOf(m.name)));
          return { ...bot, id:m.id, ...(s.rule ? { name:m.name, equipment:m.equipment } : {}) };
        });
        member = s.members.find((m:any) => m.id === p.id);
      }
      member.ready = true;
    }
    if (action === 'ready_room') {
      if (s.phase !== 'waiting') throw Error('The round has started.');
      member.ready = !member.ready;
    }
    if (action === 'start_room') {
      if (s.host !== p.id || s.phase !== 'waiting' || s.members.length < 2 || s.members.some((m:any) => !m.ready)) {
        throw Error('The host can start when at least two golfers are ready.');
      }
      if (s.mode === 'golf' && (!courseAvailable(s.course) || (s.rotationKey || '') !== courseRotationKey(s.course))) {
        throw Error('The featured course has rotated. Create a new room.');
      }
      s.phase = 'starting';
      let revision:number;
      try {
        revision = await rpc('room_cas',{p_id:room.id,p_revision:room.revision,p_state:s});
      } catch (error) {
        if (attempt < 3 && isConflict(error)) continue;
        throw error;
      }
      try {
        const roster = humans(s);
        const players = await table('players','id=in.('+roster.map((m:any)=>m.id).join(',')+')&select=id,equipment:state->equipment');
        if (players.length !== roster.length) throw Error('A golfer left before the round began.');
        const rounds = await insert('rounds', players.map((pl:any) => ({
          user_id:pl.id, room_id:room.id, mode:s.mode, course:s.course, equipment:pl.equipment ?? pl.state?.equipment,
          rules_version:RULES_VERSION, hole_count:holeCount(s), rotation_key:s.rotationKey || '',
        })));
        for (const m of roster) {
          const row = rounds.find((rr:any) => rr.user_id === m.id);
          if (!row) throw Error('Could not open a scorecard for every golfer.');
          m.roundId = row.id;
          if (s.rule) {
            const player = players.find((pl:any) => pl.id === m.id);
            m.roundEquipment = row.equipment ?? player.equipment ?? player.state?.equipment;
            m.nextHole = 0;
            m.scores = [];
            m.times = [];
          }
        }
        s.phase = 'playing';
        const started = Date.now();
        if (s.rule) prepareHole(s,started);
        else { s.botHoleStartedAt = started; s.deadline = started+HOLE_LIMIT; }
        const next = await rpc('room_cas',{p_id:room.id,p_revision:revision,p_state:s});
        return roomReply(room,s,next,p.id);
      } catch (error) {
        await rpc('room_cas',{p_id:room.id,p_revision:revision,p_state:room.state}).catch(()=>{});
        throw error;
      }
    }
    if (action === 'loaded_room') {
      if (!s.rule || s.phase !== 'playing' || b.hole !== s.hole || b.roundId !== member.roundId) {
        throw Error('That hole is no longer loading.');
      }
      member.loadedHole = s.hole;
    }
    if (action === 'room_shot') turnShot(s,member,b,now);

    try {
      if (s.phase === 'playing') {
        if (s.rule) await progressRoom(s,now,api);
        else await progressLegacyRoom(s,room,now,api);
      }
      if (s.host && !s.members.some((m:any) => m.id === s.host && now-m.seen < LOAD_LIMIT) && s.members.some((m:any) => m.id === p.id && !m.bot)) s.host = p.id;
      if (JSON.stringify(s) === JSON.stringify(room.state)) return roomReply(room,s,room.revision,p.id);
      const revision = await rpc('room_cas',{p_id:room.id,p_revision:room.revision,p_state:s});
      return roomReply(room,s,revision,p.id);
    } catch (error) {
      if (attempt === 3 || !isConflict(error)) throw error;
    }
  }
}

const isConflict = (error:any) => /room changed|state changed|already recorded|already finished/i.test(String(error?.message || error));
