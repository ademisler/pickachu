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

// Global variables to prevent duplicate listeners
let isInitialized = false;
let buttonListenersAdded = false;

function addButtonListeners(map) {
  if (buttonListenersAdded) return;
  
  document.querySelectorAll('.grid button').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'ACTIVATE_TOOL', tool: btn.id });
      // Delay closing to ensure message is sent
      setTimeout(() => window.close(), 50);
    });
    
    // Add keyboard shortcuts to tooltips
    const hint = btn.dataset.shortcut;
    if (hint && map) {
      const titleId = btn.dataset.i18nTitle;
      const base = map[titleId]?.message || btn.title;
      btn.title = `${base} (${hint})`;
    }
  });
  
  buttonListenersAdded = true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) return;
  isInitialized = true;
  
  const langSelect = document.getElementById('lang-select');
  const themeSelect = document.getElementById('theme-select');
  const shortcutsEl = document.getElementById('shortcuts');

  // Add escape key support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.close();
    }
  });

  (async () => {
    try {
      const stored = await chrome.storage.local.get(['language', 'theme']);
      const lang = stored?.language || 'en';
      const theme = stored?.theme || 'system';
      const map = await loadLang(lang);

      applyLang(map);
      langSelect.value = lang;
      themeSelect.value = theme;
      applyTheme(theme);

      // Add button listeners after language is loaded
      addButtonListeners(map);

      if (shortcutsEl) {
        const base = map.openShortcut?.message || 'Ctrl+Shift+9';
        const combos = [base, base.replace('Ctrl', 'Cmd')];
        shortcutsEl.innerHTML = '';

        combos.forEach((combo, idx) => {
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

          if (idx === 0) {
            const sep = document.createTextNode(' / ');
            shortcutsEl.appendChild(sep);
          }
        });
      }

      langSelect.addEventListener('change', async e => {
        const newLang = e.target.value;
        await chrome.storage.local.set({ language: newLang });
        const m = await loadLang(newLang);
        applyLang(m);
      });

      themeSelect.addEventListener('change', e => {
        const t = e.target.value;
        chrome.storage.local.set({ theme: t });
        applyTheme(t);
      });
      
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  })();
});
