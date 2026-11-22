import { COURSES } from "./courses.js";
import { golfHoleCount, GOLF_COURSES } from "./golf-courses.js";
import { courseAvailable } from "./rotating-courses.js";
import { icon } from "./icons.js";
import { nameplate } from "./nameplates.js";
import { button, esc, page } from "./views.js";

const RULES = {
  turn: {
    label: "Turn-based par",
    hint: "Take one shot each in roster order.",
    icon: "user",
    order: "The starting order follows the room roster. After one golfer's ball stops, the next golfer takes a shot. Golfers who've already holed out are skipped.",
    scoring: "Fewest total strokes wins. The scorecard shows how each golfer is doing against par.",
  },
  free: {
    label: "Free-for-all par",
    hint: "Take your shots whenever you're ready.",
    icon: "ball",
    order: "Everyone plays their own ball at the same time. You can take your next shot as soon as your ball stops.",
    scoring: "Fewest total strokes wins. The room moves on once everyone finishes the hole.",
  },
  distance: {
    label: "Farthest first",
    hint: "Tee off in order, then the farthest ball plays.",
    icon: "flag",
    order: "Take your first tee shots in roster order. After that, the golfer farthest from the cup plays next. If their ball is still farthest away, they play again.",
    scoring: "Fewest total strokes wins. Distance only decides who takes the next shot.",
  },
  speed: {
    label: "Speed golf",
    hint: "Race the clock from the shared start.",
    icon: "clock",
    order: "Once everyone loads in, the room starts a ten-second countdown. At go, everyone can take shots at their own pace.",
    scoring: "Fastest combined hole times win. The scorecard tracks elapsed time for each golfer.",
  },
};

const BOT_SKILLS = {
  duffer: "Duffer",
  weekend: "Weekend Warrior",
  stick: "Stick",
  master: "Master",
};
const DEFAULT_BOT_SKILL = "weekend";
const RULE_ORDER = ["turn", "free", "distance", "speed"];
const formatLabel = mode => mode === "mini" ? "Mini-golf" : "Full golf";
const holeLabel = n => `${n} ${n === 1 ? "hole" : "holes"}`;
const validRule = id => Object.hasOwn(RULES, id);
const validSkill = id => Object.hasOwn(BOT_SKILLS, id);

export function multiplayerCourses(mode, now = Date.now()) {
  if (mode === "mini") {
    return COURSES.map(({ name, difficulty, level }, course) => ({ name, difficulty, level, course, cover: course, holes: 9 }));
  }
  return GOLF_COURSES.flatMap(({ name, difficulty, level, id, layoutCourse }, cover) => {
    if (id === "planetfall" || layoutCourse !== undefined || !courseAvailable(cover, now)) return [];
    const long = GOLF_COURSES.findIndex(course => course.layoutCourse === cover);
    const course = long >= 0 ? long : cover;
    return [{ name, difficulty, level, course, cover, holes: golfHoleCount(course) }];
  });
}

function hostDraft(ui) {
  const draft = ui.multiplayerDraft ??= { mode: ui.mode === "mini" ? "mini" : "golf", rule: "free", courses: {} };
  const options = multiplayerCourses(draft.mode);
  const saved = draft.courses[draft.mode];
  const selected = options.find(course => course.course === saved?.course)
    || options.find(course => course.level <= ui.progress.level.level)
    || options[0];
  const holes = saved?.course === selected.course && saved.holes >= 1 && saved.holes <= selected.holes
    ? saved.holes
    : selected.holes;
  draft.courses[draft.mode] = { course: selected.course, holes };
  return { draft, options, selected, holes };
}

export function multiplayerCreatePayload(ui) {
  const { draft, selected, holes } = hostDraft(ui);
  if (selected.level > ui.progress.level.level) throw Error(`Unlock ${selected.name} at level ${selected.level} before hosting it.`);
  return { mode: draft.mode, course: selected.course, holeCount: holes, rule: draft.rule };
}

export function multiplayerBotSkill(ui) {
  return validSkill(ui.multiplayerBotRank) ? ui.multiplayerBotRank : DEFAULT_BOT_SKILL;
}

function courseCover(ui, mode, index, className) {
  return `<img class="${className}" data-course-preview="${mode}:${index}" src="${esc(ui.world.thumbnail(index, mode))}" alt="" loading="lazy" decoding="async">`;
}

function ruleInfo(id) {
  const rule = RULES[id];
  return button("i", "room-setup-info", `data-id="${id}" aria-label="How ${rule.label} works" aria-haspopup="dialog"`, "mp-rule-info");
}

function hostView(ui) {
  const { draft, options, selected, holes } = hostDraft(ui);
  const locked = selected.level > ui.progress.level.level;
  const invited = !!ui.inviteCode;
  const joinCode = ui.root?.querySelector("#room-code")?.value ?? ui.inviteCode ?? "";
  const join = `<section class="mp-sheet mp-join" aria-labelledby="mp-join">
    <h2 id="mp-join">Join friends</h2>
    <label for="room-code">Room code</label>
    <input id="room-code" maxlength="6" placeholder="ABC234" value="${esc(joinCode)}" autocomplete="off" autocapitalize="characters" spellcheck="false">
    ${button("Join room", "join-room", "", "button secondary wide")}
    ${!ui.cloud.session || ui.cloud.isGuest ? '<p class="mp-muted">You can join as a guest.</p>' : ""}
  </section>`;
  const side = `<aside class="mp-side" aria-label="Create or join a room">
    ${invited ? join : ""}
    <section class="mp-sheet mp-review" aria-labelledby="mp-review">
      <h2 id="mp-review">Your round</h2>
      <div class="mp-course-summary">
        ${courseCover(ui, draft.mode, selected.cover, "mp-course-cover")}
        <div><strong>${esc(selected.name)}</strong><small>${formatLabel(draft.mode)} · ${holeLabel(holes)}</small></div>
      </div>
      <p class="mp-review-rule">${icon(RULES[draft.rule].icon)} ${RULES[draft.rule].label}</p>
      ${button("Create room", "create-room", locked ? "disabled" : "", "button yellow wide")}
    </section>
    ${invited ? "" : join}
  </aside>`;
  return `<div class="mp-layout" data-invited="${invited}">
    ${invited ? side : ""}
    <section class="mp-main" aria-labelledby="mp-host">
      <div class="mp-host-heading">
        <h2 id="mp-host">Host a round</h2>
        ${invited ? "" : button("Join by code", "room-setup-join", "", "mp-jump-join")}
      </div>
      <section class="mp-step" aria-labelledby="mp-course">
        <div class="mp-step-heading"><h3 id="mp-course">Course</h3>
          <div class="mp-segment" role="group" aria-label="Golf format">
            ${["golf", "mini"].map(mode => button(formatLabel(mode), "room-setup-format", `data-id="${mode}" aria-pressed="${draft.mode === mode}"`, "mp-choice")).join("")}
          </div>
        </div>
        <div class="mp-courses" role="group" aria-labelledby="mp-course">
          ${options.map(course => {
            const active = selected.course === course.course;
            const unavailable = course.level > ui.progress.level.level;
            const meta = unavailable ? `Unlocks at level ${course.level}` : `${holeLabel(course.holes)} available`;
            return button(`${courseCover(ui, draft.mode, course.cover, "mp-course-cover")}<span class="mp-course-copy"><strong>${esc(course.name)}</strong><small>${meta}</small></span>${active ? icon("check") : ""}`,
              "room-setup-course", `data-id="${course.course}" aria-pressed="${active}" ${unavailable ? "disabled" : ""}`, "mp-course-option");
          }).join("")}
        </div>
      </section>
      <section class="mp-step" aria-labelledby="mp-holes">
        <div class="mp-step-heading"><h3 id="mp-holes">Holes</h3><span class="mp-muted">${holes === 1 ? "Opening hole" : `First ${holes} holes`}</span></div>
        <div class="mp-length" role="group" aria-labelledby="mp-holes">
          ${Array.from({ length: selected.holes }, (_, i) => button(String(i + 1), "room-setup-length", `data-id="${i + 1}" aria-label="${holeLabel(i + 1)}" aria-pressed="${holes === i + 1}"`, "mp-choice")).join("")}
        </div>
      </section>
      <section class="mp-step" aria-labelledby="mp-rules">
        <div class="mp-step-heading"><h3 id="mp-rules">Rules</h3></div>
        <div class="mp-rules" role="group" aria-labelledby="mp-rules">
          ${RULE_ORDER.map(id => {
            const rule = RULES[id];
            return `<div class="mp-rule-option" data-selected="${draft.rule === id}">
              ${button(`${icon(rule.icon)}<span><strong>${rule.label}</strong><small>${rule.hint}</small></span>`, "room-setup-rule", `data-id="${id}" aria-pressed="${draft.rule === id}"`, "mp-rule-choice")}
              ${ruleInfo(id)}
            </div>`;
          }).join("")}
        </div>
      </section>
    </section>
    ${invited ? "" : side}
  </div>`;
}

function roomView(ui, room) {
  const state = room.state;
  const localId = ui.cloud.session?.user.id;
  const isHost = localId === state.host;
  const waiting = state.phase === "waiting";
  const course = (state.mode === "golf" ? GOLF_COURSES : COURSES)[state.course];
  const cover = course?.layoutCourse ?? state.course;
  const title = course?.layoutCourse !== undefined ? GOLF_COURSES[cover]?.name : course?.name;
  const rule = validRule(state.rule) ? state.rule : "free";
  const holes = state.holeCount ?? (state.mode === "golf" && course ? golfHoleCount(state.course) : 9);
  const me = state.members.find(member => member.id === localId);
  const readyCount = state.members.filter(member => member.ready || member.bot).length;
  const canStart = waiting && state.members.length > 1 && readyCount === state.members.length;
  const full = state.members.length >= 8;
  const startHint = state.members.length < 2 ? "Add or invite another golfer to start." : "Everyone must ready up to start.";

  return `<div class="mp-layout">
    <section class="mp-main mp-roster" aria-labelledby="mp-roster">
      <div class="mp-roster-heading">
        <div><h2 id="mp-roster">Golfers</h2><p class="mp-muted">${waiting ? `${readyCount} ready · ${state.members.length} of 8 places filled` : `${state.members.length} in the round`}</p></div>
        ${me && waiting ? button(me.ready ? "Unready" : "Ready up", "ready-room", `aria-pressed="${!!me.ready}"`, `button ${me.ready ? "secondary is-ready" : "yellow"} ready-toggle`) : ""}
      </div>
      <ul class="mp-players">${state.members.map(member => {
        const memberId = esc(member.id);
        const skill = validSkill(member.botSkill) ? member.botSkill : DEFAULT_BOT_SKILL;
        const display = nameplate(member.name, member.nameplate, { compact: true });
        return `<li>
          <div class="mp-avatar" ${member.bot ? `data-bot="${skill}"` : ""} aria-hidden="true">${member.bot ? icon("club") : esc(String(member.name).slice(0, 1).toUpperCase())}</div>
          <div class="mp-player-name">${member.bot ? display : button(display, "view-profile", `data-user="${memberId}"`, "profile-link")}${member.id === state.host ? '<small>Host</small>' : member.id === localId ? '<small>You</small>' : ""}</div>
          <span class="mp-seat-status" data-ready="${!!(member.ready || member.bot)}">${member.bot ? `Bot · ${BOT_SKILLS[skill]}` : member.ready ? "Ready" : "Getting ready"}</span>
          ${member.bot && isHost && waiting ? button("Remove", "remove-room-bot", `data-id="${memberId}" aria-label="Remove ${esc(member.name)}"`, "mp-remove") : ""}
        </li>`;
      }).join("")}</ul>
      ${isHost && waiting ? `<section class="mp-bots" aria-labelledby="mp-bots">
        <div class="mp-bots-copy"><h3 id="mp-bots">Bots</h3><p class="mp-muted">Choose a rank before adding a bot. Higher ranks place shots more accurately.</p></div>
        <div class="mp-bot-controls">
          <div class="mp-bot-skills" role="group" aria-label="Bot rank">
            ${Object.entries(BOT_SKILLS).map(([id, label]) => button(label, "room-setup-skill", `data-id="${id}" aria-pressed="${multiplayerBotSkill(ui) === id}"`, "mp-choice")).join("")}
          </div>
          <div class="mp-bot-actions">${button("Add bot", "add-room-bot", full ? "disabled" : "", "button secondary")}${button("Fill seats with bots", "fill-room-bots", full ? "disabled" : "", "button secondary")}</div>
        </div>
      </section>` : ""}
    </section>
    <aside class="mp-side">
      <section class="mp-sheet mp-invite" aria-labelledby="mp-invite">
        <h2 id="mp-invite">Invite friends</h2>
        <div class="mp-room-code"><span>Room code</span><strong>${esc(room.code)}</strong></div>
        ${button("Copy invite link", "copy-room-link", "", "button secondary wide")}
      </section>
      <section class="mp-sheet mp-review" aria-labelledby="mp-review">
        <h2 id="mp-review">Round settings</h2>
        <div class="mp-course-summary">
          ${course ? courseCover(ui, state.mode, cover, "mp-course-cover") : ""}
          <div><strong>${esc(title || "Course")}</strong><small>${formatLabel(state.mode)} · ${holeLabel(holes)}</small></div>
        </div>
        <div class="mp-review-rule">${icon(RULES[rule].icon)} <span>${RULES[rule].label}</span>${ruleInfo(rule)}</div>
        ${isHost && waiting ? `${button("Start round", "start-room", canStart ? "" : "disabled", "button yellow wide")}${canStart ? "" : `<p class="mp-muted">${startHint}</p>`}` : ""}
        ${button("Leave room", "leave-room", "", "mp-leave")}
      </section>
    </aside>
  </div>`;
}

export function multiplayerLobby(ui) {
  const room = ui.cloud.room;
  return page(ui, "Multiplayer", room ? "Get your group together and ready up." : "Set up a private round or join friends.",
    room ? roomView(ui, room) : hostView(ui));
}

export function multiplayerLobbyAction(ui, action, { id } = {}) {
  if (!action.startsWith("room-setup-")) return false;
  if (action === "room-setup-join") {
    ui.root?.querySelector("#room-code")?.focus();
    return true;
  }
  if (action === "room-setup-info") {
    if (!validRule(id)) return true;
    const { icon: mark, label, order, scoring } = RULES[id];
    ui.modal(`<div class="mp-rules-dialog">
      <header>${icon(mark)}<h2 id="mp-rule-title">${label}</h2></header>
      <dl><div><dt>Playing order</dt><dd>${order}</dd></div><div><dt>Scoring</dt><dd>${scoring}</dd></div></dl>
      <div class="modal-actions">${button("Got it", "close-modal", "", "button yellow")}</div>
    </div>`);
    const dialog = ui.modalRoot?.querySelector('[role="dialog"]');
    dialog?.removeAttribute("aria-label");
    dialog?.setAttribute("aria-labelledby", "mp-rule-title");
    return true;
  }
  if (action === "room-setup-skill") {
    if (!validSkill(id)) return true;
    ui.multiplayerBotRank = id;
  } else {
    const { draft, options, selected } = hostDraft(ui);
    if (action === "room-setup-format" && ["golf", "mini"].includes(id)) draft.mode = id;
    if (action === "room-setup-course") {
      const choice = options.find(course => course.course === Number(id));
      if (choice && choice.level <= ui.progress.level.level && choice.course !== selected.course) {
        draft.courses[draft.mode] = { course: choice.course, holes: choice.holes };
      }
    }
    if (action === "room-setup-length" && Number.isInteger(Number(id)) && Number(id) >= 1 && Number(id) <= selected.holes) {
      draft.courses[draft.mode].holes = Number(id);
    }
    if (action === "room-setup-rule" && validRule(id)) draft.rule = id;
  }
  const scroller = ui.root?.querySelector(".page:has(.mp-layout)");
  const scrollTop = scroller?.scrollTop ?? 0;
  ui.render();
  const nextPage = ui.root?.querySelector(".page:has(.mp-layout)");
  if (nextPage) nextPage.scrollTop = scrollTop;
  const target = Array.from(nextPage?.querySelectorAll("[data-action][data-id]") ?? [])
    .find(control => control.dataset.action === action && control.dataset.id === id);
  target?.focus({ preventScroll: true });
  return true;
}
