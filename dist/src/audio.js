import {musicStyle,musicInterval,musicStep} from './music.js';
// All sound is synthesized locally: no sampled music or third-party audio assets.
export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.time = 0;
    this.note = 0;
    this.style = musicStyle(settings.musicStyle);
    this.nextNote = 0;
  }
  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.connect(this.master);
      this.effects = this.ctx.createGain();
      this.effects.connect(this.master);
      this.apply(this.settings);
    } catch {}
  }
  apply(s) {
    this.settings = s;
    const style=musicStyle(s.musicStyle),changed=style!==this.style;
    this.style=style;
    if (this.ctx) {
      if(changed){
        // Old notes fade out on their own bus; the new score starts immediately.
        const old=this.music;
        old.gain.setTargetAtTime(0,this.ctx.currentTime,.12);
        setTimeout(()=>old.disconnect(),1000);
        this.music=this.ctx.createGain();this.music.gain.value=0;this.music.connect(this.master);
        this.note=0;this.nextNote=this.ctx.currentTime+.03;
      }
      this.master.gain.setTargetAtTime(s.master, this.ctx.currentTime, 0.1);
      this.music.gain.setTargetAtTime(s.music * 0.24, this.ctx.currentTime, 0.1);
      this.effects.gain.setTargetAtTime(s.sfx * 0.3, this.ctx.currentTime, 0.1);
    }
  }
  tone(freq, duration = 0.15, type = "sine", volume = 0.3, delay = 0, music = false, attack = .009) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + Math.min(attack,duration*.8));
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(music ? this.music : this.effects);
    o.start(t);
    o.stop(t + duration + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  noise(duration = 0.12, volume = 0.3) {
    if (!this.ctx) return;
    const len = Math.round(this.ctx.sampleRate * duration),
      b = this.ctx.createBuffer(1, len, this.ctx.sampleRate),
      data = b.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(),
      g = this.ctx.createGain(),
      filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    s.buffer = b;
    g.gain.value = volume;
    s.connect(filter);
    filter.connect(g);
    g.connect(this.effects);
    s.start();
    s.onended = () => {
      s.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
  play(name) {
    this.start();
    if (name === "hit") {
      this.tone(290, 0.11, "triangle", 0.8);
      this.noise(0.055, 0.3);
    } else if (name === 'pirate-ship') {
      this.noise(.95,.9);
      this.tone(62,.7,'sawtooth',.55);
      this.tone(39,1.25,'sine',.75,.08);
      for(let i=0;i<4;i++)this.tone(180-i*30,.18,'triangle',.15,.18+i*.12);
    } else if (name === 'pumpkin') {
      this.noise(.22,.45);
      this.tone(95,.28,'triangle',.35);
      this.tone(52,.38,'sine',.28,.05);
    } else if (name === 'sand-impact' || name === 'sand-shot') this.noise(name === 'sand-shot' ? .19 : .28,.3);
    else if (name === "bounce") this.tone(175, 0.07, "sine", 0.3);
    else if (name === "water") {
      this.noise(0.6, 0.55);
      this.tone(140, 0.4, "sine", 0.4);
    } else if (["cup", "purchase", "level", "achievement", "collectible", "reward"].includes(name)) {
      const notes =
        name === "cup" ? [523, 659, 784, 1046] : name === "level" ? [392, 523, 659, 784, 1046] : [740, 988];
      notes.forEach((n, i) => this.tone(n, 0.45, "sine", 0.35, i * 0.1));
    } else if (name === "jump" || name === "boost") this.tone(520, 0.18, "triangle", 0.3);
    else if (name === "click") this.tone(620, 0.045, "sine", 0.18);
  }
  update(dt, moving) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const now=this.ctx.currentTime;
    if(this.settings.music>0&&this.settings.master>0){
      // Never catch up a backlog after a hidden tab or a slow device resumes.
      if(this.nextNote<now-.2)this.nextNote=now;
      if(this.nextNote<=now+.08){
        const delay=Math.max(0,this.nextNote-now);
        for(const n of musicStep(this.style,this.note++))this.tone(n.frequency,n.duration,n.type,n.volume,delay,true,n.attack);
        this.nextNote+=musicInterval(this.style);
      }
    }else{
      this.nextNote=now;
    }
    if (moving && Math.random() < dt * 8) this.noise(0.06, 0.03);
  }
}
