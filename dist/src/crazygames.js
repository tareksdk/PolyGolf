import { SAVE_KEY } from './save.js';

export const CRAZYGAMES_SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
export const MIGRATION_KEY = 'polygolf.crazygames-migrated.v1';
// Never copy sessions, credentials or generated thumbnails into the portal.
export const PROGRESS_KEYS = [SAVE_KEY, 'little-links.preferences', 'little-links.theme',
  'polygolf.first-swing.v1', 'little-links.map-draft', 'little-links.maps',
  'little-links.golf-draft', 'little-links.golf-maps', 'polygolf.planetfall.records.v1'];

export function isCrazyGamesContext(target = globalThis.window) {
  if (!target?.location) return false;
  const params = new URLSearchParams(target.location.search);
  if (params.get('platform') === 'crazygames') return true;
  const sources = [target.location.href, target.document?.referrer,
    ...Array.from(target.location.ancestorOrigins ?? [])];
  return sources.some(source => {
    try {
      const host = new URL(source).hostname;
      return host === 'crazygames.com' || host.endsWith('.crazygames.com');
    } catch { return false; }
  });
}

function validateSave(raw) {
  if (raw == null) return;
  const saved = JSON.parse(raw);
  if (saved?.version !== 1 || !Array.isArray(saved.owned)) throw Error('Unreadable save');
}

export function migrateCrazyGamesSave(data, local) {
  // Read first: an unavailable cloud must never look like a brand-new player.
  const existing = new Map(PROGRESS_KEYS.map(key => [key, data.getItem(key)]));
  validateSave(existing.get(SAVE_KEY));
  let migrated = false;
  try { migrated = local?.getItem(MIGRATION_KEY) === 'done'; } catch {}
  if (existing.get(SAVE_KEY) != null || migrated) return;
  let previous;
  try { previous = new Map(PROGRESS_KEYS.map(key => [key, local?.getItem(key)])); }
  catch { return; }
  try { validateSave(previous.get(SAVE_KEY)); } catch { return; }
  if (previous.get(SAVE_KEY) == null) return;
  // Main save last: a failed partial migration can safely retry.
  for (const key of [...PROGRESS_KEYS.slice(1), SAVE_KEY]) {
    if (existing.get(key) == null && previous.get(key) != null) data.setItem(key, previous.get(key));
  }
  try { local?.setItem(MIGRATION_KEY, 'done'); } catch {}
}

export function createCrazyGamesPlatform(sdk, reload = () => location.reload()) {
  let locked = false, playing = false;
  const assertReady = () => { if (locked) throw Error('CrazyGames account changed. Reload to continue.'); };
  const storage = {
    getItem(key) { assertReady(); return sdk.data.getItem(key); },
    setItem(key, value) { assertReady(); sdk.data.setItem(key, value); },
    removeItem(key) { assertReady(); sdk.data.removeItem(key); },
  };
  sdk.user.addAuthListener(() => {
    // The SDK has switched accounts. Block old in-memory and pagehide saves
    // before reloading, or the old golfer could overwrite the new account.
    locked = true;
    reload();
  });
  return {
    active: true, storage,
    get locked() { return locked; },
    loadingComplete() { sdk.game.loadingStop(); },
    updateGameplay(state) {
      const next = !locked && state === 'playing';
      if (next === playing) return;
      playing = next;
      try { next ? sdk.game.gameplayStart() : sdk.game.gameplayStop(); } catch {}
    },
  };
}

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(Error(message)), ms);
  })]).finally(() => clearTimeout(timer));
}

export async function initializeCrazyGames(target = globalThis.window) {
  if (!isCrazyGamesContext(target)) return { active: false };
  try {
    if (!target.CrazyGames?.SDK) {
      await withTimeout(new Promise((resolve, reject) => {
        const script = target.document.createElement('script');
        script.src = CRAZYGAMES_SDK_URL;
        script.onload = resolve;
        script.onerror = () => reject(Error('SDK unavailable'));
        target.document.head.append(script);
      }), 15000, 'SDK took too long to load');
    }
    const sdk = target.CrazyGames?.SDK;
    await withTimeout(sdk.init(), 20000, 'CrazyGames took too long to connect');
    if (!['local', 'crazygames'].includes(sdk.environment)) throw Error('Open inside CrazyGames Preview');
    sdk.game.loadingStart();
    let local;
    try { local = target.localStorage; } catch {}
    migrateCrazyGamesSave(sdk.data, local);
    return createCrazyGamesPlatform(sdk, () => target.location.reload());
  } catch {
    const error = Error('Your CrazyGames save could not be opened. Check your connection and try again. In the Developer Portal, select “Yes, using the Data Module” and open the game in Preview.');
    error.crazygamesSave = true;
    throw error;
  }
}
