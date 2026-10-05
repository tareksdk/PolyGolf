// Interface motion: screen transitions, modal and toast choreography, press ripples,
// and a sliding navigation indicator. Everything respects prefers-reduced-motion.
const ROUND_STATES = ["playing", "paused", "complete", "finished"];
const SCROLLERS = [".page", ".pass-track", ".editor-controls", ".garage-items", ".pe-inspector", ".shop-scroll"];
const RIPPLE = [
  ".button",
  ".soft-button",
  ".play-button",
  ".item-button",
  ".category-tab",
  ".shop-tab",
  ".mode-tab",
  ".icon-button",
  ".nav button",
  ".ph-chip",
  ".pe-tool",
  ".crate-card",
  ".mini-course",
].join(",");

function focusKey(el) {
  if (!el || el === document.body || !el.isConnected) return null;
  if (el.id) return "#" + CSS.escape(el.id);
  for (const attr of ["data-map-field", "data-golf-field", "data-setting"])
    if (el.hasAttribute(attr)) return `[${attr}="${CSS.escape(el.getAttribute(attr))}"]`;
  if (el.dataset.action)
    return (
      `[data-action="${CSS.escape(el.dataset.action)}"]` +
      (el.dataset.id ? `[data-id="${CSS.escape(el.dataset.id)}"]` : "")
    );
  return null;
}

export function installMotion(ui) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const exitLayer = document.createElement("div");
  exitLayer.id = "modal-exit";
  exitLayer.setAttribute("aria-hidden", "true");
  document.body.append(exitLayer);

  // Screen transitions and state preservation across re-renders.
  const render = ui.render.bind(ui);
  let lastKey = null,
    lastNav = null;
  ui.render = () => {
    const inRound = ROUND_STATES.includes(ui.game.state),
      key = inRound ? "round" : `${ui.screen}:${ui.mode || ""}`,
      same = key === lastKey,
      scroll = same ? SCROLLERS.map((s) => [...ui.root.querySelectorAll(s)].map((e) => [e.scrollTop, e.scrollLeft])) : null,
      focused = same && ui.root.contains(document.activeElement) ? focusKey(document.activeElement) : null,
      nav = ui.root.querySelector(".nav .active");
    lastNav = nav ? nav.getBoundingClientRect() : null;
    render();
    document.body.classList.toggle("in-round", inRound);
    document.body.dataset.screen = inRound ? "round" : ui.screen;
    if (same) {
      SCROLLERS.forEach((s, i) =>
        ui.root.querySelectorAll(s).forEach((e, j) => {
          const saved = scroll[i][j];
          if (saved) [e.scrollTop, e.scrollLeft] = saved;
        }),
      );
      if (focused) ui.root.querySelector(focused)?.focus({ preventScroll: true });
    } else if (!reduce.matches) {
      ui.root.classList.remove("screen-enter");
      void ui.root.offsetWidth;
      ui.root.classList.add("screen-enter");
      clearTimeout(ui.screenEnterTimer);
      ui.screenEnterTimer = setTimeout(() => ui.root.classList.remove("screen-enter"), 700);
    }
    placeNavIndicator(same ? null : lastNav);
    lastKey = key;
  };

  function placeNavIndicator(from) {
    const navEl = ui.root.querySelector(".nav"),
      active = navEl?.querySelector(".active");
    if (!navEl) return;
    let pill = navEl.querySelector(".nav-indicator"),
      fresh = false;
    if (!pill) {
      pill = document.createElement("span");
      pill.className = "nav-indicator";
      pill.setAttribute("aria-hidden", "true");
      navEl.prepend(pill);
      fresh = true;
    }
    if (!active) {
      pill.style.opacity = "0";
      return;
    }
    const box = navEl.getBoundingClientRect(),
      to = active.getBoundingClientRect(),
      set = (r) => {
        pill.style.transform = `translateX(${r.left - box.left}px)`;
        pill.style.width = r.width + "px";
      };
    pill.style.opacity = "1";
    if (fresh || !from || reduce.matches) {
      pill.style.transition = "none";
      set(from && !reduce.matches && from.width ? from : to);
      void pill.offsetWidth;
      pill.style.transition = "";
    }
    set(to);
  }
  addEventListener("resize", () => placeNavIndicator(null));

  // Modal entrance, content swap and exit.
  const modal = ui.modal.bind(ui),
    close = ui.closeModal.bind(ui);
  ui.modal = (content, options) => {
    const swapping = !!ui.modalRoot.querySelector(".modal-overlay") || exitLayer.children.length > 0;
    exitLayer.replaceChildren();
    modal(content, options);
    const overlay = ui.modalRoot.querySelector(".modal-overlay");
    if (overlay && swapping) overlay.classList.add("swap");
    overlay?.addEventListener("pointerdown", (e) => {
      if (e.target === overlay && overlay.querySelector(".modal-close")) overlay.dataset.dismiss = "1";
    });
    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay && overlay.dataset.dismiss === "1") ui.action("close-modal");
      delete overlay.dataset.dismiss;
    });
  };
  ui.closeModal = () => {
    const overlay = ui.modalRoot.querySelector(".modal-overlay");
    if (overlay && !reduce.matches) {
      const ghost = overlay.cloneNode(true);
      ghost.classList.remove("swap");
      ghost.classList.add("leaving");
      ghost.inert = true;
      exitLayer.replaceChildren(ghost);
      setTimeout(() => ghost.remove(), 240);
    }
    close();
  };

  // Toasts slide in, stack at most four deep and fade out before removal.
  ui.toast = (text) => {
    const box = document.querySelector("#toasts"),
      el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.textContent = text;
    box.append(el);
    while (box.children.length > 4) box.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), reduce.matches ? 0 : 320);
    }, 4000);
  };

  // Press ripple on tactile controls.
  document.addEventListener("pointerdown", (e) => {
    if (reduce.matches || e.button !== 0) return;
    const target = e.target.closest(RIPPLE);
    if (!target || target.disabled || target.closest(".locker-reel")) return;
    if (getComputedStyle(target).position === "static") target.classList.add("ripple-host");
    const r = target.getBoundingClientRect(),
      size = Math.max(r.width, r.height) * 2.2,
      wave = document.createElement("span");
    wave.className = "ripple";
    wave.style.width = wave.style.height = size + "px";
    wave.style.left = e.clientX - r.left - size / 2 + "px";
    wave.style.top = e.clientY - r.top - size / 2 + "px";
    let clip = target.querySelector(":scope > .ripple-clip");
    if (!clip) {
      clip = document.createElement("span");
      clip.className = "ripple-clip";
      clip.setAttribute("aria-hidden", "true");
      target.append(clip);
    }
    clip.append(wave);
    wave.addEventListener("animationend", () => wave.remove());
  });
}
