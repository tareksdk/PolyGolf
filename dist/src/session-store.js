// Store tokens only. Passwords never leave the sign-in request.
export const SESSION_KEY = 'little-links.session';
export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.access_token || !s.refresh_token || !s.user?.id) return null;
    writeSession(s); // Migrate existing tab-only sessions without signing out.
    return s;
  } catch { return null; }
}
export function writeSession(s) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); sessionStorage.removeItem(SESSION_KEY); }
  catch { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {} }
}
export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) try { storage.removeItem(SESSION_KEY); } catch {}
}
export const invalidRefresh = response => response.status === 400 || response.status === 401 || response.status === 403;
