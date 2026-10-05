import { courseRecordKey } from "./golf-courses.js";
import { halloweenActive } from './season.js';
import { rollRoundLocker } from './round-rewards.js';
import { normalizePatterns, validSeed } from './finishes.js';
import { unlockLevels, memberEntitled, migratePass } from "./equipment.js";
import { DEFAULT_EQUIPMENT, ITEMS, ITEM_BY_ID, dayKey, dayNumber, shopAvailable } from "./catalog.js";
export const SAVE_KEY = "little-links.save.v1";
export const DEFAULT_SETTINGS = {
  master: 0.65,
  music: 0.25,
  musicStyle: "calm",
  sfx: 0.65,
  graphics: "medium",
  theme: "dark",
  shadows: true,
  particles: true,
  cameraSensitivity: 1,
  zoomSensitivity: 1,
  aimGuide: true,
};
export function defaultSave() {
  return {
    version: 1,
    name: "Sunday Golfer",
    coins: 300,
    totalEarned: 300,
    xp: 0,
    owned: Object.values(DEFAULT_EQUIPMENT),
    equipment: { ...DEFAULT_EQUIPMENT, patterns: {} },
    patterns: {},
    favorites: [],
    stats: { games: 0, courses: 0, holes: 0, strokes: 0, aces: 0, birdies: 0, playTime: 0, collectibles: 0 },
    completed: [],
    bests: {},
    achievements: [],
    settings: { ...DEFAULT_SETTINGS },
    daily: { date: dayKey(), holes: 0, birdies: 0, courses: [], quick: 0, coins: 0, claimed: [] },
    login: { last: null, streak: 0 },
    history: [],
  };
}
export function levelInfo(total) {
  let level = 1,
    remaining = Math.max(0, Number(total) || 0),
    required = 500;
  while (remaining >= required && level < 100) {
    remaining -= required;
    level++;
    required = 500 + (level - 1) * 125;
  }
  return { level, xp: remaining, required, progress: remaining / required };
}
export class LocalSaveRepository {
  constructor(storage) {
    this.error = null;
    try {
      this.storage = storage ?? globalThis.localStorage;
    } catch {
      this.storage = null;
      this.error = "Storage is unavailable. Progress will last for this session only.";
    }
  }
  load() {
    const base = defaultSave();
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return base;
      const v = JSON.parse(raw);
      if (v.version !== 1 || !Array.isArray(v.owned)) throw new Error("Unknown save format");
      const result = {
        ...base,
        ...v,
        stats: { ...base.stats, ...v.stats },
        settings: { ...DEFAULT_SETTINGS, ...v.settings },
        equipment: { ...DEFAULT_EQUIPMENT, ...v.equipment },
        login: { ...base.login, ...v.login },
        daily: { ...base.daily, ...v.daily },
      };
      result.owned = [
        ...new Set([...Object.values(DEFAULT_EQUIPMENT), ...v.owned.filter((id) => ITEM_BY_ID[id])]),
      ];
      for (const [cat, id] of Object.entries(result.equipment))
        if (cat !== 'patterns' && (!result.owned.includes(id) || ITEM_BY_ID[id]?.category !== cat))
          result.equipment[cat] = DEFAULT_EQUIPMENT[cat];
      for (const key of Object.keys(result.bests))
        if (/^\d+$/.test(key)) {
          result.bests["mini:" + key] ??= result.bests[key];
          delete result.bests[key];
        }
      result.completed = result.completed.map((k) => (typeof k === "number" ? "mini:" + k : k));
      result.coins = Math.max(0, Number(result.coins) || 0);
      result.xp = Math.max(0, Number(result.xp) || 0);
      result.name = String(result.name).slice(0, 20);
      for (const k of ["master", "music", "sfx"])
        result.settings[k] = Math.max(0, Math.min(1, Number(result.settings[k]) || 0));
      return normalizeInventory(result);
    } catch (e) {
      this.error = "Your previous save could not be read. A new local session is ready.";
      return base;
    }
  }
  save(data) {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      this.error = "Storage is unavailable. Keep this tab open; progress cannot survive a reload.";
      return false;
    }
  }
}
export const ACHIEVEMENTS = [
  { id:'pumpkin',item:'ball-pumpkin-find',items:['ball-pumpkin-find','nameplate-pumpkin-find'],name:'A Little Pumpkin Hunt',desc:'Hit the pumpkin beneath a tree beside the first Autumn Pines fairway.',icon:'gift',target:1,value:s=>s.stats.pumpkinHits||0,coins:350,xp:450 },
  { id: 'pirate', item: 'ball-pirate', items: ['ball-pirate', 'nameplate-pirate'], name: 'Broadside!', desc: 'Hit the pirate ship in the water at Saltwind Links.', icon: 'flag', target: 1, value: s => s.stats.shipHits || 0, coins: 350, xp: 450 },
  {
    id: "first",
    item: "ball-achievement-first",
    locker: "fairway",
    lockerCount: 1,
    name: "The First of Many",
    desc: "Complete your first hole.",
    icon: "flag",
    target: 1,
    value: (s) => s.stats.holes,
    coins: 100,
    xp: 120,
  },
  {
    id: "ace",
    item: "club-achievement-ace",
    locker: "tour",
    lockerCount: 1,
    name: "One and Done",
    desc: "Get your first hole in one.",
    icon: "trophy",
    target: 1,
    value: (s) => s.stats.aces,
    coins: 250,
    xp: 250,
  },
  {
    id: "sharp",
    item: "driver-achievement-sharp",
    locker: "tour",
    lockerCount: 2,
    name: "Sharpshooter",
    desc: "Sink 10 holes in one.",
    icon: "spark",
    target: 10,
    value: (s) => s.stats.aces,
    coins: 1000,
    xp: 600,
  },
  {
    id: "collector",
    item: "nameplate-achievement-collector",
    locker: "fairway",
    lockerCount: 1,
    name: "A Little Collection",
    desc: "Own 10 cosmetics.",
    icon: "ball",
    target: 10,
    value: (s) => s.owned.length,
    coins: 200,
    xp: 250,
  },
  {
    id: "tourist",
    item: "trail-achievement-tourist",
    locker: "tour",
    lockerCount: 3,
    name: "The Scenic Route",
    desc: "Finish all five courses.",
    icon: "sun",
    target: 5,
    value: (s) => s.completed.length,
    coins: 1500,
    xp: 1000,
  },
  {
    id: "birds",
    item: "ball-achievement-birds",
    locker: "fairway",
    lockerCount: 2,
    name: "Bird Watcher",
    desc: "Make 25 birdies or better.",
    icon: "leaf",
    target: 25,
    value: (s) => s.stats.birdies,
    coins: 800,
    xp: 500,
  },
  {
    id: "rich",
    item: "hole-achievement-rich",
    locker: "tour",
    lockerCount: 1,
    name: "Pocket Sunshine",
    desc: "Earn 10,000 coins in total.",
    icon: "gift",
    target: 10000,
    value: (s) => s.totalEarned,
    coins: 1000,
    xp: 500,
  },
  {
    id: "secret",
    item: "emote-achievement-secret",
    locker: "fairway",
    lockerCount: 1,
    name: "Off the Beaten Path",
    desc: "Find 10 hidden course coins.",
    icon: "star",
    target: 10,
    value: (s) => s.stats.collectibles,
    coins: 500,
    xp: 350,
  },
];
export function challengesFor(now = new Date()) {
  const n = dayNumber(now);
  return [
    {
      id: "holes",
      name: n % 2 ? "A full round" : "Double the fun",
      desc: `Complete ${n % 2 ? 9 : 18} holes`,
      target: n % 2 ? 9 : 18,
      value: (d) => d.holes,
      coins: 180,
      xp: 200,
    },
    {
      id: "birdies",
      name: "Something to chirp about",
      desc: "Make 3 birdies or better",
      target: 3,
      value: (d) => d.birdies,
      coins: 220,
      xp: 250,
    },
    n % 2
      ? {
          id: "quick",
          name: "Quick little putt",
          desc: "Finish a hole in under 20 seconds",
          target: 1,
          value: (d) => d.quick,
          coins: 150,
          xp: 180,
        }
      : {
          id: "courses",
          name: "A change of scenery",
          desc: "Finish 2 different courses",
          target: 2,
          value: (d) => d.courses.length,
          coins: 300,
          xp: 300,
        },
  ];
}
export const DAILY_REWARDS = Object.freeze([60, 75, 90, 110, 135, 165, 225]);

export class ProgressionManager {
  constructor(repository, onNotify = () => {}) {
    this.repository = repository;
    this.data = normalizeInventory(repository.load());
    this.onNotify = onNotify;
    this.refreshDaily();
  }
  get level() {
    return levelInfo(this.data.xp);
  }
  save() {
    return this.repository.save(this.data);
  }
  refreshDaily(now = new Date()) {
    const date = dayKey(now);
    if (this.data.daily.date !== date) {
      this.data.daily = { date, holes: 0, birdies: 0, courses: [], quick: 0, coins: 0, claimed: [] };
      this.save();
    }
  }
  award(coins, xp) {
    const before = this.level.level;
    this.data.coins += coins;
    this.data.totalEarned += coins;
    this.data.xp += xp;
    unlockLevels(this);
    const after = this.level.level;
    if (after > before) {
      const bonus = (after - before) * 60;
      this.data.coins += bonus;
      this.data.totalEarned += bonus;
      this.onNotify(`Level ${after}! +${bonus} coins`, "level");
    }
  }
  checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (!this.data.achievements.includes(a.id) && a.value(this.data) >= a.target) {
        this.data.achievements.push(a.id);
        this.award(a.coins, a.xp);
        this.onNotify(`Achievement: ${a.name} · +${a.coins} coins`, "achievement");
      }
    }
  }
  claimAchievement(id) {
    const a = ACHIEVEMENTS.find((a) => a.id === id);
    if (!a) throw Error("Unknown achievement.");
    this.checkAchievements();
    if (!this.data.achievements.includes(id)) throw Error("Complete this achievement first.");
    this.data.achievementRewards ??= [];
    if (this.data.achievementRewards.includes(id)) throw Error("Achievement rewards already collected.");
    this.data.achievementRewards.push(id);
    for (const item of a.items || [a.item]) if (!this.data.owned.includes(item)) this.data.owned.push(item);
    this.data.lockers ??= {};
    if (a.locker) this.data.lockers[a.locker] = (this.data.lockers[a.locker] || 0) + a.lockerCount;
    this.save();
    return { item: a.item, locker: a.locker, count: a.lockerCount };
  }
  startRound(practice) {
    if (!practice) {
      this.data.stats.games++;
      this.save();
    }
  }
  discoverPumpkin(now=Date.now()) {
    if(!halloweenActive(now)||this.data.achievementRewards?.includes('pumpkin'))return false;
    this.data.stats.pumpkinHits=1;this.checkAchievements();this.claimAchievement('pumpkin');return true;
  }
  discoverPirate() {
    if (this.data.achievementRewards?.includes('pirate')) return false;
    this.data.stats.shipHits = 1;
    this.checkAchievements();
    this.claimAchievement('pirate');
    return true;
  }
  completeHole(result) {
    if (result.round.practice) return { coins: 0, xp: 0 };
    this.refreshDaily();
    const d = this.data,
      diff = result.strokes - result.par,
      coins = 26 + (diff < 0 ? 12 : 0) + (result.strokes === 1 ? 32 : 0),
      xp = 100 + (diff < 0 ? 40 : 0) + (result.strokes === 1 ? 100 : 0);
    d.stats.holes++;
    d.stats.strokes += result.strokes;
    d.daily.holes++;
    if (result.strokes === 1) d.stats.aces++;
    if (diff < 0) {
      d.stats.birdies++;
      d.daily.birdies++;
    }
    if (result.time < 20) d.daily.quick++;
    this.award(coins, xp);
    this.checkAchievements();
    this.save();
    return { coins, xp };
  }
  completeCourse(round, pars, random = Math.random) {
    if (round.practice) return { coins: 0, xp: 0 };
    this.refreshDaily();
    const d = this.data,
      key = (round.mode || "mini") + ":" + round.courseIndex,
      total = round.strokes.reduce((a, b) => a + b, 0),
      relative = total - pars.reduce((a, b) => a + b, 0);
    d.stats.courses++;
    if (!d.completed.includes(key)) d.completed.push(key);
    if (!d.daily.courses.includes(key)) d.daily.courses.push(key);
    const recordKey = courseRecordKey(round.mode || "mini", round.courseIndex),
      best = d.bests[recordKey];
    d.bests[recordKey] = {
      score: Math.min(best?.score ?? Infinity, relative),
      time: Math.min(best?.time ?? Infinity, round.time),
      strokes: total,
    };
    d.history.unshift({
      course: round.courseIndex,
      mode: round.mode || "mini",
      score: relative,
      time: Math.round(round.time),
      date: dayKey(),
    });
    d.history = d.history.slice(0, 30);
    this.award(110, 400);
    const locker = rollRoundLocker(round, random);
    if (locker) {
      d.lockers ??= {};
      d.lockers[locker] = (d.lockers[locker] || 0) + 1;
    }
    this.checkAchievements();
    this.save();
    return { coins: 110, xp: 400, ...(locker ? { locker } : {}) };
  }
  collectible(practice) {
    if (practice) return;
    this.data.stats.collectibles++;
    this.award(10, 25);
    this.checkAchievements();
    this.save();
  }
  buy(id) {
    const item = ITEM_BY_ID[id];
    if (!item || !item.price || item.exclusive)
      return { ok: false, message: "This item is earned through its collection reward." };
    if (this.data.owned.includes(id)) return { ok: false, message: "Already in your collection." };
    if (!shopAvailable(id))
      return { ok: false, message: "This item has rotated out of the shop. Check the current selection." };
    if (this.data.coins < item.price)
      return { ok: false, message: `You need ${item.price - this.data.coins} more coins.` };
    this.data.coins -= item.price;
    this.data.owned.push(id);
    this.checkAchievements();
    this.save();
    return { ok: true, message: `${item.name} is yours!` };
  }
  equip(id, seed) {
    const item = ITEM_BY_ID[id];
    if (!item || !this.data.owned.includes(id)) return false;
    if (seed !== undefined) {
      if (!item.finish || !validSeed(seed) || !this.data.patterns?.[id]?.includes(seed)) return false;
      this.data.equipment.patterns ??= {};
      this.data.equipment.patterns[id] = seed;
    }
    this.data.equipment[item.category] = id;
    this.save();
    return true;
  }
  favorite(id) {
    if (!this.data.owned.includes(id)) return;
    const f = this.data.favorites;
    if (f.includes(id)) f.splice(f.indexOf(id), 1);
    else f.push(id);
    this.save();
  }
  claimChallenge(id) {
    this.refreshDaily();
    const c = challengesFor().find((x) => x.id === id),
      d = this.data.daily;
    if (!c || d.claimed.includes(id) || c.value(d) < c.target) return false;
    d.claimed.push(id);
    this.award(c.coins, c.xp);
    this.save();
    return true;
  }
  loginStatus(now = new Date()) {
    const login = this.data.login,
      today = dayKey(now),
      last = login.last ? dayNumber(login.last) : -Infinity;
    return {
      claimed: login.last === today,
      day: login.last === today ? login.streak : dayNumber(now) - last === 1 ? (login.streak % 7) + 1 : 1,
    };
  }
  claimLogin(now = new Date()) {
    const status = this.loginStatus(now);
    if (status.claimed) return null;
    this.data.login = { last: dayKey(now), streak: status.day };
    const coins = DAILY_REWARDS[status.day - 1];
    this.award(coins, 50);
    if (status.day === 7 && !this.data.owned.includes("ball-streak")) this.data.owned.push("ball-streak");
    this.checkAchievements();
    this.save();
    return { coins, day: status.day };
  }
}

export function normalizeInventory(d) {
  migratePass(d);
  d.owned = [
    ...new Set([
      ...Object.values(DEFAULT_EQUIPMENT),
      ...d.owned.filter(
        (id) =>
          ITEM_BY_ID[id] &&
          (ITEM_BY_ID[id].source !== "membership" ||
            memberEntitled(d, id)),
      ),
    ]),
  ];
  const patterns = d.equipment?.patterns;
  d.equipment = Object.fromEntries(
    Object.entries(DEFAULT_EQUIPMENT).map(([cat, id]) => [
      cat,
      d.owned.includes(d.equipment?.[cat]) && ITEM_BY_ID[d.equipment[cat]]?.category === cat
        ? d.equipment[cat]
        : id,
    ]),
  );
  d.favorites = (d.favorites || []).filter((id) => ITEM_BY_ID[id]);
  d.equipment.patterns = patterns;
  return normalizePatterns(d, ITEM_BY_ID);
}
