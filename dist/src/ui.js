import { clampMeter, flowNeedleAngle } from './shot-meter-ui.js';
import { icon } from "./icons.js";
import { cardActionTarget } from './card-actions.js';
import { COURSES, getHole, nearestPoint, surfaceAt, relative } from "./courses.js";
import { ITEMS, ITEM_BY_ID, DEFAULT_EQUIPMENT } from "./catalog.js";
import { LocalLeaderboardRepository } from "./leaderboards.js";
import {
  homeView,
  coursesView,
  shopView,
  garageView,
  updateCaddieGrid,
  updateCaddieCategory,
  profileView,
  leaderboardView,
  hudView,
  button,
  esc,
  coins,
  minutes,
} from "./views.js";
import { holeDialog, courseDialog, dailyDialog, settingsDialog, helpDialog } from "./dialogs.js";
export class UIManager {
  constructor(world, game, progress, audio) {
    Object.assign(this, { world, game, progress, audio });
    this.root = document.querySelector("#app");
    this.modalRoot = document.querySelector("#modal-root");
    this.screen = "home";
    this.selectedCourse = 0;
    this.garageCategory = "ball";
    this.shopCategory = "all";
    this.rankingMetric = "score";
    this.rankingCourse = 0;
    this.leaderboards = new LocalLeaderboardRepository();
    this.previewId = null;
    this.bind();
  }
  bind() {
    document.addEventListener("click", (e) => {
      const target = cardActionTarget(e.target);
      if (!target || target.disabled) return;
      this.audio.play("click");
      this.action(target.dataset.action, target.dataset);
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "ranking-course") {
        this.rankingCourse = Number(e.target.value);
        this.loadRankings();
      }
      if (e.target.dataset.setting) this.changeSetting(e.target);
    });
    document.addEventListener("input", (e) => {
      if (e.target.id === 'caddie-search') {
        this.caddieQuery = e.target.value;
        updateCaddieGrid(this);
      }
      if (e.target.type === "range" && e.target.dataset.setting) this.changeSetting(e.target);
    });
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.modalRoot.children.length &&
        !["playing", "paused", "complete", "finished"].includes(this.game.state)
      )
        this.closeModal();
      if (e.key === "Tab" && this.modalRoot.children.length) {
        const controls = [...this.modalRoot.querySelectorAll("button:not(:disabled),input,select")];
        if (!controls.length) return;
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
  navigate(screen) {
    if (this.game.state !== "menu") return;
    this.screen = screen;
    this.previewId = null;
    this.world.equip(this.progress.data.equipment, ITEMS);
    this.world.mode = screen === "garage" ? "garage" : "menu";
    this.progress.refreshDaily();
    this.render();
  }
  render() {
    if (["playing", "paused", "complete", "finished"].includes(this.game.state)) {
      this.root.innerHTML = hudView(this);
      this.cacheHud();
      return;
    }
    this.root.innerHTML = (
      {
        home: homeView,
        courses: coursesView,
        shop: shopView,
        garage: garageView,
        profile: profileView,
        leaderboards: leaderboardView,
      }[this.screen] || homeView
    )(this);
    if (this.screen === "leaderboards") this.loadRankings();
    this.tick();
  }
  cacheHud() {
    this.hud = {
      fill: document.querySelector("#power-fill"),
      power: document.querySelector("#power-text"),
      marker: document.querySelector('#accuracy-marker'),
      needle: document.querySelector('#flow-direction-needle'),
      gauge: document.querySelector('#flow-direction'),
      accuracy: document.querySelector('#accuracy-text'),
      status: document.querySelector("#shot-status"),
      plate: document.querySelector("#ball-nameplate"),
      surface: document.querySelector("#surface-label"),
    };
    this.tickMeters();
  }
  tickMeters() {
    const g = this.game, h = this.hud;
    const moving = (g.state === 'playing' && (!!g.pendingSwing || g.physics.active)) || !!g.holeReveal || !!this.world.pirateMoment;
    if (moving !== this.movingHud) {
      document.body.classList.toggle('ball-moving', moving);
      this.movingHud = moving;
    }
    if (!h?.fill?.isConnected || moving) return;
    const flowReady = g.meterStyle() === 'fluid' && g.state === 'playing' && !g.physics.active && !g.pendingSwing;
    const flowWaiting = flowReady && !g.charging;
    const shownPower = flowWaiting ? 0 : clampMeter(g.power);
    h.fill.style.width = '100%';
    h.fill.style.transform = `scaleX(${shownPower})`;
    h.fill.style.background = shownPower >= .88 ? '#4dac69' : shownPower > .5 ? '#a8b96a' : '#e1c782';
    h.power.textContent = flowWaiting ? '0%' : (shownPower * 100).toFixed(1) + '%';
    const accuracy = clampMeter(g.charging || flowReady ? g.accuracy : 0, -1, 1);
    if (h.marker) {
      const fraction = (accuracy + 1) / 2;
      h.marker.style.left = `calc(${fraction * 100}% + ${2 - fraction * 4}px)`;
      h.marker.style.transform = 'translateX(-50%)';
    }
    if (h.needle) h.needle.setAttribute('transform', `rotate(${flowNeedleAngle(accuracy)} 120 84)`);
    if (h.gauge) h.gauge.dataset.phase = g.charging ? 'locked' : 'sweep';
    if (h.accuracy) h.accuracy.textContent = Math.abs(accuracy) <= .16 ? 'DIRECTION · CENTRE' : 'DIRECTION · ' + (accuracy < 0 ? 'LEFT' : 'RIGHT');
    // Input locks exactly the value last drawn, never an unseen timer sample.
    g.displayedAccuracy = accuracy;
  }
  async loadRankings() {
    const rows = await this.leaderboards.list(this.rankingMetric, this.rankingCourse, this.progress.data),
      el = document.querySelector("#rankings-body");
    if (!el) return;
    el.innerHTML = rows
      .map(
        (r) =>
          `<tr class="${r.isYou ? "your-ranking" : ""}"><td>${r.rank <= 3 ? `<span class="rank-medal r${r.rank}">${r.rank}</span>` : String(r.rank).padStart(2, "0")}</td><td><span class="ranking-avatar">${esc(r.name.charAt(0).toUpperCase())}</span>${esc(r.name)} ${r.isYou ? '<span class="badge">YOU</span>' : '<span class="demo-tag">DEMO</span>'}</td><td>${r.level}</td><td><strong>${this.rankingMetric === "score" ? relative(r.score) : this.rankingMetric === "time" ? minutes(r.time) : r[this.rankingMetric]}</strong></td></tr>`,
      )
      .join("");
  }
  toast(text) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    document.querySelector("#toasts").append(el);
    setTimeout(() => el.remove(), 4200);
  }
  modal(content, { wide = false, close = true } = {}) {
    this.lastFocus = document.activeElement;
    this.modalRoot.innerHTML = `<div class="modal-overlay"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="PolyGolf dialog">${close ? button("×", "close-modal", 'aria-label="Close dialog"', "modal-close") : ""}${content}</section></div>`;
    this.root.inert = true;
    queueMicrotask(() => this.modalRoot.querySelector("button:not(:disabled),input,select")?.focus());
  }
  closeModal() {
    this.modalRoot.innerHTML = "";
    this.root.inert = false;
    if (this.lastFocus?.isConnected) this.lastFocus.focus();
    if (this.resumeAfterModal && this.game.state === "paused") {
      this.resumeAfterModal = false;
      this.game.setPaused(false, false);
    }
    if (this.game.state === 'playing') this.world.canvas.focus?.({ preventScroll: true });
  }
  pauseForDialog() {
    if (this.game.state === "playing") {
      this.game.setPaused(true, false);
      this.resumeAfterModal = true;
    }
  }
  launch(index, practice = false) {
    const c = COURSES[index];
    if (!c) return;
    if (!practice && this.progress.level.level < c.level) {
      this.modal(
        `<h2>${c.name}</h2><p>Ranked rounds unlock at level ${c.level}. You’re level ${this.progress.level.level}. Explore all nine holes in practice now, with no rewards or records.</p><div class="modal-actions">${button("Keep exploring", "close-modal", "", "button secondary")}${button("Play practice", "practice", `data-course="${index}"`, "button yellow")}</div>`,
      );
      return;
    }
    this.closeModal();
    this.resumeAfterModal = false;
    this.progress.startRound(practice);
    this.audio.start();
    this.world.equip(this.progress.data.equipment, ITEMS);
    this.game.start(index, practice);
  }
  holeComplete(result) {
    const reward = this.progress.completeHole(result);
    this.render();
    this.modal(holeDialog(result, reward), { close: false });
  }
  courseComplete(round) {
    const reward = this.progress.completeCourse(
      round,
      round.strokes.map((_, i) => getHole(round.courseIndex, i).par),
    );
    this.modal(courseDialog(round, reward), { wide: true, close: false });
  }
  pause(paused) {
    if (!paused) {
      this.resumeAfterModal = false;
      this.closeModal();
      return;
    }
    this.modal(
      `<div class="eyebrow">TAKE YOUR TIME</div><h2>A little breather.</h2><p>Your next shot can wait.</p><div class="pause-menu">${button(icon("play") + "Keep playing", "resume", "", "button yellow wide")}${button(icon("sliders") + "Settings", "settings", "", "button secondary wide")}${button(icon("help") + "How to play", "help", "", "button secondary wide")}${button("Pick up ball · Par + 6", "skip-hole", "", "button secondary wide")}${button(icon("home") + "Back to clubhouse", "exit-confirm", "", "text-button")}</div>`,
      { close: false },
    );
  }
  changeSetting(input) {
    const key = input.dataset.setting,
      value =
        input.type === "checkbox"
          ? input.checked
          : input.type === "range"
            ? Number(input.value)
            : input.value;
    this.progress.data.settings[key] = value;
    this.progress.save();
    this.audio.apply(this.progress.data.settings);
    if(key==="courseWeather"){this.world.settings.courseWeather=value;this.world.setWeather?.(value);}
    if (
      ["graphics", "shadows", "particles", "cameraSensitivity", "zoomSensitivity", "aimGuide", "shotGuide"].includes(key)
    )
      this.world.settingsChanged(this.progress.data.settings);
    if (input.nextElementSibling?.tagName === "OUTPUT")
      input.nextElementSibling.textContent =
        Number(input.max) === 1 ? Math.round(value * 100) + "%" : value + "×";
  }
  async action(action, data = {}) {
    const id = data.id,
      index = Number(data.course);
    switch (action) {
      case "home":
      case "courses":
      case "garage":
      case "shop":
      case "profile":
      case "leaderboards":
        this.navigate(action);
        break;
      case "select-course":
        this.selectedCourse = index;
        this.world.load(getHole(index, 0));
        this.render();
        break;
      case "start":
        this.launch(index);
        break;
      case "practice":
        this.launch(index, true);
        break;
      case "next-hole":
        this.closeModal();
        this.game.next();
        break;
      case "round-exit":
        this.closeModal();
        this.resumeAfterModal = false;
        this.screen = "home";
        this.game.leave();
        break;
      case "replay":
        this.launch(this.game.round.courseIndex, this.game.round.practice);
        break;
      case "pause":
      case "resume":
        this.game.pause();
        break;
      case "camera":
        this.world.orbit += Math.PI / 4;
        break;
      case "reset":
        this.game.reset();
        break;
      case "exit-confirm":
        this.modal(
          `<h2>Call it a day?</h2><p>Rewards from completed holes are saved. This unfinished round won't have a scorecard.</p><div class="modal-actions">${button("Keep playing", "resume", "", "button yellow")}${button("Back to clubhouse", "round-exit", "", "button secondary")}</div>`,
          { close: false },
        );
        break;
      case "skip-hole":
        this.closeModal();
        this.game.skip();
        break;
      case "close-modal":
        this.closeModal();
        if (this.game.state === "paused") this.pause(true);
        break;
      case "settings":
        this.pauseForDialog();
        this.modal(settingsDialog(this.progress.data.settings));
        break;
      case "help":
        this.pauseForDialog();
        this.modal(helpDialog(), { wide: true });
        break;
      case "fullscreen":
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
        } catch {
          this.toast("Use your browser’s fullscreen control to expand the game.");
        }
        break;
      case "daily":
        this.modal(dailyDialog(this.progress), { wide: true });
        break;
      case "claim-login": {
        const r = this.progress.claimLogin();
        if (r) {
          this.audio.play("reward");
          this.toast(`Day ${r.day} claimed · +${r.coins} coins +50 XP`);
          this.render();
          this.modal(dailyDialog(this.progress), { wide: true });
        }
        break;
      }
      case "shop-category":
        this.shopCategory = id;
        this.render();
        break;
      case "garage-category":
        this.garageCategory = id;
        this.world.previewCategory = id;
        this.previewId = null;
        this.world.equip(this.progress.data.equipment, ITEMS);
        updateCaddieCategory(this);
        break;
      case 'caddie-filters':
        this.caddieFiltersOpen = !this.caddieFiltersOpen;
        this.render();
        break;
      case 'caddie-sort':
        this.caddieSort = id;
        this.render();
        break;
      case 'caddie-rarity':
        this.caddieRarity = id;
        this.render();
        break;
      case 'caddie-clear':
        this.caddieQuery = ''; this.caddieRarity = 'all'; this.favoritesOnly = false;
        this.render();
        break;
      case "favorites":
        this.favoritesOnly = !this.favoritesOnly;
        this.render();
        break;
      case "favorite":
        this.progress.favorite(id);
        this.render();
        break;
      case "preview": {
        const item = ITEM_BY_ID[id];
        if (!item || !this.progress.data.owned.includes(id)) break;
        this.previewId = id;
        this.world.previewCategory = item.category;
        this.world.equip({ ...this.progress.data.equipment, [item.category]: id }, ITEMS);
        this.render();
        if (item.category === 'hole') this.world.burst(-1, 3.5, 8, item.color, 25);
        break;
      }
      case "equip-preview":
        if (this.previewId) await this.action("equip", { id: this.previewId });
        break;
      case "equip":
        if (this.progress.equip(id)) {
          this.previewId = null;
          this.world.equip(this.progress.data.equipment, ITEMS);
          this.audio.play("purchase");
          this.toast(`${ITEM_BY_ID[id].name} equipped`);
          this.closeModal();
          this.render();
        }
        break;
      case "unequip":
        this.progress.equip(DEFAULT_EQUIPMENT[this.garageCategory]);
        this.previewId = null;
        this.world.equip(this.progress.data.equipment, ITEMS);
        this.render();
        break;
      case "randomize":
        for (const category of Object.keys(DEFAULT_EQUIPMENT)) {
          const options = this.progress.data.owned.filter((id) => ITEM_BY_ID[id].category === category);
          this.progress.equip(options[Math.floor(Math.random() * options.length)]);
        }
        this.previewId = null;
        this.world.equip(this.progress.data.equipment, ITEMS);
        this.render();
        this.toast("A fresh little combination.");
        break;
      case "item-detail":
      case "buy": {
        const item = ITEM_BY_ID[id];
        if (!item) break;
        const owned = this.progress.data.owned.includes(id);
        this.modal(
          `<div class="item-detail"><img src="${this.world.itemThumbnail(item)}" alt="${item.name}"><span class="badge">${item.rarity} · ${item.category === "hole" ? "Hole effect" : item.category}</span><h2>${item.name}</h2><p>A little more personality for your next round.<br>Cosmetic only. Your game stays the same.</p><div class="divider"></div><div class="row between">${owned ? "<span>In your collection</span>" : coins(item.price)}${button(owned ? "Equip" : `Buy for ${item.price} coins`, owned ? "equip" : "confirm-buy", `data-id="${id}" ${!owned && this.progress.data.coins < item.price ? "disabled" : ""}`, "button yellow")}</div>${!owned && this.progress.data.coins < item.price ? `<p class="small-note">${item.price - this.progress.data.coins} more coins needed. Earn coins on the course.</p>` : ""}</div>`,
        );
        break;
      }
      case "confirm-buy": {
        const result = this.progress.buy(id);
        this.toast(result.message);
        if (result.ok) {
          this.audio.play("purchase");
          this.render();
          this.modal(
            `<div class="result"><div class="result-icon">${icon("gift")}</div><h2>A lovely little find.</h2><p>${ITEM_BY_ID[id].name} is now in your collection.</p><div class="modal-actions">${button("Keep browsing", "close-modal", "", "button secondary")}${button("Equip now", "equip", `data-id="${id}"`, "button yellow")}</div></div>`,
          );
        }
        break;
      }
      case "save-name": {
        const name = document.querySelector("#player-name").value.trim();
        if (!name) {
          this.toast("Give your golfer a name first.");
          break;
        }
        this.progress.data.name = name.slice(0, 20);
        this.progress.save();
        this.render();
        this.toast("Looking good. Your name is saved.");
        break;
      }
      case "claim-challenge":
        if (this.progress.claimChallenge(id)) {
          this.audio.play("reward");
          this.render();
          this.toast("Challenge complete! Coins and XP added.");
        }
        break;
      case "ranking-metric":
        this.rankingMetric = id;
        this.render();
        break;
      case "emote": {
        const item = ITEM_BY_ID[this.progress.data.equipment.emote];
        this.toast(
          item.id === "emote-love"
            ? "♥ Love that shot!"
            : item.id === "emote-cheer"
              ? "Nice one! ✨"
              : "Hello, fairway!",
        );
        this.world.burst(this.game.physics.ball.x, 1, this.game.physics.ball.z, item.color, 12);
        break;
      }
    }
  }
  tick() {
    if (this.hud?.fill?.isConnected) {
      const g = this.game,
        h = this.hud;
      h.fill.style.width = g.power * 100 + "%";
      h.power.textContent = Math.round(g.power * 100) + "%";
      h.status.textContent = g.physics.active
        ? "ENJOY THE RIDE"
        : g.charging
          ? "FIND YOUR POWER"
          : "MAKE IT A GOOD ONE";
      const p = this.world.ballScreen();
      h.plate.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      h.plate.style.opacity = p.visible && !g.physics.sunk ? "1" : "0";
      const n = nearestPoint(g.hole, g.physics.ball.x, g.physics.ball.z);
      h.surface.textContent = surfaceAt(g.hole, n.t).toUpperCase();
    }
    const timer = document.querySelector("#rotation-countdown");
    if (timer) {
      const now = new Date(),
        seconds = 86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds());
      timer.textContent = `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  }
}
