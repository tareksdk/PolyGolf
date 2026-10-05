import { ITEM_BY_ID, ITEMS } from "./catalog.js";
export const MINI_EFFECTS = {
  "club-halloween-witch": { curve: .2, description: "Mini-golf: gentle curve control." },
  "ball-stripe": { curve: 0.18, description: "Mini-golf: gentle curve control." },
  "ball-water": { curve: 0.32, description: "Mini-golf: stronger curve control." },
  "ball-marble": { friction: 0.88, description: "Mini-golf: rolls 12% more freely." },
  "ball-lava": { power: 1.1, description: "Mini-golf: 10% extra shot speed." },
  "ball-galaxy": { curve: 0.46, description: "Mini-golf: maximum curve control." },
  "ball-pixel": { friction: 1.12, description: "Mini-golf: stops 12% sooner for precision." },
  "club-wood": { curve: 0.12, description: "Mini-golf: adds gentle curve control." },
  "club-carbon": { power: 1.08, description: "Mini-golf: 8% extra shot speed." },
  "club-crystal": { friction: 1.08, description: "Mini-golf: extra stopping control." },
  "club-neon": { curve: 0.24, description: "Mini-golf: adds advanced curve control." },
  "ball-club": { curve: 0.35, description: "Mini-golf: signature curve control." },
  "club-club": { power: 1.06, description: "Mini-golf: 6% extra shot speed." },
  "club-broom": { friction: 1.08, description: "Mini-golf: extra stopping control." },
  "club-umbrella": { friction: 1.1, description: "Mini-golf: stops 10% sooner for precision." },
  "club-peppermint": { curve: 0.2, description: "Mini-golf: gentle curve control." },
  "club-flamingo": { curve: 0.3, description: "Mini-golf: stronger curve control." },
  "club-lollipop": { power: 1.08, description: "Mini-golf: 8% extra shot speed." },
  "club-pan": { power: 1.1, description: "Mini-golf: 10% extra shot speed." },
  "club-midnight": { curve: 0.36, description: "Mini-golf: signature curve control." },
};
export function miniStats(equipment = {}) {
  const effect = (id) =>
    MINI_EFFECTS[id] ||
    (ITEM_BY_ID[id]?.id.includes("-edition-")
      ? [{ curve: 0.12 }, { friction: 1.06 }, { power: 1.04 }, { curve: 0.18 }][ITEM_BY_ID[id].design % 4]
      : {});
  const a = effect(equipment.ball),
    b = effect(equipment.club);
  return {
    curve: (a.curve || 0) + (b.curve || 0),
    power: (a.power || 1) * (b.power || 1),
    friction: (a.friction || 1) * (b.friction || 1),
  };
}
export const DRIVER_YARDS = {
  Common: 265,
  Uncommon: 285,
  Rare: 305,
  Epic: 330,
  Legendary: 350,
  "Black Market": 350,
};
export function driverYards(equipment = {}) {
  return DRIVER_YARDS[ITEM_BY_ID[equipment.driver]?.rarity] || 265;
}
export function golfGear(equipment = {}) {
  return { driverYards: driverYards(equipment) };
}
export function itemDescription(item) {
  const flavor = item.flavor ? item.flavor + " " : "";
  if (item.category === "driver")
    return `${flavor}${DRIVER_YARDS[item.rarity]} yard driver · full-power total on a level fairway. Wind, slope and lie affect distance.`;
  return (
    flavor +
    (MINI_EFFECTS[item.id]?.description ||
      (["ball", "club"].includes(item.category) && item.id.includes("-edition-")
        ? [
            "Mini-golf: gentle curve control.",
            "Mini-golf: 6% more stopping friction.",
            "Mini-golf: 4% more shot speed.",
            "Mini-golf: responsive curve control.",
          ][item.design % 4]
        : "A cosmetic finish for your collection.")) + " Full golf: appearance only."
  );
}
export const LEVEL_REWARDS = [
  { level: 2, id: "ball-stripe" },
  { level: 3, id: "club-wood" },
  { level: 5, id: "ball-water" },
  { level: 7, id: "club-carbon" },
  { level: 10, id: "ball-galaxy" },
];
export const MEMBERSHIP_COST = 50000;
export const PASS_TIER_XP = 6000;
export const PASS_TIER_COUNT = 30;
export const MEMBER_DAILY = 40;
export const EDITOR_LEVEL = 10;
export function requireEditor(progress) {
  if (progress.level.level < EDITOR_LEVEL)
    throw Error("Map creation unlocks at level 10. Keep playing ranked rounds to earn XP.");
}
const memberItems = ITEMS.filter((i) => i.source === "membership");
const legacyTiers = {
  2: "driver-club",
  3: "emote-club",
  4: "nameplate-club",
  5: "hole-club",
  6: "ball-club",
  8: "trail-club",
  10: "club-club",
  12: "nameplate-edition-26",
  14: "ball-prestige",
  16: "driver-prestige",
  18: "club-prestige",
  20: "trail-prestige",
  22: "nameplate-prestige",
  24: "hole-prestige",
};
const extraMemberItems = memberItems.filter((i) => !Object.values(legacyTiers).includes(i.id));
const LEGACY_PASS = Array.from({ length: 100 }, (_, i) => ({
  tier: i + 1,
  xp: (i + 1) * 1800,
  freeCoins: 20 + Math.floor(i / 10) * 5,
  premiumCoins: 30 + Math.floor(i / 10) * 5,
  item: legacyTiers[i + 1] || (i >= 24 ? extraMemberItems[i - 24]?.id : undefined),
}));
// One free coin reward and one exclusive item per tier. Other member finishes
// remain available in the separate members' collection, never in public lockers.
const passItems = [...Object.values(legacyTiers)];
const categories=[...new Set(memberItems.map(i=>i.category))];
for(let row=0;passItems.length<30;row++)for(const category of categories){
  const item=extraMemberItems.filter(i=>i.category===category)[row];
  if(item&&passItems.length<30)passItems.push(item.id);
}
const collectionByCategory=categories.map(c=>memberItems.filter(i=>i.category===c&&!passItems.includes(i.id)));
export const MEMBER_COLLECTION = Array.from({length:Math.max(...collectionByCategory.map(a=>a.length))},(_,row)=>collectionByCategory.map(a=>a[row]).filter(Boolean)).flat();
export function memberRotation(now=Date.now()) {
  const week=Math.floor(Number(now)/604800000);
  return Array.from({length:6},(_,i)=>MEMBER_COLLECTION[(week*6+i)%MEMBER_COLLECTION.length]);
}
export const memberPrice = item => ({Common:4000,Uncommon:6000,Rare:9000,Epic:14000,Legendary:22000,'Black Market':28000}[item.rarity] || 9000);
export function buyMemberItem(progress,id) {
  const p=membership(progress),item=MEMBER_COLLECTION.find(i=>i.id===id);
  if(!p.member)throw Error('Join the Country Club to collect member items.');
  if(!item)throw Error('This item is earned through Country Club tiers.');
  if(progress.data.owned.includes(id))throw Error('Already in your collection.');
  if(!memberRotation().some(i=>i.id===id))throw Error('This member item is not in this week’s collection.');
  const cost=memberPrice(item);
  if(progress.data.coins<cost)throw Error('Not enough coins.');
  progress.data.coins-=cost;progress.data.owned.push(id);
  p.collection??=[];p.collection.push(id);progress.save();return true;
}
export const PASS_TIERS = Array.from({ length: PASS_TIER_COUNT }, (_, i) => {
  const legacy = LEGACY_PASS.filter(t => Math.ceil(t.tier * PASS_TIER_COUNT / 100) === i + 1);
  const items = [passItems[i]];
  return { tier: i + 1, xp: (i + 1) * PASS_TIER_XP, freeCoins: 90 + Math.floor(i / 10) * 15,
    premiumCoins: 0, item: items[0], items, legacy: legacy.map(t => t.tier) };
});
export function migratePass(d) {
  const p = d.clubPass;
  if (!p || p.version === 3) return p;
  if(p.version===2){p.legacyItems=[...new Set([...(p.legacyItems||[]),...(p.member?memberItems.filter(i=>d.owned.includes(i.id)).map(i=>i.id):[])])];p.version=3;return p;}
  const claimed = p.claimed || [], premium = p.premiumClaimed || [];
  p.legacyItems = p.member ? LEGACY_PASS.filter(t => premium.includes(t.tier) && t.item && d.owned.includes(t.item)).map(t => t.item) : [];
  p.claimed = PASS_TIERS.filter(t => t.legacy.every(n => claimed.includes(n))).map(t => t.tier);
  p.premiumClaimed = PASS_TIERS.filter(t => t.legacy.every(n => premium.includes(n))).map(t => t.tier);
  p.version = 3;
  return p;
}
export function memberEntitled(d, id) {
  const p = migratePass(d);
  return !!p?.member && (p.legacyItems?.includes(id) || (p.collection?.includes(id)&&MEMBER_COLLECTION.some(i=>i.id===id)) || PASS_TIERS.some(t => t.items.includes(id) && p.premiumClaimed?.includes(t.tier)));
}
export function unlockLevels(progress) {
  for (const r of LEVEL_REWARDS)
    if (progress.level.level >= r.level && !progress.data.owned.includes(r.id)) {
      progress.data.owned.push(r.id);
      progress.onNotify("New equipment unlocked!", "reward");
    }
}
export function membership(progress) {
  const d = progress.data;
  d.clubPass ??= { version: 3, member: false, claimed: [], premiumClaimed: [] };
  migratePass(d);
  return d.clubPass;
}
export function joinClub(progress) {
  const p = membership(progress);
  if (p.member) throw Error("You are already a member.");
  if (progress.level.level < 10) throw Error("Country Club membership unlocks at level 10.");
  if (progress.data.coins < MEMBERSHIP_COST) throw Error("Membership costs 50,000 coins.");
  progress.data.coins -= MEMBERSHIP_COST;
  p.member = true;
  progress.save();
  return true;
}
export function tierClaimed(progress, t) {
  const p = membership(progress);
  return (
    p.claimed.includes(t.tier) &&
    (!p.member || (p.premiumClaimed.includes(t.tier) && t.items.every(id => progress.data.owned.includes(id))))
  );
}
export function claimTier(progress, tier) {
  const p = membership(progress),
    t = PASS_TIERS.find((t) => t.tier === tier);
  if (!t || progress.data.xp < t.xp) throw Error("Earn more XP to unlock this tier.");
  let changed = false;
  if (!p.claimed.includes(tier)) {
    p.claimed.push(tier);
    progress.award(t.freeCoins, 0);
    changed = true;
  }
  if (p.member) {
    if (!p.premiumClaimed.includes(tier)) {
      p.premiumClaimed.push(tier);
      progress.award(t.premiumCoins, 0);
      changed = true;
    }
    for (const id of t.items) if (!progress.data.owned.includes(id)) { progress.data.owned.push(id); changed = true; }
  }
  if (!changed) throw Error("Already claimed.");
  progress.save();
  return true;
}

export function claimClubDaily(progress, day = new Date().toISOString().slice(0, 10)) {
  const p = membership(progress);
  if (!p.member) throw Error("Join the Country Club first.");
  if (p.dailyClaim === day) throw Error("Today’s member tokens are already claimed.");
  p.dailyClaim = day;
  progress.award(MEMBER_DAILY, 0);
  progress.save();
  return true;
}
