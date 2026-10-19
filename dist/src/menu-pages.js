export function menuRange(total, size, requested = 0) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.max(0, Math.min(pages - 1, Math.trunc(requested) || 0));
  return { page, pages, start: page * size, end: Math.min(total, (page + 1) * size) };
}

// Menus are single scrolling pages: the Caddie collection, Shop, courses and
// dialogs show everything at once. Only the Caddie filter popover is managed here.
export function installMenuPages(ui) {
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
