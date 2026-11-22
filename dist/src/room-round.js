import { getHole } from './courses.js';
import { getGolfHole } from './golf-courses.js';
import { icon } from './icons.js';
import { currentRoomRound } from './live-state.js';
import { formatRoomTime, hasRoomTime, roomNow } from './room-rules.js';
import { SpectatorCamera } from './spectator-camera.js';
import { button, esc } from './views.js';

const recorded = score => Number.isInteger(score) && score >= 1;
const liveCount = score => Number.isInteger(score) && score >= 0 && score <= 999;

export function roomScoreRows(members, holeCount, hole, golfer, localStrokes, savedStrokes, peerState) {
  return members.map(member => {
    const own = member.id === golfer;
    const peer = own ? null : peerState(member.id);
    const inProgress = own ? localStrokes : peer?.hole === String(hole) ? peer.strokes : null;
    const scores = Array.from({ length: holeCount }, (_, index) => {
      const official = member.scores?.[index];
      if (recorded(official)) return { score: official, saved: true };
      if (index !== hole) return { score: null, saved: false };
      if (own && recorded(savedStrokes)) return { score: savedStrokes, saved: true };
      return { score: liveCount(inProgress) ? inProgress : null, saved: false };
    });
    const saved = scores.filter(cell => cell.saved);
    return { id: member.id, scores, total: saved.length ? saved.reduce((sum, cell) => sum + cell.score, 0) : null };
  });
}

export function roomSpectatorTargets(room, golfer, hole) {
  if (room.state.phase !== 'playing' || room.state.hole !== hole) return [];
  return room.state.members.filter(member => member.id !== golfer &&
    !(member.nextHole > hole || recorded(member.scores?.[hole])));
}

function sheetMarkup(members, pars, ownId, speed) {
  return `<caption class="room-sr-only">Hole by hole, with totals for completed holes</caption>
    <thead><tr><th scope="col" class="scorecard-golfer">Golfer</th>${pars.map((_, i) => `<th scope="col" data-hole-column="${i}">${i+1}</th>`).join('')}<th scope="col" class="scorecard-total">${speed ? "Time" : "Total"}</th></tr></thead>
    <tbody>${speed ? "" : `<tr class="scorecard-par"><th scope="row" class="scorecard-golfer">Par</th>${pars.map((par, i) => `<td data-hole-column="${i}">${par}</td>`).join('')}<td class="scorecard-total">${pars.reduce((sum, par) => sum + par, 0)}</td></tr>`}
    ${members.map(member => `<tr class="scorecard-player${member.id === ownId ? ' is-you' : ''}"><th scope="row" class="scorecard-golfer"><span title="${esc(member.name)}">${esc(member.name)}</span>${member.id === ownId ? '<small>YOU</small>' : ''}</th>${pars.map((_, i) => `<td data-hole-column="${i}"><span class="scorecard-ink">—</span></td>`).join('')}<td class="scorecard-total">—</td></tr>`).join('')}</tbody>`;
}

const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };

export function installRoomRound(ui) {
  const game = ui.game, world = ui.world;
  const peer = id => ui.liveRound.peer(id);
  const camera = new SpectatorCamera(world, peer);
  world.spectatorCamera = camera;
  camera.bind(world.canvas, () => game.state !== 'complete' || ui.root.inert || document.hidden);

  const overlay = document.createElement('div');
  overlay.className = 'room-round-overlay';
  overlay.innerHTML = `<details class="room-scorecard">
    <summary>${icon('flag')}<strong>Scorecard</strong><span class="scorecard-hole"></span>${icon('chevron')}</summary>
    <div class="room-score-scroll" tabindex="0" role="region" aria-label="Scroll all hole scores"><table class="room-score-grid"></table></div>
    <footer><span class="scorecard-ready"></span><span class="scorecard-deadline"></span></footer>
  </details>
  <section class="room-spectator" aria-label="Spectator camera" hidden>
    <div class="room-watch-heading"><div><strong>Spectating</strong><span class="room-watch-result"></span></div>
      <button type="button" class="room-watch-leave" aria-label="Leave round">Leave</button>
    </div>
    <div class="room-watch-controls" role="group" aria-label="Spectator controls">
      <button type="button" class="room-watch-free" aria-pressed="true">${icon('camera')} Free camera</button>
      <select aria-label="Follow a golfer"><option value="">Follow a golfer</option></select>
      <div class="room-watch-zoom" role="group" aria-label="Spectator zoom"><button type="button" aria-label="Zoom out">−</button><button type="button" aria-label="Zoom in">+</button></div>
    </div>
    <p class="room-watch-status" role="status"></p>
    <p class="room-watch-help"><span class="room-watch-mouse"></span><span class="room-watch-touch"></span></p>
  </section>`;
  const find = selector => overlay.querySelector(selector);
  const card = find('.room-scorecard'), scroll = find('.room-score-scroll'), table = find('table');
  const watch = find('.room-spectator'), free = find('.room-watch-free'), follow = find('select');
  const scoreHole = find('.scorecard-hole'), ready = find('.scorecard-ready'), deadline = find('.scorecard-deadline');
  const title = find('summary strong');
  const resultLine = find('.room-watch-result'), watchStatus = find('.room-watch-status');
  const mouseHelp = find('.room-watch-mouse'), touchHelp = find('.room-watch-touch');
  let currentRound, rosterKey, activeHole = -1, selectedKey = '', entry, pars, entries;

  function revealHole() {
    if (!card.open || scroll.clientWidth >= scroll.scrollWidth) return;
    const cell = table.querySelector(`thead [data-hole-column="${activeHole}"]`);
    if (!cell) return;
    const region = scroll.getBoundingClientRect(), rect = cell.getBoundingClientRect();
    const nameWidth = table.querySelector('thead .scorecard-golfer').offsetWidth;
    const totalWidth = table.querySelector('thead .scorecard-total').offsetWidth;
    const left = region.left + nameWidth, right = region.right - totalWidth;
    if (rect.left < left || rect.right > right)
      scroll.scrollLeft += rect.left - left;
  }

  function selectTarget(id) {
    camera.follow(id);
    sync();
  }
  overlay.addEventListener('pointerdown', () => game.clearInput());
  overlay.addEventListener('focusin', () => game.clearInput());
  card.addEventListener('toggle', revealHole);
  free.addEventListener('click', () => selectTarget(null));
  follow.addEventListener('change', () => selectTarget(follow.value || null));
  find('[aria-label="Zoom out"]').addEventListener('click', () => camera.zoomBy(1.18));
  find('[aria-label="Zoom in"]').addEventListener('click', () => camera.zoomBy(1 / 1.18));
  find('.room-watch-leave').addEventListener('click', () => {
    camera.clearInput();
    ui.modal(`<h2>Leave this round?</h2><p>Scores already recorded are saved.</p><div class="modal-actions">${button('Keep watching', 'close-modal', '', 'button secondary')}${button('Leave round', 'round-exit', '', 'button yellow')}</div>`);
  });

  function updateSheet(room, golfer) {
    const { members, deadline: end, phase, holeStartAt } = room.state;
    const speed = room.state.rule === 'speed';
    text(title, speed ? 'Race times' : 'Scorecard');
    card.classList.toggle('is-speed-card', speed);
    const hole = game.index;
    const key = JSON.stringify(members.map(({ id, name }) => [id, name]));
    const newRound = game.round !== currentRound;
    if (newRound) {
      currentRound = game.round;
      const get = game.mode === 'golf' ? getGolfHole : getHole;
      pars = Array.from({ length: game.round.holeCount }, (_, i) => get(game.round.courseIndex, i, false).par);
      card.open = matchMedia('(min-width: 1001px) and (min-height: 560px)').matches;
      scroll.scrollTop = scroll.scrollLeft = 0;
    }
    if (newRound || key !== rosterKey) {
      rosterKey = key;
      table.innerHTML = sheetMarkup(members, pars, golfer, speed);
      entries = [...table.querySelectorAll('.scorecard-player')].map(row => ({
        row, ink: [...row.querySelectorAll('.scorecard-ink')], total: row.querySelector('.scorecard-total'),
      }));
      activeHole = -1;
    }
    if (activeHole !== hole) {
      activeHole = hole;
      for (const el of table.querySelectorAll('[data-hole-column]')) {
        const current = Number(el.dataset.holeColumn) === hole;
        el.classList.toggle('is-current', current);
        if (el.scope === 'col') {
          if (current) el.setAttribute('aria-current', 'step');
          else el.removeAttribute('aria-current');
        }
      }
      revealHole();
    }
    text(scoreHole, `Hole ${hole+1} / ${pars.length}`);
    const finished = members.filter(member => member.nextHole > hole || recorded(member.scores?.[hole]) || (member.id === golfer && entry)).length;
    text(ready, `${finished} / ${members.length} finished`);
    const seconds = Math.max(0, Math.ceil((end - Date.now() - (ui.cloud.serverOffset || 0)) / 1000));
    text(deadline, phase === 'playing' && end > 0 && Number.isFinite(seconds)
      ? `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} left` : '');
    if (speed) {
      const clock = overlay.parentElement?.querySelector('#room-race-time');
      const saved = members.find(member => member.id === golfer)?.times?.[hole];
      const milliseconds = Number.isFinite(holeStartAt) ? Math.max(0, roomNow(ui.cloud) - holeStartAt) : 0;
      const elapsed = saved ?? entry?.raceTime ?? (game.state === 'playing' ? Math.floor(milliseconds / 100) / 10 : null);
      if (clock) text(clock, formatRoomTime(elapsed));
    }
    if (!card.open) return;
    if (speed) {
      members.forEach((member, index) => {
        const { row, ink, total } = entries[index];
        row.classList.toggle('is-followed', member.id === camera.targetId);
        const official = member.times?.filter(hasRoomTime) || [];
        text(total, official.length ? formatRoomTime(official.reduce((sum, elapsed) => sum + elapsed, 0)) : '—');
        ink.forEach((cell, holeIndex) => {
          const saved = member.times?.[holeIndex];
          const time = saved ?? (member.id === golfer && holeIndex === hole ? entry?.raceTime : null);
          text(cell, hasRoomTime(time) ? formatRoomTime(time) : (member.nextHole > holeIndex ? 'DNF' : '—'));
        });
      });
      return;
    }
    const rows = roomScoreRows(members, pars.length, hole, golfer, game.strokes, entry?.strokes, id => peer(id)?.sample);
    for (const [i, { id, scores, total }] of rows.entries()) {
      const { row, ink, total: sum } = entries[i];
      row.classList.toggle('is-followed', id === camera.targetId);
      text(sum, total === null ? '—' : String(total));
      for (const [h, { score, saved }] of scores.entries()) {
        const cell = ink[h];
        text(cell, score === null ? '—' : String(score));
        cell.classList.toggle('is-live', score !== null && !saved);
        cell.classList.toggle('is-under', saved && score < pars[h]);
        cell.classList.toggle('is-over', saved && score > pars[h]);
        if (score !== null && !saved) {
          if (!cell.title) cell.title = 'In progress';
        } else if (cell.title) cell.removeAttribute('title');
      }
    }
  }

  function updateSpectator(room, golfer) {
    const available = roomSpectatorTargets(room, golfer, entry.index);
    const key = JSON.stringify(available.map(({ id, name }) => [id, name]));
    if (key !== selectedKey) {
      selectedKey = key;
      follow.replaceChildren(new Option('Follow a golfer', ''), ...available.map(member => new Option(member.name, member.id)));
    }
    const chosen = available.find(member => member.id === camera.targetId);
    if (camera.targetId && !chosen) camera.follow(null);
    const selected = camera.targetId || '';
    if (follow.value !== selected) follow.value = selected;
    follow.disabled = available.length === 0;
    if (free.getAttribute('aria-pressed') !== String(!chosen)) free.setAttribute('aria-pressed', String(!chosen));
    const r = entry.reward, bonus = [r?.coins ? `+${r.coins} coins` : '', r?.xp ? `+${r.xp} XP` : ''].filter(Boolean);
    text(resultLine, [`Hole ${entry.index+1} complete`, room.state.rule === 'speed' ? formatRoomTime(entry.raceTime ?? room.state.members.find(m => m.id === golfer)?.times?.[entry.index]) : recorded(entry.strokes) ? `${entry.strokes} stroke${entry.strokes === 1 ? '' : 's'}` : '', ...bonus].filter(Boolean).join(' · '));
    text(watchStatus, chosen ? (peer(chosen.id)?.viewTarget ? `Following ${chosen.name}` : `Waiting for ${chosen.name}'s live view…`)
      : available.length ? 'Free view · Choose a golfer to follow' : 'Waiting for the next hole or round results');
    text(mouseHelp, chosen ? 'Drag to orbit · Scroll to zoom' : 'Drag to orbit · WASD or arrow keys to move · Scroll to zoom');
    text(touchHelp, chosen ? 'Drag to orbit · + / − to zoom' : 'Drag to move · + / − to zoom');
  }

  function sync() {
    const room = currentRoomRound(ui);
    if (entry && (!room || room.state.phase !== 'playing' || room.state.hole !== entry.index ||
        entry.round !== game.round || entry.index !== game.index || game.state !== 'complete')) {
      entry = null;
      camera.stop();
    }
    watch.hidden = !entry;
    overlay.parentElement?.classList.toggle('is-spectating', !!entry);
    overlay.hidden = !room || game.state === 'finished';
    if (!room) {
      currentRound = null;
      return;
    }
    const golfer = ui.cloud.session.user.id;
    if (entry) updateSpectator(room, golfer);
    if (!overlay.hidden) updateSheet(room, golfer);
  }

  const render = ui.render.bind(ui), tick = ui.tick.bind(ui);
  ui.render = () => {
    const focus = overlay.contains(document.activeElement) ? document.activeElement : null;
    const scrollPosition = [scroll.scrollLeft, scroll.scrollTop];
    render();
    const hud = ui.root.querySelector('.play-hud.is-room-round');
    if (hud) {
      hud.prepend(overlay);
      scroll.scrollLeft = scrollPosition[0];
      scroll.scrollTop = scrollPosition[1];
    }
    sync();
    if (!overlay.hidden && focus?.isConnected && !focus.closest('[hidden]')) focus.focus({ preventScroll: true });
  };
  ui.tick = () => { tick(); sync(); };
  ui.roomRound = {
    begin(strokes, reward, raceTime) {
      const room = currentRoomRound(ui);
      if (!room || room.state.phase !== 'playing' || room.state.hole !== game.index || game.state !== 'complete') return;
      if (!entry) camera.start(game.hole, game.physics.ball);
      entry = { index: game.index, round: game.round, strokes, reward, raceTime };
      ui.closeModal();
      sync();
      world.canvas.focus({ preventScroll: true });
    },
    sync,
  };
}
