/* Core content never depends on this small, optional enhancement. */
(() => {
  const root = document.documentElement;
  const choices = new Set(['system', 'light', 'dark']);
  // Keep independent sites on one host separate; examples share their site's preference.
  const scriptURL = document.currentScript?.src;
  const scope = scriptURL ? new URL('../', scriptURL).pathname : new URL('.', document.baseURI).pathname;
  const key = `elsewhere-theme:${scope}`;
  const initial = choices.has(root.dataset.defaultTheme) ? root.dataset.defaultTheme : 'system';
  let preference = initial;
  try {
    const saved = localStorage.getItem(key);
    if (choices.has(saved)) preference = saved;
  } catch { /* Storage may be unavailable; the control still works for this page. */ }
  const apply = value => {
    if (value === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = value;
  };
  apply(preference);
  const control = document.getElementById('theme-control');
  const select = document.getElementById('theme-choice');
  if (control && select) {
    select.value = preference;
    control.hidden = false;
    select.addEventListener('change', () => {
      if (!choices.has(select.value)) return;
      apply(select.value);
      try { localStorage.setItem(key, select.value); } catch { /* Page-only preference. */ }
    });
    window.addEventListener('storage', event => {
      if (event.key !== key && event.key !== null) return;
      const next = choices.has(event.newValue) ? event.newValue : initial;
      apply(next);
      select.value = next;
    });
  }
  for (const image of document.querySelectorAll('img.portrait')) {
    const hideBrokenImage = () => { image.hidden = true; };
    image.addEventListener('error', hideBrokenImage);
    if (image.complete && image.naturalWidth === 0) hideBrokenImage();
  }
})();
