// Long controls and settings dialogs use pages, keeping every action reachable
// without a scrolling overlay, including in a short landscape window.
export function installDialogPages(ui) {
  const modal = ui.modal.bind(ui), action = ui.action.bind(ui), close = ui.closeModal.bind(ui);
  ui.closeModal = () => { ui.modalRoot.querySelector('.paged-locker')?.lockerResizeObserver?.disconnect(); close(); };
  ui.modal = (...args) => {
    ui.modalRoot.querySelector('.paged-locker')?.lockerResizeObserver?.disconnect();
    modal(...args);
    const root = ui.modalRoot.querySelector('.modal');
    const settings = root?.querySelector('.settings-custom');
    const guide = root?.querySelector('.controls-guide');
    const locker = root?.querySelector('.crate-detail');
    if (locker) { pageLockerContents(root, locker); return; }
    if (!settings && !guide) return;
    const groups = settings
      ? [['Display', [...settings.children].slice(0, 2)], ...[...settings.children].slice(2).map((el, i) => [['Sound','Camera','Course'][i], [el]])]
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

function pageLockerContents(root, locker) {
  const original = locker.innerHTML;
  root.classList.add('paged-locker');
  const pages = [], labels = [], head = locker.querySelector('.crate-detail-head');
  const note = head.querySelector('.small-note');
  if (note) note.remove();
  pages.push(head); labels.push('Overview');
  if (note) {
    const rules = document.createElement('section'); rules.className = 'locker-rules';
    const title = document.createElement('h2'); title.textContent = 'Odds & rules'; rules.append(title, note);
    pages.push(rules); labels.push('Odds & rules');
  }
  const columns = innerWidth < 600 ? 3 : innerHeight < 480 ? 5 : 6, size = columns * 2;
  for (const group of [...locker.querySelectorAll('.odds-group')]) {
    const items = [...group.querySelector('.odds-items').children], header = group.querySelector('header');
    const name = header.querySelector('.rarity-chip').textContent;
    for (let i = 0; i < items.length; i += size) {
      const panel = document.createElement('section'); panel.className = 'odds-group';
      const grid = document.createElement('div'); grid.className = 'odds-items'; grid.style.setProperty('--odds-columns', columns);
      grid.append(...items.slice(i, i + size)); panel.append(header.cloneNode(true), grid); pages.push(panel);
      labels.push(`${name} · ${Math.floor(i / size) + 1} / ${Math.ceil(items.length / size)}`);
    }
  }
  const quantity = locker.querySelector('.locker-quantity'), actions = locker.querySelector('.crate-detail-actions');
  const nav = document.createElement('nav'); nav.className = 'locker-dialog-pager'; nav.setAttribute('aria-label','Locker contents pages');
  const previous = document.createElement('button'), next = document.createElement('button'), select = document.createElement('select');
  previous.type = next.type = 'button'; previous.className = next.className = 'button secondary'; previous.textContent = '←'; next.textContent = '→';
  previous.setAttribute('aria-label','Previous contents page'); next.setAttribute('aria-label','Next contents page');
  select.setAttribute('aria-label','Locker contents page');
  labels.forEach((label, index) => { const option = document.createElement('option'); option.value = index; option.textContent = label; select.append(option); });
  nav.append(previous, select, next);
  const body = document.createElement('div'); body.className = 'locker-dialog-body'; body.append(...pages);
  const footer = document.createElement('footer'); footer.className = 'locker-dialog-footer'; if (quantity) footer.append(quantity); if (actions) footer.append(actions);
  locker.replaceChildren(nav, body, footer);
  let index = 0;
  const show = value => { index = Math.max(0, Math.min(pages.length - 1, value)); pages.forEach((page, i) => { page.hidden = i !== index; }); select.value = index; previous.disabled = index === 0; next.disabled = index === pages.length - 1; };
  previous.addEventListener('click', () => show(index - 1)); next.addEventListener('click', () => show(index + 1)); select.addEventListener('change', () => show(Number(select.value)));
  show(0);
  const observer = new ResizeObserver(() => {
    if (!root.isConnected) { observer.disconnect(); return; }
    const nextColumns = innerWidth < 600 ? 3 : innerHeight < 480 ? 5 : 6;
    if (nextColumns !== columns) {
      observer.disconnect(); locker.innerHTML = original; pageLockerContents(root, locker);
      locker.querySelector('select').focus({preventScroll:true});
    }
  });
  root.lockerResizeObserver = observer;
  observer.observe(root);
}
