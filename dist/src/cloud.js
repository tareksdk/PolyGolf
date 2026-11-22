import { normalizeInventory } from "./save.js";
import { SESSION_KEY, readSession, writeSession, clearSession, invalidRefresh } from './session-store.js';
import { courseRotationKey } from "./rotating-courses.js";
import { RULES_VERSION, golfHoleCount } from "./golf-courses.js";
import { isLocalPreview } from './local-preview.js';
import { READ_ACTIONS, RANKINGS_TTL_MS, roomPollInterval, retryDelay } from './network-policy.js';
export const SUPABASE_URL = "https://khbmuaitysznyxxefhou.supabase.co";
export const PUBLISHABLE_KEY = "sb_publishable_Xm4rfU4lZ2vBnrfy-p8utw_Dp11cOqR";
// Network failures surface as friendly messages instead of the browser's "Failed to fetch".
const OFFLINE = "Couldn’t reach the PolyGolf servers. Check your connection and try again.";
const LOCAL_ONLY = 'Online features are unavailable in this local preview. Your solo rounds save on this device.';
let pausedUntil=0,pausedStatus=0;
const pauseKey='polygolf-network-pause-v1';
export function networkPauseUntil(){
  try{const saved=JSON.parse(localStorage.getItem(pauseKey)||'null');if(saved&&[402,429].includes(saved.status)&&saved.until>Date.now()&&saved.until<=Date.now()+600000&&saved.until>pausedUntil){pausedUntil=saved.until;pausedStatus=saved.status;}}catch{}
  return pausedUntil;
}
function pauseError(){const e=Error(pausedStatus===402?'The online service has reached its usage limit. Your sign-in is saved. Please try again later.':'Too many online requests. Please wait before trying again.');e.retryAfterMs=Math.max(0,pausedUntil-Date.now());return e;}
export async function request(url, options) {
  if(Date.now()<networkPauseUntil())throw pauseError();
  let response;
  try {
    response=await fetch(url, options);
  } catch (e) {
    throw Error(e?.name === "TimeoutError" || e?.name === "AbortError" ? "The PolyGolf servers took too long to answer. Please try again." : OFFLINE);
  }
  if([402,429].includes(response.status)){
    const header=response.headers.get('Retry-After'),seconds=Number(header);
    const retry=header?(Number.isFinite(seconds)?seconds*1000:Date.parse(header)-Date.now()):60000;
    const delay=response.status===402?600000:Math.min(600000,Math.max(60000,Number.isFinite(retry)?retry:60000));
    pausedUntil=Date.now()+delay;pausedStatus=response.status;
    try{localStorage.setItem(pauseKey,JSON.stringify({until:pausedUntil,status:pausedStatus}));}catch{}
    throw pauseError();
  }
  return response;
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
    this.crazyGames = ui.platform?.active === true;
    if (this.crazyGames) { this.localPreview = false; this.status = 'Progress saved through CrazyGames'; return; }
    this.localPreview = isLocalPreview();
    if (this.localPreview) { this.status = 'Local preview · saved on this device'; return; }
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
  get isGuest() {
    return !!this.session?.user?.app_metadata?.polygolf_guest;
  }
  set room(value) {
    if (value && value.id === this._room?.id && value.revision < this._room.revision) return;
    if (this._room?.id !== value?.id) { this.nextRoomPoll = 0; this.roomFailures = 0; }
    this._room = value;
    try {
      if (value) sessionStorage.setItem("little-links.room", value.id);
      else sessionStorage.removeItem("little-links.room");
    } catch {}
  }
  async restore() {
    if (this.crazyGames) return;
    if(this.localPreview)return;
    if(this.restoring)return;
    this.restoring=true;
    try {
      const s = readSession();
      if (!s) return;
      this.session = s;
      await this.refresh();
      const data = await this.call("me", { includeMaps: true });
      if(this.session?.user.id!==s.user.id)return;
      this.attach(data);
      const roomId = sessionStorage.getItem("little-links.room");
      if (roomId) {
        try {
          const r = await this.call("room", { roomId });
          if (["waiting", "starting", "playing"].includes(r.room.state.phase)) {
            this.room = r.room;
            this.ui.screen = "multiplayer";
            if (r.room.state.phase === "starting") this.ui.render();
            this.ui.syncRoom(r.room);
          } else this.room = null;
        } catch (error) {
          if (/not a member|room not found|older course/i.test(error.message)) this.room = null;
          else {
            this.status = 'Reconnecting to your room…';
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.restore(), Math.max(5000, error.retryAfterMs || 0));
          }
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
    this.usageVersion = data.usageVersion || 0;
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
    this.usernameChanges = data.usernameChanges ?? 0;
    this.profile = data.profile || this.profile;
    this.status = this.isGuest ? "Guest online · saved in this browser" : "Account synced";
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
    if(this.localPreview)return;
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
    if (!READ_ACTIONS.has(action)) return this.performCall(action, data);
    this.pendingReads ??= new Map();
    const key = JSON.stringify([this.session?.access_token || '', action, data]);
    if (this.pendingReads.has(key)) return this.pendingReads.get(key);
    const pending = this.performCall(action, data);
    this.pendingReads.set(key, pending);
    try { return await pending; }
    finally { if (this.pendingReads.get(key) === pending) this.pendingReads.delete(key); }
  }
  async performCall(action, data = {}) {
    if (this.crazyGames) throw Error('Online accounts and multiplayer are not available in this CrazyGames build. Your solo progress saves through CrazyGames.');
    // Public browsing is read-only. Local previews never restore an account,
    // send a bearer token, or permit mutations through this exception.
    if (this.localPreview) {
      if(action!=='community_maps')throw Error(LOCAL_ONLY);
      const mode=data.mode==='golf'?'golf':'mini',offset=Number.isInteger(data.offset)&&data.offset>=0?data.offset:0;
      const response=await request(`/__preview/community?mode=${mode}&offset=${offset}`,{signal:AbortSignal.timeout(20000)});
      const result=await response.json();
      if(!response.ok||result.error)throw Error(result.error||'Community maps are unavailable. Please try again.');
      return {maps:Array.isArray(result.maps)?result.maps:[]};
    }
    if (!["login", "signup", "guest"].includes(action)) await this.refresh();
    const actor=this.session?.user.id;
    const response = await request(SUPABASE_URL + "/functions/v1/little-links", {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        ...(this.session ? { Authorization: "Bearer " + this.session.access_token } : {}),
      },
      body: JSON.stringify({ action, rulesVersion: RULES_VERSION, ...(action === 'me' ? { includeMaps: false } : {}), ...data }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || result.error) throw Error(result.error || "Could not connect. Please try again.");
    if (!READ_ACTIONS.has(action)) { this.rankingGeneration = (this.rankingGeneration || 0) + 1; this.rankingCache?.clear(); this.pendingRankings?.clear(); }
    if(Number.isFinite(result.serverNow ?? result.server_now))this.serverOffset=(result.serverNow ?? result.server_now)-Date.now();
    if (actor && actor===this.session?.user.id) {
      if (result.state) this.accept(result.state);
      if (['me','change_username'].includes(action)) {
        this.username = result.username;
        this.usernameChanges = result.usernameChanges ?? 0;
        if (this.profile) this.profile.username = result.username;
      }
    }
    return result;
  }
  async signIn(action, username, password, policyAccepted = false) {
    if (this.room) throw Error('Leave your multiplayer room before switching accounts.');
    const result = await this.call(action, { username, password, policyAccepted });
    this.session = result.session;
    writeSession(this.session);
    this.attach(await this.call("me", { includeMaps: true }));
  }
  async ensureGuest() {
    if (this.crazyGames) return;
    if (this.localPreview) return;
    if (this.session) return;
    if (this.joiningGuest) return this.joiningGuest;
    const connect = async () => {
      const saved = readSession();
      this.session = saved || (await this.call('guest')).session;
      writeSession(this.session);
      this.attach(await this.call('me', { includeMaps: true }));
    };
    this.joiningGuest = (navigator.locks ? navigator.locks.request('polygolf-guest-connect', connect) : connect())
      .finally(() => { this.joiningGuest = null; });
    return this.joiningGuest;
  }
  async logout() {
    if (this.localPreview) return;
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
    this.usageVersion = 0;
    this.pendingReads?.clear();
    this.room = null;
    this.ui.progress.repository = this.guestRepository;
    const settings = this.ui.progress.data.settings;
    this.ui.progress.data = this.guestRepository.load();
    this.ui.progress.data.settings = settings;
    this.status = "Guest · saved on this device";
    this.ui.game.leave();
    this.ui.render();
  }
  async rest(path, body) {
    if (this.localPreview) throw Error(LOCAL_ONLY);
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
    const now = Date.now();
    if (now < (this.nextRoomPoll || 0)) return;
    const roomId = this.room.id, actor = this.session.user.id;
    this.busy = true;
    try {
      const result = await this.call('room', { roomId, knownRevision: this.room.revision });
      if (this.session?.user.id !== actor || this.room?.id !== roomId) return;
      if (result.room) this.room = result.room;
      else if (!result.unchanged || result.roomId !== roomId || result.revision > this.room.revision) throw Error('Room update interrupted.');
      this.roomFailures = 0;
      this.nextRoomPoll = Date.now() + roomPollInterval(this.room, typeof document !== 'undefined' && document.hidden);
      this.ui.syncRoom(this.room);
      // Position, gear and animation updates use private Realtime broadcasts.
      this.status = this.isGuest ? "Guest online · saved in this browser" : "Account synced";
    } catch (e) {
      if (this.session?.user.id !== actor || this.room?.id !== roomId) return;
      if (/not a member of this room/i.test(e.message)) {
        this.room = null;
        this.ui.closeModal();
        if (this.ui.game.round?.roomRule) this.ui.game.leave();
        this.ui.screen = 'multiplayer';
        this.ui.render();
        this.ui.toast('Your seat in this room has closed.');
        return;
      }
      this.roomFailures = (this.roomFailures || 0) + 1;
      this.nextRoomPoll = Date.now() + retryDelay(this.roomFailures);
      this.status = "Reconnecting…";
      this.ui.connectionError = e.message;
    } finally {
      this.busy = false;
    }
  }
  async rankings(mode, course, metric = "score", offset = 0) {
    if (this.localPreview) throw Error(LOCAL_ONLY);
    const key = JSON.stringify([mode, course, metric, offset, mode === 'golf' ? courseRotationKey(course) : '']);
    this.rankingCache ??= new Map();
    const cached = this.rankingCache.get(key);
    if (cached && cached.until > Date.now()) return structuredClone(cached.rows);
    this.pendingRankings ??= new Map();
    if (this.pendingRankings.has(key)) return structuredClone(await this.pendingRankings.get(key));
    const generation = this.rankingGeneration || 0;
    const pending = this.fetchRankings(mode, course, metric, offset);
    this.pendingRankings.set(key, pending);
    try {
      const rows = await pending;
      if (generation === (this.rankingGeneration || 0)) {
        if (this.rankingCache.size >= 50) this.rankingCache.delete(this.rankingCache.keys().next().value);
        this.rankingCache.set(key, { rows, until: Date.now() + RANKINGS_TTL_MS });
      }
      return structuredClone(rows);
    } finally { if (this.pendingRankings.get(key) === pending) this.pendingRankings.delete(key); }
  }
  async fetchRankings(mode, course, metric, offset) {
    if(metric === 'elo'){
      const r=await request(SUPABASE_URL+'/functions/v1/little-links',{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'ranked_leaderboard'}),signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw Error('Ranked standings are unavailable. Please try again.');
      return (await r.json()).rows;
    }
    const r=await request(SUPABASE_URL+'/rest/v1/rpc/golf_course_rankings',{
      method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({p_mode:mode,p_course:course,p_metric:metric,p_rotation:mode==='golf'?courseRotationKey(course):'',p_offset:offset,p_limit:100}),
      signal:AbortSignal.timeout(10000)
    });
    if(!r.ok)throw Error('Rankings are unavailable. Please try again.');
    return r.json();
  }
}
