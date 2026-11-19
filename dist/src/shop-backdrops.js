import { coinChest } from "./shop-coin-art.js";

const SCENES = {
  featured: {
    sky: "#245ec1", horizon: "#6da9cf", sun: "#ffe4a0", cloud: "#cee5ff", peak: "#3e66a3", ridge: "#4f90a9",
    rough: "#25755c", dark: "#1e544e", grass: "#66ae63", light: "#80bd6b", sand: "#e8bf7d", water: "#478cca", wave: "#9bdef2",
    lake: true, landmark: "lighthouse", trees: "pine", sunset: false,
  },
  daily: {
    sky: "#238e7e", horizon: "#8ac99c", sun: "#fff5bd", cloud: "#e2f7b1", peak: "#367976", ridge: "#588c68",
    rough: "#317447", dark: "#205e4b", grass: "#8bc55a", light: "#aad76b", sand: "#e7cd86", water: "#55a6a1", wave: "#a5e8cb",
    lake: false, landmark: "bridge", trees: "pine", sunset: false, mirror: true,
  },
  weekly: {
    sky: "#4942a0", horizon: "#b578c0", sun: "#ffe6e3", cloud: "#edd2f4", peak: "#574585", ridge: "#77558c",
    rough: "#51497b", dark: "#373867", grass: "#7d799d", light: "#a19ab5", sand: "#e8acd0", water: "#586bc0", wave: "#b9c9f8",
    lake: true, landmark: "gazebo", trees: "pine", sunset: true,
  },
  novelty: {
    sky: "#bc682a", horizon: "#f5ac50", sun: "#fff0ad", cloud: "#fff0ad", peak: "#a9523b", ridge: "#bd7648",
    rough: "#628847", dark: "#407049", grass: "#a3bb52", light: "#c0ce64", sand: "#ffe080", water: "#55a38e", wave: "#c9ead0",
    lake: false, landmark: "windmill", trees: "broadleaf", sunset: false,
  },
  bundles: {
    sky: "#a34258", horizon: "#ee926b", sun: "#ffd574", cloud: "#ffd09e", peak: "#984b61", ridge: "#a95960",
    rough: "#9b6152", dark: "#734455", grass: "#c29762", light: "#d8b579", sand: "#ffe2a4", water: "#627c9b", wave: "#a6dade",
    lake: false, landmark: "arch", trees: "broadleaf", sunset: true, mirror: true,
  },
  "country-club": {
    sky: "#123f68", horizon: "#71a6ae", sun: "#e9f0c6", cloud: "#b9d9dd", peak: "#385c83", ridge: "#487987",
    rough: "#367477", dark: "#25555d", grass: "#79ab83", light: "#aad2a0", sand: "#ecd6a2", water: "#407b86", wave: "#a4dfee",
    lake: true, landmark: "clubhouse", trees: "pine", sunset: false,
  },
  lockers: {
    sky: "#274180", horizon: "#7285c0", sun: "#f9db90", cloud: "#c0c9ee", peak: "#425c99", ridge: "#5276a2",
    rough: "#53668a", dark: "#374b76", grass: "#7c94a1", light: "#9eb0b3", sand: "#f3d8a2", water: "#4268a9", wave: "#97c3f0",
    lake: true, landmark: "cabin", trees: "broadleaf", sunset: true, mirror: true,
  },
  coins: {
    sky: "#885522", horizon: "#e7b44f", sun: "#fff19c", cloud: "#ffdc92", peak: "#9b6137", ridge: "#b5813f",
    rough: "#8a7443", dark: "#60502c", grass: "#c7a746", light: "#ddc56b", sand: "#ffe0a0",
    lake: false, landmark: "treasure", trees: "broadleaf", sunset: true,
  },
  socials: {
    sky: "#ab622c", horizon: "#f8cd71", sun: "#fff6b2", cloud: "#fce4af", peak: "#bd7744", ridge: "#c9975d",
    rough: "#748347", dark: "#536544", grass: "#adb354", light: "#cfcc81", sand: "#ffe1a2", water: "#64998d", wave: "#d8e3b4",
    lake: true, landmark: "community-treasure", trees: "broadleaf", sunset: true,
  },
};

const polygon = (fill, points) => `<polygon fill="${fill}" points="${points}"/>`;
const ellipse = (fill, cx, cy, rx, ry) => `<ellipse fill="${fill}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
const group = (x, y, scale, children) => `<g transform="translate(${x} ${y}) scale(${scale})">${children}</g>`;
const svg = (body, className) => `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;

function tree(scene, x, y, size) {
  const crown = scene.trees === "pine"
    ? polygon(scene.dark, "-26,0 0,-66 26,0") + polygon(scene.rough, "0,-66 26,0 2,-7") + polygon(scene.dark, "-20,-18 0,-78 19,-19") + polygon(scene.rough, "0,-78 19,-19 1,-26")
    : polygon(scene.dark, "-27,-21 -31,-47 -14,-67 11,-72 29,-49 27,-24 12,-13 -12,-12") + polygon(scene.rough, "-31,-47 -14,-67 11,-72 8,-32 -12,-12") + polygon(scene.grass, "-14,-67 11,-72 29,-49 8,-32");
  return group(x, y, size, ellipse("#12243655", 12, 1, 25, 7)
    + polygon("#64483d", "-4,0 -3,-37 4,-37 6,0") + crown);
}

function flag(x, y, size) {
  return group(x, y, size, ellipse("#1e3c4d", 0, 0, 8, 3)
    + '<path d="M0 0v-44" fill="none" stroke="#fff2db" stroke-width="2.5"/>'
    + polygon("#fff0b9", "1,-44 21,-37 1,-30")
    + polygon("#e97262", "1,-44 21,-37 1,-37"));
}

function landmark(kind, color) {
  const wall = "#e1bb99";
  const roof = "#633f57";
  const beam = "#533c3d";
  if (kind === "treasure" || kind === "community-treasure") {
    const community = kind === "community-treasure";
    return group(862, 355, 1.85, coinChest({ full: true, extra: true }))
      + group(community ? 47 : 1095, 500, community ? 1.83 : 1.28, coinChest({ full: community }));
  }
  if (kind === "lighthouse") {
    return group(1042, 359, 1.2,
      polygon(color, "-82,5 -27,-23 21,-15 63,5 26,18 -57,16") +
      polygon("#f5dec0", "-16,-3 -9,-76 8,-76 17,-3 4,2") +
      polygon("#a95457", "-14,-27 -11,-47 11,-47 14,-27") +
      polygon("#ffe1a9", "-13,-77 -13,-91 13,-91 13,-77") +
      polygon("#783d57", "-22,-90 0,-107 22,-90") +
      polygon("#607697", "2,-2 0,-17 9,-17 10,-3"));
  }
  if (kind === "windmill") {
    return group(1062, 359, 1.25, polygon(wall, "-24,2 -12,-69 13,-69 25,2")
      + polygon("#b9896a", "12,-69 25,2 10,2")
      + polygon(roof, "-24,-67 1,-93 24,-67")
      + polygon(beam, "-5,0 -4,-23 7,-23 8,0")
      + '<path d="M-35 -14 35 -87M-34 -86 36 -15" stroke="#793b4c" stroke-width="5"/>'
      + polygon("#ffddac", "-38,-20 -25,-26 -15,-16 -28,-7")
      + polygon("#ffddac", "24,-90 40,-91 39,-76 27,-69")
      + polygon("#ffddac", "-39,-92 -26,-89 -19,-76 -30,-73")
      + polygon("#ffddac", "28,-37 41,-24 38,-10 25,-18"));
  }
  if (kind === "arch") {
    return group(1042, 363, 1.2, polygon("#8b5260", "-61,3 -57,-46 -35,-74 0,-85 38,-78 57,-51 63,3 36,3 31,-39 10,-55 -13,-53 -36,-27 -39,3")
      + polygon("#bc7167", "-61,3 -57,-46 -35,-74 -23,-62 -41,-40 -45,3")
      + polygon("#d38f76", "-35,-74 0,-85 38,-78 27,-66 -4,-71 -23,-62")
      + polygon("#a95f60", "38,-78 57,-51 63,3 49,3 43,-42 27,-66"));
  }
  if (kind === "bridge") {
    return group(995, 382, 1.2, polygon("#a59679", "-63,5 -34,-12 24,-14 66,1 67,15 44,16 27,5 -7,1 -25,5 -39,17 -62,18")
      + polygon("#d9bf84", "-63,5 -36,-19 20,-22 66,1 43,4 11,-6 -24,-4 -42,9"));
  }
  if (kind === "gazebo") {
    return group(1032, 359, 1.35, '<path d="M-34 2v-34m26 38v-30m36 21v-34m16 24v-24" stroke="#d4babb" stroke-width="4"/>'
      + polygon("#d9b39e", "-51,-26 -15,-55 53,-36 23,-24")
      + polygon(roof, "-15,-55 0,-65 53,-36 32,-36"));
  }
  const wide = kind === "clubhouse" ? 1.45 : 1.1;
  return group(1042, 357, wide, polygon(wall, "-56,3 -56,-42 23,-47 24,8")
    + polygon("#9f8b85", "24,8 23,-47 55,-56 57,-6")
    + polygon(roof, "-65,-38 -39,-68 33,-68 65,-47 22,-36")
    + polygon("#927285", "-39,-68 33,-68 22,-36 -65,-38")
    + polygon(beam, "-43,-12 -43,-25 -29,-24 -29,-11")
    + polygon(beam, "-15,5 -15,-22 3,-21 3,7")
    + polygon(beam, "34,-16 35,-31 48,-35 48,-21"));
}

function course(scene, id, preview = false) {
  const skyId = `shop-sky-${id}`;
  const distant = polygon(scene.peak, "0,337 0,258 20,236 96,267 156,187 233,247 284,209 371,286 451,237 524,271 597,229 670,273 737,215 801,273 911,198 1001,259 1075,179 1200,261 1200,376");
  const folds = polygon(scene.ridge, "156,187 178,241 233,247 185,252 96,267")
    + polygon(scene.ridge, "911,198 939,238 1001,259 941,257 880,290 801,273")
    + polygon(scene.ridge, "1075,179 1103,229 1200,261 1133,253 1045,286 1001,259");
  const rough = polygon(scene.rough, "0,386 0,323 189,300 329,326 473,311 583,333 717,303 838,321 964,295 1200,315 1200,720 0,720")
    + polygon(scene.dark, "0,424 151,362 279,360 205,416 98,446 0,493")
    + polygon(scene.dark, "0,624 181,570 292,628 375,720 0,720")
    + polygon(scene.dark, "839,594 995,520 1089,550 1200,516 1200,720 904,720");
  const shore = scene.lake
    ? polygon(scene.water, "827,372 914,344 1100,341 1200,357 1200,527 1026,537 917,477 835,451 808,414")
      + polygon(scene.wave, "901,432 972,413 1088,418 1027,424") + polygon(scene.wave, "1014,463 1113,454 1190,465 1113,465")
      + polygon(scene.ridge, "1100,362 1171,353 1200,361 1200,393 1156,393 1080,384")
    : polygon(scene.dark, "827,377 926,345 1130,360 1200,349 1200,530 1045,520 946,484 838,468")
      + polygon(scene.ridge, "910,400 1040,382 1150,392 1200,383 1200,413 1113,436 985,438")
      + polygon(scene.rough, "872,447 989,445 1045,471 1200,466 1200,530 1053,509 950,482");
  const fairway = `<path fill="${scene.grass}" d="M67 720C123 622 299 566 427 486C540 415 574 345 689 335C791 326 836 364 788 403C750 436 627 477 579 532C541 577 518 645 551 720Z"/>`
    + polygon(scene.light, "118,657 173,624 230,606 525,619 523,645 522,678")
    + polygon(scene.light, "266,585 348,542 383,515 577,533 556,563 547,587")
    + polygon(scene.light, "426,487 475,451 512,423 683,458 637,481 613,501")
    + polygon(scene.light, "552,384 593,357 648,341 795,377 787,404 752,420")
    + ellipse(scene.light, 736, 369, 69, 26)
    + flag(754, 367, 0.88);
  const sand = polygon(scene.sand, "792,454 824,429 859,432 869,446 854,457 825,456 803,471 780,469")
    + polygon(scene.sand, "308,489 339,462 378,459 389,471 363,485 352,506 327,510 300,503")
    + polygon(scene.sand, "608,646 636,602 687,580 718,584 729,606 715,632 681,665 644,666 620,683 583,676");
  const trees = [
    [20,404,0.76], [72,398,0.78], [137,381,0.6], [179,385,0.78], [218,367,0.52], [247,376,0.62],
    [1172,432,0.78], [1140,418,0.56], [1123,417,0.48], [905,527,1.08], [961,511,0.86],
    [117,552,0.82], [75,576,1.22], [21,581,1.15], [0,661,1.68], [1078,673,1.43], [1158,616,1.66], [1196,626,1.50],
  ].filter((_, i) => !preview || i % 3 === 0).map(([x, y, size]) => tree(scene, x, y, size)).join("");
  const sky = `<defs><linearGradient id="${skyId}" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${scene.sky}"/><stop offset=".63" stop-color="${scene.horizon}"/></linearGradient></defs>
    <path fill="url(#${skyId})" d="M0 0h1200v720H0z"/>`
    + ellipse(scene.sun, scene.sunset ? 224 : 930, scene.sunset ? 189 : 128, 48, 48);
  const land = distant + folds + rough + shore + fairway + sand + landmark(scene.landmark, scene.ridge) + trees;
  return svg(sky + (scene.mirror ? `<g transform="translate(1200 0) scale(-1 1)">${land}</g>` : land), "shop-scenery-course");
}

const railPreviews = new Map();
export function shopRailPreview(id) {
  if (!railPreviews.has(id)) {
    const scene = SCENES[id];
    const viewBox = scene.mirror ? "27 176 950 420" : "220 176 950 420";
    const still = course(scene, id, true).replace('0 0 1200 720', viewBox);
    const url = encodeURIComponent(still).replaceAll("'", "%27");
    railPreviews.set(id, `--rail-scene:url('data:image/svg+xml,${url}');--rail-tone:${scene.sky}`);
  }
  return railPreviews.get(id);
}

function clouds(scene) {
  const form = "0,25 28,13 53,14 71,2 103,0 124,12 170,14 190,26 156,31 25,32";
  return svg([
    [94,131,0.94], [396,84,0.52], [623,205,0.72], [1029,176,0.94],
  ].map(([x, y, scale]) => group(x, y, scale, polygon(scene.cloud, form))).join(""), "shop-scenery-clouds");
}

export function mountShopBackdrops(page, { reducedMotion = false } = {}) {
  const sections = [...page.querySelectorAll("[data-shop-section]")];
  if (!sections.length) return () => {};
  const host = document.createElement("div");
  host.className = "shop-scenery";
  host.setAttribute("aria-hidden", "true");
  host.classList.toggle("is-reduced", reducedMotion);
  page.classList.add("shop-scenery-scroll");
  page.prepend(host);

  // Only two scenes can paint at once. Prepare the next one when the browser is idle.
  const layers = [];
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  function layerFor(index) {
    if (layers[index]) return layers[index];
    const id = sections[index].dataset.shopSection;
    const scene = SCENES[id] || SCENES.featured;
    const layer = document.createElement("div");
    layer.className = "shop-scenery-scene";
    layer.dataset.scene = id;
    if (scene.mirror) layer.classList.add("is-mirrored");
    layer.innerHTML = course(scene, id) + clouds(scene);
    layer.hidden = true;
    frameScene(layer);
    host.append(layer);
    layers[index] = layer;
    return layer;
  }

  let frame = 0;
  let idle = 0;
  let idleIndex = -1;
  let visibleBase = null;
  let visibleOverlay = null;
  let overlayOpacity = "";
  let narrow = false;
  let viewportHeight = 0;
  let transitionSize = 1;
  let stops = [];

  function frameScene(layer) {
    const x = layer.classList.contains("is-mirrored") ? 0 : 250;
    const viewBox = narrow ? `${x} 0 950 720` : "0 0 1200 720";
    layer.querySelectorAll("svg").forEach(element => {
      if (element.getAttribute("viewBox") !== viewBox) element.setAttribute("viewBox", viewBox);
    });
  }

  function measure() {
    const { clientHeight, clientWidth, scrollHeight } = page;
    const transitionEnd = Math.min(100, clientHeight * 0.20);
    transitionSize = Math.max(1, Math.min(200, clientHeight * 0.38));
    // Layout offsets stay stable while the existing shop entrance animation translates its content.
    stops = sections.map(section => {
      let top = 0;
      for (let element = section; element && element !== page; element = element.offsetParent) {
        top += element.offsetTop;
      }
      return top - transitionEnd;
    });
    const maxScroll = scrollHeight - clientHeight;
    // The final section can be shorter than the viewport. Finish its blend at the scroll limit.
    if (stops.length > 1 && maxScroll > 0) {
      stops[stops.length - 1] = Math.min(stops.at(-1), maxScroll);
    }
    if (clientHeight !== viewportHeight) {
      viewportHeight = clientHeight;
      host.style.setProperty("--shop-scenery-height", `${clientHeight}px`);
    }
    const nextNarrow = clientWidth / clientHeight < 0.85;
    if (nextNarrow !== narrow) {
      narrow = nextNarrow;
      layers.forEach(frameScene);
    }
  }

  function prepare(index) {
    if (index >= sections.length || layers[index] || idleIndex === index
      || document.hidden || !window.requestIdleCallback) return;
    if (idle) window.cancelIdleCallback(idle);
    idleIndex = index;
    idle = window.requestIdleCallback(() => {
      idle = 0;
      idleIndex = -1;
      if (page.isConnected && !document.hidden) layerFor(index);
    });
  }

  function update() {
    frame = 0;
    if (!page.isConnected || !viewportHeight) return;
    const scrollTop = page.scrollTop;
    let current = 0;
    while (current + 1 < stops.length && stops[current + 1] - scrollTop <= 1) current += 1;
    const incoming = current + 1;
    const phase = incoming < stops.length && !reducedMotion && !motionPreference.matches
      ? Math.min(1, Math.max(0, 1 - (stops[incoming] - scrollTop) / transitionSize)) : 0;
    const base = layerFor(current);
    const overlay = phase > 0 ? layerFor(incoming) : null;
    if (base !== visibleBase || overlay !== visibleOverlay) {
      if (visibleBase && visibleBase !== base && visibleBase !== overlay) visibleBase.hidden = true;
      if (visibleOverlay && visibleOverlay !== base && visibleOverlay !== overlay) visibleOverlay.hidden = true;
      if (base !== visibleBase) {
        base.hidden = false;
        base.style.zIndex = "0";
        base.style.opacity = "1";
      }
      if (overlay && overlay !== visibleOverlay) {
        overlay.hidden = false;
        overlay.style.zIndex = "1";
      }
      visibleBase = base;
      visibleOverlay = overlay;
      overlayOpacity = "";
    }
    if (overlay) {
      const opacity = (phase * phase * (3 - 2 * phase)).toFixed(3);
      if (opacity !== overlayOpacity) {
        overlay.style.opacity = opacity;
        overlayOpacity = opacity;
      }
    }
    prepare(incoming + (overlay ? 1 : 0));
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const resize = new ResizeObserver(() => {
    measure();
    schedule();
  });
  const onVisibility = () => {
    host.classList.toggle("is-paused", document.hidden);
    if (!document.hidden) schedule();
  };
  resize.observe(page);
  const storefront = page.querySelector(".store");
  if (storefront) resize.observe(storefront);
  sections.forEach(section => resize.observe(section));
  page.addEventListener("scroll", schedule, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  motionPreference.addEventListener("change", schedule);
  host.classList.toggle("is-paused", document.hidden);
  measure();
  update();
  return () => {
    cancelAnimationFrame(frame);
    if (idle) window.cancelIdleCallback(idle);
    resize.disconnect();
    page.removeEventListener("scroll", schedule);
    document.removeEventListener("visibilitychange", onVisibility);
    motionPreference.removeEventListener("change", schedule);
    page.classList.remove("shop-scenery-scroll");
    host.remove();
  };
}
