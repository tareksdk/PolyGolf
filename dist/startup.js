(() => {
  const loading = document.getElementById('loading');
  const version = document.currentScript?.dataset.version || '';
  let stage = 'Loading game code', active = true;
  const status = document.createElement('p');
  status.id = 'startup-status';
  status.textContent = stage + (version ? ' · v' + version : '');
  loading.append(status);
  const stop = () => {
    active = false;
    clearTimeout(timer);
    window.removeEventListener('error', onError, true);
  };
  const fail = detail => {
    if (!active || !loading.isConnected) return;
    stop();
    const panel = document.createElement('div');
    panel.className = 'panel';
    const title = document.createElement('h2'), copy = document.createElement('p'), code = document.createElement('p'), retry = document.createElement('button');
    title.textContent = 'The game could not finish loading.';
    copy.textContent = 'Reload to try again. If this keeps happening, share the message below with the developer.';
    code.id = 'startup-error';
    code.textContent = 'v' + version + ' · ' + stage + ' · ' + detail;
    code.style.cssText = 'font-size:12px;overflow-wrap:anywhere;max-width:560px';
    retry.className = 'button yellow';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => location.reload());
    panel.append(title, copy, code, retry);
    loading.replaceChildren(panel);
  };
  function onError(event) {
    const script = event.target?.tagName === 'SCRIPT' ? event.target : null;
    if (script?.src) {
      fail('Script failed to load: ' + new URL(script.src).pathname.split('/').pop());
    } else if (event.message) {
      fail('A startup script stopped. Check the browser Console for the error.');
    }
  }
  window.addEventListener('error', onError, true);
  const timer = setTimeout(() => fail('Startup timed out. Check your connection and the browser Console.'), 25000);
  window.PolyGolfStartup = {
    stop,
    phase(message) {
      if (!active) return;
      stage = message;
      status.textContent = message + (version ? ' · v' + version : '');
    },
  };
})();
