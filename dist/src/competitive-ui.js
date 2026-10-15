import { nameplate } from "./nameplates.js";
import { page, button, esc } from "./views.js";
import { icon } from "./icons.js";
import { ITEMS } from "./catalog.js";
import { GOLF_COURSES, golfHoleCount } from "./golf-courses.js";
import { RANKS, rankFor, COMPETITIVE_LEVEL, suddenHole } from "./competitive-rules.js";

const active = (m) => m && m.phase !== "finished";
const sum = (rows) => (rows || []).reduce((n, h) => n + h.strokes, 0);
export function matchCard(ui) {
  const m = ui.ranked?.match;
  if (!m) return "";
  const me = ui.cloud.session?.user.id,
    isA = m.a_id === me,
    own = isA ? m.a_scores : m.b_scores,
    other = isA ? m.b_scores : m.a_scores,
    opponent = isA ? m.b_name : m.a_name,
    count = golfHoleCount(m.course);
  return `<section class="panel ranked-match"><div class="eyebrow">${esc(GOLF_COURSES[m.course].name)} · ${m.phase === "sudden" ? "CLOSEST TO THE PIN" : `${count}-HOLE MATCH`}</div><div class="ranked-versus"><div>${nameplate(ui.progress.data.name,isA?m.a_plate:m.b_plate)}<b>${sum(own) || "-"}</b><small>${own?.length || 0} / ${count} holes</small></div><span>vs</span><div>${nameplate(opponent,isA?m.b_plate:m.a_plate)}<b>${sum(other) || "-"}</b><small>${other?.length || 0} / ${count} holes</small></div></div>${m.phase === "sudden" ? "<p>One shot each. The ball that finishes closer to the cup wins. An exact tie starts another single-shot decider.</p>" : ""}</section>`;
}
function rankedPage(ui) {
  const s = ui.ranked || {},
    r = s.rating || { elo: 1000, wins: 0, losses: 0 },
    unlocked = ui.progress.level.level >= COMPETITIVE_LEVEL,
    m = s.match;
  const rank=rankFor(r.elo), index=RANKS.indexOf(rank), next=RANKS[index+1];
  const progress=next?Math.max(0,Math.min(100,(r.elo-rank.min)/(next.min-rank.min)*100)):100;
  const queue=!ui.cloud.session?button('Sign in to compete','account','','button yellow wide'):!unlocked?`<p class="ranked-lock">${icon('lock')} Unlocks at level 15 · You’re level ${ui.progress.level.level}</p>${button('Play a casual round','courses','','button secondary wide')}`:active(m)?button('Return to match','ranked-resume','','button yellow wide'):s.queued?`<div class="ranked-search" role="status"><span></span>Finding an opponent…</div><p class="small-note">${r.elo<1300?"Silver and below: a bot joins after one minute if no player is available.":"Gold and above: human opponents only."}</p>${button('Cancel search','ranked-cancel','','button secondary wide')}`:button('Find a match','ranked-queue','','button yellow wide');
  return `<main class="competitive-page"><header class="competitive-header">${button('← Main menu','home','','button secondary')}<div><span>POLYGOLF</span><strong>Competitive</strong></div>${button(icon('sliders'),'settings','aria-label="Settings"','button secondary')}</header><div class="competitive-content"><section class="ranked-stage"><div class="ranked-identity"><span class="eyebrow">1 VS 1 · RANKED GOLF</span><h1>Ranked golf.</h1><p>Three holes. Lowest score wins.</p><div class="ranked-rules"><span>${icon('flag')}3-hole rounds</span><span>${icon('clock')}18-minute limit</span><span>${icon('trophy')}Closest-to-pin tiebreak</span></div>${matchCard(ui)}<div class="ranked-course-strip">${GOLF_COURSES.map((c,i)=>`<div><img data-course-preview="golf:${i}" src="${ui.world.thumbnail(i,'golf')}" alt="${esc(c.name)}"><span>${esc(c.name)}</span></div>`).join('')}</div><p class="ranked-fairplay">The server checks every score. Leaving an active match counts as a loss.</p></div><aside class="ranked-queue-card" style="--rank-color:${rank.color}"><div class="rank-emblem">${icon('trophy')}</div><span class="eyebrow">${r.matches?'YOUR RANK':'STARTING RANK'}</span><h2>${rank.name}</h2><div class="ranked-elo">${r.elo}<small>ELO</small></div><div class="rank-progress"><i style="width:${progress}%"></i></div><p class="rank-next">${next?Math.max(0,next.min-r.elo)+' Elo to '+next.name:'Highest rank reached'}</p><div class="ranked-record"><div><strong>${r.wins}</strong><span>Wins</span></div><div><strong>${r.losses}</strong><span>Losses</span></div></div>${queue}<small>Live matchmaking · Level 15+</small></aside></section><section class="competitive-ladder"><h2>The ranks</h2><div>${RANKS.map((tier,i)=>`<article class="${tier.name===rank.name?'is-current':''}" style="--rank-color:${tier.color}"><span class="rank-number">${i===6?'★':String(i+1).padStart(2,'0')}</span><strong>${tier.name}</strong><small>${tier.min}+ Elo</small>${tier.name===rank.name?'<span class="rank-you">YOU</span>':''}</article>`).join('')}</div><p>Win to climb. Earn a nameplate for every rank you reach.</p></section></div></main>`;
}
export function installCompetitive(ui) {
  const render = ui.render.bind(ui),
    action = ui.action.bind(ui),
    pause = ui.pause.bind(ui),
    courseComplete = ui.courseComplete.bind(ui),
    holeComplete = ui.holeComplete.bind(ui);
  let chain = Promise.resolve(),
    busy = false,
    nextPoll = 0,
    failures = 0,
    sessionId = null,
    seenFinished = null,
    queued = false;
  ui.ranked = null;
  const updateBadge = () => {
    document.querySelector("#ranked-live")?.remove();
    const m = ui.ranked?.match;
    if (!active(m) || ui.game.state === "menu") return;
    const isA = m.a_id === ui.cloud.session?.user.id,
      badge = document.createElement("div");
    badge.id = "ranked-live";
    badge.className = "ranked-live";
    badge.innerHTML = nameplate(isA?m.b_name:m.a_name,isA?m.b_plate:m.a_plate,{compact:true}) + '<small>' + (m.phase === 'sudden' ? 'Sudden death' : 'Competitive') + ' · ' + (isA?m.b_holes:m.a_holes) + '/' + golfHoleCount(m.course) + ' holes · ' + Math.max(0,Math.ceil((Date.parse(m.deadline)-Date.now())/60000)) + 'm left</small>';
    ui.root.append(badge);
  };
  ui.render = () => {
    if (ui.game.state === "menu" && ui.screen === "competitive") ui.root.innerHTML = rankedPage(ui);
    else render();
    updateBadge();
  };
  const waiting = () => {
    ui.modal(
      `<h2>${ui.game.round?.sudden ? "Shot recorded." : "Round complete."}</h2><p>Waiting for your opponent. Keep this page open to stay in the match.</p>${matchCard(ui)}${button("Watch opponent", "ranked-watch", "", "button secondary")}${button("Forfeit match", "ranked-forfeit", "", "text-button")}`,
      { close: false },
    );
  };
  const launch = () => {
    const m = ui.ranked?.match;
    if (!active(m)) return;
    const r = m.round;
    if (m.phase === "playing" && r.finished) {
      ui.game.state = "finished";
      waiting();
      return;
    }
    const sudden = m.phase === "sudden",
      ownDistance = m.a_id === ui.cloud.session.user.id ? m.a_distance : m.b_distance;
    if (sudden && ownDistance !== null) {
      ui.game.state = "finished";
      waiting();
      return;
    }
    const same =
      ui.game.round?.competitiveId === m.id &&
      !!ui.game.round.sudden === sudden &&
      (!sudden || ui.game.round.suddenRound === m.sudden_round);
    if (same && ui.game.state !== "menu") return;
    ui.pendingResult = null;
    ui.closeModal();
    ui.audio.start();
    ui.mode = "golf";
    ui.world.equip(r.equipment, ITEMS);
    ui.game.start(m.course, false, {
      mode: "golf",
      ...(sudden ? { customHole: suddenHole() } : {}),
      round: {
        cloudId: r.id,
        competitiveId: m.id,
        sudden,
        practice: false,
        suddenRound: m.sudden_round,
        strokes: sudden ? [] : r.holes.map((h) => h.strokes),
      },
    });
    if (!sudden && r.next_hole > 0) ui.game.loadHole(r.next_hole);
    ui.toast(
      sudden
        ? "Sudden death · one shot, closest to the pin wins."
        : "Match found · " + (m.a_id === ui.cloud.session.user.id ? m.b_name : m.a_name),
    );
  };
  const accept = (s) => {
    ui.ranked = s;
    queued = s.queued;
    const m = s.match;
    if (active(m)) {
      queued = false;
      if (!ui.pendingResult && !ui.game.holeReveal) launch();
    } else if (m?.phase === "finished" && seenFinished !== m.id && ui.game.round?.competitiveId === m.id) {
      seenFinished = m.id;
      ui.pendingResult = null;
      ui.game.holeReveal = null;
      ui.game.pendingSwing = null;
      ui.game.state = "finished";
      ui.game.physics.active = false;
      const me = ui.cloud.session.user.id,
        delta = m.a_id === me ? m.a_delta : m.b_delta;
      ui.modal(
        `<div class="result"><span class="eyebrow">${rankFor(s.rating.elo).name} · ${s.rating.elo} ELO</span><h2>${m.winner === me ? "Match won." : m.winner || (m.bot && m.reason !== 'abandoned') ? "Match lost." : "Match ended."}</h2><p>${delta > 0 ? "+" : ""}${delta} Elo${m.reason === "forfeit" ? " · Forfeit" : m.reason === "disconnect" ? " · Opponent disconnected" : m.reason === "closest" ? " · Closest to the pin" : m.reason === "time" ? " · Time limit" : m.reason === "abandoned" ? " · No rating change" : ""}</p>${matchCard(ui)}${button("Back to competitive", "ranked-done", "", "button yellow")}</div>`,
        { close: false },
      );
    }
    if (ui.game.state === "menu" && ui.screen === "competitive") ui.render();
    else updateBadge();
  };
  const runRequest = async (name, payload = {}) => {
    busy = true;
    try {
      const s = await ui.cloud.call(name, payload);
      failures = 0;
      nextPoll = Date.now() + (s.queued ? 10000 : 5000);
      accept(s);
      return s;
    } catch (e) {
      failures++;
      nextPoll = Date.now() + Math.min(30000, 5000 * 2 ** failures);
      throw e;
    } finally {
      busy = false;
    }
  };
  const request = (name, payload = {}) => {
    const task = chain.then(() => runRequest(name, payload));
    chain = task.catch(() => {});
    return task;
  };
  ui.holeComplete = async (result) => {
    if (!result.round.sudden) return holeComplete(result);
    ui.pendingResult = result;
    ui.modal("<h2>Measuring your shot…</h2>", { close: false });
    try {
      await request("ranked_shot", {
        matchId: result.round.competitiveId,
        suddenRound: result.round.suddenRound,
        transcript: result.transcript,
        endTick: result.endTick,
      });
      ui.pendingResult = null;
      if (active(ui.ranked?.match)) {
        if (ui.ranked.match.sudden_round === result.round.suddenRound) waiting();
        else launch();
      }
    } catch (e) {
      ui.modal(
        `<h2>Shot saved on this screen.</h2><p>${esc(e.message)}</p>${button("Retry submission", "retry-score", "", "button yellow")}`,
        { close: false },
      );
    }
  };
  ui.courseComplete = (round) => {
    if (!round.competitiveId) return courseComplete(round);
    waiting();
    nextPoll = 0;
  };
  ui.pause = (paused) => {
    if (!active(ui.ranked?.match)) return pause(paused);
    if (!paused) {
      ui.closeModal();
      return;
    }
    ui.modal(
      `<h2>A quick breather.</h2><p>The match clock keeps running.</p><div class="pause-menu">${button("Keep playing", "resume", "", "button yellow wide")}${button("Settings", "settings", "", "button secondary wide")}${!ui.game.round.sudden ? button("Pick up ball · Par + 6", "skip-hole", "", "button secondary wide") : ""}${button("Forfeit match", "ranked-forfeit", "", "text-button")}</div>`,
      { close: false },
    );
  };
  ui.action = async (name, data = {}) => {
    try {
      if(name==='ranked-watch'){ui.closeModal();return;}
      if (name === "competitive") {
        if (ui.cloud.room) throw Error("Leave your private room before entering competitive.");
        ui.navigate("competitive");
        if (ui.cloud.session) await request("ranked_status");
        return;
      }
      if (name === "ranked-queue") {
        if (ui.progress.level.level < 15) throw Error("Competitive unlocks at level 15.");
        await request("ranked_queue");
        return;
      }
      if (name === "ranked-cancel") {
        await request("ranked_leave");
        return;
      }
      if (name === "ranked-resume") {
        launch();
        return;
      }
      if (
        name === "ranked-forfeit" ||
        (active(ui.ranked?.match) && ["round-exit", "exit-confirm", "logout"].includes(name))
      ) {
        ui.modal(
          `<h2>Forfeit this match?</h2><p>Your opponent will win and you will lose Elo.</p><div class="modal-actions">${button("Keep playing", "ranked-return", "", "button yellow")}${button("Forfeit", "ranked-confirm-forfeit", "", "button secondary")}</div>`,
          { close: false },
        );
        return;
      }
      if (name === "ranked-return") {
        ui.closeModal();
        if (ui.game.state === "paused") {
          ui.game.state = "playing";
          ui.render();
        } else if (ui.game.state === "finished") waiting();
        return;
      }
      if (name === "ranked-confirm-forfeit") {
        await request("ranked_leave", { forfeit: true });
        return;
      }
      if (name === "ranked-done") {
        ui.closeModal();
        ui.game.leave();
        ui.world.equip(ui.progress.data.equipment, ITEMS);
        ui.screen = "competitive";
        ui.render();
        return;
      }
      if (
        (queued || active(ui.ranked?.match)) &&
        ["start", "practice", "replay", "create-room", "join-room", "editor", "community", "logout"].includes(
          name,
        )
      )
        throw Error("Finish your competitive match or cancel matchmaking first.");
      await action(name, data);
    } catch (e) {
      ui.toast(e.message);
    }
  };
  setInterval(() => {
    const id = ui.cloud.session?.user?.id;
    if (!id) {
      sessionId = null;
      ui.ranked = null;
      queued = false;
      return;
    }
    if (sessionId !== id) {
      sessionId = id;
      nextPoll = 0;
      ui.ranked = null;
    }
    if (busy || Date.now() < nextPoll || (ui.ranked && !queued && !active(ui.ranked.match))) return;
    request(queued ? "ranked_queue" : "ranked_status").catch((e) => {
      if (failures === 1) ui.toast("Competitive connection interrupted. Reconnecting…");
    });
  }, 1000);
}
