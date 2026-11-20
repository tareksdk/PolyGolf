import { scrollToSection, trackSections } from './section-navigation.js';

export function jumpToShopSection(ui, id, { smooth = true } = {}) {
  const page = ui.root.querySelector('.shop-page');
  const section = page?.querySelector('#shop-section-' + CSS.escape(id));
  if (!section) return;
  const reduced = ui.progress.data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  scrollToSection(page, section, { smooth: smooth && !reduced, atStart: id === 'featured' });
}

export function trackShopSections(page) {
  return trackSections(page, {
    sections: [...page.querySelectorAll('[data-shop-section]')],
    links: [...page.querySelectorAll('[data-shop-link]')],
    rail: page.querySelector('.store-index-links'),
    content: page.querySelector('.store'),
  }).dispose;
}
