async function loadLang(lang){
  try {
    const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    if (!res.ok) {
      throw new Error(`Failed to load language: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error('Error loading language:', error);
    // Fallback to English
    try {
      const res = await fetch(chrome.runtime.getURL(`_locales/en/messages.json`));
      return res.json();
    } catch (fallbackError) {
      console.error('Error loading fallback language:', fallbackError);
      return {};
    }
  }
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

// Performance optimization: debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Performance optimization: throttle function
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Global variables to prevent duplicate listeners
let isInitialized = false;
let buttonListenersAdded = false;

// Keyboard shortcuts mapping
const keyboardShortcuts = {
  '1': 'color-picker',
  '2': 'element-picker', 
  '3': 'link-picker',
  '4': 'font-picker',
  '5': 'image-picker',
  '6': 'text-picker',
  '7': 'screenshot-picker',
  '8': 'sticky-notes-picker',
  '9': 'site-info-picker'
};

function addButtonListeners(map) {
  if (buttonListenersAdded) return;
  
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'ACTIVATE_TOOL', tool: btn.id });
      // Delay closing to ensure message is sent
      setTimeout(() => window.close(), 50);
    });
    
    // Add keyboard shortcuts to tooltips
    const shortcut = Object.keys(keyboardShortcuts).find(key => keyboardShortcuts[key] === btn.id);
    if (shortcut && map) {
      const titleId = btn.dataset.i18nTitle;
      const base = map[titleId]?.message || btn.title;
      btn.title = `${base} (${shortcut})`;
    }
  });
  
  buttonListenersAdded = true;
}

// Add keyboard shortcut support
function addKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    const shortcut = keyboardShortcuts[e.key];
    if (shortcut) {
      e.preventDefault();
      const button = document.getElementById(shortcut);
      if (button) {
        button.click();
      }
    }
    
    // Escape key to close popup
    if (e.key === 'Escape') {
      window.close();
    }
  });
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
      
      // Add keyboard shortcuts
      addKeyboardShortcuts();

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

      // Add history button event listener
      const historyBtn = document.getElementById('history-btn');
      if (historyBtn) {
        historyBtn.addEventListener('click', async () => {
          try {
            // Send message to content script to show history
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tab = tabs[0];
            if (tab) {
              chrome.tabs.sendMessage(tab.id, { type: 'SHOW_HISTORY' });
              window.close();
            }
          } catch (error) {
            console.error('Error opening history:', error);
          }
        });
      }
      
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  })();
});
