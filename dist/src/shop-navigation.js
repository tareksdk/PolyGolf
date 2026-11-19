function shopScrollInset(page) {
  return Number.parseFloat(getComputedStyle(page).scrollPaddingTop) || 0;
}

export function jumpToShopSection(ui, id, { smooth = true } = {}) {
  const page = ui.root.querySelector(".shop-page");
  const section = page?.querySelector(`#shop-section-${CSS.escape(id)}`);
  if (!section) return;

  const reduced = ui.progress.data.settings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = id === "featured" ? 0 :
    page.scrollTop + section.getBoundingClientRect().top - page.getBoundingClientRect().top - shopScrollInset(page);
  section.querySelector("h2").focus({ preventScroll: true });
  page.scrollTo({ top: target, behavior: smooth && !reduced ? "smooth" : "auto" });
}

export function trackShopSections(page) {
  const sections = [...page.querySelectorAll("[data-shop-section]")];
  const rail = page.querySelector(".store-index-links");
  const links = new Map([...rail.querySelectorAll("[data-shop-link]")].map(link => [link.dataset.id, link]));
  let active = rail.querySelector('[aria-current="location"]');
  let frame = 0;

  function update() {
    frame = 0;
    if (!page.isConnected) return;

    const boundary = page.getBoundingClientRect().top + shopScrollInset(page) + 3;
    const atEnd = page.scrollTop > 0 && page.scrollTop + page.clientHeight >= page.scrollHeight - 2;
    const section = atEnd ? sections.at(-1) : sections.findLast(node => node.getBoundingClientRect().top <= boundary);
    const next = links.get((section || sections[0]).dataset.shopSection);
    if (!next || next === active) return;

    active?.removeAttribute("aria-current");
    active = next;
    active.setAttribute("aria-current", "location");
    if (rail.scrollWidth <= rail.clientWidth) return;

    const item = active.getBoundingClientRect();
    const bounds = rail.getBoundingClientRect();
    if (item.left < bounds.left + 6) rail.scrollLeft += item.left - bounds.left - 6;
    if (item.right > bounds.right - 6) rail.scrollLeft += item.right - bounds.right + 6;
  }

  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  page.addEventListener("scroll", schedule, { passive: true });
  schedule();
  return schedule;
}
