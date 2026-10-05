// Transport boundary for a future server-authoritative, simultaneous 2–8-player lobby.
// The shipped game uses SoloSession; no network service is needed to play.
export class SoloSession {
  constructor(player) {
    this.players = new Map([[player.id, player]]);
    this.hole = 0;
    this.listeners = new Set();
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(type, payload) {
    for (const listener of this.listeners) listener({ type, payload });
  }
  setHole(hole) {
    this.hole = hole;
    for (const p of this.players.values()) p.finished = false;
    this.emit("hole", { hole });
  }
  submitShot(playerId, shot) {
    if (!this.players.has(playerId)) return false;
    this.emit("shot", { playerId, shot, hole: this.hole });
    return true;
  }
  finish(playerId, strokes) {
    const p = this.players.get(playerId);
    if (p) {
      p.finished = true;
      p.strokes = strokes;
      this.emit("score", { playerId, strokes });
    }
    return [...this.players.values()].every((p) => p.finished);
  }
}
