export function menuRange(total, size, requested = 0) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.max(0, Math.min(pages - 1, Math.trunc(requested) || 0));
  return { page, pages, start: page * size, end: Math.min(total, (page + 1) * size) };
}

// Keep responsive collection controls and dismissible filters together.
export function installMenuPages(ui) {
  // Collection cards share one scroll region; filtering never hides a page of results.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (ui.game.state === 'menu' && ['garage','shop','courses'].includes(ui.screen)) ui.render(); }, 120);
  });
  const closeFilters = () => {
    ui.caddieFiltersOpen = false;
    const filters = ui.root.querySelector('.caddie-filters'); if (filters) filters.hidden = true;
    ui.root.querySelector('[data-action="caddie-filters"]')?.setAttribute('aria-expanded','false');
  };
  document.addEventListener('pointerdown', event => {
    if (ui.game.state === 'menu' && ui.caddieFiltersOpen && !event.target.closest('.caddie-filters,[data-action="caddie-filters"]')) closeFilters();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && ui.game.state === 'menu' && ui.caddieFiltersOpen) {
      closeFilters(); ui.root.querySelector('[data-action="caddie-filters"]')?.focus();
    }
  });
}
