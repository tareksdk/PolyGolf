export function menuRange(total, size, requested = 0) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.max(0, Math.min(pages - 1, Math.trunc(requested) || 0));
  return { page, pages, start: page * size, end: Math.min(total, (page + 1) * size) };
}

// Keep the existing cards and actions, but present bounded pages instead of
// letting a large collection or shop shelf push controls below the window.
export function installMenuPages(ui) {
  const render = ui.render.bind(ui), action = ui.action.bind(ui);
  ui.menuPages = {};
  const compact = () => innerWidth < 700 || innerHeight < 600;
  const capacity = () => innerWidth < 600 ? 1 : innerWidth < 1000 ? 2 : 3;
  const key = () => [ui.screen, ui.shopShelf, ui.shopCategory, ui.shopSort, ui.shopHideOwned,
    ui.garageCategory, ui.caddieQuery, ui.caddieRarity, ui.caddieSort, ui.showAllItems, ui.favoritesOnly].join('|');
  const pager = (host, total, size, id) => {
    const range = menuRange(total, size, ui.menuPages[id]);
    ui.menuPages[id] = range.page;
    const nav = document.createElement('nav');
    nav.className = 'menu-pager';
    nav.setAttribute('aria-label', ui.screen === 'garage' ? 'Collection pages' : 'Shop pages');
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
  const chunkGrid = grid => {
    const children = [...grid.children], pages = [];
    for (let i = 0; i < children.length; i += capacity()) {
      const clone = grid.cloneNode(false); clone.classList.add('paged-card-grid');
      clone.style.setProperty('--page-columns', capacity());
      children.slice(i, i + capacity()).forEach(child => clone.append(child)); pages.push(clone);
    }
    return pages.length ? pages : [grid];
  };
  const gridSelector = '.shop-grid,.crate-grid,.bundle-grid,.achievement-rewards,.coin-pack-grid';
  const sections = node => {
    if (node.matches(gridSelector)) return chunkGrid(node);
    if (node.matches('.shop-featured') && compact()) return [...node.children];
    if (node.matches('.shop-rail')) {
      const grid = node.querySelector('.pg-grid'), header = node.querySelector('.rail-head');
      return chunkGrid(grid).map(cards => { const section = node.cloneNode(false); section.append(header.cloneNode(true), cards); return section; });
    }
    if (node.matches('.money-shop')) return [...node.children].flatMap(sections);
    if (node.matches('.community-menu-content')) {
      const links = node.querySelector('.community-links'), items = [...links.children], pages = [];
      const count = innerHeight < 480 ? 1 : 2;
      for (let i = 0; i < items.length; i += count) {
        const panel = node.cloneNode(true), list = panel.querySelector('.community-links');
        list.replaceChildren(...items.slice(i, i + count)); pages.push(panel);
      }
      return pages;
    }
    return [node];
  };
  let observer;
  const fit = () => {
    observer?.disconnect();
    ui.root.querySelectorAll('.compact-menu-select').forEach(el => el.remove());
    ui.root.querySelectorAll('.topbar .nav,.shop-tabs,.garage-inventory>.category-tabs,.shop-filters .chip-row,.caddie-filters>[role=group]').forEach(selectFor);
    const garage = ui.root.querySelector('.garage-inventory'), shelf = ui.root.querySelector('.shop-shelf');
    if (garage) {
      garage.querySelector('.menu-pager')?.remove();
      const grid = garage.querySelector('.garage-items'), cards = [...grid.children];
      const range = pager(garage, cards.length, capacity(), key());
      cards.forEach((card, index) => { card.hidden = index < range.start || index >= range.end; });
      grid.style.setProperty('--page-columns', capacity());
      const filters = garage.querySelector('.caddie-filters'), toolbar = garage.querySelector('.caddie-toolbar');
      if (filters && compact()) filters.style.top = Math.max(6, Math.min(toolbar.offsetTop + toolbar.offsetHeight + 4, garage.clientHeight - 114)) + 'px';
    }
    if (shelf && !shelf.querySelector(':scope>.menu-page-content')) {
      const pages = [];
      for (const child of [...shelf.children]) {
        if (child.matches('.shelf-caption,.shop-filters,.locker-quantity')) continue;
        pages.push(...sections(child)); child.remove();
      }
      const host = document.createElement('div'); host.className = 'menu-page-content'; shelf.append(host);
      const range = pager(shelf, pages.length, 1, key());
      pages.forEach((panel, index) => { panel.hidden = index !== range.page; host.append(panel); });
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
