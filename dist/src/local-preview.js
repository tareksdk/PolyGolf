import { SAVE_KEY } from './save.js';

export const PREVIEW_SAVE_KEY = 'polygolf.local-preview.0.7';
export function isLocalPreview(target = globalThis.location) {
  return !!target && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(target.hostname);
}

// A separate browser save lets this experimental build be played without changing an account.
export function previewStorage(storage) {
  const area = () => storage ?? globalThis.localStorage;
  return {
    getItem(key) {
      const store = area();
      return key === SAVE_KEY ? store.getItem(PREVIEW_SAVE_KEY) ?? store.getItem(SAVE_KEY) : store.getItem(key);
    },
    setItem(key, value) { area().setItem(key === SAVE_KEY ? PREVIEW_SAVE_KEY : key, value); },
    removeItem(key) { area().removeItem(key === SAVE_KEY ? PREVIEW_SAVE_KEY : key); },
  };
}

export function installLocalPreview(ui) {
  if (!ui.cloud.localPreview) return;
  ui.localPreview = true;
  ui.launch = async (index, practice = false) => {
    const mode = ui.mode;
    ui.closeModal();
    ui.audio.start();
    ui.world.equip(ui.progress.data.equipment, ui.items);
    ui.progress.startRound(practice);
    ui.game.start(index, practice, { mode, round: { localPreview: true } });
  };
}
