// Long controls and settings dialogs use pages, keeping every action reachable
// without a scrolling overlay, including in a short landscape window.
export function installDialogPages(ui) {
  const modal = ui.modal.bind(ui), action = ui.action.bind(ui);
  ui.modal = (...args) => {
    modal(...args);
    const root = ui.modalRoot.querySelector('.modal');
    const settings = root?.querySelector('.settings-custom');
    const guide = root?.querySelector('.controls-guide');
    const locker = root?.querySelector('.crate-detail');
    if (locker) { installLockerCatalog(root, locker); return; }
    if (!settings && !guide) return;
    const groups = settings
      ? [['Display', [...settings.querySelectorAll(':scope > .settings-choice')].filter(el => !el.querySelector('[name=setting-courseWeather]'))], ['Weather', [settings.querySelector('[name=setting-courseWeather]')?.closest('.settings-choice')]], ['Sound', [settings.querySelector('[aria-labelledby=settings-sound]')]], ['Camera', [settings.querySelector('[aria-labelledby=settings-camera]')]], ['Course', [settings.querySelector('[aria-labelledby=settings-course]')]], ['HUD', [settings.querySelector('[aria-labelledby=settings-hud]')]]]
      : [['Shot', [guide.querySelector(':scope > p'), guide.querySelector('.controls-meters')]], ['Keys', [guide.querySelector('.controls-keys')]], ['Tips', [guide.querySelector('.controls-notes')]]];
    const host = settings || guide;
    const tabs = document.createElement('nav');
    tabs.className = 'dialog-tabs';
    tabs.setAttribute('aria-label', settings ? 'Settings pages' : 'Controls pages');
    groups.forEach(([label, nodes], index) => {
      const panel = document.createElement('div');
      panel.className = 'dialog-page';
      panel.id = `dialog-page-${index}`;
      panel.hidden = index !== 0;
      nodes.filter(Boolean).forEach(node => panel.append(node));
      host.insertBefore(panel, guide?.querySelector(':scope > button') || null);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button secondary';
      button.dataset.action = 'dialog-tab';
      button.dataset.id = index;
      button.textContent = label;
      button.setAttribute('aria-controls', panel.id);
      button.setAttribute('aria-pressed', String(index === 0));
      tabs.append(button);
    });
    host.before(tabs);
  };
  ui.action = async (name, data = {}) => {
    if (name !== 'dialog-tab') return action(name, data);
    const root = ui.modalRoot;
    root.querySelectorAll('.dialog-page').forEach((panel, index) => { panel.hidden = String(index) !== data.id; });
    root.querySelectorAll('.dialog-tabs button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.id === data.id)));
  };
}

export function installLockerCatalog(root, locker) {
  root.classList.add('scrolling-locker');
  root.setAttribute('aria-label', locker.querySelector('h2').textContent + ' rewards');
  const search = locker.querySelector('#locker-search'), rarity = locker.querySelector('#locker-rarity');
  const groups = [...locker.querySelectorAll('.odds-group')];
  const filter = () => {
    const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const group of groups) {
      let count = 0;
      for (const item of group.querySelectorAll('.odds-item')) {
        item.hidden = (rarity.value !== 'all' && group.dataset.rarity !== rarity.value) || !words.every(word => item.textContent.toLowerCase().includes(word));
        if (!item.hidden) count++;
      }
      group.hidden = count === 0;
      visible += count;
    }
    locker.querySelector('.locker-result-count').textContent = `${visible} reward${visible === 1 ? '' : 's'}`;
    locker.querySelector('.locker-no-results').hidden = visible > 0;
  };
  search.addEventListener('input', filter);
  rarity.addEventListener('change', filter);
  locker.querySelector('.locker-clear').addEventListener('click', () => {
    search.value = ''; rarity.value = 'all'; filter(); search.focus();
  });
  filter();
}
