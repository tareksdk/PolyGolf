import { APP_VERSION } from './version.js';
import { button, coins, esc } from './views.js';
import { icon, brandMark } from './icons.js';

const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';

export function homeMenu(ui) {
  const d = ui.progress.data;
  const guest = !ui.cloud.session || ui.cloud.isGuest;
  const more = [
    ['flag', 'Community maps', 'community'],
    ['flag', 'Editor', 'editor'],
    ['user', 'Friends', 'friends'],
    ['trophy', 'Rankings', 'leaderboards'],
    ['gift', 'Country Club', 'club-pass'],
    ['gift', 'Auction house', 'auctions'],
  ];
  return `<main class="arcade-home home-refresh">
    <div class="home-account">
      ${coins(d.coins)}
      ${button(`<span class="home-player-name">${esc(d.name)}</span><small>Lv ${ui.progress.level.level}</small>`, 'profile', `title="${esc(d.name)} · Level ${ui.progress.level.level}"`, 'home-profile')}
      ${guest ? button('Sign in', 'auth-mode', 'data-id="login"', 'home-signin') : ''}
      ${button(icon('sliders'), 'settings', 'aria-label="Settings"', 'home-settings')}
    </div>
    <section class="home-center" aria-labelledby="home-title">
      <h1 id="home-title">${brandMark()}<span>PolyGolf</span></h1>
      <div id="home-splash" class="home-splash" hidden></div>
      <nav class="home-actions" aria-label="Main menu">
        ${button(`<span class="home-play-copy"><strong>Play</strong><small>Choose a course</small></span>${icon('play')}`, 'courses', 'aria-label="Play"', 'home-primary home-play')}
        <div class="home-prep">
          ${button(icon('club') + '<span>Caddie</span>', 'garage', '', 'home-tile')}
          ${button(icon('gift') + '<span>Shop</span>', 'shop', '', 'home-tile')}
        </div>
        <div class="home-quick-links">
          ${button(icon('user') + '<span>Multiplayer</span>', 'multiplayer', '', 'home-quick')}
          ${button(icon('trophy') + '<span>Competitive</span>', 'competitive', '', 'home-quick')}
          <details class="home-more">
            <summary aria-label="More options">More ${chevron}</summary>
            <nav class="home-secondary home-more-links" aria-label="More options">
              ${more.map(([i, label, action]) => button(icon(i) + `<span>${label}</span>`, action)).join('')}
              ${button(icon('user') + '<span>Account</span>', 'account')}
              ${button(icon('flag') + '<span>Room310 community</span>', 'socials', '', 'home-community')}
              <div class="home-activity" id="online-estimate" hidden title="Studio-set activity estimate, not a live player count."><i></i><span>Studio estimate · <b>-</b></span></div>
            </nav>
          </details>
        </div>
      </nav>
    </section>
    <footer class="home-footer">
      <div class="home-footer-left">
        <div class="home-studio">Room310 × OneShotStudios <span>v${APP_VERSION}</span></div>
        <div class="home-utilities">
          ${button('Controls', 'help')}
          ${button(icon('fullscreen'), 'fullscreen', 'aria-label="Fullscreen"')}
        </div>
      </div>
      <nav aria-label="Legal pages"><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/cookies.html">Cookies</a><a href="/copyright.html">Copyright</a><a href="/contact.html">Contact</a></nav>
    </footer>
  </main>`;
}

// Native details supplies keyboard disclosure; these add dismissal and focus return.
export function installHomeMenu(ui) {
  const render = ui.render.bind(ui);
  let previous = '', previewBackground = null;
  ui.render = () => {
    render();
    const screen = ui.game.state === 'menu' ? ui.screen : 'round';
    const reduced = !!ui.progress.data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    ui.root.dataset.menuMotion = reduced ? 'reduced' : 'full';
    const background = ui.world.scene.background;
    if (screen === 'garage' && background?.isColor) {
      previewBackground ??= { color: background.clone(), target: background };
      background.set(getComputedStyle(document.documentElement).getPropertyValue('--club-bg').trim());
    } else if (previewBackground) {
      if (background === previewBackground.target) background.copy(previewBackground.color);
      previewBackground = null;
    }
    if (screen !== previous && screen !== 'round' && !reduced) {
      const content = ui.root.querySelector('.home-center, .course-menu, .garage-page, .competitive-content, .page');
      content?.animate?.([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 170, easing: 'ease-out' });
    }
    if (previous && screen !== previous && screen !== 'round' && !ui.modalRoot.children.length) {
      const heading = ui.root.querySelector('main h1, .home-center h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
    previous = screen;
  };
  document.addEventListener('pointerdown', event => {
    const menu = ui.root.querySelector('.home-more[open], .menu-more[open]');
    if (menu && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.home-more-links [data-action], .menu-more-links [data-action]')) return;
    const menu = ui.root.querySelector('.home-more[open], .menu-more[open]');
    if (!menu) return;
    menu.open = false;
    const summary = menu.querySelector('summary');
    if (ui.modalRoot.children.length) ui.lastFocus = summary;
    else summary.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || ui.modalRoot.children.length) return;
    const menu = ui.root.querySelector('.home-more[open], .menu-more[open]');
    if (!menu) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    menu.open = false;
    menu.querySelector('summary').focus();
  }, true);
}
