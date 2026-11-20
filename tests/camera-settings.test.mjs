import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, LocalSaveRepository } from '../dist/src/save.js';
import { readPreferences, savePreferences } from '../dist/src/device-settings.js';
import { UIManager } from '../dist/src/ui.js';

test('cinematic mode defaults off, survives save reload, and rejects old invalid values', () => {
  let raw;
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const repository = new LocalSaveRepository(storage), save = defaultSave();
  assert.equal(save.settings.cinematicCamera, false);
  save.settings.cinematicCamera = true;
  repository.save(save);
  assert.equal(repository.load().settings.cinematicCamera, true);
  delete save.settings.cinematicCamera;
  repository.save(save);
  assert.equal(repository.load().settings.cinematicCamera, false);
  save.settings.cinematicCamera = 'false';
  repository.save(save);
  assert.equal(repository.load().settings.cinematicCamera, false);
  save.settings.cinematicCamera = true;
  savePreferences(save.settings, storage);
  assert.equal(readPreferences({}, storage).cinematicCamera, true);
});

test('camera mode and skip controls preserve the shot and save only an intentional mode change', async () => {
  let saved = 0, skipped = 0, recentered = 0, settingsUpdates = 0;
  const shot = { power: .73, charging: true, strokes: 2 };
  const ui = {
    progress: { data: defaultSave(), save() { saved++; } },
    audio: { apply() {} },
    world: { settingsChanged(settings) { settingsUpdates++; this.settings = { ...settings }; } },
    game: { ...shot, skipCamera() { skipped++; }, resetCamera() { recentered++; } },
    tickCameraControls() {},
    changeSetting: UIManager.prototype.changeSetting,
  };
  await UIManager.prototype.action.call(ui, 'camera-mode');
  assert.equal(ui.progress.data.settings.cinematicCamera, true);
  assert.equal(saved, 1);
  assert.equal(settingsUpdates, 1);
  await UIManager.prototype.action.call(ui, 'camera-skip');
  assert.equal(skipped, 1);
  assert.equal(saved, 1, 'skipping this shot must not change the saved preference');
  await UIManager.prototype.action.call(ui, 'camera-recenter');
  assert.equal(recentered, 1);
  await UIManager.prototype.action.call(ui, 'camera-mode');
  assert.equal(ui.progress.data.settings.cinematicCamera, false);
  assert.equal(skipped, 2, 'turning the preference off exits an active cinematic');
  assert.equal(saved, 2);
  assert.deepEqual({ power: ui.game.power, charging: ui.game.charging, strokes: ui.game.strokes }, shot);
});

test('skip remains available through the hole finish and disappears when manual control takes over', () => {
  const originalDocument = globalThis.document;
  let focused = false, pressed = 'true';
  const skip = { hidden: true };
  globalThis.document = { activeElement: null };
  const ui = {
    progress: { data: defaultSave() },
    hud: {
      cameraMode: { isConnected: true, getAttribute: () => pressed, setAttribute: (_, value) => { pressed = value; } },
      cameraLabel: {}, cameraSkip: skip,
    },
    world: { cameraRig: { isCinematic: true }, canvas: { focus() { focused = true; } } },
    game: { state: 'complete', holeReveal: { remaining: .9 } },
  };
  try {
    UIManager.prototype.tickCameraControls.call(ui);
    assert.equal(skip.hidden, false, 'the finish is skippable before the score dialog opens');
    assert.equal(pressed, 'false');
    assert.equal(ui.hud.cameraLabel.textContent, 'Default');
    globalThis.document.activeElement = skip;
    ui.world.cameraRig.isCinematic = false;
    UIManager.prototype.tickCameraControls.call(ui);
    assert.equal(skip.hidden, true);
    assert.equal(focused, true, 'a disappearing focused skip control returns keyboard control to the course');
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
