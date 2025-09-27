const SUPPORTED_LANGUAGES = ['en', 'tr', 'fr'];
const themeMediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

async function loadLang(lang){
  const resolved = resolveLanguage(lang);
  const candidates = [...new Set([resolved, resolveLanguage(resolved), 'en'])];

  for (const candidate of candidates) {
    try {
      const res = await fetch(chrome.runtime.getURL(`_locales/${candidate}/messages.json`));
      if (res.ok) {
        return res.json();
      }
    } catch (error) {
      console.error(`Error loading language ${candidate}:`, error);
    }
  }

  return {};
}

function resolveLanguage(code = 'en') {
  const normalized = String(code || 'en').trim().toLowerCase();
  if (!normalized) return 'en';
  if (SUPPORTED_LANGUAGES.includes(normalized)) return normalized;
  const base = normalized.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : 'en';
}

function applyLang(map){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = map[el.dataset.i18n]?.message || el.textContent;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = map[el.dataset.i18nTitle]?.message || el.title;
  });
}

function getEffectiveTheme(theme){
  if (theme === 'light' || theme === 'dark') return theme;
  return themeMediaQuery && themeMediaQuery.matches ? 'dark' : 'light';
}

let currentThemeSetting = 'system';

function applyTheme(theme){
  currentThemeSetting = theme;
  const effective = getEffectiveTheme(theme);
  document.body.classList.remove('light','dark');
  document.body.classList.add(effective === 'dark' ? 'dark' : 'light');
}

if (themeMediaQuery) {
  const handleThemeChange = () => {
    if (currentThemeSetting === 'system') {
      applyTheme('system');
    }
  };

  if (typeof themeMediaQuery.addEventListener === 'function') {
    themeMediaQuery.addEventListener('change', handleThemeChange);
  } else if (typeof themeMediaQuery.addListener === 'function') {
    themeMediaQuery.addListener(handleThemeChange);
  }
}


// Global variables to prevent duplicate listeners
let isInitialized = false;
let buttonListenersAdded = false;
let shortcutsOverlay = null;
let currentLangMap = null;


// Keyboard shortcuts mapping
const keyboardShortcuts = {
  '1': 'color-picker',
  '2': 'element-picker', 
  '3': 'link-picker',
  '4': 'font-picker',
  '5': 'media-picker',
  '6': 'text-picker',
  '7': 'screenshot-picker',
  '8': 'sticky-notes-picker',
  '9': 'site-info-picker'
};

function updateToolButtonTooltips(map) {
  document.querySelectorAll('.tool-btn').forEach(btn => {
    const shortcut = Object.keys(keyboardShortcuts).find(key => keyboardShortcuts[key] === btn.id);
    if (shortcut) {
      const titleId = btn.dataset.i18nTitle;
      const base = map?.[titleId]?.message || btn.title.replace(/\s*\([^)]*\)$/, '');
      btn.title = `${base} (${shortcut})`;
    }
  });
}

function addButtonListeners(map) {
  if (!buttonListenersAdded) {
    const toolsGrid = document.querySelector('.tools-grid');
    if (toolsGrid) {
      toolsGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.tool-btn');
        if (button) {
          chrome.runtime.sendMessage({ type: 'ACTIVATE_TOOL', tool: button.id });
          // Delay closing to ensure message is sent
          setTimeout(() => window.close(), 50);
        }
      });
    }
    buttonListenersAdded = true;
  }

  updateToolButtonTooltips(map);
}

// Add keyboard shortcut support
function addKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (shortcutsOverlay) return;
    
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

/*
function parseShortcutString(shortcut) {
  if (!shortcut || typeof shortcut !== 'string') return [];
  return shortcut.split('+').map(part => part.trim()).filter(Boolean);
}

function createKeyChip(label) {
  const span = document.createElement('span');
  span.className = 'key-chip';
  span.textContent = label;
  return span;
}

function createSeparator(symbol) {
  const span = document.createElement('span');
  span.className = 'key-separator';
  span.textContent = symbol;
  return span;
}
*/

/*
function renderShortcutKeys(container, combos) {
  combos.forEach((combo, comboIndex, combosArray) => {
    const normalizedCombo = Array.isArray(combo) ? combo : parseShortcutString(combo);
    normalizedCombo.forEach((key, keyIndex, keyArray) => {
      container.appendChild(createKeyChip(key));
      if (keyIndex < keyArray.length - 1) {
        container.appendChild(createSeparator('+'));
      }
    });

    if (comboIndex < combosArray.length - 1) {
      container.appendChild(createSeparator('/'));
    }
  });
}
*/

/*
function buildShortcutsSection(title, items) {
  if (!items || items.length === 0) return null;

  const section = document.createElement('section');
  section.className = 'modal-section';

  const heading = document.createElement('div');
  heading.className = 'modal-section-title';
  heading.textContent = title;
  section.appendChild(heading);

  items.forEach(({ label, combos }) => {
    if (!label || !combos || combos.length === 0) return;

    const row = document.createElement('div');
    row.className = 'shortcut-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'shortcut-label';
    labelEl.textContent = label;

    const keysEl = document.createElement('div');
    keysEl.className = 'shortcut-keys';
    // renderShortcutKeys(keysEl, combos);

    row.appendChild(labelEl);
    row.appendChild(keysEl);
    section.appendChild(row);
  });

  return section;
}
*/

function updateFooterButtons(map) {
  const favoritesBtn = document.getElementById('favorites-btn');
  if (favoritesBtn) {
    const label = map?.favorites?.message || 'Favorites';
    favoritesBtn.setAttribute('aria-label', label);
    const textSpan = favoritesBtn.querySelector('.footer-btn-text');
    if (textSpan) {
      textSpan.textContent = label;
    }
  }

  const shortcutsBtn = document.getElementById('shortcuts-btn');
  if (shortcutsBtn) {
    const label = map?.shortcuts?.message || 'Shortcuts';
    shortcutsBtn.setAttribute('aria-label', label);
    const textSpan = shortcutsBtn.querySelector('.footer-btn-text');
    if (textSpan) {
      textSpan.textContent = label;
    }
  }

  // Update developer and support buttons
  const developerBtn = document.querySelector('a[href*="ademisler.com"]');
  if (developerBtn) {
    const label = map?.developer?.message || 'Developer';
    developerBtn.setAttribute('aria-label', label);
    const textSpan = developerBtn.querySelector('.footer-btn-text');
    if (textSpan) {
      textSpan.textContent = label;
    }
  }

  const supportBtn = document.querySelector('a[href*="buymeacoffee.com"]');
  if (supportBtn) {
    const label = map?.support?.message || 'Support';
    supportBtn.setAttribute('aria-label', label);
    const textSpan = supportBtn.querySelector('.footer-btn-text');
    if (textSpan) {
      textSpan.textContent = label;
    }
  }
}

function closeShortcutsModal() {
  if (shortcutsOverlay) {
    shortcutsOverlay.remove();
    shortcutsOverlay = null;
  }
}

function showShortcutsModal(map) {
  closeShortcutsModal();

  const overlay = document.createElement('div');
  overlay.id = 'popup-shortcuts-overlay';
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const header = document.createElement('div');
  header.className = 'modal-header';

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = map?.shortcutsTitle?.message || 'Keyboard shortcuts';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>';

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';

  const descriptionText = map?.shortcutsDescription?.message || 'Trigger Pickachu faster with these shortcuts.';
  const description = document.createElement('p');
  description.className = 'modal-description';
  description.textContent = descriptionText;
  body.appendChild(description);


  // Simplified shortcuts display
  const shortcutsList = [
    { label: map?.shortcutOpen?.message || map?.openPickachu?.message || 'Open Pickachu', key: 'Ctrl+Shift+9' },
    { label: map?.shortcutToggle?.message || 'Toggle popup', key: 'Ctrl+Shift+P' },
    { label: map?.color?.message || 'Color Picker', key: 'Alt+Shift+1' },
    { label: map?.element?.message || 'Element Picker', key: 'Alt+Shift+2' },
    { label: map?.shortcutClose?.message || 'Close popup', key: 'Esc' }
  ];

  const shortcutsSection = document.createElement('div');
  shortcutsSection.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  shortcutsList.forEach(({ label, key }) => {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(0,0,0,0.03);
      border-radius: 8px;
      font-size: 13px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = 'color: var(--pickachu-text); font-weight: 500;';

    const keyEl = document.createElement('span');
    keyEl.textContent = key;
    keyEl.style.cssText = `
      background: var(--pickachu-button-bg);
      border: 1px solid var(--pickachu-border);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--pickachu-text);
      font-family: monospace;
    `;

    row.appendChild(labelEl);
    row.appendChild(keyEl);
    shortcutsSection.appendChild(row);
  });

  body.appendChild(shortcutsSection);

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const handleOverlayClick = (event) => {
    if (event.target === overlay) {
      closeShortcutsModal();
    }
  };

  closeBtn.addEventListener('click', closeShortcutsModal);
  overlay.addEventListener('click', handleOverlayClick);

  shortcutsOverlay = overlay;
}

document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) return;
  isInitialized = true;
  
  const langSelect = document.getElementById('lang-select');
  const themeSelect = document.getElementById('theme-select');

  // Add escape key support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (shortcutsOverlay) {
        e.preventDefault();
        closeShortcutsModal();
        return;
      }
      window.close();
    }
  });

  (async () => {
    try {
      const stored = await chrome.storage.local.get(['language', 'theme']);
      let lang = stored?.language ? resolveLanguage(stored.language) : null;
      if (!lang) {
        const autoLang = resolveLanguage(chrome.i18n?.getUILanguage?.() || navigator.language || 'en');
        lang = autoLang;
        await chrome.storage.local.set({ language: lang });
      }

      let theme = stored?.theme;
      if (!['light', 'dark', 'system'].includes(theme)) {
        theme = 'system';
        await chrome.storage.local.set({ theme });
      }

      const map = await loadLang(lang);

      applyLang(map);
      currentLangMap = map;
      updateFooterButtons(map);
      updateToolButtonTooltips(map);

      langSelect.value = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
      themeSelect.value = theme;
      applyTheme(theme);

      // Add button listeners after language is loaded
      addButtonListeners(map);
      
      // Add keyboard shortcuts
      addKeyboardShortcuts();

      langSelect.addEventListener('change', async e => {
        const newLang = resolveLanguage(e.target.value);
        e.target.value = newLang;
        await chrome.storage.local.set({ language: newLang });
        const m = await loadLang(newLang);
        applyLang(m);
        currentLangMap = m;
        updateFooterButtons(m);
        updateToolButtonTooltips(m);
      });

      themeSelect.addEventListener('change', async e => {
        const requested = e.target.value;
        const normalized = ['light', 'dark', 'system'].includes(requested) ? requested : 'system';
        e.target.value = normalized;
        await chrome.storage.local.set({ theme: normalized });
        applyTheme(normalized);
      });

      // Add favorites button event listener
      const favoritesBtn = document.getElementById('favorites-btn');
      if (favoritesBtn) {
        const favLabel = map?.favorites?.message || 'Favorites';
        favoritesBtn.setAttribute('aria-label', favLabel);
        favoritesBtn.addEventListener('click', async () => {
          try {
            // Send message to content script to show favorites
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tab = tabs[0];
            if (tab) {
              chrome.tabs.sendMessage(tab.id, { type: 'SHOW_FAVORITES' });
              window.close();
            }
          } catch (error) {
            console.error('Error opening favorites:', error);
          }
        });
      }

      const shortcutsBtn = document.getElementById('shortcuts-btn');
      if (shortcutsBtn) {
        const label = map?.shortcuts?.message || 'Shortcuts';
        shortcutsBtn.setAttribute('aria-label', label);
        shortcutsBtn.addEventListener('click', () => showShortcutsModal(currentLangMap || map));
      }

      const versionBadge = document.getElementById('version-badge');
      if (versionBadge) {
        const { version } = chrome.runtime.getManifest();
        versionBadge.textContent = `v${version}`;
      }
      
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  })();
});
