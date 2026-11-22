import { MAX_LEVEL, MAX_LEVEL_XP } from './save.js';

export const PROGRESSION_GIFT_CODE = 'allunlock';
export const PROGRESSION_GIFT_BALANCE = 1_000_000_000;

const claimId = 'allunlock-level-and-coins';

export function redeemProgressionGift(data) {
  if (data.giftClaims?.includes(claimId)) throw Error('You have already redeemed this gift code.');

  // Give only the requested progression. The normal award path also grants gear.
  const tokens = Math.max(0, PROGRESSION_GIFT_BALANCE - data.coins);
  data.xp = Math.max(data.xp, MAX_LEVEL_XP);
  data.coins += tokens;
  data.totalEarned += tokens;
  (data.giftClaims ??= []).push(claimId);
  return { tokens, unlocked: [], message: `Level ${MAX_LEVEL} and a balance of at least ${PROGRESSION_GIFT_BALANCE.toLocaleString('en-US')} coins.` };
}
