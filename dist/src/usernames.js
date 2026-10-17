export function normalizeUsername(value) {
  const name = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(name)) throw Error('Use 3-20 letters, numbers or underscores for your username.');
  return name;
}

export function usernameChangeCost(changes = 0) {
  if (!Number.isInteger(changes) || changes < 0) throw Error('Refresh your profile to load the username-change price.');
  return [0, 10000, 100000][changes] ?? 1000000;
}
