import { installInterface } from './interface.js';
import { installSeason } from './season.js';
import { installRelease } from "./release.js";
import { loadCourseAssets } from "./course-assets.js";
import { installClubhouse } from "./clubhouse.js";
import { installCompetitive } from "./competitive-ui.js";
import { installExpansion } from "./expansion.js";
import { World } from "./world.js";
import { GameManager } from "./game.js";
import { ProgressionManager, LocalSaveRepository } from "./save.js";
import { AudioManager } from "./audio.js";
import { UIManager } from "./ui.js";
import { ITEMS } from "./catalog.js";
import { registerTools } from "./webmcp.js";
import { installMotion } from "./motion.js";
import { installShopExtras } from "./pro-shop-ui.js";
import { installSharing } from "./map-share.js";
let ui;
try {
  await loadCourseAssets();
  const repository = new LocalSaveRepository();
  const progress = new ProgressionManager(repository, (message, type) => {
    ui?.toast(message);
    audio?.play(type);
  });
  const audio = new AudioManager(progress.data.settings);
  const world = new World(document.querySelector("#world"));
  world.settingsChanged(progress.data.settings);
  world.equip(progress.data.equipment, ITEMS);
  const game = new GameManager(world, {
    onUpdate: () => ui?.render(),
    onHole: (result) => ui.holeComplete(result),
    onCourse: (round) => ui.courseComplete(round),
    onPause: (paused) => ui.pause(paused),
    onEvent: (event) => {
      if (event === "collectible") {
        if (!ui?.cloud?.session) progress.collectible(game.round.practice);
        ui.toast(game.round.practice ? "Hidden coin found!" : "A little discovery! +10 coins · +25 XP");
      }
      if (event === "water") ui.toast("A splash! Back to your last shot · +1 stroke");
      if (event === "penalty") ui.toast("Back to your last shot · +1 stroke");
      if (event === "interact") audio.start();
      else audio.play(event);
    },
  });
  ui = new UIManager(world, game, progress, audio);
  installExpansion(ui);
  installClubhouse(ui);
  installCompetitive(ui);
  installShopExtras(ui);
  installSharing(ui);
  installMotion(ui);
  installRelease(ui);
  installInterface(ui);
  installSeason(ui);
  ui.render();
  registerTools(ui);
  document.querySelector("#loading").remove();
  if (repository.error) ui.toast(repository.error);
  let last = performance.now(),
    saveTimer = 0,
    hudTimer = 0;
  function frame(now) {
    const elapsed = (now - last) / 1000;
    if (document.hidden || (game.state === 'menu' && elapsed < 1 / 30 - .001)) {
      if(document.hidden) last=now;
      requestAnimationFrame(frame);return;
    }
    if(game.state === "playing") world.observeFrame(elapsed);
    world.frameTimes ??= [];
    world.frameTimes.push(elapsed * 1000);
    if (world.frameTimes.length > 240) world.frameTimes.shift();
    const dt = Math.min(elapsed, 0.05);
    last = now;
    game.update(dt);
    audio.update(dt, game.state === "playing" && game.physics.active);
    if (game.state === "playing") progress.data.stats.playTime += dt;
    saveTimer += dt;
    hudTimer += dt;
    if (hudTimer > 0.045) {
      ui.tick();
      hudTimer = 0;
    }
    if (saveTimer > 20) {
      progress.save();
      saveTimer = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener("pagehide", () => progress.save());
} catch (error) {
  document.querySelector("#loading").innerHTML =
    '<div class="panel"><h2>The course couldn’t open.</h2><p>Enable hardware acceleration and WebGL in your browser, then reload to try again.</p><button class="button" onclick="location.reload()">Try again</button></div>';
  console.error(error);
}
