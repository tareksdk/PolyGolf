import { APP_VERSION } from './version.js';
import { redeemPreviewSupreme } from './supreme-ball.js';
import { flowDirectionGauge } from './shot-meter-ui.js';
import { LOCKERS } from "./pro-shop.js";
import { homeMenu } from "./home-menu.js";
import { nameplate } from "./nameplates.js";
import { clubPassView } from "./collection-ui.js";
import { clubYards } from "./club-distances.js";
import { GolfMapEditor } from "./golf-editor.js";
import { communityView, loadCommunity, communityAction } from "./community.js";
import { keepMiniSceneryClear } from "./course-detail.js";
import { installGolfPresentation } from "./golf-presentation.js";
import { installCoursePreviews } from "./course-previews.js";
import { installOcclusion } from "./occlusion.js";
import { GOLF_COURSES, courseRecordKey, getGolfHole, terrainAt, golfHoleCount } from "./golf-courses.js";
import { courseAvailable } from './rotating-courses.js';
import { COURSES, getHole, nearestPoint, surfaceAt, relative } from "./courses.js";
import { CLUBS } from "./golf-physics.js";
import { ITEMS, ITEM_BY_ID, DEFAULT_EQUIPMENT } from "./catalog.js";
import {
  PASS_TIERS,
  LEVEL_REWARDS,
  membership,
  tierClaimed,
  joinClub,
  claimTier,
  claimClubDaily,
  itemDescription,
  miniStats,
  driverYards,
  MEMBERSHIP_COST,
  MEMBER_DAILY,
  requireEditor,
} from "./equipment.js";
import { MapEditor } from "./editor.js";
import { GolfCloud } from "./cloud.js";
import { welcomeToClub } from './club-welcome.js';
import { usernameAction } from './username-ui.js';
import { header, page, button, coins, esc, minutes } from "./views.js";
import { holeDialog } from "./dialogs.js";
import { icon } from "./icons.js";

const list = (ui) => (ui.mode === "golf" ? GOLF_COURSES : COURSES);
const hole = (mode, c, i) => (mode === "golf" ? getGolfHole : getHole)(c, i);
const modeTabs = (ui) =>
  `<div class="mode-tabs" role="group" aria-label="Game mode">${button("Full golf", "mode", `data-id="golf" aria-pressed="${ui.mode === "golf"}"`, "mode-tab " + (ui.mode === "golf" ? "active" : ""))}${button("Mini-golf", "mode", `data-id="mini" aria-pressed="${ui.mode === "mini"}"`, "mode-tab " + (ui.mode === "mini" ? "active" : ""))}</div>`;
function home(ui) { return homeMenu(ui); }

function courses(ui) {
  return page(
    ui,
    "Choose your next round.",
    ui.mode === "golf"
      ? "Three courses. Fifteen carefully built holes. A full bag of clubs."
      : "Five mini-golf worlds, plus the courses you create.",
    modeTabs(ui) +
      `<div class="course-grid">${list(ui)
        .map((c, i) => {
          const unlocked = ui.progress.level.level >= c.level,
            n = ui.mode === "golf" ? golfHoleCount(i) : 9,
            par = Array.from({ length: n }, (_, j) => hole(ui.mode, i, j).par).reduce((a, b) => a + b, 0),
            best = ui.progress.data.bests[courseRecordKey(ui.mode, i)];
          return `<article class="course-card panel"><div class="course-image"><img data-course-preview="${ui.mode}:${i}" src="${ui.world.thumbnail(i, ui.mode)}" alt="${c.name} course map"><span class="badge">${c.difficulty}</span></div><div class="course-body"><div class="course-number">${n} HOLES · PAR ${par}</div><h2>${c.name}</h2><p>${c.subtitle}</p><div class="course-facts"><span>${unlocked ? "Unlocked" : "Unlocks at level " + c.level}</span><span>Best ${best ? relative(best.score) : "-"}</span></div>${button(unlocked ? "Play course" : "Play practice", unlocked ? "start" : "practice", `data-course="${i}"`, "button yellow wide")}</div></article>`;
        })
        .join(
          "",
        )}</div>${`<section class="panel creator-entry"><div><h2>A course with your name on it.</h2><p>Build a golf hole or mini-golf course, then share it with the community. Unlocks at level 10.</p></div><div class="row">${button("Open map editor", "editor", "", "button yellow")}${button("Community maps", "community", "", "button secondary")}</div></section>`}<p class="small-note">Practice is available on every course. Practice and custom maps do not award coins or ranked results.</p>`,
  );
}
function clubPass(ui) {
  return clubPassView(ui);
}
function rankings(ui) {
  const ranked = ui.rankingMetric === "elo";
  return page(
    ui,
    "The clubhouse leaderboard.",
    ranked ? "Competitive standings by Elo. Finish a ranked match to join the board." : "Complete rounds from players and guests. One best round per golfer, with no top-20 cutoff. Skipped rounds are not ranked.",
    (ranked ? "" : modeTabs(ui)) +
      `<div class="panel ranking-panel"><div class="ranking-filters"><div class="category-tabs">${button("Ranked · Elo", "ranking-metric", 'data-id="elo"', "category-tab " + (ranked ? "active" : ""))}${button("Lowest score", "ranking-metric", 'data-id="score"', "category-tab " + (ui.rankingMetric === "score" ? "active" : ""))}${button("Fastest round", "ranking-metric", 'data-id="time"', "category-tab " + (ui.rankingMetric === "time" ? "active" : ""))}</div><select id="ranking-course" aria-label="Leaderboard course" ${ranked ? "hidden" : ""}>${list(
        ui,
      )
        .map((c, i) => ui.mode==='golf'&&!courseAvailable(i)?'':`<option value="${i}" ${i === ui.rankingCourse ? "selected" : ""}>${c.name}</option>`)
        .join(
          "",
        )}</select></div><div class="table-scroll"><table class="ranking-table"><thead><tr><th>PLACE</th><th>GOLFER</th>${ranked ? "<th>RANK</th><th>ELO</th><th>W / L</th>" : "<th>LEVEL</th><th>TO PAR</th><th>TIME</th>"}</tr></thead><tbody id="rankings-body"><tr><td colspan="5" class="board-message">Loading shared scorecards…</td></tr></tbody></table></div><div class="rankings-sentinel" id="rankings-sentinel" role="status"></div>${button("Refresh board", "refresh-rankings", "", "text-button")}</div>`,
  );
}
function multiplayer(ui) {
  const r = ui.cloud.room,
    s = r?.state;
  return page(
    ui,
    "A round together.",
    r
      ? "Send an invite link or share the room code with up to seven friends."
      : "Create a private room or join a friend. Play as a guest. No signup needed. Each golfer plays their own ball.",
    r
        ? `<section class="panel lobby-panel"><div class="row between"><div><span class="eyebrow">ROOM CODE</span><h2 class="room-code">${r.code}</h2>${button("Copy invite link","copy-room-link","","button secondary")}</div><span class="badge">${s.members.length} / 8 GOLFERS</span></div><p>${s.mode === "golf" ? "Full golf" : "Mini-golf"} · ${list({ mode: s.mode })[s.course].name}</p><div class="lobby-members">${s.members.map((m) => `<div><span class="avatar">${esc(m.name[0].toUpperCase())}</span>${m.bot ? nameplate(m.name,m.nameplate,{compact:true}) : button(nameplate(m.name,m.nameplate,{compact:true}), "view-profile", `data-user="${m.id}"`, "profile-link")}<span>${m.id === s.host ? "HOST · " : ""}${m.bot ? "BOT" : m.ready ? "Ready" : "Getting ready"}</span>${m.bot && s.host===ui.cloud.session.user.id ? button("Remove","remove-room-bot",`data-id="${m.id}"`,"text-button") : ""}</div>`).join("")}</div><div class="modal-actions">${s.host===ui.cloud.session.user.id ? button("Add bot","add-room-bot",s.members.length>=8?"disabled":"","button secondary")+button("Fill with bots","fill-room-bots",s.members.length>=8?"disabled":"","button secondary") : ""}${button("Leave room", "leave-room", "", "button secondary")}${button(s.members.find(m=>m.id===ui.cloud.session.user.id)?.ready ? "✓ Ready · Click to unready" : "Not ready · Click to ready", "ready-room", `aria-pressed="${!!s.members.find(m=>m.id===ui.cloud.session.user.id)?.ready}"`, "button ready-toggle " + (s.members.find(m=>m.id===ui.cloud.session.user.id)?.ready ? "is-ready" : "secondary"))}${s.host === ui.cloud.session.user.id ? button("Start round", "start-room", s.members.length < 2 || s.members.some((m) => !m.ready) ? "disabled" : "", "button yellow") : ""}</div><p class="small-note">Six minutes per hole. Scores and hole changes are shared automatically.</p></section>`
        : `<div class="multiplayer-grid"><section class="panel"><h2>Host a round</h2>${modeTabs(ui)}<label>Course<select id="room-course">${list(
            ui,
          )
            .map(
              (c, i) =>
                ui.mode==='golf'&&!courseAvailable(i)?'':`<option value="${i}" ${i === ui.selectedCourse ? "selected" : ""}>${c.name}${ui.progress.level.level < c.level ? " · Level " + c.level : ""}</option>`,
            )
            .join(
              "",
            )}</select></label>${button("Create room", "create-room", "", "button yellow wide")}</section><section class="panel"><h2>Join your friends</h2><label>Six-character room code<input id="room-code" maxlength="6" placeholder="ABC234" value="${esc(ui.inviteCode||'')}" autocomplete="off" spellcheck="false"></label>${button("Join room", "join-room", "", "button yellow wide")}</section></div>${!ui.cloud.session || ui.cloud.isGuest ? '<p class="small-note">Guests get a starter golfer saved in this browser. Guest progress is separate from local solo play and registered accounts. Sign in for ranked play, trading and account rewards.</p>' : ''}`,
  );
}
function miniMap(g) {
  const h = g.hole,
    b = g.physics.ball;
  if (g.mode !== "golf") return "";
  const coords = (x, z) => [70 + x * 0.42, 18 - (z / h.length) * 164],
    path = h.points.map(([x, z], i) => `${i ? "L" : "M"}${coords(x, z).join(",")}`).join(" "),
    bp = coords(b.x, b.z),
    cp = coords(h.cup.x, h.cup.z);
  const ovals = (list, fill) =>
    list
      .map((p) => {
        const [x, y] = coords(p.x, p.z);
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(p.rx * 0.42).toFixed(1)}" ry="${((p.rz / h.length) * 164).toFixed(1)}" fill="${fill}"/>`;
      })
      .join("");
  const [gx, gy] = coords(h.green.x, h.green.z);
  return `<svg id="hole-map" viewBox="0 0 140 200" aria-label="Hole map. Click to aim." role="img"><rect width="140" height="200" rx="14" fill="#c9d8b4"/><path d="${path}" stroke="#a9c485" stroke-width="19" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${ovals(h.water, "#79b3c1")}${ovals(h.bunkers, "#ecdcae")}<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(h.green.rx * 0.42 + 1).toFixed(1)}" ry="${((h.green.rz / h.length) * 164 + 1).toFixed(1)}" fill="#c3df8f"/><path d="M${cp[0]},${cp[1]}v-9l6 2.5-6 2.5" fill="#e07a5f" stroke="#2c4a3b" stroke-width=".9"/><path d="M${bp[0]},${bp[1]}l${(g.direction.x * 18).toFixed(1)},${(-g.direction.z * 18).toFixed(1)}" stroke="#2c4a3b" stroke-width="1.6" stroke-dasharray="2 2"/><circle cx="${bp[0]}" cy="${bp[1]}" r="3.6" fill="#fff" stroke="#2c4a3b" stroke-width="1.2"/></svg>`;
}
function holeIntro(ui) {
  const g = ui.game;
  if (!g.round || (ui.hudIntroRound === g.round && ui.hudIntroIndex === g.index)) return;
  ui.hudIntroRound = g.round;
  ui.hudIntroIndex = g.index;
  if (g.state !== "playing" || g.strokes > 0) return;
  const golf = g.mode === "golf",
    sudden = g.round.sudden,
    course = sudden ? "Sudden death" : g.customHole ? "Custom course" : g.hole.course.name,
    meta = sudden
      ? "One shot · closest to the pin wins"
      : `Par ${g.hole.par}${golf ? ` · ${Math.round(Math.hypot(g.hole.cup.x - g.hole.start.x, g.hole.cup.z - g.hole.start.z))} m` : ""}${g.round.practice ? " · Practice" : ""}`;
  document.getElementById("hole-intro")?.remove();
  const el = document.createElement("div");
  el.id = "hole-intro";
  el.className = "hole-intro";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<span>${esc(course)} · Hole ${g.index + 1} of ${g.round.holeCount}</span><strong>${esc(g.hole.name || "")}</strong><small>${esc(meta)}</small>`;
  document.body.append(el);
  setTimeout(() => el.remove(), 3600);
}
function hud(ui) {
  const g = ui.game,
    d = ui.progress.data,
    golf = g.mode === "golf",
    total = g.round.strokes.reduce(
      (a, b, i) => a + b - (g.customHole || hole(g.mode, g.round.courseIndex, i)).par,
      0,
    ),
    wind = golf ? Math.hypot(g.hole.wind.x, g.hole.wind.z) : 0,
    windAngle = golf ? (Math.atan2(g.hole.wind.x, -g.hole.wind.z) * 180) / Math.PI : 0;
  queueMicrotask(() => holeIntro(ui));
  const stat = (label, value, extra = "") =>
    `<div class="ph-stat ${extra}"><span>${label}</span><strong>${value}</strong></div>`;
  const fluid = g.meterStyle() === 'fluid';
  const meterChoice = `<label class="ph-field ph-meter-choice">Shot meter<select id="shot-meter" aria-label="Shot meter"><option value="classic" ${!fluid ? 'selected' : ''}>Classic · 2 steps</option><option value="fluid" ${fluid ? 'selected' : ''}>Flow · press &amp; hold</option></select></label>`;
  const powerMeter = `<div class="meter-power"><div class="power-header"><span id="shot-status"></span><span id="power-text"></span></div><div class="power-track ph-track"><div class="power-fill" id="power-fill"></div></div></div>`;
  const directionMeter = fluid ? flowDirectionGauge() : `<div class="accuracy-label"><span>LEFT</span><span id="accuracy-text">DIRECTION · CENTRE</span><span>RIGHT</span></div><div class="accuracy-track" aria-label="Shot direction"><i id="accuracy-marker"></i></div>`;
  const shotCard = golf
    ? `<label class="ph-field">Club<select id="shot-club">${CLUBS.map((c) => `<option value="${c.id}" ${c.id === g.club ? "selected" : ""}>${c.name} · ${clubYards(c.id, d.equipment)} yd</option>`).join("")}</select></label><label class="ph-field">Draw / fade<input id="shot-shape" type="range" min="-1" max="1" step=".05" value="${g.shape}"></label><label class="ph-field">Spin · low / high<input id="shot-spin" type="range" min="-1" max="1" step=".05" value="${g.spin}"></label>${button(icon("camera") + "Overview", "overview", "", "ph-chip")}${meterChoice}`
    : `<div class="ph-equip"><span>Equipment</span><strong>${esc(ITEM_BY_ID[d.equipment.club]?.name || "Putter")}</strong><small>${esc(itemDescription(ITEM_BY_ID[d.equipment.ball]).split(" Full golf")[0])}</small></div><label class="ph-field">Curve<input id="shot-shape" type="range" min="-1" max="1" step=".05" value="${g.shape}" ${!miniStats(d.equipment).curve ? "disabled" : ""}></label>${meterChoice}`;
  return `<section class="play-hud ${golf ? "is-golf" : "is-mini"}" aria-label="Round controls"><span class="round-version">v${APP_VERSION}${ui.localPreview ? ' · Local preview' : ''}</span><div class="ball-nameplate" id="ball-nameplate" >${nameplate(d.name,d.equipment.nameplate,{compact:true})}</div><div class="ph-left"><div class="ph-card ph-shot ${ui.shotPanelCollapsed ? "is-collapsed" : ""}">${button(ui.shotPanelCollapsed ? "Club & shot +" : "Minimize −", "toggle-shot-panel", `aria-expanded="${!ui.shotPanelCollapsed}" aria-controls="shot-options"`, "ph-chip ph-collapse")}<div id="shot-options" ${ui.shotPanelCollapsed ? "hidden" : ""}>${shotCard}</div></div></div><div class="ph-center"><div class="ph-card ph-power ${fluid ? "is-flow-meter" : ""}"><div class="ph-stats">${stat("Hole", `${g.index + 1}<small>/${g.round.holeCount}</small>`)}${stat("Par", g.hole.par)}${stat("Strokes", g.strokes, "ph-strokes")}${stat(g.round.sudden ? "Mode" : "Round", g.round.sudden ? "SD" : relative(total))}</div><div class="ph-meter-body">${fluid ? directionMeter + powerMeter : powerMeter + directionMeter}</div><div class="ph-meta"><span id="surface-label"></span><span id="distance-label"></span><span id="flight-label"></span>${golf ? `<span class="ph-wind"><i style="transform:rotate(${windAngle.toFixed(0)}deg)">↑</i>${wind.toFixed(1)} m/s</span>` : ""}</div></div><p class="ph-hint">${fluid ? "Press: lock direction · Hold: power · Release: swing" : golf ? "Hold & release: power · Click again: direction · C changes club" : "Hold & release: power · Click again: direction · Right-drag to orbit"}</p></div><div class="ph-right">${ui.cloud.room ? `<div class="ph-card ph-live" id="live-players">Live room · ${ui.cloud.room.code}</div>` : ""}<div class="ph-tools">${button(icon("heart"), "emote-wheel", 'aria-label="Emote wheel (B)" title="Emote wheel (B)"', "icon-button")}${button(icon("help"), "help", 'aria-label="Controls" title="Controls"', "icon-button")}${g.round.sudden ? "" : button(icon("reset"), "reset", 'aria-label="Reset ball with one penalty stroke" title="Reset ball (+1 stroke)"', "icon-button")}${button(icon("pause"), "pause", 'aria-label="Pause" title="Pause"', "icon-button")}${g.customHole && !g.round.sudden ? button(g.round.customOrigin === "community" ? "Maps" : g.round.customOrigin === "shared" ? "Exit" : "Editor", g.round.customOrigin === "community" ? "return-community" : g.round.customOrigin === "shared" ? "round-exit" : "return-editor", "", "button secondary editor-return") : ""}</div></div></section>`;
}
function scorecard(ui, round, reward) {
  const pars = round.strokes.map((_, i) => hole(round.mode, round.courseIndex, i).par),
    sum = round.strokes.reduce((a, b) => a + b, 0),
    par = pars.reduce((a, b) => a + b, 0);
  return `<div class="result"><div class="eyebrow centered">ROUND COMPLETE</div><h2>${list({ mode: round.mode })[round.courseIndex].name}</h2><div class="result-score"><div><strong>${sum}</strong><span>Strokes</span></div><div><strong>${relative(sum - par)}</strong><span>To par</span></div><div><strong>${minutes(round.time)}</strong><span>Time</span></div></div><div class="table-scroll"><table class="scorecard"><thead><tr><th>Hole</th>${pars.map((_, i) => `<th>${i + 1}</th>`).join("")}</tr></thead><tbody><tr><th>Par</th>${pars.map((n) => `<td>${n}</td>`).join("")}</tr><tr><th>Score</th>${round.strokes.map((n) => `<td>${n}</td>`).join("")}</tr></tbody></table></div>${ui.cloud.room ? `<div class="lobby-results">${ui.cloud.room.state.members.map((m) => `<p>${esc(m.name)} <strong>${m.scores.reduce((a, b) => a + b, 0)} strokes</strong></p>`).join("")}</div>` : ""}<p>${round.practice ? "Practice round" : `${reward.coins} coins + ${reward.xp} XP completion bonus`}</p>${reward.locker ? `<div class="round-drop"><strong>Round drop · ${esc(LOCKERS.find(p=>p.id===reward.locker)?.name || "Locker")}</strong><span>Added to Shop → Lockers. Your next opening is free.</span></div>` : ""}<div class="modal-actions">${button("Back to clubhouse", "round-exit", "", "button yellow")}${button("Play again", ui.cloud.room ? "replay-room" : "replay", "", "button secondary")}</div></div>`;
}

export function installExpansion(ui) {
  ui.mode = "golf";
  ui.items = ITEMS;
  ui.miniEditor = new MapEditor(ui);
  ui.golfEditor = new GolfMapEditor(ui);
  ui.editor = ui.golfEditor;
  ui.cloud = new GolfCloud(ui);
  ui.world.setGhosts = () => {}; // Older round cleanup callers remain compatible.
  installGolfPresentation(ui.world);
  keepMiniSceneryClear(ui.world);
  installCoursePreviews(ui.world);
  installOcclusion(ui.world);
  ui.world.load(getGolfHole(0, 0));
  ui.game.menuHole = () => {
    const list = ui.mode === "golf" ? GOLF_COURSES : COURSES;
    return hole(ui.mode, Math.min(Math.max(0, ui.selectedCourse || 0), list.length - 1), 0);
  };
  const originalRender = ui.render.bind(ui),
    originalAction = ui.action.bind(ui),
    originalNavigate = ui.navigate.bind(ui);
  ui.navigate = (screen) => {
    if (screen === "editor") {
      requireEditor(ui.progress);
      ui.editor = ui.mode === "golf" ? ui.golfEditor : ui.miniEditor;
    }
    if (ui.game.state !== "menu") return;
    if (screen !== "multiplayer" && ui.cloud.room?.state.phase === "playing") return;
    originalNavigate(screen);
  };
  ui.render = () => {
    // Rounds started from rooms, matches or shared links can switch mode; keep the selection valid.
    const courseCount = (ui.mode === "golf" ? GOLF_COURSES : COURSES).length;
    if (!(ui.selectedCourse >= 0 && ui.selectedCourse < courseCount)) ui.selectedCourse = 0;
    if (!(ui.rankingCourse >= 0 && ui.rankingCourse < courseCount)) ui.rankingCourse = 0;
    if(ui.game.state==='menu'&&ui.mode==='golf'){
      if(!courseAvailable(ui.selectedCourse))ui.selectedCourse=0;
      if(!courseAvailable(ui.rankingCourse))ui.rankingCourse=0;
    }
    if (["playing", "paused", "complete", "finished"].includes(ui.game.state)) {
      ui.root.innerHTML = hud(ui);
      ui.cacheHud();
      bindShotControls(ui);
      return;
    }
    const views = {
      home,
      courses,
      "club-pass": clubPass,
      leaderboards: rankings,
      multiplayer,
      community: communityView,
      editor: () => ui.editor.view(),
    };
    if (views[ui.screen]) {
      ui.root.innerHTML = views[ui.screen](ui);
      if (ui.screen === "editor") ui.editor.bind();
      if (ui.screen === "community") loadCommunity(ui);
      if (ui.screen === "leaderboards") ui.loadRankings();
      ui.tick();
    } else originalRender();
  };
  ui.loadRankings = async (append=false) => {
    ui.rankingObserver?.disconnect();
    const offset=append?(ui.rankingRows?.length||0):0;
    const request = (ui.rankingRequest = (ui.rankingRequest || 0) + 1),
      mode = ui.mode,
      course = ui.rankingCourse, metric = ui.rankingMetric;
    try {
      const rows = await ui.cloud.rankings(mode, course, metric, offset),
        el = document.querySelector("#rankings-body");
      if (!el || request !== ui.rankingRequest || mode !== ui.mode || course !== ui.rankingCourse || metric !== ui.rankingMetric) return;
      ui.rankingRows=append?[...(ui.rankingRows||[]),...rows]:rows;
      const sentinel=ui.root.querySelector("#rankings-sentinel");
      if(sentinel)sentinel.textContent="";
      el.innerHTML = ui.rankingRows.length
        ? ui.rankingRows
            .map(
              (r, i) =>
                `<tr class="${r.user_id === ui.cloud.session?.user.id ? "your-ranking" : ""}"><td>${i + 1}</td><td>${button(esc(r.username), "view-profile", `data-user="${r.user_id}"`, "profile-link")}${r.username?.startsWith("guest_")?'<span class="guest-label">Guest</span>':""}</td>${metric === "elo" ? `<td>${esc(r.rank)}</td><td><strong>${r.elo}</strong></td><td>${r.wins} / ${r.losses}</td>` : `<td>${r.level}</td><td><strong>${relative(r.score)}</strong></td><td>${minutes(r.seconds)}</td>`}</tr>`,
            )
            .join("")
        : `<tr><td colspan="5" class="board-message"><h3>${metric === 'elo' ? 'The ranked board starts here.' : 'The first scorecard could be yours.'}</h3>${metric === 'elo' ? 'Complete a competitive match to earn your place.' : 'Finish this course as a player or guest to join the board.'}</td></tr>`;
      if(sentinel && metric!=='elo' && rows.length===100){
        sentinel.textContent='More golfers load as you scroll';
        ui.rankingObserver=new IntersectionObserver(entries=>{
          if(entries.some(e=>e.isIntersecting) && request===ui.rankingRequest && sentinel.isConnected){
            ui.rankingObserver.disconnect();sentinel.textContent='Loading golfers…';ui.loadRankings(true);
          }
        },{rootMargin:'200px'});
        ui.rankingObserver.observe(sentinel);
      }
    } catch (e) {
      if (request !== ui.rankingRequest || mode !== ui.mode || course !== ui.rankingCourse || metric !== ui.rankingMetric) return;
      const el = document.querySelector("#rankings-body");
      if (append) ui.toast(e.message);
      else if (el) el.innerHTML = `<tr><td colspan="5" class="board-message">${esc(e.message)}</td></tr>`;
      const sentinel=ui.root.querySelector("#rankings-sentinel");
      if(sentinel)sentinel.textContent="Could not load the board. Use Refresh board to try again.";
    }
  };
  ui.launch = async (index, practice = false) => {
    const requestedMode = ui.mode;
    if (ui.cloud.room) throw Error("Leave your multiplayer room before starting a solo round.");
    const c = list(ui)[index];
    if (!c) return;
    if (!practice && ui.progress.level.level < c.level) {
      ui.modal(
        `<h2>${c.name}</h2><p>Ranked play unlocks at level ${c.level}. Practice is available now.</p>${button("Play practice", "practice", `data-course="${index}"`, "button yellow")}`,
      );
      return;
    }
    let roundId, rotationKey;
    if (!practice && !ui.cloud.session) { try { await ui.cloud.ensureGuest(); } catch(e) { ui.toast("Offline round. This score will stay on this device."); } }
    if (ui.cloud.session && !practice) {
      const r = await ui.cloud.call("start_round", { mode: requestedMode, course: index });
      roundId = r.roundId; rotationKey = r.rotationKey;
    } else ui.progress.startRound(practice);
    ui.roundBonus = null;
    ui.closeModal();
    ui.audio.start();
    ui.world.equip(ui.progress.data.equipment, ITEMS);
    ui.game.start(index, practice, { mode: requestedMode, round: { cloudId: roundId, ...(rotationKey!==undefined?{rotationKey}:{}) } });
  };
  ui.holeComplete = async (result) => {
    ui.pendingResult = result;
    ui.render();
    if (ui.game.customHole && result.round.customOrigin === "shared") {
      ui.modal(
        `<div class="result"><div class="eyebrow centered">SHARED ${ui.game.mode === "golf" ? "HOLE" : "COURSE"}</div><h2>${esc(result.label)}</h2><p>${result.strokes} strokes · Par ${result.par} · Practice round</p><div class="modal-actions">${button("Back to clubhouse", "round-exit", "", "button secondary")}${button("Open in editor", "shared-edit", "", "button secondary")}${button("Play again", "shared-play", "", "button yellow")}</div></div>`,
        { close: false },
      );
      return;
    }
    if (ui.game.customHole && result.round.customOrigin === "community") {
      ui.modal(
        `<div class="result"><h2>${esc(result.label)}</h2><p>${result.strokes} strokes · Par ${result.par}</p>${button("Back to community", "return-community", "", "button yellow")}</div>`,
        { close: false },
      );
      return;
    }
    if (ui.game.customHole) {
      ui.modal(
        `<div class="result"><h2>Map tested!</h2><p>${result.strokes} strokes · Par ${result.par}</p><div class="modal-actions">${button("Back to editor", "return-editor", "", "button yellow")}${button("Test again", "editor-test-again", "", "button secondary")}</div></div>`,
        { close: false },
      );
      return;
    }
    let reward = { coins: 0, xp: 0 };
    try {
      if (ui.cloud.session && result.round.cloudId) {
        ui.modal(
          '<div class="result"><h2>Saving your scorecard…</h2><p>Checking the shots and syncing your rewards.</p></div>',
          { close: false },
        );
        const r = await ui.cloud.call("submit_hole", {
          roundId: result.round.cloudId,
          index: result.index,
          transcript: result.transcript,
          endTick: result.endTick,
        });
        reward = r.reward || reward;
        ui.roundBonus = r.bonus || ui.roundBonus;
        if(r.bonus?.locker && !r.duplicate)ui.earnedLockerPending = {id:r.bonus.locker,round:result.round};
      } else if (!result.transcript.some((c) => c.kind === "skip")) reward = ui.progress.completeHole(result);
      else result.round.skipped = true;
      if (ui.game.round !== result.round || ui.game.index !== result.index || ui.game.state !== "complete")
        return;
      ui.pendingResult = null;
      ui.render();
      if (ui.cloud.room) {
        ui.modal(
          `<div class="result"><h2>${result.label}</h2><p>${result.strokes} strokes · ${reward.coins} coins + ${reward.xp} XP</p><p>Waiting for the other golfers. The next hole starts automatically.</p><div id="waiting-scores"></div></div>`,
          { close: false },
        );
      } else
        ui.modal(
          holeDialog(result, reward).replace(
            result.index === 8 ? "View scorecard" : "Next hole",
            result.index === result.round.holeCount - 1 ? "View scorecard" : "Next hole",
          ),
          { close: false },
        );
    } catch (e) {
      if (ui.game.round !== result.round || ui.game.index !== result.index || ui.game.state !== "complete")
        return;
      ui.modal(
        `<h2>Your score is still here.</h2><p>${esc(e.message)}</p><p>Retry to save this hole before continuing.</p>${button("Retry save", "retry-score", "", "button yellow")}${button("Return to clubhouse", "round-exit", "", "button secondary")}`,
        { close: false },
      );
    }
  };
  ui.courseComplete = (round) => {
    const reward =
      ui.cloud.session && round.cloudId
        ? ui.roundBonus || { coins: 0, xp: 0 }
        : ui.progress.completeCourse(
            { ...round, practice: round.practice || round.skipped },
            round.strokes.map((_, i) => hole(round.mode, round.courseIndex, i).par),
          );
    ui.modal(scorecard(ui, round, reward), { wide: true, close: false });
    if(reward.locker)ui.showEarnedLocker?.(reward.locker,round);
  };
  ui.syncRoom = (r) => {
    const s = r.state,
      m = s.members.find((m) => m.id === ui.cloud.session.user.id);
    if (!m) return;
    if (s.phase === 'waiting' && ui.game.state === 'finished') {ui.closeModal();ui.game.leave();ui.screen='multiplayer';}
    if (ui.screen === "multiplayer" && ui.game.state === "menu" && s.phase === "waiting") ui.render();
    if (s.phase === "playing") {
      if (ui.game.round?.cloudId !== m.roundId || ui.game.state === "menu") {
        ui.closeModal();
        ui.audio.start();
        ui.roundBonus = null;
        ui.mode = s.mode;
        ui.world.equip(ui.progress.data.equipment, ITEMS);
        ui.game.start(s.course, false, { mode: s.mode, round: { cloudId: m.roundId, rotationKey: s.rotationKey || '' } });
      }
      if (ui.game.holeReveal) return;
      if (s.hole > ui.game.index) {
        ui.closeModal();
        ui.game.round.strokes = m.scores.slice();
        ui.pendingResult = null;
        ui.game.loadHole(s.hole);
      }
      if (m.nextHole > s.hole && ui.game.state === "playing" && !ui.pendingResult) {
        ui.game.round.strokes = m.scores.slice();
        ui.game.state = "complete";
        ui.game.physics.active = false;
        ui.game.physics.sunk = true;
        ui.render();
        ui.modal(
          `<div class="result"><h2>Score saved.</h2><p>Waiting for the other golfers.</p><div id="waiting-scores"></div></div>`,
          { close: false },
        );
      }
      const el = document.querySelector("#live-players");
      if (el)
        el.innerHTML =
          s.members
            .map(
              (m) =>
                `<div>${nameplate(m.name,m.nameplate,{compact:true})} <strong>${m.scores?.reduce((a, b) => a + b, 0) || 0}</strong></div>`,
            )
            .join("") + `<small>${Math.max(0, Math.ceil((s.deadline - Date.now()) / 1000))}s left</small>`;
      const waiting = document.querySelector("#waiting-scores");
      if (waiting)
        waiting.innerHTML = s.members
          .map((m) => `<p>${esc(m.name)} · ${m.nextHole > s.hole ? "Finished" : "Playing"}</p>`)
          .join("");
    } else if (
      s.phase === "finished" &&
      ui.game.state !== "finished" &&
      !ui.game.holeReveal &&
      !ui.pendingResult
    ) {
      ui.game.round.strokes = m.scores.slice();
      ui.game.round.time = ui.game.elapsed;
      ui.game.state = "finished";
      ui.courseComplete(ui.game.round);
    }
  };
  ui.tick = () => {
    const g = ui.game,
      h = ui.hud;
    ui.tickMeters();
    if (h?.fill?.isConnected) {
      h.status.textContent =
        g.state === "complete"
          ? "HOLED OUT"
          : g.pendingSwing
            ? "TAKING THE SHOT"
            : g.physics.active
              ? "BALL IN PLAY"
              : g.charging
                ? (g.meterStyle() === 'fluid' ? "2 · HOLD POWER · RELEASE TO SWING" : g.shotPhase === "direction" ? "2 · CLICK TO LOCK DIRECTION" : "1 · RELEASE TO LOCK POWER")
                : g.meterStyle() === 'fluid' ? "1 · PRESS TO LOCK DIRECTION" : "READY FOR YOUR SHOT";
      const p = g.mode === "golf" ? ui.world.golferScreen() : ui.world.ballScreen();
      h.plate.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      h.plate.style.opacity = p.visible && !g.physics.sunk ? "1" : "0";
      h.surface.textContent = (
        g.mode === "golf"
          ? terrainAt(g.hole, g.physics.ball.x, g.physics.ball.z).surface
          : surfaceAt(g.hole, nearestPoint(g.hole, g.physics.ball.x, g.physics.ball.z).t)
      ).toUpperCase();
      const dist = document.querySelector("#distance-label");
      if (dist)
        dist.textContent =
          Math.hypot(g.physics.ball.x - g.hole.cup.x, g.physics.ball.z - g.hole.cup.z).toFixed(1) +
          " m to flag";
      const flight = document.querySelector("#flight-label");
      if (flight)
        flight.textContent =
          g.mode === "golf" && g.physics.airborne
            ? "AIRBORNE · " +
              Math.max(
                0,
                g.physics.ball.y - terrainAt(g.hole, g.physics.ball.x, g.physics.ball.z).height,
              ).toFixed(1) +
              " m high"
            : "";
      const power = document.querySelector("#shot-power");
      if (power && document.activeElement !== power) power.value = g.power;
      for (const el of document.querySelectorAll("#shot-club,#shot-spin,#shot-meter"))
        el.disabled = g.charging || !!g.pendingSwing || g.physics.active || g.state !== "playing" || !!ui.world.waterMoment || !!ui.world.pirateMoment;
      const shape = document.querySelector("#shot-shape");
      if (shape)
        shape.disabled =
          g.charging || !!g.pendingSwing ||
          g.physics.active ||
          g.state !== "playing" ||
          !!ui.world.waterMoment || !!ui.world.pirateMoment ||
          (g.mode !== "golf" && !miniStats(ui.progress.data.equipment).curve);
    }
    const timer = document.querySelector("#rotation-countdown");
    if (timer) {
      const s = 86400 - (Math.floor(Date.now() / 1000) % 86400);
      timer.textContent = Math.floor(s / 3600) + "h " + Math.floor((s % 3600) / 60) + "m";
    }
    const connection = document.querySelector(".connection-status");
    if (connection) connection.textContent = ui.cloud.status;
  };
  ui.action = async (action, data = {}) => {
    if(action==='club-welcome-done'){ui.closeModal();ui.navigate('club-pass');return;}
    try {
      if (ui.launching) return;
      if (action.startsWith("community-") || action === "return-community") {
        if (ui.communityBusy) return;
        ui.communityBusy = true;
        try {
          await communityAction(ui, action, data);
        } finally {
          ui.communityBusy = false;
        }
        return;
      }
      if (action === "redeem-code") {
        if (!ui.cloud.session && !ui.cloud.localPreview) {
          accountDialog(ui);
          return;
        }
        if (ui.redeeming) return;
        ui.redeeming = true;
        try {
          const code = document.querySelector("#gift-code").value;
          const result = ui.cloud.localPreview
            ? redeemPreviewSupreme(ui.progress, code)
            : await ui.cloud.call("redeem_code", { code });
          ui.closeModal();
          ui.toast(result.message || "Reward redeemed.");
          ui.render();
        } finally {
          ui.redeeming = false;
        }
        return;
      }
      if (action === "claim-club-daily") {
        if (ui.cloud.session) await ui.cloud.call("claim_club_daily");
        else claimClubDaily(ui.progress);
        ui.toast(`${MEMBER_DAILY} member coins added.`);
        ui.render();
        return;
      }
      if (action.startsWith("editor-")) {
        requireEditor(ui.progress);
        if (action === "editor-test-again") {
          ui.closeModal();
          ui.game.leave();
          return ui.editor.action("editor-test", {});
        }
        return await ui.editor.action(action, data);
      }
      if (["editor", "club-pass", "multiplayer", "community"].includes(action)) {
        ui.navigate(action);
        return;
      }
      if (action === "return-editor") {
        ui.closeModal();
        ui.game.leave();
        ui.screen = "editor";
        ui.render();
        return;
      }
      if (action === "mode") {
        ui.mode = data.id === "mini" ? "mini" : "golf";
        ui.selectedCourse = ui.rankingCourse = 0;
        ui.world.load(hole(ui.mode, 0, 0));
        ui.render();
        return;
      }
      if (action === "garage-category") ui.world.previewCategory = data.id;
      if (action === "select-course") {
        ui.selectedCourse = Number(data.course);
        ui.world.load(hole(ui.mode, ui.selectedCourse, 0));
        ui.render();
        return;
      }
      if (action === "start" || action === "practice") {
        if (ui.launching) return;
        ui.launching = true;
        try {
          await ui.launch(Number(data.course), action === "practice");
        } finally {
          ui.launching = false;
        }
        return;
      }
      if (action === "replay") {
        await ui.launch(ui.game.round.courseIndex, ui.game.round.practice);
        return;
      }
      if (action === "overview") {
        ui.world.zoom = ui.world.zoom > 100 ? 45 : 200;
        return;
      }
      if (action === "retry-score") {
        if (ui.pendingResult) await ui.holeComplete(ui.pendingResult);
        return;
      }
      if (action === "more-rankings") {
        const more=ui.root.querySelector('[data-action="more-rankings"]');
        if(more?.disabled)return;
        if(more)more.disabled=true;
        await ui.loadRankings(true);
        return;
      }
      if (action === "refresh-rankings") {
        await ui.loadRankings();
        return;
      }
      if (action === "account") {
        accountDialog(ui);
        return;
      }
      if (action === "auth-mode") {
        ui.authMode = data.id;
        accountDialog(ui);
        return;
      }
      if (action === "logout") {
        const guest = ui.cloud.isGuest;
        await ui.cloud.logout();
        ui.closeModal();
        ui.toast(guest ? "Guest session ended. Your local solo save is ready." : "Signed out. Your account progress is saved.");
        return;
      }
      if (["create-room", "join-room", "ready-room", "replay-room", "start-room", "leave-room", "add-room-bot", "fill-room-bots", "remove-room-bot"].includes(action)) {
        if (ui.roomBusy) return;
        const payload =
          action === "create-room"
            ? { mode: ui.mode, course: Number(document.querySelector("#room-course").value) }
            : action === "join-room"
              ? { code: document.querySelector("#room-code").value }
              : { roomId: ui.cloud.room.id, botId:data.id };
        if(action === 'join-room' && !/^[A-HJ-NP-Z2-9]{6}$/i.test(payload.code.trim())) throw Error('Enter the six-character room code from your friend.');
        ui.roomBusy = true;
        try {
        if (action === 'create-room' || action === 'join-room') await ui.cloud.ensureGuest();
        const r = await ui.cloud.call(action.replaceAll("-", "_"), payload);
        ui.cloud.room = action === "leave-room" ? null : r.room;
        if(action === "join-room") { ui.inviteCode=""; const url=new URL(location.href);url.searchParams.delete("invite");history.replaceState(null,"",url.pathname+url.search+url.hash); }
        ui.render();
        if (ui.cloud.room) ui.syncRoom(ui.cloud.room);
        } finally { ui.roomBusy = false; }
        return;
      }
      if (action === "round-exit" && ui.cloud.room) {
        await ui.cloud.call("leave_room", { roomId: ui.cloud.room.id });
        ui.cloud.room = null;
      }
      if (action === "join-club" || action === "claim-tier") {
        if (ui.cloud.session) await ui.cloud.call(action.replace("-", "_"), { tier: Number(data.tier) });
        else if (action === "join-club") joinClub(ui.progress);
        else claimTier(ui.progress, Number(data.tier));
        ui.toast(
          action === "join-club" ? "Welcome to the Country Club." : "Rewards added to your collection.",
        );
        ui.render();
        if (action === "join-club") welcomeToClub(ui);
        return;
      }
      if (action === "item-detail" || action === "buy") {
        const item = ITEM_BY_ID[data.id],
          owned = ui.progress.data.owned.includes(item.id);
        ui.modal(
          `<div class="item-detail"><img src="${ui.world.itemThumbnail(item)}" alt="${item.name}"><span class="badge">${item.rarity} · ${item.category}</span><h2>${item.name}</h2><p>${itemDescription(item)}</p><div class="row between">${owned ? "In your collection" : coins(item.price)}${button(owned ? "Equip" : "Buy for " + item.price + " coins", owned ? "equip" : "confirm-buy", `data-id="${item.id}" ${!owned && ui.progress.data.coins < item.price ? "disabled" : ""}`, "button yellow")}</div></div>`,
        );
        return;
      }
      const cloudActions = {
        "confirm-buy": "buy",
        equip: "equip",
        "claim-login": "claim_login",
        "claim-challenge": "claim_challenge",
      };
      if (
        ui.cloud.session &&
        (cloudActions[action] || ["equip-preview", "unequip", "randomize"].includes(action))
      ) {
        if (ui.mutating) return;
        ui.mutating = true;
        try {
          if (action === "randomize") {
            for (const category of Object.keys(DEFAULT_EQUIPMENT)) {
              const ids = ui.progress.data.owned.filter((id) => ITEM_BY_ID[id].category === category);
              await ui.cloud.call("equip", { id: ids[Math.floor(Math.random() * ids.length)] });
            }
          } else {
            const id =
              action === "equip-preview"
                ? ui.previewId
                : action === "unequip"
                  ? DEFAULT_EQUIPMENT[ui.garageCategory]
                  : data.id;
            await ui.cloud.call(cloudActions[action] || "equip", { id });
          }
          ui.previewId = null;
          ui.world.equip(ui.progress.data.equipment, ITEMS);
          ui.closeModal();
          ui.render();
          ui.audio.play("reward");
          ui.toast("Saved to your account.");
        } finally {
          ui.mutating = false;
        }
        return;
      }
      if (await usernameAction(ui, action)) return;
      if (action === "help") {
        ui.pauseForDialog();
        ui.modal(
          `<h2>A good round starts here.</h2><div class="help-grid"><div><h3>Full golf</h3><p>Your caddie selects a club for the lie and distance; you can change it. Aim with the mouse or hole map, then hold and release on the course to swing. Holding Space and releasing works too. Both meters bounce back and forth. Full power is green; release near the centre of the direction bar for a straight shot.</p><p>Left and right arrows fine-tune aim. C cycles clubs. After each shot the golfer faces the flag; your caddie suggests the next club. Shape adds draw or fade; spin adjusts trajectory and backspin. Drivers range from 265 yards at Common to about 350 at Legendary. Black Market matches Legendary. Other full-golf items change appearance.</p></div><div><h3>Mini-golf</h3><p>Use bank shots, ramps and boosts. Equipped balls and putters can add curve, power or stopping control. Earn equipment through levels, the shop and Country Club.</p><h3>Camera & rules</h3><p>Right-drag to orbit; scroll to zoom. R resets with one penalty stroke. Esc pauses. Water and out of bounds return you to the last shot with a penalty. Picked-up holes earn no rewards, and picked-up rounds are unranked.</p></div></div>`,
          { wide: true },
        );
        return;
      }
      await originalAction(action, data);
    } catch (e) {
      // A server still running the previous catalogue rejects items added in this release.
      const added = ITEM_BY_ID[data?.id]?.added && ui.cloud.session && /earned through|rotated out|before equipping/i.test(e.message || "");
      ui.toast(added ? "This item isn’t available on the server yet. Please try again later." : e.message || "Could not complete that action. Please try again.");
    }
  };
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "account-form") return;
    e.preventDefault();
    const form = e.target,
      btn = form.querySelector('button[type="submit"]'),
      error = form.querySelector("#auth-error");
    btn.disabled = true;
    error.textContent = "";
    try {
      await ui.cloud.signIn(
        ui.authMode || "login",
        form.elements.username.value,
        form.elements.password.value,
        !!form.elements.policyAccepted?.checked,
      );
      ui.closeModal();
      ui.toast("Your golfer is ready.");
    } catch (e) {
      error.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  });
}
function accountDialog(ui) {
  if (ui.cloud.session && !ui.cloud.isGuest) {
    ui.modal(
      `<h2>Hello, ${esc(ui.cloud.username)}.</h2><p>Your inventory, progression, maps and verified scorecards are saved to your account.</p>${button("Sign out", "logout", "", "button secondary")}`,
    );
    return;
  }
  const signup = ui.authMode === "signup";
  ui.modal(
    (ui.cloud.isGuest ? `<p class="small-note">Playing as ${esc(ui.cloud.username)}. This guest golfer is saved in this browser. Leave your room before signing in. Account progress stays separate.</p>${button('End guest session', 'logout', '', 'text-button')}` : '') +
    `<nav class="auth-tabs" aria-label="Account access">${[['login','Sign in'],['signup','Create account']].map(([id,label])=>button(label,'auth-mode',`data-id="${id}" aria-pressed="${(signup?'signup':'login')===id}"`,'auth-tab')).join('')}</nav><h2>${signup ? "Create account" : "Sign in"}</h2><p>${signup ? "Start your golfer with 5,000 coins. Save your collection and scores." : "Welcome back. Your golfer and collection are waiting."}</p><form id="account-form"><label>Username<input name="username" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" required placeholder="Your golfer name"></label><label>Password<input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="6" maxlength="128" required placeholder="At least 6 characters"></label>${signup ? `<label class="account-consent"><input type="checkbox" name="policyAccepted" required> <span>I am at least 13 and meet the age requirements where I live. I agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms</a> and have read the <a href="/privacy.html" target="_blank" rel="noopener">Privacy policy</a>.</span></label>` : ""}<p id="auth-error" class="form-error" role="alert"></p><button class="button yellow wide" type="submit">${signup ? "Create account" : "Sign in"}</button></form>${button(signup ? "Already a member? Sign in" : "New here? Create an account", "auth-mode", `data-id="${signup ? "login" : "signup"}"`, "text-button")}<p class="small-note">Username and password only. Keep your password safe; there is no email recovery. Online progress starts separately from guest progress.</p>`,
  );
}
function bindShotControls(ui) {
  const g = ui.game;
  document.getElementById('shot-meter')?.addEventListener('change', e => {
    if (g.charging || g.physics.active || g.pendingSwing || g.state !== 'playing' || ui.world.waterMoment || ui.world.pirateMoment) { e.target.value = g.meterStyle(); return; }
    const style = e.target.value === 'fluid' ? 'fluid' : 'classic';
    ui.progress.data.settings.shotMeter = style;
    ui.world.settings.shotMeter = style;
    ui.progress.save();
    g.cancelShot();
    ui.render();
    ui.world.canvas.focus?.({ preventScroll: true });
  });
  for (const [id, key] of [
    ["shot-shape", "shape"],
    ["shot-spin", "spin"],
    ["shot-club", "club"],
  ])
    document.getElementById(id)?.addEventListener("input", (e) => {
      if (g.charging || g.physics.active || g.pendingSwing || g.state !== 'playing' || ui.world.waterMoment || ui.world.pirateMoment) return;
      g[key] = key === "club" ? e.target.value : Number(e.target.value);
    });
  document.getElementById('shot-club')?.addEventListener('change', () => ui.world.canvas.focus?.({ preventScroll: true }));
  for (const id of ['shot-shape', 'shot-spin'])
    document.getElementById(id)?.addEventListener('pointerup', () => ui.world.canvas.focus?.({ preventScroll: true }));
  document.querySelector("#hole-map")?.addEventListener("pointerdown", (e) => {
    if (g.physics.active || g.pendingSwing) return;
    const r = e.currentTarget.getBoundingClientRect(),
      x = (((e.clientX - r.left) / r.width) * 140 - 70) / 0.42,
      z = (-(((e.clientY - r.top) / r.height) * 200 - 18) / 164) * g.hole.length;
    g.direction = { x: x - g.physics.ball.x, z: z - g.physics.ball.z };
    g.normalizeAim();
    g.aimTarget = null;
  });
}
