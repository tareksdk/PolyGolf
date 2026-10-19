// One vector design is shared by live nameplates and the 3D collection artwork.
const BADGES = {
  paw:[['M6 14c1-2 3-5 6-5s5 3 6 5c3 4-1 7-6 5-5 2-9-1-6-5Z','fill'],['M4 6a2 3 0 1 0 4 0 2 3 0 1 0-4 0M10 4a2 3 0 1 0 4 0 2 3 0 1 0-4 0M16 6a2 3 0 1 0 4 0 2 3 0 1 0-4 0','fill']],
  vault: [
    ['M3 6h18v15H3Zm-1 0 3-4h14l3 4M3 10h18M7 2v8m10-8V2','stroke'],
    ['m12 11 1.5 3 3.5.5-2.5 2.3.6 3.2-3.1-1.5L9 20l.6-3.2L7 14.5l3.5-.5Z','fill'],
  ],
  moon: [
    ['M17 3a9 9 0 1 0 4 14A8 8 0 0 1 17 3Z','stroke'],
    ['m6 7 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z','fill'],
  ],
  crown: [
    ['m3 7 5 4 4-7 4 7 5-4-2 12H5ZM5 22h14','stroke'],
    ['m12 12 2 3-2 3-2-3Z','fill'],
  ],
  clover: [
    ['M12 11C2 12 2 3 7 3c3 0 5 4 5 8 0-4 2-8 5-8 5 0 5 9-5 8 10-1 10 8 5 8-3 0-5-4-5-8 0 4-2 8-5 8-5 0-5-9 5-8Zm0 1c0 5 1 8 4 10','stroke'],
  ],
  comet: [
    ['m10 3 1 4 4 1-4 2-1 4-2-4-4-2 4-1Zm6 7 6 8M13 15l5 7M4 14l7 8','stroke'],
  ],
  cards: [
    ['M9 2h12v18H9ZM6 5 2 6l4 16 12-3','stroke'],
    ['m15 6 3 5-3 5-3-5Z','fill'],
  ],
  developer: [
    ['M12 2 21 7v10l-9 5-9-5V7Z', 'stroke'],
    ['m9 8-4 4 4 4m6-8 4 4-4 4m-2-9-2 14', 'stroke'],
  ],
  staff: [
    ['M12 2 21 5v7c0 5-5 8-9 10-4-2-9-5-9-10V5Z', 'stroke'],
    ['m7.5 11.5 3 3 6-6', 'stroke'],
  ],
  pumpkin: [
    ['M12 6C5 1 1 8 2 14s5 8 10 6c5 2 9 0 10-6s-3-13-10-8Z', 'stroke'],
    ['M12 6V3l3-2', 'stroke'],
    ['m5 12 4-3 1 4Zm9 1 1-4 4 3Zm-8 3h4v2h4v-2h4l-2 3H8Z', 'fill'],
  ],
  door: [
    ['M4 22V3h16v19M2 22h20M7 4l10-2v20l-10-3Z', 'stroke'],
    ['M13 12a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 1 0-2.2 0', 'fill'],
  ],
  target: [
    ['M20.5 8a9 9 0 1 1-4.5-4.5M17 10a5.5 5.5 0 1 1-3-3', 'stroke'],
    ['m12 12 9-9m-5 0h5v5', 'stroke'],
    ['M10.4 12a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0', 'fill'],
  ],
  studios: [
    ['M2 22V4l9-2v20l-9-3m0 3h11M7 11v2', 'stroke'],
    ['M21 13a6 6 0 1 1-4-4m3 5a3 3 0 1 1-3-2m0 3 6-7m-4 0h4v4', 'stroke'],
  ],
};

export function badgeFor(item) {
  if (BADGES[item.badge]) return item.badge;
  if (item.id === 'nameplate-developer') return 'developer';
  if (item.id === 'nameplate-staff') return 'staff';
  if (item.motif === 'pumpkin' || item.id?.startsWith('nameplate-halloween-')) return 'pumpkin';
  return null;
}

export function badgeSvg(key) {
  const paths = BADGES[key];
  if (!paths) return '';
  return `<svg class="plate-badge-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths.map(([d,mode]) => `<path d="${d}" fill="${mode === 'fill' ? 'currentColor' : 'none'}" stroke="${mode === 'stroke' ? 'currentColor' : 'none'}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
}

export function drawBadge(context, key, color) {
  context.save();
  context.scale(context.canvas.width / 28, context.canvas.height / 28);
  context.translate(2, 2);
  context.strokeStyle = context.fillStyle = color;
  context.lineWidth = 1.65;
  context.lineCap = context.lineJoin = 'round';
  for (const [d, mode] of BADGES[key] || []) context[mode](new Path2D(d));
  context.restore();
}
