import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { getGolfHole } from '../dist/src/golf-courses.js';
import { currentRoomRound } from '../dist/src/live-state.js';
import { roomScoreRows, roomSpectatorTargets } from '../dist/src/room-round.js';
import { SpectatorCamera } from '../dist/src/spectator-camera.js';

test('scorecard uses the real roster and hole count and keeps live strokes out of the total', () => {
  const golfers = [
    { id: 'me', scores: [4] },
    { id: 'peer', scores: [3, 5] },
    { id: 'guest', scores: [] },
    { id: 'bot', scores: [6] },
  ];
  const live = new Map([['peer', { hole: '1', strokes: 2 }], ['guest', { hole: '0', strokes: 3 }], ['bot', { hole: '1', strokes: 1 }]]);
  const rows = roomScoreRows(golfers, 3, 1, 'me', 2, undefined, id => live.get(id));
  assert.deepEqual(rows.map(({ id, total }) => [id, total]), [['me', 4], ['peer', 8], ['guest', null], ['bot', 6]]);
  assert.ok(rows.every(row => row.scores.length === 3));
  assert.deepEqual(rows.map(row => row.scores[1]), [
    { score: 2, saved: false }, { score: 5, saved: true }, { score: null, saved: false }, { score: 1, saved: false },
  ]);
  const submitted = roomScoreRows(golfers, 9, 1, 'me', 2, 3, id => live.get(id));
  assert.equal(submitted[0].total, 7);
  assert.equal(submitted[0].scores.length, 9);
  assert.deepEqual(submitted[0].scores[2], { score: null, saved: false });
  const official = roomScoreRows([{ id: 'me', scores: [4, 6] }], 3, 1, 'me', 2, 3, () => null);
  assert.equal(official[0].total, 10);
});

test('spectator choices exclude yourself, saved golfers and a hole that has advanced', () => {
  const members = [{ id: 'me', roundId: 'mine', nextHole: 1 }, { id: 'p', scores: [4] }, { id: 'q', scores: [] }, { id: 'bot', nextHole: 1 }];
  const room = { id: 'round', state: { phase: 'playing', hole: 0, members } };
  const ui = { cloud: { room, session: { user: { id: 'me' } } }, game: { state: 'complete', round: { cloudId: 'mine' } } };
  assert.equal(currentRoomRound(ui), room);
  assert.deepEqual(roomSpectatorTargets(room, 'me', 0).map(member => member.id), ['q']);
  assert.deepEqual(roomSpectatorTargets(room, 'me', 1), []);
  room.state.phase = 'finished';
  assert.deepEqual(roomSpectatorTargets(room, 'me', 0), []);
  ui.game.round.cloudId = 'different';
  assert.equal(currentRoomRound(ui), null);
});

test('free and follow cameras move the view without touching the gameplay ball', () => {
  const hole = getGolfHole(0, 0, false), ball = { x: hole.start.x, y: 1, z: hole.start.z };
  const look = new THREE.Vector3(ball.x, 1, ball.z);
  const camera = new THREE.PerspectiveCamera(45, 1.5, .1, 2000);
  camera.position.copy(look).add(new THREE.Vector3(0, 7, 15));
  const world = { hole, camera, look, group: new THREE.Group(), settings: { reducedMotion: true },
    renderGround: () => 0, cameraPosition: new THREE.Vector3(), cameraTarget: new THREE.Vector3() };
  let peer;
  const spectator = new SpectatorCamera(world, () => peer);
  const before = { ...ball };
  spectator.start(hole, ball);
  const initialZ = look.z;
  spectator.keys.add('KeyW');
  for (let i = 0; i < 30; i++) spectator.update(1 / 60);
  assert.ok(look.z < initialZ - 2);
  spectator.follow('friend');
  spectator.update(1 / 60);
  assert.equal(spectator.targetId, 'friend');
  const target = new THREE.Vector3(ball.x + 4, 12, ball.z - 35);
  peer = { viewTarget: target, sample: { active: true, ball: { vx: 0, vz: 35 } } };
  spectator.update(1 / 60);
  assert.equal(look.x, target.x);
  assert.equal(look.z, target.z);
  assert.ok(camera.position.y > 12);
  assert.deepEqual(ball, before);
  spectator.stop();
  assert.equal(spectator.active, false);
  assert.equal(spectator.targetId, null);
  assert.equal(spectator.keys.size, 0);
});
