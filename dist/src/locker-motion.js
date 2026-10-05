// Skipping affects presentation only. The opening receipt is still awaited once.
export function lockerMotion() {
  let skipped = false, animation, release;
  const signal = new Promise(resolve => {release = resolve;});
  return {
    get skipped() {return skipped;},
    skip() {
      if (skipped) return;
      skipped = true; release();
      if (animation && animation.playState !== 'finished') animation.finish();
    },
    animate(value) {animation = value; if (skipped) animation.finish();},
    async wait(ms) {
      if (skipped || !ms) return;
      let timer;
      await Promise.race([signal, new Promise(resolve => {timer = setTimeout(resolve, ms);})]);
      clearTimeout(timer);
    },
    race(promise) {return Promise.race([promise, signal]);},
  };
}
