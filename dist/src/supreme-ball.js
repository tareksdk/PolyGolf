export const SUPREME_BALL = {
  id: 'ball-israel', category: 'ball', name: 'Israel Flag', rarity: 'Legendary',
  color: '#ffffff', pattern: '#0038b8', motif: 'israel', design: 0,
  source: 'code', exclusive: true, supremeOnly: true, price: 0,
  description: 'benjamin netanyahu', flavor: 'benjamin netanyahu',
};
export const SUPREME_CLAIM = 'supreme-israel-ball-2026';
export const SUPREME_MESSAGE = 'Israel Flag ball unlocked. Equip it in your caddie for a flag and fireworks on every sunk putt.';

// The localhost preview has a separate save and never contacts a live account.
export function redeemPreviewSupreme(progress, code) {
  if (typeof code !== 'string' || code.trim() !== 'supreme')
    throw Error('That gift code is not active. Codes are case-sensitive.');
  const d = progress.data;
  if (d.giftClaims?.includes(SUPREME_CLAIM)) throw Error('You have already redeemed this gift code.');
  const unlocked = d.owned.includes(SUPREME_BALL.id) ? [] : [SUPREME_BALL.id];
  d.giftClaims ??= [];
  d.giftClaims.push(SUPREME_CLAIM);
  d.owned.push(...unlocked);
  progress.save();
  return {unlocked, message: SUPREME_MESSAGE};
}
