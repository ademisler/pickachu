async function loadLang(lang){
  const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
  return res.json();
}

function applyLang(map){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = map[el.dataset.i18n]?.message || el.textContent;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = map[el.dataset.i18nTitle]?.message || el.title;
  });
}

function applyTheme(theme){
  document.body.classList.remove('light','dark');
  if(theme==='light') document.body.classList.add('light');
  if(theme==='dark') document.body.classList.add('dark');
}

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('lang-select');
  const themeSelect = document.getElementById('theme-select');

  document.querySelectorAll('.grid button').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'ACTIVATE_TOOL', tool: btn.id });
      window.close();
    });
  });

  const shortcutsEl = document.getElementById('shortcuts');

  (async () => {
    const stored = await chrome.storage.local.get(['language', 'theme']);
    const lang = stored?.language || 'en';
    const theme = stored?.theme || 'system';
    const map = await loadLang(lang);

    applyLang(map);
    langSelect.value = lang;
    themeSelect.value = theme;
    applyTheme(theme);

    if (shortcutsEl) {
      const base = map.openShortcut?.message || 'Ctrl+Shift+P';
      const combo = navigator.platform.includes('Mac') ?
        base.replace('Ctrl', 'Cmd') : base;
      shortcutsEl.innerHTML = '';
      combo.split('+').forEach((k, i, arr) => {
        const span = document.createElement('span');
        span.className = 'key';
        span.textContent = k;
        shortcutsEl.appendChild(span);
        if (i < arr.length - 1) {
          const sep = document.createTextNode('+');
          shortcutsEl.appendChild(sep);
        }
      });
    }

    langSelect.addEventListener('change', async e => {
      const newLang = e.target.value;
      chrome.storage.local.set({ language: newLang });
      const m = await loadLang(newLang);
      applyLang(m);
    });

    themeSelect.addEventListener('change', e => {
      const t = e.target.value;
      chrome.storage.local.set({ theme: t });
      applyTheme(t);
    });

    document.querySelectorAll('.grid button').forEach(btn => {
      const hint = btn.dataset.shortcut;
      if (hint) {
        const titleId = btn.dataset.i18nTitle;
        const base = map[titleId]?.message || btn.title;
        btn.title = `${base} (${hint})`;
      }
    });
  })();
});
