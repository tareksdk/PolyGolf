const paths = {
  search: "M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  flag: "M5 21V3m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0",
  play: "m9 5 11 7-11 7Z",
  arrow: "M4 12h15m-5-5 5 5-5 5",
  chevron: "m9 5 7 7-7 7",
  lock: "M6 10h12v11H6Zm2 0V6a4 4 0 0 1 8 0v4",
  trophy: "M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-5 0h10",
  gift: "M3 8h18v5H3Zm2 5v8h14v-8M12 8v13m0-13C4 9 5 1 9 3l3 5Zm0 0c8 1 7-7 3-5l-3 5Z",
  settings:
    "m9 3 6 0 .6 3 2.5 1.5 2.9-1 3 5-2.3 2v3L24 19l-3 5-3-1.1-2.5 1.5-.5 3H9l-.6-3-2.5-1.5-2.9 1-3-5 2.3-2v-3L0 12l3-5 3 1.1L8.5 6Z",
  sliders: "M5 3v18M12 3v18M19 3v18M2 8h6m1 8h6m1-9h6",
  sound: "M3 9h4l5-4v14l-5-4H3Zm12-1a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14",
  pause: "M8 4v16M16 4v16",
  reset: "M4 9a8 8 0 1 1 0 8m0-13v6h6",
  camera: "M3 7h5l2-3h4l2 3h5v14H3Zm12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  star: "m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.6l-5.7 3 1.1-6.4-4.6-4.5 6.4-.9Z",
  check: "m5 12 4 4L20 5",
  shuffle: "M3 6h3c5 0 6 12 11 12h4m-4-4 4 4-4 4M3 18h3c5 0 6-12 11-12h4m-4-4 4 4-4 4",
  ball: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 8h.1m7 2h.1m-4 5h.1m-4-3h.1m9 3h.1",
  spark: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z",
  club: "M16 3 9 18m0 0H4v4h9l2-4Z",
  leaf: "M20 3C3 1 0 17 9 20c8 2 12-6 11-17ZM5 22 16 8",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-2a7 7 0 0 1 14 0v2",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z",
  help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 3v1M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z",
  fullscreen: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  heart: "M12 21C-8 8 5-3 12 6c7-9 20 2 0 15Z",
  clock: "M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
};
export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="${name === "play" ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
}

// PolyGolf brand mark: a faceted low-poly ball beneath a pennant flag.
export function brandMark(size = 40) {
  return '<svg class="brand-mark" width="'+size+'" height="'+size+'" viewBox="0 0 40 40" aria-hidden="true"><path d="M13 33V6" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M15 6L32 12L15 19Z" fill="#ca714e"/><path d="M7 34h18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
}
