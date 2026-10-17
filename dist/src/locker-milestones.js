export const LOCKER_LEGEND_ID = 'locker-legend';
export const LOCKER_LEGEND_ITEM = 'nameplate-locker-legend';
export const LOCKER_LEGEND_TARGET = 1001;

export function normalizeLockerHistory(data) {
  data.stats ??= {};
  let total = Number.isSafeInteger(data.stats.lockersOpened) && data.stats.lockersOpened >= 0 ? data.stats.lockersOpened : 0;
  if (data.lockerStatsVersion !== 1) {
    // Old saves retained 100 individual receipts and 50 batch receipts, not a
    // lifetime total. Recover all retained openings without counting batches twice.
    const requests = new Set();
    for (const receipt of data.lockerReceipts || []) if (typeof receipt.requestId === 'string') requests.add(receipt.requestId);
    for (const batch of data.lockerBatches || []) for (const receipt of batch.items || [])
      if (typeof receipt.requestId === 'string') requests.add(receipt.requestId);
    total = Math.max(total, requests.size);
    data.lockerStatsVersion = 1;
  }
  data.stats.lockersOpened = total;
  if (total < LOCKER_LEGEND_TARGET) return false;
  data.achievements ??= [];
  data.achievementRewards ??= [];
  data.owned ??= [];
  const unlocked = !data.achievementRewards.includes(LOCKER_LEGEND_ID);
  if (!data.achievements.includes(LOCKER_LEGEND_ID)) data.achievements.push(LOCKER_LEGEND_ID);
  if (unlocked) data.achievementRewards.push(LOCKER_LEGEND_ID);
  if (!data.owned.includes(LOCKER_LEGEND_ITEM)) data.owned.push(LOCKER_LEGEND_ITEM);
  return unlocked;
}

export function recordLockerOpening(data) {
  normalizeLockerHistory(data);
  data.stats.lockersOpened++;
  return normalizeLockerHistory(data);
}
