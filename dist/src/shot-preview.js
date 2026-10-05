import { GolfPhysics } from './golf-physics.js';

// The guide uses the same fixed-step physics as a real shot. Chunking also gives
// browsers without Workers an interruptible fallback instead of a long UI task.
export function previewTask(hole, ball, dir, power, options) {
  const ghost = new GolfPhysics(), points = [], interval = options.club === 'putter' ? 8 : 12;
  ghost.load(hole); ghost.ball = {...ball}; ghost.shoot(dir.x, dir.z, power, options);
  let tick = 0;
  return {
    step(budget = 128) {
      for (let n = 0; n < budget && tick < 4200 && ghost.active; n++, tick++) {
        ghost.update(1 / 120);
        if (tick % interval === 0) points.push(ghost.ball.x, ghost.ball.y, ghost.ball.z);
        if (ghost.events.includes('water') || ghost.sunk) {ghost.active = false; break;}
      }
      return tick >= 4200 || !ghost.active;
    },
    result: () => new Float32Array(points),
  };
}

export class ShotPreview {
  constructor(onResult) {
    this.onResult = onResult; this.generation = 0; this.sequence = 0;
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./shot-preview-worker.js', import.meta.url), {type:'module'});
        this.worker.onmessage = ({data}) => this.finish(data.id, data.points);
        this.worker.onerror = event => {
          event.preventDefault(); this.worker.terminate(); this.worker = null;
          const active = this.active; this.active = null;
          if (!this.queued && active?.generation === this.generation) this.queued = active;
          this.run();
        };
      } catch { this.worker = null; }
    }
  }
  reset() {this.generation++; this.queued = null;}
  request(hole, ball, dir, power, options) {
    this.queued = {id:++this.sequence, generation:this.generation, hole, ball:{...ball}, dir:{...dir}, power, options:{...options}};
    this.run();
  }
  run() {
    if (this.active || !this.queued) return;
    const job = this.active = this.queued; this.queued = null;
    if (this.worker) {
      const {hole, ...message} = job;
      if (this.sentHole !== hole) {message.hole = hole; this.sentHole = hole;}
      this.worker.postMessage(message);
    } else {
      const task = previewTask(job.hole, job.ball, job.dir, job.power, job.options);
      const step = () => {
        if (job.generation !== this.generation) {this.finish(job.id, null); return;}
        if (task.step()) this.finish(job.id, task.result());
        else setTimeout(step, 0);
      };
      setTimeout(step, 0);
    }
  }
  finish(id, points) {
    const job = this.active;
    if (!job || id !== job.id) return;
    this.active = null;
    if (points && job.generation === this.generation) this.onResult(points, job);
    this.run();
  }
}
