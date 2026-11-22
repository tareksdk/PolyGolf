import test from "node:test";
import assert from "node:assert/strict";
import {
  multiplayerBotSkill, multiplayerCourses, multiplayerCreatePayload, multiplayerLobby, multiplayerLobbyAction,
} from "../dist/src/multiplayer-lobby.js";

function clubhouse(level = 1) {
  return {
    mode: "golf",
    screen: "multiplayer",
    progress: { data: { coins: 0, name: "Golfer" }, level: { level, xp: 0, required: 500, progress: 0 } },
    cloud: { session: null, room: null },
    world: { thumbnail: (index, mode) => `/assets/course-cards/${mode}-${index}.webp` },
    render() {},
  };
}

test("full golf combines each classic course with its full nine-hole layout", () => {
  const courses = multiplayerCourses("golf", Date.UTC(2026, 10, 22));
  assert.deepEqual(courses.slice(0, 3).map(c => [c.name, c.course, c.cover, c.holes]), [
    ["Willow Park", 14, 0, 9],
    ["Saltwind Links", 15, 1, 9],
    ["Autumn Pines", 16, 2, 9],
  ]);
  assert.equal(courses.some(c => c.name.includes("Long Course") || c.name === "Planetfall"), false);
  assert.ok(courses.some(c => c.holes === 3));
  assert.ok(courses.some(c => c.holes === 1));
});

test("hosting defaults to all holes and preserves a separate draft for each format", () => {
  const ui = clubhouse(5);
  assert.deepEqual(multiplayerCreatePayload(ui), { mode: "golf", course: 14, holeCount: 9, rule: "free" });
  multiplayerLobbyAction(ui, "room-setup-length", { id: "4" });
  multiplayerLobbyAction(ui, "room-setup-rule", { id: "speed" });
  multiplayerLobbyAction(ui, "room-setup-format", { id: "mini" });
  assert.deepEqual(multiplayerCreatePayload(ui), { mode: "mini", course: 0, holeCount: 9, rule: "speed" });
  multiplayerLobbyAction(ui, "room-setup-length", { id: "2" });
  multiplayerLobbyAction(ui, "room-setup-format", { id: "golf" });
  assert.deepEqual(multiplayerCreatePayload(ui), { mode: "golf", course: 14, holeCount: 4, rule: "speed" });
  multiplayerLobbyAction(ui, "room-setup-course", { id: "18" });
  multiplayerLobbyAction(ui, "room-setup-length", { id: "9" });
  assert.deepEqual(multiplayerCreatePayload(ui), { mode: "golf", course: 18, holeCount: 3, rule: "speed" });
});

test("course locks and lobby draft affect the rendered controls", () => {
  const ui = clubhouse();
  multiplayerLobbyAction(ui, "room-setup-course", { id: "15" });
  assert.equal(multiplayerCreatePayload(ui).course, 14);
  ui.inviteCode = "BLUE42";
  const html = multiplayerLobby(ui);
  assert.match(html, /data-invited="true"/);
  assert.ok(html.indexOf("Join friends") < html.indexOf("Host a round"));
  assert.match(html, /value="BLUE42"/);
  assert.match(html, /How Farthest first works/);
  assert.match(html, /How Speed golf works/);
  assert.match(html, /Unlocks at level 3/);
});

test("bot difficulty selection persists and the lobby renders choices in order and real readiness", () => {
  const ui = clubhouse();
  assert.equal(multiplayerBotSkill(ui), "weekend");
  multiplayerLobbyAction(ui, "room-setup-skill", { id: "master" });
  assert.equal(multiplayerBotSkill(ui), "master");
  ui.cloud.session = { user: { id: "host" } };
  ui.cloud.room = { code: "BLUE42", state: {
    mode: "golf", course: 14, phase: "waiting", rule: "speed", holeCount: 4, host: "host",
    members: [{ id: "host", name: "Golfer", ready: false }, { id: "bot", name: "Cedar", bot: true, botSkill: "stick" }],
  } };
  let html = multiplayerLobby(ui);
  assert.match(html, /Bot · Hard/);
  const choices = [...html.matchAll(/data-action="room-setup-skill"[^>]*>([^<]+)/g)].map(match => match[1]);
  assert.deepEqual(choices, ["Easy", "Medium", "Hard", "Master"]);
  assert.match(html, /Copy invite link/);
  assert.match(html, /data-action="start-room"\s+disabled/);
  ui.cloud.room.state.members[0].ready = true;
  html = multiplayerLobby(ui);
  assert.doesNotMatch(html, /data-action="start-room"\s+disabled/);
  assert.match(html, /data-id="master" aria-pressed="true"/);
});
