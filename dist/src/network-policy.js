// Cosmetic updates stay on Realtime; these checks only reconcile server-owned state.
export const BACKGROUND_POLL_MS = 300000;
export const SITE_SETTINGS_TTL_MS = 600000;
export const RANKINGS_TTL_MS = 60000;
export const READ_ACTIONS = new Set(['me', 'room', 'friends', 'notifications', 'honors_inbox', 'profile', 'search_players', 'community_maps', 'ranked_status']);

export function roomPollInterval(room, hidden = false) {
  if (hidden) return 30000;
  const state = room?.state;
  if (state?.phase !== 'playing') return 4000;
  if (state.rule && (!state.holeStartAt || state.rule === 'turn' || state.rule === 'distance')) return 1800;
  return 8000;
}

export function retryDelay(failures, base = 4000, cap = 60000) {
  return Math.min(cap, base * 2 ** Math.min(Math.max(0, failures), 8));
}
