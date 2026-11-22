import { installHomeMenu } from './home-menu.js';
import { initializeCrazyGames } from './crazygames.js';
import { installCrazyGamesUI } from './crazygames-ui.js';
import { setProgressStorage } from './progress-storage.js';
import { installPlanetfall } from './planetfall-ui.js';
import { loadSkyDarbyAssets } from './sky-islands.js';
import { installDarby } from './darby.js';
import { installHoleEffects } from './hole-effects.js';
import { installCaddieUI } from './caddie-view.js';
import { readPreferences, savePreferences } from './device-settings.js';
import { installOpeningUpdate } from './opening-update.js';
import { installSmartHud } from './smart-hud.js';
import { installMinimap } from './minimap.js';
import { installCourseAdventures } from './course-adventure-render.js';
import { installHonors } from './honors-ui.js';
import { installInvites } from './room-invites.js';
import { isLocalPreview, previewStorage, installLocalPreview } from './local-preview.js';
import { installPirateEffects } from './pirate-effects.js';
import { installFlagCelebration } from './flag-celebration.js';
import { loadAdventureAssets } from './event-scenery.js';
import { installInterface } from './interface.js';
import { installCourseAtmosphere } from './course-weather.js';
import { installItemThumbnails } from './item-thumbnails.js';
import { installLiveRound } from './live-round.js';
import { installRoomRound } from './room-round.js';
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
  window.PolyGolfStartup?.phase('Connecting to saves');
  const platform = await initializeCrazyGames();
  if (platform.active) setProgressStorage(platform.storage);
  const localPreview = !platform.active && isLocalPreview();
  window.PolyGolfStartup?.phase('Loading course assets');
  await Promise.all([loadCourseAssets(),loadAdventureAssets(),loadSkyDarbyAssets()]);
  window.PolyGolfStartup?.phase('Starting the golf course');
  const repository = new LocalSaveRepository(platform.active ? platform.storage : localPreview ? previewStorage() : undefined);
  const progress = new ProgressionManager(repository, (message, type) => {
    ui?.toast(message);
    audio?.play(type);
  });
  if (!localPreview) progress.data.settings = readPreferences(progress.data.settings, platform.storage);
  const save = progress.save.bind(progress);
  let saveWarning = false;
  progress.save = () => {
    if (platform.locked) return false;
    if (!localPreview) savePreferences(progress.data.settings, platform.storage);
    const saved = save();
    if (!saved && !saveWarning) ui?.toast(platform.active ? 'CrazyGames couldn’t save your progress. Keep this tab open and check your connection or storage settings.' : repository.error);
    saveWarning = !saved;
    return saved;
  };
  const audio = new AudioManager(progress.data.settings);
  if (platform.active) platform.bindAudio(audio);
  const world = new World(document.querySelector("#world"));
  installItemThumbnails(world);
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
        ui.toast(game.round.practice ? "Hidden coin found!" : "A little discovery! +40 coins · +25 XP");
      }
      if (event === "water") ui.toast(`${game.hole.volcanic?'Lava hazard':'Water hazard'} · +1 stroke · Returning to your last shot`);
      if (event === "penalty") ui.toast("Back to your last shot · +1 stroke");
      if (event === "interact") audio.start();
      else audio.play(event);
    },
  });
  ui = new UIManager(world, game, progress, audio);
  ui.platform = platform;
  installExpansion(ui);
  installClubhouse(ui);
  installCompetitive(ui);
  installShopExtras(ui);
  installSharing(ui);
  installMotion(ui);
  installRelease(ui);
  installInterface(ui);
  installCaddieUI(ui);
  installSeason(ui);
  installLiveRound(ui);
  installRoomRound(ui);
  installCourseAtmosphere(ui);
  installPirateEffects(world);
  installHoleEffects(world);
  installCourseAdventures(ui);
  installFlagCelebration(world);
  installLocalPreview(ui);
  installHonors(ui);
  installOpeningUpdate(ui);
  installDarby(ui);
  installSmartHud(ui);
  installPlanetfall(ui);
  installMinimap(ui);
  installHomeMenu(ui);
  installCrazyGamesUI(ui);
  ui.render();
  installInvites(ui);
  registerTools(ui);
  window.PolyGolfStartup?.stop();
  document.querySelector("#loading").remove();
  if (platform.active) platform.loadingComplete();
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
    // The shop backdrops cover the course and animate independently.
    if (game.state !== "menu" || ui.screen !== "shop") game.update(dt);
    if (platform.active) platform.updateGameplay(game.state);
    audio.update(dt, game.state === "playing" && game.physics.active);
    if (game.state === "playing") progress.data.stats.playTime += dt;
    saveTimer += dt;
    hudTimer += dt;
    ui.tickMeters();
    if (hudTimer > 0.1) {
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
  window.PolyGolfStartup?.stop();
  document.querySelector("#loading").innerHTML =
    error.crazygamesSave
      ? '<div class="panel"><h2>Your CrazyGames save couldn’t open.</h2><p>Check your connection, then reload the game from CrazyGames. Your existing save has not been replaced.</p><button class="button" onclick="location.reload()">Try again</button></div>'
      : '<div class="panel"><h2>The course couldn’t open.</h2><p>Enable hardware acceleration and WebGL in your browser, then reload to try again.</p><button class="button" onclick="location.reload()">Try again</button></div>';
  if (!error.crazygamesSave) console.error(error);
}
