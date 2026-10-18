// High is deliberately fixed supersampling; it never silently becomes blurry.
// Cap large displays at 8.3MP while preserving native resolution on common screens.
export function renderScale(quality='medium',dpr=1,width=1920,height=1080) {
  const desired=quality==='high'?Math.max(1.5,Math.min(2,dpr)):quality==='low'?1:Math.min(1.5,Math.max(1,dpr));
  const budget=quality==='high'?8300000:quality==='low'?2400000:4200000;
  return Math.max(1,Math.min(desired,Math.sqrt(budget/(width*height))));
}

// Auto is intentionally conservative on low-memory ChromeOS and integrated devices.
export function effectiveGraphics(requested='auto',device={}) {
  if(['low','medium','high'].includes(requested))return requested;
  const memory=Number(device.deviceMemory),cores=Number(device.hardwareConcurrency);
  return /CrOS/i.test(device.userAgent||'')||(memory>0&&memory<=4)||(cores>0&&cores<=4)?'low':'medium';
}
