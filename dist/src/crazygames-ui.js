// Keep portal-only restrictions out of the ordinary website experience.
export const PORTAL_UNAVAILABLE = new Set([
  'fullscreen', 'competitive', 'multiplayer', 'friends', 'trades', 'auctions',
  'leaderboards', 'community', 'editor-cloud', 'editor-publish', 'redeem-code',
  'purchase-coming-soon', 'tutorial-signin', 'copy-room-link', 'create-room', 'join-room',
  'shop-code', 'visit-social',
]);
export function portalActionAllowed(action, data = {}) {
  return !PORTAL_UNAVAILABLE.has(action) && !(['shop-shelf', 'shop-jump'].includes(action) && data?.id === 'coins');
}

export function installCrazyGamesUI(ui) {
  if (!ui.platform?.active) return;
  document.body.dataset.platform = 'crazygames';
  ui.shotPanelCollapsed = true;
  const clean = () => {
    for (const root of [ui.root, ui.modalRoot]) {
      root.querySelectorAll('[data-action]').forEach(node => {
        if (!portalActionAllowed(node.dataset.action, node.dataset)) node.remove();
        else if (node.dataset.action === 'auth-mode') node.remove();
      });
      root.querySelectorAll('#gift-form, .gift-code-panel, .online-required, #online-estimate, #home-splash').forEach(node => node.remove());
    }
  };
  const render = ui.render.bind(ui), modal = ui.modal.bind(ui), action = ui.action.bind(ui), navigate = ui.navigate.bind(ui);
  ui.render = (...args) => { render(...args); clean(); };
  ui.modal = (...args) => { modal(...args); clean(); };
  ui.navigate = (screen, ...args) => {
    if (!portalActionAllowed(screen)) return;
    return navigate(screen, ...args);
  };
  ui.action = (name, ...args) => {
    if (!portalActionAllowed(name, args[0])) return;
    return action(name, ...args);
  };
  clean();
}
