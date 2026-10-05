// One vector design is shared by live nameplates and the 3D collection artwork.
const BADGES = {
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
