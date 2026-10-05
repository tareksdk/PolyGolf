export const RANKS = [
  { name: 'Rookie', min: 0, color: '#7f9282' },
  { name: 'Bronze', min: 800, color: '#af845b' },
  { name: 'Silver', min: 1100, color: '#97a9ad' },
  { name: 'Gold', min: 1300, color: '#c5a24e' },
  { name: 'Platinum', min: 1500, color: '#6aafab' },
  { name: 'Diamond', min: 1700, color: '#849ac6' },
  { name: 'Elite', min: 1900, color: '#726090' },
];
export const rankFor = elo => RANKS.findLast(r => elo >= r.min) || RANKS[0];
export const rankPlate = rank => 'nameplate-rank-' + rank.name.toLowerCase();
// Called with the server's rating only. Once earned, a plate survives relegation.
export function awardRankPlates(progress, rating) {
  if (!rating || !Number.isFinite(rating.matches) || rating.matches < 1 || !Number.isFinite(rating.elo)) return false;
  const d = progress.data, peak = Math.max(d.competitive?.peak || 0, rating.elo);
  const next = { elo: rating.elo, peak, matches: rating.matches, wins: rating.wins, losses: rating.losses };
  let changed = JSON.stringify(d.competitive) !== JSON.stringify(next);
  d.competitive = next;
  for (const rank of RANKS) if (peak >= rank.min && !d.owned.includes(rankPlate(rank))) {
    d.owned.push(rankPlate(rank));
    changed = true;
  }
  return changed;
}
