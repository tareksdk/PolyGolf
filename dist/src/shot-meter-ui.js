export function clampMeter(value, min = 0, max = 1) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;
}

export function flowDirectionGauge() {
  return `<div class="flow-direction" id="flow-direction" data-phase="sweep"><div class="accuracy-label"><span>LEFT</span><span id="accuracy-text">DIRECTION · CENTRE</span><span>RIGHT</span></div><svg class="flow-gauge" viewBox="0 0 240 96" role="img" aria-label="Direction timing gauge. Press near the green centre, then hold for power."><path class="flow-gauge-rim" d="M58.4 55.3 A68 68 0 0 1 181.6 55.3"/><path class="flow-gauge-track" d="M58.4 55.3 A68 68 0 0 1 181.6 55.3"/><path class="flow-gauge-sweet" d="M107.7 17.1 A68 68 0 0 1 132.3 17.1"/><path class="flow-gauge-ticks" d="M58.4 55.3l-5.4 -2.5M76.3 31.9l-3.9 -4.6M120 16v-7M163.7 31.9l3.9 -4.6M181.6 55.3l5.4 -2.5"/><g id="flow-direction-needle" transform="rotate(0 120 84)"><path class="flow-needle-edge" d="M120 83V23"/><path class="flow-needle" d="M120 83V23"/><path class="flow-needle-tip" d="M120 15l-5 12h10z"/></g><circle class="flow-gauge-hub" cx="120" cy="84" r="5"/><text class="flow-gauge-caption" x="48" y="73" text-anchor="middle">L</text><text class="flow-gauge-caption" x="192" y="73" text-anchor="middle">R</text></svg></div>`;
}

export function flowNeedleAngle(accuracy) {
  return Math.max(-1,Math.min(1,accuracy || 0))*65;
}
