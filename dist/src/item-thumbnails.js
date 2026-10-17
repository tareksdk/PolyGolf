import { finishItem } from './finishes.js';
import { renderItemArt } from './item-art.js';

const VERSION = 'polygolf-item-art-v5';
export function thumbnailKey(item) {
  return [item.category, item.id, item.seed ?? '', item.color || '', item.pattern || '', item.badge || '', item.shine || ''].join(':');
}

function placeholder(item) {
  const color = /^#[a-f\d]{3,8}$/i.test(item.color) ? item.color : '#9cb494';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="864" height="600" viewBox="0 0 864 600"><rect width="864" height="600" fill="#bfcdbb"/><circle cx="432" cy="300" r="48" fill="${color}" opacity=".4"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg) + '#' + encodeURIComponent(thumbnailKey(item));
}

// Rendering a menu never renders 3D thumbnails. Visible art is loaded from disk or
// produced one item at a time, with asynchronous encoding and a bounded URL cache.
export function installItemThumbnails(world) {
  const jobs = new Map(), bySource = new Map(), ready = new Map(), watched = new WeakSet();
  const visible = new Set();
  let working = false, scheduled = false, writes = 0;
  let worker, pendingArt;
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try {
      worker = new Worker(new URL('./item-art-worker.js', import.meta.url), {type:'module'});
      worker.onmessage = ({data}) => {
        if (data.error) {worker.terminate(); worker = null; pendingArt?.reject(Error(data.error));}
        else pendingArt?.resolve(data.blob);
        pendingArt = null;
      };
      worker.onerror = event => {
        event.preventDefault(); worker?.terminate(); worker = null;
        pendingArt?.reject(Error('Offscreen rendering unavailable')); pendingArt = null;
      };
    } catch {}
  }
  async function render(item) {
    if (worker) {
      try {
        return await new Promise((resolve,reject) => {pendingArt={resolve,reject}; worker.postMessage({item});});
      } catch { /* Older GPUs use the same one-at-a-time main-thread fallback. */ }
    }
    return renderItemArt(world, item, {blob:true});
  }
  const disk = globalThis.caches?.open(VERSION).catch(() => null) || Promise.resolve(null);
  const cacheUrl = key => new URL('/__item_art__/' + VERSION + '/' + encodeURIComponent(key), location.origin).href;
  world.itemThumbnail = raw => {
    const item = finishItem(raw, world.equipment), key = thumbnailKey(item);
    if (ready.has(key)) {
      const url = ready.get(key); ready.delete(key); ready.set(key, url);
      return url;
    }
    if (!jobs.has(key)) {
      const job = { key, item, source: placeholder(item), images: new Set(), waiters: new Set() };
      jobs.set(key, job); bySource.set(job.source, job);
    }
    return jobs.get(key).source;
  };
  world.prepareItemThumbnails = (items, {signal} = {}) => Promise.all(items.map(item => new Promise(resolve => {
    if (signal?.aborted) return resolve();
    const source = world.itemThumbnail(item), job = bySource.get(source);
    if (!job) return resolve();
    const done = () => {job.waiters.delete(done); signal?.removeEventListener('abort', done); resolve();};
    job.waiters.add(done); signal?.addEventListener('abort', done, {once:true}); schedule();
  })));
  const observer = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (isIntersecting) visible.add(target); else visible.delete(target);
    }
    schedule();
  }, {rootMargin:'160px'});
  function attach(root) {
    const images = root.matches?.('img') ? [root] : root.querySelectorAll?.('img') || [];
    for (const img of images) {
      const job = bySource.get(img.getAttribute('src'));
      if (!job || watched.has(img)) continue;
      watched.add(img); job.images.add(img); img.decoding = 'async'; observer.observe(img);
    }
  }
  function clean() {
    for (const [key, job] of jobs) {
      for (const img of job.images) if (!img.isConnected) {
        job.images.delete(img); visible.delete(img); observer.unobserve(img);
      }
      if (!job.images.size && !job.waiters.size) { jobs.delete(key); bySource.delete(job.source); }
    }
    if (ready.size > 180) {
      const used = new Set([...document.images].map(img => img.getAttribute('src')));
      for (const [key, url] of ready) {
        if (ready.size <= 180) break;
        if (!used.has(url)) { ready.delete(key); URL.revokeObjectURL(url); }
      }
    }
  }
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) attach(node);
    clean(); schedule();
  }).observe(document.body, {childList:true, subtree:true});
  function schedule() {
    if (working || scheduled || document.hidden || (!visible.size && ![...jobs.values()].some(j=>j.waiters.size))) return;
    scheduled = true;
    // Let the click's new tab paint before any GPU work. Never render art during a shot.
    requestAnimationFrame(() => setTimeout(() => { scheduled = false; void next(); }, 0));
  }
  async function next() {
    if (working || document.hidden || (world.mode === 'play' && !world.suspended && !world.presentationPaused)) return;
    clean();
    const job = [...jobs.values()].find(j => [...j.images].some(img => visible.has(img))) || [...jobs.values()].find(j=>j.waiters.size);
    if (!job) return;
    working = true;
    try {
      const cache = await disk;
      let blob;
      try { blob = await (await cache?.match(cacheUrl(job.key)))?.blob(); } catch {}
      if (!blob) {
        // Navigation may have changed while the disk lookup was pending.
        if (!job.waiters.size && ![...job.images].some(img => img.isConnected && visible.has(img))) return;
        blob = await render(job.item);
        if (cache) {
          void cache.put(cacheUrl(job.key), new Response(blob)).then(async () => {
            if (++writes % 32 === 0) {
              const keys = await cache.keys();
              await Promise.all(keys.slice(0, Math.max(0, keys.length - 700)).map(key => cache.delete(key)));
            }
          }).catch(() => {});
        }
      }
      const url = URL.createObjectURL(blob);
      ready.set(job.key, url);
      const current = jobs.get(job.key);
      for (const img of new Set([...job.images, ...(current?.images || [])])) {
        if (img.isConnected && img.getAttribute('src') === job.source) img.src = url;
        visible.delete(img); observer.unobserve(img);
      }
      for (const done of new Set([...job.waiters, ...(current?.waiters || [])])) done();
      jobs.delete(job.key); bySource.delete(job.source);
    } catch (error) {
      // A context loss cannot lock navigation in a retry loop.
      const current = jobs.get(job.key);
      for (const img of new Set([...job.images, ...(current?.images || [])])) {visible.delete(img); observer.unobserve(img);}
      for (const done of new Set([...job.waiters, ...(current?.waiters || [])])) done();
      jobs.delete(job.key); bySource.delete(job.source);
      console.warn('Item preview unavailable', error);
    } finally {working = false; schedule();}
  }
  document.addEventListener('visibilitychange', schedule);
  attach(document.body);
}
