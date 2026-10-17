import { HALLOWEEN_ITEMS, DISCOVERY_ITEMS, SPECIAL_PLATES } from "./halloween.js";
import { CODE_NAMEPLATES } from './code-nameplates.js';
import { RANKS, rankPlate } from './ranks.js';
import { FINISHES } from './finishes.js';
export const CATEGORIES = [
  { id: "ball", name: "Balls", icon: "ball" },
  { id: "trail", name: "Trails", icon: "spark" },
  { id: "club", name: "Putters", icon: "club" },
  { id: "driver", name: "Drivers", icon: "club" },
  { id: "hole", name: "Hole effects", icon: "sun" },
  { id: "emote", name: "Emotes", icon: "heart" },
  { id: "nameplate", name: "Nameplates", icon: "user" },
];
export const RARITY = {
  Common: "#a0ac9b",
  Uncommon: "#7aab72",
  Rare: "#74a9bc",
  Epic: "#b08dc1",
  Legendary: "#d9b15c",
  "Black Market": "#524275",
};
const rows = {
  driver: [
    ["classic", "Tour Steel", 0, "Common", "#718279"],
    ["copper", "Copperhead", 450, "Rare", "#b47a57"],
    ["midnight", "Midnight Driver", 900, "Epic", "#626884"],
  ],
  ball: [
    ["classic", "Classic Cream", 0, "Common", "#f7f5e7"],
    ["stripe", "Coral Stripe", 250, "Uncommon", "#f8ede1", "#dc8774"],
    ["galaxy", "Little Galaxy", 1300, "Epic", "#79649b", "#d8a9e5"],
    ["lava", "Ember", 950, "Epic", "#bf6850", "#f5c07b"],
    ["water", "Blue Lagoon", 600, "Rare", "#72b8c8", "#cef2ee"],
    ["gold", "Golden Hour", 2400, "Legendary", "#e2b856"],
    ["marble", "Mint Marble", 550, "Rare", "#b5d2ba", "#eff3dd"],
    ["pixel", "Pixel Peach", 450, "Uncommon", "#efa187", "#f5d2a1"],
    ["neon", "Afterglow", 1100, "Epic", "#bba2d8", "#82e2d1"],
    ["patch", "Patchwork", 350, "Uncommon", "#f5ead4", "#506958"],
    ["streak", "Sunday Special", 0, "Legendary", "#f2d088", "#b8d2a2"],
  ],
  trail: [
    ["none", "No Trail", 0, "Common", "#dfe5d8"],
    ["sparkles", "Stardust", 400, "Rare", "#f4d274"],
    ["fire", "Ember Drift", 850, "Epic", "#e98d59"],
    ["ice", "Frost Dust", 600, "Rare", "#a1dbe9"],
    ["rainbow", "Daydream", 1200, "Epic", "#d49ac9"],
    ["stars", "Shooting Stars", 950, "Epic", "#f0ca64"],
    ["electric", "Live Wire", 1500, "Legendary", "#b5a1e6"],
    ["leaves", "Autumn Leaves", 350, "Uncommon", "#b8c378"],
    ["cloud", "Cloud Puff", 550, "Rare", "#edf3e7"],
    ["pixel", "Pixel Parade", 700, "Rare", "#e8a789"],
    ["neon", "Neon Ribbon", 1000, "Epic", "#96ddd0"],
  ],
  club: [
    ["classic", "The Original", 0, "Common", "#7d8978"],
    ["wood", "Old Oak", 300, "Uncommon", "#aa7b4d"],
    ["gold", "Golden Putter", 1700, "Legendary", "#dfb65e"],
    ["crystal", "Crystal Clear", 1100, "Epic", "#a4d7dd"],
    ["neon", "Night Shift", 900, "Epic", "#c499d3"],
    ["carbon", "Carbon Club", 600, "Rare", "#586263"],
    ["candy", "Candy Cane", 500, "Rare", "#de8d8a"],
    ["galaxy", "Cosmic Club", 1300, "Epic", "#8370a5"],
  ],
  hole: [
    ["confetti", "Happy Confetti", 0, "Common", "#f0d075"],
    ["pop", "Solar Pop", 500, "Rare", "#e7a179"],
    ["lightning", "Thunderclap", 1100, "Epic", "#c0b1eb"],
    ["fireworks", "Celebration", 1500, "Legendary", "#f0c474"],
    ["void", "Into the Void", 1700, "Legendary", "#9181b0"],
    ["leaves", "Leaf Shower", 400, "Uncommon", "#b0be76"],
    ["splash", "Tiny Splash", 650, "Rare", "#90cbde"],
    ["pixel", "Pixel Party", 750, "Rare", "#e3a2ba"],
  ],
  emote: [
    ["wave", "Hello, Fairway", 0, "Common", "#b4ca99"],
    ["love", "Love That Shot", 300, "Uncommon", "#e2a1a2"],
    ["cheer", "Nice One!", 500, "Rare", "#f0ce71"],
  ],
  nameplate: [
    ["classic", "Sunday Golfer", 0, "Common", "#8dab81"],
    ["sunset", "Sunset Society", 350, "Uncommon", "#e1ae7e"],
    ["midnight", "Midnight Club", 850, "Epic", "#9c8abe"],
    ["botanical", "Botanical Club", 500, "Rare", "#a5bf91"],
  ],
  effect: [
    ["none", "No Aura", 0, "Common", "#d9e2d5"],
    ["petals", "Petal Waltz", 700, "Rare", "#e5b5ca"],
    ["orbit", "Golden Orbit", 1800, "Legendary", "#f0cd68"],
    ["fireflies", "Firefly Friends", 950, "Epic", "#cfe28e"],
  ],
};
export const ITEMS = Object.entries(rows)
  .filter(([category]) => category !== "effect")
  .flatMap(([category, items]) =>
    items.map(([id, name, price, rarity, color, pattern]) => ({
      id: category + "-" + id,
      name,
      price,
      rarity,
      color,
      pattern,
      category,
      exclusive: id === "streak",
    })),
  );
ITEMS.push(
  ...[
    ["driver", "Clubhouse Driver", "#bb9755"],
    ["nameplate", "Members Crest", "#577c68"],
    ["ball", "Clubhouse Pearl", "#c7dbc0"],
    ["trail", "Champagne Trail", "#e4c583"],
    ["club", "Clubhouse Putter", "#bb9755"],
  ].map(([category, name, color]) => ({
    id: category + "-club",
    category,
    name,
    color,
    price: 0,
    rarity: "Legendary",
    exclusive: true,
  })),
);
ITEMS.push(
  ...[
    ["ball", "Aurora Pearl", "#a6cfed"],
    ["driver", "Rosewood Tour", "#ba7e66"],
    ["club", "Jade Precision", "#63ad97"],
    ["trail", "Seaside Spark", "#73c8dc"],
    ["nameplate", "Founders Laurel", "#d9bc6b"],
    ["hole", "Clubhouse Celebration", "#e5a2b4"],
  ].map(([category, name, color]) => ({
    id: category + "-prestige",
    category,
    name,
    color,
    price: 0,
    rarity: "Legendary",
    exclusive: true,
  })),
);
const finishes = [
  ["Field Notes", "#7d986a", "#eee4bf"],
  ["Persimmon", "#b36542", "#f4dbb0"],
  ["Sea Glass", "#70aaad", "#d0e8df"],
  ["Oxford", "#334e70", "#dcb46c"],
  ["Terracotta", "#bc7565", "#f4d4ae"],
  ["Alpine", "#92b8ac", "#f3f1e3"],
  ["Cobalt", "#477fbb", "#deeceb"],
  ["Cherrywood", "#713c44", "#dcbba0"],
  ["Match Point", "#ded7ae", "#4a7158"],
  ["After Hours", "#3b4059", "#bfb5df"],
  ["Copperline", "#bd8d60", "#e9d3a8"],
  ["Azalea", "#bc84a5", "#f4d1df"],
  ["Tidal", "#367e8c", "#a3d9db"],
  ["Pistachio", "#9ba97d", "#ebe5c8"],
  ["Oxblood", "#824845", "#dab493"],
  ["Porcelain", "#eceddf", "#526d93"],
  ["Heritage", "#4f6856", "#cdad70"],
  ["Citrus", "#d2ad45", "#fff0b6"],
  ["Slate", "#667582", "#c4d3dc"],
  ["Burgundy", "#704359", "#c899a5"],
  ["Dune", "#c7b897", "#f2e6cb"],
  ["Horizon", "#839fc2", "#efd6b0"],
  ["Evergreen", "#356758", "#a8c888"],
  ["Moonstone", "#a0a2be", "#ece8f4"],
  ["Firecrest", "#c67641", "#e8ce7a"],
  ["Silver Birch", "#c6cebd", "#7d9573"],
  ["Ink Wash", "#465259", "#bcbda9"],
  ["Sunroom", "#dab466", "#f2ddb5"],
];
const labels = {
  ball: "Ball",
  club: "Putter",
  driver: "Driver",
  trail: "Trail",
  hole: "Finish",
  emote: "Salute",
  nameplate: "Plate",
  effect: "Aura",
};
for (const { id: category } of CATEGORIES) {
  if (!ITEMS.some((i) => i.id === category + "-club"))
    ITEMS.push({
      id: category + "-club",
      category,
      name: "Clubhouse " + labels[category],
      color: "#c5b17b",
      pattern: "#496853",
      price: 0,
      rarity: "Legendary",
      exclusive: true,
    });
  ITEMS.push({
    id: category + "-alpha",
    category,
    name: "Alpha " + labels[category],
    color: "#292f47",
    pattern: "#c2e7b3",
    price: 0,
    rarity: "Legendary",
    exclusive: true,
    source: "alpha",
    design: 5,
  });
  if (["ball", "club", "driver"].includes(category))
    ITEMS.push({
      id: category + "-obsidian",
      category,
      name: { ball: "Event Horizon", club: "Black Label", driver: "Carbon Eclipse", effect: "Dark Matter" }[
        category
      ],
      color: "#262337",
      pattern: "#b2a1ed",
      price: 6800,
      rarity: "Black Market",
      source: "weekly",
      design: 7,
    });
  for (let j = 0; ITEMS.filter((i) => i.category === category).length < 80; j++) {
    const [finish, color, pattern] = finishes[j % finishes.length],
      name =
        finish +
        (j >= finishes.length ? " " + ["Links", "Tour", "Reserve"][Math.floor(j / finishes.length) - 1] : ""),
      rarity = ["Uncommon", "Rare", "Rare", "Epic", "Rare", "Legendary"][j % 6];
    ITEMS.push({
      id: category + "-edition-" + (j + 1),
      category,
      name: name + " " + labels[category],
      color,
      pattern,
      rarity,
      price: { Uncommon: 350, Rare: 650, Epic: 1250, Legendary: 2600 }[rarity] + (j % 3) * 50,
      source:
        j >= 24
          ? j % 5 === 0
            ? "membership"
            : j % 3 === 0
              ? "bundle"
              : j % 2 === 0
                ? "pack"
                : "weekly"
          : j % 3 === 0
            ? "weekly"
            : "daily",
      design: j % 8,
    });
  }
}
ITEMS.push(
  ...[
    ["ball", "first", "First Tee Pearl", "Rare", "#eee1a8"],
    ["club", "ace", "Ace Maker", "Legendary", "#c89d50"],
    ["driver", "sharp", "Pinseeker", "Legendary", "#455876"],
    ["nameplate", "collector", "Curator Crest", "Epic", "#986578"],
    ["trail", "tourist", "Traveller Gold", "Epic", "#d6b26b"],
    ["ball", "birds", "Birdsong", "Epic", "#8fb6ab"],
    ["hole", "rich", "Sunburst Cup", "Legendary", "#e1b847"],
    ["emote", "secret", "Explorer Salute", "Epic", "#678458"],
  ].map(([category, key, name, rarity, color]) => ({
    id: category + "-achievement-" + key,
    category,
    name,
    rarity,
    color,
    pattern: "#f4e7ba",
    price: 0,
    source: "achievement",
    exclusive: true,
    design: 6,
  })),
);
for (const item of ITEMS) {
  item.design ??= hash(item.id) % 8;
  item.source ??=
    item.id === "ball-streak"
      ? "streak"
      : item.exclusive
        ? "membership"
        : item.price === 0
          ? "starter"
          : hash(item.id) % 3 === 0
            ? "weekly"
            : "daily";
}
for (const item of ITEMS) {
  if (["ball-obsidian", "club-obsidian"].includes(item.id)) item.source = "pack";
  if (item.source === "pack" && item.rarity !== "Black Market")
    item.rarity = [
      "Uncommon",
      "Uncommon",
      "Rare",
      "Rare",
      "Rare",
      "Epic",
      "Epic",
      "Rare",
      "Legendary",
      "Rare",
    ][hash(item.id) % 10];
  if (item.price > 0)
    item.price =
      { Common: 700, Uncommon: 1800, Rare: 5200, Epic: 14000, Legendary: 42000, "Black Market": 68000 }[
        item.rarity
      ] +
      (hash(item.id) % 5) * 100;
  if (["pack", "membership", "bundle", "alpha"].includes(item.source)) {
    item.exclusive = true;
    item.price = 0;
  }
}
// Novelty clubs are appended after every generated item so existing ids, prices and
// rarities never shift. "permanent" items stay on the Novelty Rack; "pack" items with a
// crate belong only to that locker.
const NOVELTY = [
  ["driver", "hockey", "Slapshot", "Rare", "permanent", "hockey", "#c8553d", "#f1ece0", "A taped hockey stick with a surprisingly sweet spot."],
  ["driver", "baguette", "Le Long Drive", "Epic", "permanent", "baguette", "#d9a35b", "#f3dcae", "Freshly baked, lightly scored, built for distance."],
  ["club", "broom", "Clean Sweep", "Rare", "permanent", "broom", "#d8b563", "#8a5a3a", "Sweeps the ball along the green."],
  ["driver", "oar", "Rowing Blue", "Rare", "pack", "oar", "#3c6e9e", "#f2e3b8", "A painted rowing blade for long, smooth strokes."],
  ["club", "umbrella", "Rain Check", "Rare", "pack", "umbrella", "#3f6f8f", "#f2c45a", "A neatly furled umbrella with a hooked handle."],
  ["driver", "bat", "Home Run", "Epic", "pack", "bat", "#c79a5b", "#2f3f55", "Ash-wood slugger with a taped handle."],
  ["club", "peppermint", "Peppermint Twist", "Epic", "pack", "candycane", "#5aa06b", "#fbf7ee", "A mint-striped cane that hooks the ball home."],
  ["club", "flamingo", "Lawn Flamingo", "Epic", "pack", "flamingo", "#ee8fa3", "#2b2b2b", "A garden flamingo with a very precise beak."],
  ["club", "lollipop", "Sugar Rush", "Epic", "pack", "lollipop", "#e56aa0", "#fff3c4", "A swirl lollipop on a sturdy candy stick."],
  ["driver", "rocket", "Liftoff", "Legendary", "pack", "rocket", "#e8e2d0", "#d8573a", "A finned rocket head with a glowing exhaust."],
  ["club", "pan", "Sunny Side", "Legendary", "pack", "pan", "#3b3f45", "#f6c64a", "A cast-iron pan, egg included."],
  ["driver", "blackice", "Black Ice", "Black Market", "pack", "hockey", "#262337", "#9fd6e8", "A midnight stick wrapped in glacier tape."],
  ["club", "midnight", "Midnight Cane", "Black Market", "pack", "candycane", "#b2a1ed", null, "Violet stripes on a midnight cane.", "#262337"],
];
for (const [category, key, name, rarity, source, shape, color, pattern, flavor, base] of NOVELTY) {
  const id = category + "-" + key,
    pack = source === "pack";
  ITEMS.push({
    id,
    category,
    name,
    rarity,
    color,
    ...(pattern ? { pattern } : {}),
    ...(base ? { base } : {}),
    shape,
    flavor,
    design: 0,
    source,
    added: "polygolf-1",
    ...(pack ? { crate: "oddities" } : {}),
    exclusive: pack,
    price: pack ? 0 : { Rare: 5200, Epic: 14000, Legendary: 42000 }[rarity] + (hash(id) % 5) * 100,
  });
}
// The existing Candy Cane putter now uses its matching candy-cane model.
Object.assign(
  ITEMS.find((i) => i.id === "club-candy"),
  { shape: "candycane", flavor: "Peppermint stripes with a hooked head." },
);
for (const item of ITEMS) if (item.price > 0) item.price = Math.ceil(item.price * 1.3 / 100) * 100;
ITEMS.push(
  { id: 'ball-pirate', category: 'ball', name: 'Jolly Roger', rarity: 'Legendary', color: '#e6dfca', pattern: '#283639', design: 0, motif: 'skull', source: 'achievement', exclusive: true, price: 0, flavor: 'Strike the pirate ship off Saltwind Links.' },
  { id: 'nameplate-pirate', category: 'nameplate', name: 'Captain of the Coast', rarity: 'Legendary', color: '#283e46', pattern: '#cdb271', motif: 'skull', design: 0, source: 'achievement', exclusive: true, price: 0 },
  ...RANKS.map((rank, i) => ({ id: rankPlate(rank), category: 'nameplate', name: rank.name + ' Competitor', rarity: ['Common','Uncommon','Rare','Epic','Epic','Legendary','Black Market'][i], color: rank.color, pattern: '#ede6d6', rank: rank.name, design: i, source: 'competitive', exclusive: true, price: 0, flavor: 'Earned by reaching ' + rank.name + ' after a completed competitive match.' }))
);
for (const finish of FINISHES) for (const [category, label] of [['driver','Driver'],['club','Putter'],['ball','Ball']]) {
  ITEMS.push({ id: category + '-' + finish.key, category, name: finish.name + ' ' + label,
    rarity: finish.rarity, color: finish.color, pattern: finish.accent, finish: finish.key,
    source: 'pack', crate: 'workshop', price: 0, exclusive: true, design: 0,
    flavor: finish.key === 'case-hardened' ? 'Heat-blued steel, brass gold and violet edges. Every drop gets a saved pattern from 000 to 999.' : 'An original numbered finish. Every drop adds its own saved pattern to your collection.' });
}
ITEMS.push(...HALLOWEEN_ITEMS, ...DISCOVERY_ITEMS, ...SPECIAL_PLATES);
ITEMS.push(...CODE_NAMEPLATES);
ITEMS.push({id:'nameplate-locker-legend',category:'nameplate',name:'Locker Legend',rarity:'Legendary',color:'#201d36',pattern:'#f0cb78',badge:'vault',shine:'prismatic',design:0,source:'achievement',exclusive:true,price:0,secret:true,flavor:'A secret discovered after opening more than 1,000 lockers.'});
export const ALPHA_ITEMS = ITEMS.filter((i) => i.source === "alpha").map((i) => i.id);
export const DEFAULT_EQUIPMENT = {
  ball: "ball-classic",
  driver: "driver-classic",
  trail: "trail-none",
  club: "club-classic",
  hole: "hole-confetti",
  emote: "emote-wave",
  nameplate: "nameplate-classic",
};
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export function dayKey(now = new Date()) {
  return new Date(now).toISOString().slice(0, 10);
}
export function dayNumber(now = new Date()) {
  return Math.floor(new Date(now).getTime() / 86400000);
}
export function shopRotation(now = new Date()) {
  const day = dayNumber(now),
    week = Math.floor((day + 3) / 7),
    sort = (items, key) => [...items].sort((a, b) => hash(a.id + ":" + key) - hash(b.id + ":" + key));
  const daily = CATEGORIES.flatMap((c) =>
    sort(
      ITEMS.filter((i) => i.category === c.id && i.source === "daily"),
      day,
    ).slice(0, 2),
  );
  const pool = ITEMS.filter((i) => i.source === "weekly"),
    weeklyBase = CATEGORIES.map(
      (c) =>
        sort(
          pool.filter((i) => i.category === c.id),
          week,
        )[0],
    ).filter(Boolean);
  const extra = sort(
      pool.filter((i) => !weeklyBase.includes(i)),
      week,
    ).slice(0, 4),
    weekly = [...weeklyBase, ...extra];
  return {
    featured: extra,
    daily,
    weekly: weeklyBase,
    permanent: ITEMS.filter((i) => i.source === "permanent"),
    day,
    week,
    nextDay: (day + 1) * 86400000,
    nextWeek: ((week + 1) * 7 - 3) * 86400000,
  };
}
let availableDay, availableIds;
export function shopAvailable(id, now = new Date()) {
  const day = dayNumber(now);
  if (day !== availableDay || !availableIds) {
    const r = shopRotation(now);
    availableDay = day;
    availableIds = new Set([...r.featured, ...r.daily, ...r.weekly, ...r.permanent].map(i => i.id));
  }
  return availableIds.has(id);
}
export function itemSource(item) {
  return (
    {
      code: "Exclusive gift code",
      founder: "First 100 accounts",
      alpha: "Alpha tester code",
      membership: "Country Club reward",
      streak: "Seven-day login reward",
      starter: "Starter equipment",
      daily: "Daily shop rotation",
      weekly: "Weekly shop rotation",
      pack: item.crate === "halloween" ? "Halloween Locker exclusive" : item.crate === "workshop" ? "Forge & Workshop Lockers" : item.crate === "oddities" ? "Oddities Locker exclusive" : "Locker exclusive",
      permanent: "Novelty Rack · always in stock",
      bundle: "Pro Shop bundle exclusive",
      achievement: "Achievement reward",
      competitive: "Competitive rank reward",
    }[item.source] || "Collection reward"
  );
}
function hash(s) {
  let n = 2166136261;
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
}
