const oneShot = { id: 'mystery-driver-2026', tokens: 0, items: ['driver-mystery'],
  message: 'One Shot unlocked. Equip it in the Caddie for automatic hole-in-ones.' };

export const DRIVER_REWARDS = {
  '1e6288fee2b560c035a4d08666ef0038f035ad6b0bccc7f78f96ddc5195d6377': oneShot,
  'b67d6fbecddb4d5fbf09b635989e4f3f333d4a44da16c289b4a8f7bf11a72890': oneShot,
  '451c3d487aeda41e70a44977d69571df991e3bc2ec1e4a0c8b25c427c85c57f0': { id: 'devteam-driver-2026', tokens: 0, items: ['driver-devteam'],
    message: '??? unlocked. Equip it in the Caddie for a 400-yard drive with an explosive landing.' },
};

export async function redeemPreviewDriver(progress, code) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim()));
  const digest = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  const reward = DRIVER_REWARDS[digest];
  if (!reward) return null;
  const data = progress.data;
  data.giftClaims ??= [];
  if (data.giftClaims.includes(reward.id)) throw Error('You have already redeemed this gift code.');
  const unlocked = reward.items.filter(id => !data.owned.includes(id));
  data.giftClaims.push(reward.id);
  data.owned.push(...unlocked);
  progress.save();
  return { unlocked, message: reward.message };
}
