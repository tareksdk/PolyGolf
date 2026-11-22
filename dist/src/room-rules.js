import { currentRoomRound } from './live-state.js';
import { esc } from './views.js';

export const orderedRoom = state => state?.rule === 'turn' || state?.rule === 'distance';
export const roomNow = cloud => Date.now() + (cloud.serverOffset || 0);
export const hasRoomTime = seconds => typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0;
export function formatRoomTime(seconds) {
  if (!hasRoomTime(seconds)) return '—';
  const millis = Math.round(seconds * 1000);
  return `${Math.floor(millis / 60000)}:${String(Math.floor(millis / 1000) % 60).padStart(2, '0')}.${String(millis % 1000).padStart(3, '0')}`;
}
export function speedRows(members, count) {
  return members.map(member => {
    const times = Array.from({ length: count }, (_, i) => member.times?.[i]);
    const completed = times.filter(hasRoomTime);
    return { member, times, completed: completed.length, total: completed.length ? completed.reduce((sum, time) => sum + time, 0) : null };
  }).sort((a, b) => b.completed - a.completed || (a.total ?? Infinity) - (b.total ?? Infinity));
}

export function speedResults(state) {
  const count = state.holeCount;
  const rows = speedRows(state.members, count);
  return `<div class="table-scroll"><table class="scorecard speed-results">
    <thead><tr><th scope="col">Golfer</th>${Array.from({ length: count }, (_, i) => `<th scope="col">${i + 1}</th>`).join('')}<th scope="col">Total time</th></tr></thead>
    <tbody>${rows.map(({ member, times, completed, total }) => `<tr><th scope="row">${esc(member.name)}</th>${times.map(t => `<td>${hasRoomTime(t) ? formatRoomTime(t) : 'DNF'}</td>`).join('')}<td>${completed === count ? formatRoomTime(total) : 'DNF'}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

export function installRoomRules(ui) {
  const game = ui.game, world = ui.world, cloud = ui.cloud;
  const hud = document.createElement('div');
  hud.className = 'room-rule-banner';
  hud.hidden = true;
  hud.setAttribute('role', 'status');
  hud.innerHTML = '<span></span><strong></strong>';
  const [label, number] = hud.children;
  document.body.append(hud);
  let request, retryAt = 0, ending, warning;

  const context = () => {
    const room = currentRoomRound(ui);
    const state = room?.state;
    if (!state?.rule || state.phase !== 'playing' || state.hole !== game.index) return null;
    const member = state.members.find(m => m.id === cloud.session.user.id);
    return member ? { room, state, member } : null;
  };
  const blocked = () => {
    if (!game.round?.roomRule) return false;
    const current = context();
    if (!current) return true;
    const { state, member } = current;
    const now = roomNow(cloud);
    if (!Number.isFinite(state.holeStartAt) || now < state.holeStartAt || (state.deadline && now >= state.deadline)) return true;
    return orderedRoom(state) && (state.turnId !== member.id || (state.turnDeadline && now >= state.turnDeadline) ||
      game.transcript.length !== (member.turnCommands || 0));
  };
  game.roomShotAllowed = () => !blocked();
  game.roomSkipAllowed = () => {
    if (!game.round?.roomRule) return true;
    const current = context();
    return Number.isFinite(current?.state.holeStartAt) && roomNow(cloud) >= current.state.holeStartAt;
  };

  function send(action, { room, member }, extra) {
    const index = game.index, round = game.round;
    request = cloud.call(action, { roomId: room.id, roundId: member.roundId, hole: index, ...extra })
      .then(reply => {
        if (cloud.room?.id !== room.id || game.round !== round) return;
        warning = null;
        if (reply.room) cloud.room = reply.room;
        ui.syncRoom(cloud.room);
      })
      .catch(error => {
        retryAt = performance.now() + Math.max(1800, error.retryAfterMs || 0);
        warning = { round, index, message: error.message };
        cloud.nextRoomPoll = 0;
      })
      .finally(() => { request = null; });
  }

  function update() {
    const current = context();
    if (!current) { hud.hidden = true; return; }
    const { state, member } = current;
    const now = roomNow(cloud);
    const start = state.holeStartAt;
    const notice = warning?.round === game.round && warning.index === game.index ? warning.message : '';
    let copy = '', count = '';
    if (!Number.isFinite(start)) {
      copy = member.loadedHole === game.index ? 'Waiting for golfers to load' : notice || 'Preparing the course';
      if (!request && performance.now() >= retryAt && member.loadedHole !== game.index &&
          world.renderedFrames >= 3 && !document.hidden) send('loaded_room', current);
    } else if (state.rule === 'speed' && start > now) {
      copy = 'Race begins in';
      count = String(Math.max(1, Math.ceil((start - now) / 1000)));
    } else if (state.rule === 'speed' && now - start < 680) {
      count = 'GO';
    } else if (game.state === 'playing' && (member.nextHole || 0) <= game.index) {
      if (orderedRoom(state)) {
        if (state.turnId !== member.id) {
          const turn = state.members.find(m => m.id === state.turnId);
          copy = turn ? `${turn.name} to play` : 'Waiting for the next golfer';
        } else if (game.transcript.length !== (member.turnCommands || 0) && !game.physics.active && !game.pendingSwing) {
          copy = notice || 'Syncing your lie…';
          if (game.transcript.length > (member.turnCommands || 0) && !request && performance.now() >= retryAt)
            send('room_shot', current, { transcript: game.transcript.slice(), endTick: game.ticks });
        } else if (!game.physics.active && !game.pendingSwing && !game.charging) copy = 'Your turn';
      }
    }
    hud.hidden = !(copy || count);
    hud.classList.toggle('is-countdown', !!count);
    if (label.textContent !== copy) label.textContent = copy;
    if (number.textContent !== count) {
      number.textContent = count;
      if (count && !matchMedia('(prefers-reduced-motion: reduce)').matches)
        number.animate([{ scale: '1.28', opacity: .5 }, { scale: '1', opacity: 1 }], { duration: 370, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  }

  const payload = result => ({ roundId: result.round.cloudId, index: result.index, transcript: result.transcript.slice(), endTick: result.endTick });
  game.onHoleSettled = result => {
    if (!['speed', 'turn', 'distance'].includes(result.round.roomRule) || !cloud.session || !result.round.cloudId) return;
    const pending = cloud.call('submit_hole', payload(result)).then(response => ({ response }), error => ({ error }));
    ending = { round: result.round, index: result.index, pending };
  };
  return {
    update,
    async submit(result) {
      if (ending?.round === result.round && ending.index === result.index) {
        const { pending } = ending;
        ending = null;
        const outcome = await pending;
        if (outcome.error) throw outcome.error;
        return outcome.response;
      }
      return cloud.call('submit_hole', payload(result));
    },
  };
}
