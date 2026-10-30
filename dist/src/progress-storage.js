// Portal progress uses account storage. Device caches and website sign-ins do not.
let portalStorage;
export function setProgressStorage(storage) { portalStorage = storage; }
export function progressStorage() { return portalStorage ?? globalThis.localStorage; }
