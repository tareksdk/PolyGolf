import { normalizeInventory } from "./save.js";
import { SESSION_KEY, readSession, writeSession, clearSession, invalidRefresh } from './session-store.js';
import { RULES_VERSION, GOLF_HOLE_COUNT } from "./golf-courses.js";
export const SUPABASE_URL = "https://khbmuaitysznyxxefhou.supabase.co";
export const PUBLISHABLE_KEY = "sb_publishable_Xm4rfU4lZ2vBnrfy-p8utw_Dp11cOqR";
// Network failures surface as friendly messages instead of the browser's "Failed to fetch".
const OFFLINE = "Couldn’t reach the PolyGolf servers. Check your connection and try again.";
async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch (e) {
    throw Error(e?.name === "TimeoutError" || e?.name === "AbortError" ? "The PolyGolf servers took too long to answer. Please try again." : OFFLINE);
  }
}
export class GolfCloud {
  constructor(ui) {
    this.ui = ui;
    this.session = null;
    this._room = null;
    this.status = "Guest · saved on this device";
    this.lastRoom = 0;
    this.lastPresence = 0;
    this.busy = false;
    this.guestRepository = ui.progress.repository;
    this.timer = setInterval(() => this.poll(), 500);
    this.restore();
    window.addEventListener('online', () => { if (this.session && this.status !== 'Account synced') this.restore(); });
    window.addEventListener('storage', e => {
      if (e.key !== SESSION_KEY) return;
      if (!e.newValue) this.detach();
      else { const previous = this.session?.user.id; this.session = readSession(); if (previous !== this.session?.user.id) this.restore(); }
    });
  }
  get room() {
    return this._room;
  }
  set room(value) {
    this._room = value;
    try {
      if (value) sessionStorage.setItem("little-links.room", value.id);
      else sessionStorage.removeItem("little-links.room");
    } catch {}
  }
  async restore() {
    if(this.restoring)return;
    this.restoring=true;
    try {
      const s = readSession();
      if (!s) return;
      this.session = s;
      await this.refresh();
      const data = await this.call("me");
      if(this.session?.user.id!==s.user.id)return;
      this.attach(data);
      const roomId = sessionStorage.getItem("little-links.room");
      if (roomId) {
        try {
          const r = await this.call("room", { roomId });
          if (["waiting", "playing"].includes(r.room.state.phase)) {
            this.room = r.room;
            this.ui.screen = "multiplayer";
            this.ui.syncRoom(r.room);
          } else this.room = null;
        } catch {
          this.room = null;
        }
      }
    } catch (error) {
      if (error.sessionExpired) { clearSession(); this.detach(); }
      this.status = this.session ? 'Connection interrupted · sign-in saved' : 'Sign in to reconnect';
      this.ui.render();
      if(this.session){clearTimeout(this.reconnectTimer);this.reconnectTimer=setTimeout(()=>{if(this.session)this.restore();},60000);}
    } finally {
      this.restoring=false;
    }
  }
  attach(data) {
    this.ui.progress.repository = {
      load: () => data.state,
      save: () => {
        try {
          localStorage.setItem("little-links.preferences", JSON.stringify(this.ui.progress.data.settings));
        } catch {}
        return true;
      },
    };
    this.accept(data.state);
    try {
      Object.assign(
        this.ui.progress.data.settings,
        JSON.parse(localStorage.getItem("little-links.preferences") || "{}"),
      );
    } catch {}
    this.username = data.username;
    this.profile = data.profile || this.profile;
    this.status = "Account synced";
    if (data.maps)
      for (const editor of [this.ui.miniEditor, this.ui.golfEditor]) {
        if (!editor) continue;
        const mode = editor === this.ui.golfEditor ? "golf" : "mini";
        editor.saved = [
          ...editor.saved,
          ...data.maps
            .map((m) => m.layout)
            .filter((m) => (m.mode || "mini") === mode && !editor.saved.some((s) => s.name === m.name)),
        ];
      }
    this.ui.world.equip(this.ui.progress.data.equipment, this.ui.items);
    this.ui.render();
  }
  accept(state) {
    if (!state) return;
    const settings = this.ui.progress.data.settings;
    this.ui.progress.data = normalizeInventory({ ...state, settings });
  }
  async refresh() {
    if (!this.session) return;
    if (this.session.expires_at * 1000 > Date.now() + 60000) return;
    if (this.refreshing) return this.refreshing;
    const refresh = async () => {
      // Re-read inside the cross-tab lock: another tab may have rotated the token.
      const saved = readSession();
      if (!saved || saved.user.id !== this.session?.user.id) throw Error('Please sign in again.');
      this.session = saved;
      if (saved.expires_at * 1000 > Date.now() + 60000) return;
      const r = await request(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: saved.refresh_token }),
        signal: AbortSignal.timeout(15000),
      });
      const s = await r.json();
      if (!r.ok) { const e = Error(invalidRefresh(r) ? 'Your session expired. Please sign in again.' : OFFLINE); e.sessionExpired = invalidRefresh(r); throw e; }
      if (readSession()?.refresh_token !== saved.refresh_token) return;
      this.session = s;
      writeSession(s);
    };
    this.refreshing = (navigator.locks ? navigator.locks.request('polygolf-auth-refresh', refresh) : refresh()).catch(e => {
      if (e.sessionExpired) { clearSession(); this.detach(); }
      throw e;
    }).finally(() => (this.refreshing = null));
    return this.refreshing;
  }
  async call(action, data = {}) {
    if (!["login", "signup"].includes(action)) await this.refresh();
    const actor=this.session?.user.id;
    const response = await request(SUPABASE_URL + "/functions/v1/little-links", {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        ...(this.session ? { Authorization: "Bearer " + this.session.access_token } : {}),
      },
      body: JSON.stringify({ action, rulesVersion: RULES_VERSION, ...data }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || result.error) throw Error(result.error || "Could not connect. Please try again.");
    if (result.state && actor && actor===this.session?.user.id) this.accept(result.state);
    return result;
  }
  async signIn(action, username, password, policyAccepted = false) {
    const result = await this.call(action, { username, password, policyAccepted });
    this.session = result.session;
    writeSession(this.session);
    this.attach(await this.call("me"));
  }
  async logout() {
    if (this.room) await this.call("leave_room", { roomId: this.room.id }).catch(() => {});
    const token = this.session?.access_token;
    clearSession();
    this.detach();
    await request(SUPABASE_URL + "/auth/v1/logout", {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
  }
  detach() {
    clearTimeout(this.reconnectTimer);
    this.session = null;
    this.profile = null;
    this.room = null;
    this.ui.progress.repository = this.guestRepository;
    this.ui.progress.data = this.guestRepository.load();
    this.status = "Guest · saved on this device";
    this.ui.game.leave();
    this.ui.render();
  }
  async rest(path, body) {
    await this.refresh();
    const r = await request(SUPABASE_URL + "/rest/v1/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: "Bearer " + this.session.access_token,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw Error("Live connection interrupted.");
    return body ? null : r.json();
  }
  async poll() {
    if (this.busy || !this.session || !this.room) return;
    this.busy = true;
    try {
      const now = Date.now();
      if (now - this.lastRoom > 2200) {
        this.lastRoom = now;
        const { room } = await this.call("room", { roomId: this.room.id });
        this.room = room;
        this.ui.syncRoom(room);
      }
      // Position, gear and animation updates use private Realtime broadcasts.
      this.status = "Account synced";
    } catch (e) {
      this.status = "Reconnecting…";
      this.ui.connectionError = e.message;
    } finally {
      this.busy = false;
    }
  }
  async rankings(mode, course, metric = "score") {
    if(metric === 'elo'){
      const r=await request(SUPABASE_URL+'/functions/v1/little-links',{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'ranked_leaderboard'}),signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw Error('Ranked standings are unavailable. Please try again.');
      return (await r.json()).rows;
    }
    const column = metric === "time" ? "seconds" : "score";
    const r = await request(
      SUPABASE_URL +
        "/rest/v1/golf_records?mode=eq." +
        mode +
        "&course=eq." +
        course +
        "&hole_count=eq." +
        (mode === "golf" ? GOLF_HOLE_COUNT : 9) +
        "&rules_version=eq." +
        RULES_VERSION +
        "&order=" +
        column +
        ".asc&limit=100",
      { headers: { apikey: PUBLISHABLE_KEY }, signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw Error("Rankings are unavailable. Please try again.");
    const rows = await r.json(),
      seen = new Set();
    return rows
      .filter((r) => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      })
      .slice(0, 20);
  }
}
