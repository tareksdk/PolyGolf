export function menuRange(total, size, requested = 0) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.max(0, Math.min(pages - 1, Math.trunc(requested) || 0));
  return { page, pages, start: page * size, end: Math.min(total, (page + 1) * size) };
}

// Course controls adjust to the available space.
export function installMenuPages(ui) {
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (ui.game.state === 'menu' && ui.screen === 'courses') ui.render(); }, 120);
  });
}
