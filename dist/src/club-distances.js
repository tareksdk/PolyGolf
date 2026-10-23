import { CLUBS } from "./golf-physics.js";
import { terrainAt } from "./golf-courses.js";
import { driverYards } from "./equipment.js";
// Windless, level-fairway total distance; weather and lie still affect each shot.
export const CLUB_MAX_YARDS = {
  "3w": 271,
  "5w": 251,
  "4i": 231,
  "5i": 215,
  "6i": 199,
  "7i": 183,
  "8i": 166,
  "9i": 151,
  pw: 135,
  gw: 110,
  sw: 86,
  lw: 66,
  putter: 39,
};
export function clubYards(id, equipment = {}) {
  return id === "driver" ? driverYards(equipment) : CLUB_MAX_YARDS[id] || 0;
}
export function recommendClub(h, ball, equipment = {}) {
  const lie = terrainAt(h, ball.x, ball.z),
    yards = Math.hypot(h.cup.x - ball.x, h.cup.z - ball.z) / 0.9144;
  if(h.space){
    if(lie.surface==='green')return 'putter';
    return ['9i','8i','7i','6i','5i','4i'].find(id=>CLUB_MAX_YARDS[id]*.9144*.83>=yards*.9144)||'4i';
  }
  if (lie.surface === "tee" && yards > 210) return "driver";
  if (lie.surface === "green" || (yards < 12 && lie.surface !== "sand")) return "putter";
  if (lie.surface === "sand" && yards < 105) return "sw";
  const bag = CLUBS.filter(
    (c) => c.id !== "putter" && (lie.surface !== "sand" || !["driver", "3w", "5w"].includes(c.id)),
  );
  return bag.findLast((c) => clubYards(c.id, equipment) >= yards * 1.08)?.id || bag[0].id;
}
