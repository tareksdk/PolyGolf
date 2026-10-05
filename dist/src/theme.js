// Appearance is a browser preference, shared by guest and signed-in sessions.
export const THEME_KEY = 'little-links.theme';
export function readTheme(fallback = 'dark') {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {}
  return fallback === 'light' ? 'light' : 'dark';
}
export function applyTheme(value, root = document.documentElement) {
  const theme = value === 'light' ? 'light' : 'dark';
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  return theme;
}
export function installTheme(ui) {
  let theme = readTheme(ui.progress.data.settings.theme);
  const render = ui.render.bind(ui), changeSetting = ui.changeSetting.bind(ui);
  const apply = () => {
    ui.progress.data.settings.theme = theme;
    applyTheme(theme);
  };
  ui.render = () => { apply(); render(); };
  ui.changeSetting = input => {
    if (input.dataset.setting === 'theme') {
      theme = input.value === 'light' ? 'light' : 'dark';
      input.value = theme;
      try { localStorage.setItem(THEME_KEY, theme); } catch {}
      apply();
    }
    changeSetting(input);
  };
  window.addEventListener('storage', event => {
    if (event.key === THEME_KEY) {
      theme = readTheme();
      apply();
      document.querySelectorAll('input[data-setting="theme"]').forEach(input => {
        input.checked = input.value === theme;
      });
    }
  });
  apply();
}
