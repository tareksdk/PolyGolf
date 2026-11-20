import { CATEGORIES, ITEM_BY_ID, RARITY } from './catalog.js';
import { caddieItems, CADDIE_RARITIES, CADDIE_SORTS } from './caddie-collection.js';
import { icon } from './icons.js';
import { totalItemCount } from './item-stacks.js';
import { nameplate } from './nameplates.js';
import { scrollToSection, trackSections } from './section-navigation.js';
import { button, esc, header } from './views.js';

const sectionId = id => 'caddie-section-' + id;
const categoryById = new Map(CATEGORIES.map(category => [category.id, category]));
const itemCount = n => n.toLocaleString() + (n === 1 ? ' item' : ' items');

function results(ui) {
  const items = caddieItems(ui.progress.data, {
    category: 'all', query: ui.caddieQuery, rarity: ui.caddieRarity,
    sort: ui.caddieSort || 'equipped', showAll: ui.showAllItems, favorites: ui.favoritesOnly,
  });
  const groups = new Map(CATEGORIES.map(category => [category.id, []]));
  for (const item of items) groups.get(item.category).push(item);
  return { groups, count: items.length };
}

function caddieTile(ui, item) {
  const data = ui.progress.data;
  const owned = data.owned.includes(item.id);
  const equipped = data.equipment[item.category] === item.id;
  const favorite = data.favorites.includes(item.id);
  const copies = totalItemCount(data, item.id);
  return `<article class="caddie-tile" style="--caddie-rarity:${RARITY[item.rarity]}">
    <button type="button" class="caddie-item" data-action="${owned ? 'preview' : 'item-detail'}" data-id="${item.id}" ${owned ? `aria-pressed="${ui.previewId === item.id}"` : ''} aria-label="${owned ? 'Preview' : 'View'} ${esc(item.name)}">
      <span class="caddie-item-art">
        <img src="${ui.world.itemThumbnail(item)}" alt="" width="864" height="600" loading="lazy" decoding="async">
        ${equipped ? `<span class="caddie-item-check" aria-label="Equipped" title="Equipped">${icon('check')}</span>` : ''}
        ${copies > 1 ? `<span class="caddie-stack">×${copies.toLocaleString()}</span>` : ''}
      </span>
      <span class="caddie-item-copy"><strong>${esc(item.name)}</strong><small>${owned ? item.rarity : 'Catalog · ' + item.rarity}</small></span>
    </button>
    ${owned ? button(icon('heart'), 'favorite',
      `type="button" data-id="${item.id}" aria-pressed="${favorite}" aria-label="Favorite ${esc(item.name)}" title="${favorite ? 'Remove favorite' : 'Favorite'}"`, 'caddie-tile-favorite') : ''}
  </article>`;
}

function selection(ui) {
  const data = ui.progress.data;
  const preview = data.owned.includes(ui.previewId) ? ITEM_BY_ID[ui.previewId] : null;
  return preview || ITEM_BY_ID[data.equipment[ui.garageCategory]] || ITEM_BY_ID[data.equipment.ball];
}

function previewCopy(ui) {
  const item = selection(ui), data = ui.progress.data;
  const equipped = data.equipment[item.category] === item.id;
  const artwork = item.category === 'nameplate' ? `<div class="caddie-preview-mark">${nameplate(data.name, item.id, { compact: true })}</div>` :
    ['hole', 'emote', 'trail'].includes(item.category) ? `<img class="caddie-preview-mark" src="${ui.world.itemThumbnail(item)}" alt="" width="864" height="600">` : '';
  return `<div class="caddie-preview-text">
      <span class="caddie-preview-type" style="--caddie-rarity:${RARITY[item.rarity]}">${categoryById.get(item.category).name} · ${item.rarity}</span>
      <h2>${esc(item.name)}</h2>
    </div>${artwork}
    <div class="caddie-preview-actions">
      ${equipped ? `<span class="caddie-equipped">${icon('check')} Equipped</span>` :
        button('Equip', 'equip-preview', 'type="button"', 'button yellow')}
      ${button(item.finish ? 'Patterns' : 'Details', 'item-detail', `type="button" data-id="${item.id}"`, 'button secondary')}
    </div>`;
}

function filtersView(ui) {
  return `<details class="caddie-options caddie-sort-panel" ${ui.caddieFiltersOpen ? 'open' : ''}>
    <summary>${icon('sliders')} <span>Filter &amp; sort</span></summary>
    <div class="caddie-options-menu">
      <label>Sort each section <select id="caddie-sort" aria-label="Sort inventory">${CADDIE_SORTS.map(([id, label]) =>
        `<option value="${id}" ${(ui.caddieSort || 'equipped') === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label>Rarity <select id="caddie-rarity" aria-label="Filter by rarity">${['all', ...CADDIE_RARITIES].map(id =>
        `<option value="${id}" ${(ui.caddieRarity || 'all') === id ? 'selected' : ''}>${id === 'all' ? 'All rarities' : id}</option>`).join('')}</select></label>
      <label class="caddie-checkbox"><input type="checkbox" id="caddie-include-catalog" ${ui.showAllItems ? 'checked' : ''}> Include unowned gear</label>
      ${button('Clear filters', 'caddie-clear', 'type="button"', 'text-button')}
    </div>
  </details>`;
}

export function caddieView(ui) {
  const { groups, count } = results(ui), collapsed = !!ui.caddieNavCollapsed;
  return `${header(ui)}
    <main class="page caddie-page ${collapsed ? 'caddie-nav-small' : ''}" aria-labelledby="caddie-title">
      <div class="caddie-shell">
        <header class="caddie-heading">
          <h1 id="caddie-title">Caddie</h1>
          <div class="caddie-heading-tools">
            ${button('Trade up', 'trade-up', '', 'text-button')}
            ${button('Item Shop ' + icon('arrow'), 'shop', '', 'text-button')}
            <details class="caddie-options caddie-bag-panel"><summary>Bag actions</summary>
              <div class="caddie-options-menu">
                ${button(icon('shuffle') + 'Shuffle gear', 'randomize', '', 'text-button')}
                ${button('Reset selected slot', 'unequip', '', 'text-button')}
              </div>
            </details>
          </div>
        </header>
        <div class="caddie-layout">
          <nav class="caddie-index" aria-label="Caddie sections">
            <button class="caddie-index-toggle" type="button" data-action="caddie-toggle-nav" aria-expanded="${!collapsed}" aria-controls="caddie-section-links" aria-label="${collapsed ? 'Expand sections' : 'Collapse sections'}">
              <span>Sections</span>${icon('arrow')}
            </button>
            <div class="caddie-index-links" id="caddie-section-links">
              ${CATEGORIES.map(({ id, name, icon: mark }) => button(icon(mark) + `<span>${name}</span>`, 'caddie-jump',
                `type="button" data-caddie-link data-id="${id}" aria-controls="${sectionId(id)}" aria-label="${name}" title="${name}" ${groups.get(id).length ? '' : 'hidden'}`, 'caddie-index-link')).join('')}
            </div>
          </nav>
          <aside class="caddie-display" aria-label="Equipment preview">
            <div class="caddie-stage" role="img" aria-label="Ball and club on a display stand overlooking a golf course"></div>
            <div class="caddie-preview-copy" aria-live="polite">${previewCopy(ui)}</div>
          </aside>
          <section class="caddie-catalog" aria-label="Equipment collection">
            <div class="caddie-controls">
              <label class="caddie-search-field">${icon('search')}<input id="caddie-search" type="search" maxlength="80" placeholder="Search gear" aria-label="Search gear" value="${esc(ui.caddieQuery || '')}" autocomplete="off"></label>
              <button type="button" class="caddie-favorites" data-action="favorites" aria-label="Favorites only" aria-pressed="${!!ui.favoritesOnly}" title="Favorites only">${icon('heart')}</button>
              ${filtersView(ui)}
            </div>
            <div class="caddie-results" id="caddie-result-count" role="status">${itemCount(count)}</div>
            <div class="caddie-sections">
              ${CATEGORIES.map(({ id, name }) => {
                const items = groups.get(id);
                return `<section class="caddie-section" id="${sectionId(id)}" data-caddie-section="${id}" aria-labelledby="caddie-name-${id}" ${items.length ? '' : 'hidden'}>
                  <header><h2 id="caddie-name-${id}" tabindex="-1">${name}</h2></header>
                  <div class="caddie-items">${items.map(item => caddieTile(ui, item)).join('')}</div>
                </section>`;
              }).join('')}
              <div class="caddie-empty" ${count ? 'hidden' : ''}>
                <h2>No matching gear</h2><p>Search by name, type, rarity, or a pattern like #042.</p>
                ${button('Clear filters', 'caddie-clear', 'type="button"', 'button secondary')}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>`;
}

export function updateCaddieGrid(ui) {
  const page = ui.root.querySelector('.caddie-page');
  if (!page) return;
  const { groups, count } = results(ui);
  for (const section of page.querySelectorAll('[data-caddie-section]')) {
    const items = groups.get(section.dataset.caddieSection);
    section.hidden = !items.length;
    section.querySelector('.caddie-items').innerHTML = items.map(item => caddieTile(ui, item)).join('');
  }
  for (const link of page.querySelectorAll('[data-caddie-link]')) link.hidden = !groups.get(link.dataset.id).length;
  page.querySelector('#caddie-result-count').textContent = itemCount(count);
  page.querySelector('.caddie-empty').hidden = !!count;
  ui.caddieNavigation?.measure();
}

export function updateCaddiePreview(ui) {
  const page = ui.root.querySelector('.caddie-page');
  if (!page) return;
  page.querySelector('.caddie-preview-copy').innerHTML = previewCopy(ui);
  for (const tile of page.querySelectorAll('.caddie-item[data-action="preview"]'))
    tile.setAttribute('aria-pressed', String(tile.dataset.id === ui.previewId));
}

export function jumpToCaddieSection(ui, id) {
  const page = ui.root.querySelector('.caddie-page');
  const section = page?.querySelector('#' + sectionId(CSS.escape(id)));
  if (!section || section.hidden) return;
  const reduced = ui.progress.data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  scrollToSection(page, section, { smooth: !reduced });
}

export function toggleCaddieNavigation(ui) {
  const page = ui.root.querySelector('.caddie-page');
  if (!page) return;
  const collapsed = ui.caddieNavCollapsed = !ui.caddieNavCollapsed;
  page.classList.toggle('caddie-nav-small', collapsed);
  const toggle = page.querySelector('.caddie-index-toggle');
  toggle.setAttribute('aria-expanded', String(!collapsed));
  toggle.setAttribute('aria-label', collapsed ? 'Expand sections' : 'Collapse sections');
  ui.caddieNavigation?.measure();
}

export function installCaddieUI(ui) {
  const render = ui.render.bind(ui);
  ui.render = () => {
    ui.caddieFiltersOpen = ui.root.querySelector('.caddie-sort-panel')?.open ?? false;
    ui.caddieNavigation?.dispose();
    render();
    const page = ui.root.querySelector('.caddie-page');
    ui.caddieNavigation = page ? trackSections(page, {
      sections: [...page.querySelectorAll('[data-caddie-section]')],
      links: [...page.querySelectorAll('[data-caddie-link]')],
      rail: page.querySelector('.caddie-index-links'),
      content: page.querySelector('.caddie-shell'),
    }) : null;
  };
  ui.root.addEventListener('change', event => {
    const control = event.target;
    if (control.id === 'caddie-rarity') ui.caddieRarity = control.value;
    else if (control.id === 'caddie-sort') ui.caddieSort = control.value;
    else if (control.id === 'caddie-include-catalog') ui.showAllItems = control.checked;
    else return;
    updateCaddieGrid(ui);
  });
  ui.root.addEventListener('pointerdown', event => {
    for (const disclosure of ui.root.querySelectorAll('.caddie-options[open]'))
      if (!disclosure.contains(event.target)) disclosure.open = false;
  });
  ui.root.addEventListener('keydown', event => {
    const disclosure = event.target.closest('.caddie-options[open]');
    if (event.key !== 'Escape' || !disclosure) return;
    event.preventDefault();
    disclosure.open = false;
    disclosure.querySelector('summary').focus();
  });
}
