import { renderMinimapScene } from './minimap-scene.js';

const WIDTH = 240, HEIGHT = 212, GAP = 12;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// One uniform scale keeps distances and hazards honest on every course shape.
export function minimapModel(hole) {
  const golf = hole.mode === 'golf';
  const route = hole.route || hole.samples?.map(p => [p.x, p.z]) || hole.points;
  const margin = golf ? Math.max(24, hole.width * .8) : hole.width * .8;
  const extents = route.map(([x, z]) => ({ x, z, rx: margin, rz: margin }));
  extents.push({ ...hole.start, rx: margin, rz: margin }, { ...hole.cup, rx: margin, rz: margin });
  for (const p of [...(hole.water || []), ...(hole.bunkers || []), ...(hole.islands || []), ...(hole.green ? [hole.green] : [])])
    extents.push({ x: p.x, z: p.z, rx: Math.max(p.rx, p.rz) + 8, rz: Math.max(p.rx, p.rz) + 8 });
  for (const p of hole.planets || []) extents.push({ x: p.x, z: p.z, rx: p.radius + 8, rz: p.radius + 8 });
  const minX = Math.min(...extents.map(p => p.x - p.rx)), maxX = Math.max(...extents.map(p => p.x + p.rx));
  const minZ = Math.min(...extents.map(p => p.z - p.rz)), maxZ = Math.max(...extents.map(p => p.z + p.rz));
  const scale = Math.min((WIDTH - 36) / Math.max(1, maxX - minX), (HEIGHT - 36) / Math.max(1, maxZ - minZ));
  const project = (x, z) => ({ x: WIDTH / 2 + (x - (minX + maxX) / 2) * scale, y: HEIGHT / 2 + (z - (minZ + maxZ) / 2) * scale });
  return { route, golf, scale, project, minX, maxX, minZ, maxZ };
}

export function minimapMarker(model, ball) {
  const point = model.project(ball.x, ball.z);
  const x = clamp(point.x, 10, WIDTH - 10), y = clamp(point.y, 14, HEIGHT - 12);
  return { x, y, outside: x !== point.x || y !== point.y, angle: Math.atan2(point.y - y, point.x - x) * 180 / Math.PI };
}

// A saved position is a fraction of the available space, so resizing cannot lose it.
export function minimapPosition(viewport, size, position, top = 64) {
  const spanX = Math.max(0, viewport.width - size.width - GAP * 2), spanY = Math.max(0, viewport.height - size.height - GAP * 2);
  return {
    x: GAP + spanX * clamp(position?.x ?? 1, 0, 1),
    y: position ? GAP + spanY * clamp(position.y, 0, 1) : clamp(top, GAP, GAP + spanY),
  };
}

export function minimapArtwork(hole, model = minimapModel(hole), landmarks = []) {
  return renderMinimapScene(hole, model, landmarks);
}

export function installMinimap(ui) {
  const widget = document.createElement('aside');
  widget.className = 'course-minimap'; widget.setAttribute('aria-label', 'Course minimap'); widget.hidden = true;
  widget.innerHTML = `<div class="minimap-expanded" id="minimap-expanded"><header><button type="button" class="minimap-grab" aria-label="Move minimap. Drag or use arrow keys; Home resets position." title="Drag to move · Arrow keys when focused"><svg class="minimap-grip" viewBox="0 0 10 16" aria-hidden="true"><path d="M2 2h1v1H2zm5 0h1v1H7zM2 7h1v1H2zm5 0h1v1H7zM2 12h1v1H2zm5 0h1v1H7z"/></svg><span><b>COURSE MAP</b><small class="minimap-hole"></small></span></button><button type="button" class="minimap-collapse" aria-label="Minimize minimap" aria-expanded="true" aria-controls="minimap-expanded" title="Minimize minimap">−</button></header><svg class="minimap-chart" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Top-down map of the current hole"><g class="minimap-art"></g><g class="minimap-tee"><circle r="5"/><text y="3" text-anchor="middle">T</text></g><g class="minimap-cup"><ellipse cy="2" rx="5" ry="2.5"/><path d="M0 1 V-17"/><path d="M1 -17 H13 L9 -12 H1 Z"/></g><g class="minimap-you"><path class="minimap-outside" d="M8 0 L14 -3 L14 3 Z"/><circle class="minimap-ball-rim" r="7"/><circle class="minimap-ball" r="4"/><text class="minimap-you-label" x="0" y="-12" text-anchor="middle">YOU</text></g></svg><footer><span><i class="minimap-key-ball"></i>You</span><span><i class="minimap-key-tee"></i>Tee</span><span><i class="minimap-key-hole"></i>Hole</span><strong class="minimap-distance"></strong></footer></div><button type="button" class="minimap-tab" aria-label="Expand minimap" aria-expanded="false" aria-controls="minimap-expanded" title="Open course map" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5 L7 12 L14 19"/></svg><span>MAP</span></button>`;
  document.body.append(widget);
  const expanded = widget.querySelector('.minimap-expanded'), tab = widget.querySelector('.minimap-tab');
  const grab = widget.querySelector('.minimap-grab'), collapse = widget.querySelector('.minimap-collapse');
  const chart = widget.querySelector('.minimap-chart'), art = widget.querySelector('.minimap-art');
  const tee = widget.querySelector('.minimap-tee'), cup = widget.querySelector('.minimap-cup'), you = widget.querySelector('.minimap-you');
  const outside = widget.querySelector('.minimap-outside'), label = widget.querySelector('.minimap-you-label');
  const distance = widget.querySelector('.minimap-distance');
  let hole = null, model = null, collapsed = false, position = null, drag = null, lastLabel = '';
  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
  const startY = () => {
    let top = 16;
    for (const el of ui.root.querySelectorAll('.course-weather,.ph-tools')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.top < window.innerHeight * .3) top = Math.max(top, r.bottom + GAP);
    }
    return top;
  };
  const place = () => {
    if (widget.hidden) return;
    const size = widget.getBoundingClientRect(), v = viewport();
    const p = collapsed ? { x: v.width - size.width, y: clamp(startY(), GAP, Math.max(GAP, v.height - size.height - GAP)) } : minimapPosition(v, size, position, startY());
    widget.style.left = `${p.x}px`; widget.style.top = `${p.y}px`;
  };
  const savePosition = (x, y) => {
    const size = widget.getBoundingClientRect(), v = viewport();
    position = { x: clamp((x - GAP) / Math.max(1, v.width - size.width - GAP * 2), 0, 1), y: clamp((y - GAP) / Math.max(1, v.height - size.height - GAP * 2), 0, 1) };
    place();
  };
  const finishDrag = () => {
    if (!drag) return;
    const id = drag.id; drag = null; widget.classList.remove('is-dragging');
    if (grab.hasPointerCapture(id)) grab.releasePointerCapture(id);
  };
  grab.addEventListener('pointerdown', e => {
    if (e.button !== 0 || drag) return;
    e.preventDefault(); ui.game.clearInput(); grab.focus({ preventScroll: true });
    const r = widget.getBoundingClientRect(); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: r.left, top: r.top };
    grab.setPointerCapture(e.pointerId); widget.classList.add('is-dragging');
  });
  grab.addEventListener('pointermove', e => {
    if (drag?.id !== e.pointerId) return;
    savePosition(drag.left + e.clientX - drag.x, drag.top + e.clientY - drag.y);
  });
  grab.addEventListener('pointerup', e => { if (drag?.id === e.pointerId) { finishDrag(); ui.world.canvas.focus({ preventScroll: true }); } });
  grab.addEventListener('pointercancel', finishDrag); grab.addEventListener('lostpointercapture', finishDrag);
  grab.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'Escape'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation(); ui.game.clearInput();
    if (e.key === 'Escape') { ui.world.canvas.focus({ preventScroll: true }); return; }
    if (e.key === 'Home') { position = null; place(); return; }
    const step = e.shiftKey ? 24 : 8, r = widget.getBoundingClientRect();
    savePosition(r.left + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0), r.top + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0));
  });
  widget.addEventListener('pointerdown', () => ui.game.clearInput());
  const toggle = value => {
    finishDrag(); collapsed = value; expanded.hidden = collapsed; tab.hidden = !collapsed;
    widget.classList.toggle('is-collapsed', collapsed); place(); update(); ui.world.canvas.focus({ preventScroll: true });
  };
  collapse.addEventListener('click', () => toggle(true)); tab.addEventListener('click', () => toggle(false));
  function update() {
    const g = ui.game, active = !!g.hole && ['playing', 'paused', 'complete'].includes(g.state) && !ui.tutorialActive;
    const wasHidden = widget.hidden; widget.hidden = !active;
    if (!active) { finishDrag(); return; }
    widget.inert = g.state !== 'playing' || !!ui.modalRoot.children.length || ui.root.inert;
    if (hole !== g.hole) {
      finishDrag(); hole = g.hole; model = minimapModel(hole); art.innerHTML = minimapArtwork(hole, model, ui.world.minimapScenery?.hole === hole ? ui.world.minimapScenery.features : []);
      widget.querySelector('.minimap-hole').textContent = `Hole ${g.index + 1} / ${g.round.holeCount} · ${hole.space ? 'No par' : `Par ${hole.par}`}`;
      for (const [el, p] of [[tee, hole.start], [cup, hole.cup]]) { const q = model.project(p.x, p.z); el.setAttribute('transform', `translate(${q.x} ${q.y})`); }
      place();
    } else if (wasHidden) place();
    if (collapsed) return;
    const ball = g.physics.ball, p = minimapMarker(model, ball);
    you.setAttribute('transform', `translate(${p.x} ${p.y})`);
    outside.style.display = p.outside ? '' : 'none'; outside.setAttribute('transform', `rotate(${p.angle})`);
    tee.style.display = Math.hypot(ball.x - hole.start.x, ball.z - hole.start.z) > 4 / model.scale ? '' : 'none';
    label.textContent = p.outside ? 'YOU · OFF MAP' : 'YOU';
    label.setAttribute('y', p.y < 32 ? '22' : '-12');
    label.setAttribute('x', p.x < 48 ? '24' : p.x > WIDTH - 48 ? '-24' : '0');
    const text = `${Math.round(Math.hypot(ball.x - hole.cup.x, ball.z - hole.cup.z))} m`;
    if (distance.textContent !== text) distance.textContent = text;
    const description = `${hole.name}. You are ${text} from the hole.${p.outside ? ' Ball is beyond the map edge; the arrow points toward it.' : ''}`;
    if (description !== lastLabel) { chart.setAttribute('aria-label', description); lastLabel = description; }
  }
  const render = ui.render.bind(ui), tick = ui.tick.bind(ui);
  ui.render = () => { render(); update(); };
  ui.tick = () => { tick(); update(); };
  window.addEventListener('resize', () => { finishDrag(); place(); });
  window.addEventListener('blur', finishDrag);
  new ResizeObserver(place).observe(widget);
  update();
}
