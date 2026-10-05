// The 2026 event ends at midnight in the studio's New York timezone.
export const HALLOWEEN_START=Date.parse('2026-10-01T00:00:00-04:00');
export const HALLOWEEN_END=Date.parse('2026-11-01T00:00:00-04:00');
export function halloweenActive(now=Date.now()) {
  const t=Number(now);return t>=HALLOWEEN_START&&t<HALLOWEEN_END;
}
export function installSeason(ui){
  let active=halloweenActive();
  setInterval(()=>{const next=halloweenActive();if(next===active)return;active=next;if(ui.game.state==='menu')ui.render();},1000);
}
