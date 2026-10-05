import { ITEM_BY_ID, DEFAULT_EQUIPMENT } from "./catalog.js";
import { validSeed } from './finishes.js';
// Shared validation: the API publishes only this allowlisted profile shape.
export function validateProfile(input) {
  if (typeof input.bio !== "string" || input.bio.length > 280)
    throw Error("Your bio must be 280 characters or fewer.");
  const bio = input.bio.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const avatar = input.avatar ?? "";
  if (typeof avatar !== "string" || avatar.length > 54000) throw Error("Choose a smaller profile picture.");
  if (avatar) {
    if (!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar))
      throw Error("Use the image uploader to prepare a WebP profile picture.");
    let bytes;
    try {
      bytes = atob(avatar.slice(23));
    } catch {
      throw Error("Invalid profile picture.");
    }
    if (bytes.slice(0, 4) !== "RIFF" || bytes.slice(8, 12) !== "WEBP")
      throw Error("Invalid profile picture.");
  }
  return { bio, avatar };
}
export function publicProfile(p) {
  const s = p.state || {},
    stats = s.stats || {},
    equipment = Object.fromEntries(
      Object.entries(DEFAULT_EQUIPMENT).map(([category, id]) => [
        category,
        ITEM_BY_ID[s.equipment?.[category]]?.category === category ? s.equipment[category] : id,
      ]),
    );
  equipment.patterns = Object.fromEntries(Object.values(equipment).filter(id => ITEM_BY_ID[id]?.finish && validSeed(s.equipment?.patterns?.[id])).map(id => [id,s.equipment.patterns[id]]));
  return {
    id: p.id,
    username: p.username,
    bio: p.bio || "",
    avatar: p.avatar || "",
    xp: Number(s.xp) || 0,
    member: !!s.clubPass?.member,
    equipment,
    stats: {
      games: stats.games || 0, strokes: stats.strokes || 0, playTime: stats.playTime || 0,
      holes: stats.holes || 0,
      aces: stats.aces || 0,
      birdies: stats.birdies || 0,
      courses: stats.courses || 0,
    },
    items: (s.owned || []).filter((id) => ITEM_BY_ID[id]).length,
    joined: p.created_at,
  };
}
