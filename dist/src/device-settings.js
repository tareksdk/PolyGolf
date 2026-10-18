import { DEFAULT_SETTINGS } from './save.js';
export const PREFERENCES_KEY = 'little-links.preferences';
export function readPreferences(fallback = {}, storage) {
  const result = {...DEFAULT_SETTINGS, ...fallback};
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(PREFERENCES_KEY) || '{}');
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (typeof saved[key] === typeof value && (typeof value !== 'number' || Number.isFinite(saved[key]))) result[key] = saved[key];
    }
  } catch {}
  return result;
}
export function savePreferences(settings, storage) {
  try { (storage ?? globalThis.localStorage)?.setItem(PREFERENCES_KEY, JSON.stringify(Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(key => [key, settings[key]])))); } catch {}
}
