export function menuRange(total, size, requested = 0) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.max(0, Math.min(pages - 1, Math.trunc(requested) || 0));
  return { page, pages, start: page * size, end: Math.min(total, (page + 1) * size) };
}

// Keep bounded collection pages in the Caddie. The Shop retains its original
// scrolling shelves, card sizes, filters and section tabs.
export function installMenuPages(ui) {
  const render = ui.render.bind(ui), action = ui.action.bind(ui);
  ui.menuPages = {};
  const compact = () => innerWidth < 700 || innerHeight < 600;
  const capacity = () => innerWidth < 600 ? 1 : innerWidth < 1000 ? 2 : 3;
  const key = () => [ui.screen, ui.garageCategory, ui.caddieQuery, ui.caddieRarity, ui.caddieSort, ui.showAllItems, ui.favoritesOnly].join('|');
  const pager = (host, total, size, id) => {
    const range = menuRange(total, size, ui.menuPages[id]);
    ui.menuPages[id] = range.page;
    const nav = document.createElement('nav');
    nav.className = 'menu-pager';
    nav.setAttribute('aria-label', 'Collection pages');
    for (const [step, label] of [[-1, 'Previous page'], [1, 'Next page']]) {
      const button = document.createElement('button');
      button.className = 'button secondary'; button.type = 'button';
      button.dataset.action = 'menu-page'; button.dataset.step = step;
      button.textContent = step < 0 ? '← Previous' : 'Next →'; button.setAttribute('aria-label', label);
      button.disabled = step < 0 ? range.page === 0 : range.page === range.pages - 1;
      nav.append(button);
      if (step < 0) { const count = document.createElement('span'); count.textContent = `${range.page + 1} / ${range.pages}`; count.setAttribute('role','status'); nav.append(count); }
    }
    host.append(nav);
    return range;
  };
  const selectFor = nav => {
    if (!nav || nav.previousElementSibling?.classList.contains('compact-menu-select')) return;
    const buttons = [...nav.querySelectorAll('button[data-action]')];
    if (!buttons.length) return;
    const select = document.createElement('select'); select.className = 'compact-menu-select';
    select.setAttribute('aria-label', nav.getAttribute('aria-label') || 'Choose section');
    buttons.forEach((button, index) => {
      const option = document.createElement('option'); option.value = index; option.textContent = button.textContent.trim();
      option.selected = button.classList.contains('active') || button.getAttribute('aria-selected') === 'true' || button.getAttribute('aria-pressed') === 'true'; select.append(option);
    });
    select.addEventListener('change', () => { const button = buttons[select.value]; ui.action(button.dataset.action, {...button.dataset}); });
    nav.before(select); nav.classList.add('compact-menu-source');
  };
  let observer;
  const fit = () => {
    observer?.disconnect();
    if (ui.screen === 'shop') return;
    ui.root.querySelectorAll('.compact-menu-select').forEach(el => el.remove());
    ui.root.querySelectorAll('.topbar .nav,.garage-inventory>.category-tabs,.caddie-filters>[role=group]').forEach(selectFor);
    const garage = ui.root.querySelector('.garage-inventory');
    if (garage) {
      garage.querySelector('.menu-pager')?.remove();
      const grid = garage.querySelector('.garage-items'), cards = [...grid.children];
      const range = pager(garage, cards.length, capacity(), key());
      cards.forEach((card, index) => { card.hidden = index < range.start || index >= range.end; });
      grid.style.setProperty('--page-columns', capacity());
      const filters = garage.querySelector('.caddie-filters'), toolbar = garage.querySelector('.caddie-toolbar');
      if (filters && compact()) filters.style.top = Math.max(6, Math.min(toolbar.offsetTop + toolbar.offsetHeight + 4, garage.clientHeight - 114)) + 'px';
    }
    if (garage) observer.observe(garage.querySelector('.garage-items'), {childList:true});
  };
  observer = new MutationObserver(fit);
  ui.render = () => { observer.disconnect(); render(); if (ui.game.state === 'menu') fit(); };
  ui.action = async (name, data = {}) => {
    if (name !== 'menu-page') return action(name, data);
    ui.menuPages[key()] = (ui.menuPages[key()] || 0) + Number(data.step);
    ui.render(); ui.root.querySelector('.menu-pager button:not(:disabled)')?.focus({preventScroll:true});
  };
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
