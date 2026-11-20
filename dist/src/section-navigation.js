function scrollInset(page) {
  return Number.parseFloat(getComputedStyle(page).scrollPaddingTop) || 0;
}

export function scrollToSection(page, section, { smooth, atStart = false }) {
  const top = atStart ? 0 :
    page.scrollTop + section.getBoundingClientRect().top - page.getBoundingClientRect().top - scrollInset(page);
  section.querySelector('h2')?.focus({ preventScroll: true });
  page.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

export function trackSections(page, { sections, content, rail, links }) {
  const byId = new Map(links.map(link => [link.getAttribute('aria-controls'), link]));
  let active = rail.querySelector('[aria-current="location"]');
  let frame = 0, reveal = false;

  const measure = () => {
    reveal = true;
    schedule();
  };
  function update() {
    frame = 0;
    if (!page.isConnected) return;
    const top = page.scrollTop;
    const atEnd = top > 0 && top >= page.scrollHeight - page.clientHeight - 2;
    const visible = sections.filter(section => !section.hidden);
    const threshold = page.getBoundingClientRect().top + scrollInset(page) + 3;
    const section = atEnd ? visible.at(-1) :
      visible.findLast(entry => entry.getBoundingClientRect().top <= threshold) || visible[0];
    const next = byId.get(section?.id) || null;
    if (active !== next) {
      active?.removeAttribute('aria-current');
      active = next;
      active?.setAttribute('aria-current', 'location');
      reveal = true;
    }
    if (reveal && active && rail.scrollWidth > rail.clientWidth) {
      const item = active.getBoundingClientRect(), bounds = rail.getBoundingClientRect();
      if (item.left < bounds.left + 6) rail.scrollLeft += item.left - bounds.left - 6;
      if (item.right > bounds.right - 6) rail.scrollLeft += item.right - bounds.right + 6;
    }
    reveal = false;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  const resize = new ResizeObserver(measure);
  resize.observe(page);
  resize.observe(content);
  page.addEventListener('scroll', schedule, { passive: true });
  measure();
  return {
    measure,
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      page.removeEventListener('scroll', schedule);
    },
  };
}
