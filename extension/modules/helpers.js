// Helper utilities for Pickachu
let langMap = {};
let userTheme = 'system';

// Performance utilities
export function debounce(func, wait) {
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

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Cache for computed styles and DOM queries
const styleCache = new Map();

export function getCachedComputedStyle(element) {
  const key = `${element.tagName}-${element.id}-${element.className}`;
  if (!styleCache.has(key)) {
    styleCache.set(key, getComputedStyle(element));
  }
  return styleCache.get(key);
}


async function loadLanguage(lang = 'en') {
  try {
    // Check if chrome.runtime is available and if the file exists
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
      if (res.ok) {
        langMap = await res.json();
      }
    }
  } catch {
    // Silently fail for language loading - it's not critical
    console.debug('Language file not found, using defaults');
  }
}

// Initialize language and theme with async/await
if (typeof chrome !== 'undefined') {
  (async () => {
    try {
      const { language } = await chrome.storage.local.get('language');
      await loadLanguage(language || 'en');
    } catch (error) {
      console.error('Error loading initial language:', error);
    }
  })();
  
  chrome.storage.onChanged.addListener(async (changes) => {
    if (changes.language) {
      await loadLanguage(changes.language.newValue || 'en');
    }
    if (changes.theme) {
      userTheme = changes.theme.newValue;
    }
  });
}

// Initialize theme with async/await
if (typeof chrome !== 'undefined') {
  (async () => {
    try {
      const { theme } = await chrome.storage.local.get('theme');
      if (theme) userTheme = theme;
    } catch (error) {
      console.error('Error loading initial theme:', error);
    }
  })();
}

function applyTheme(el){
  if(userTheme==='light') el.classList.add('light-theme');
  if(userTheme==='dark') el.classList.add('dark-theme');
}

function t(id) {
  if (langMap[id]) return langMap[id].message;
  if (chrome && chrome.i18n) {
    const msg = chrome.i18n.getMessage(id);
    if (msg) return msg;
  }
  return id;
}

export function createOverlay() {
  const box = document.createElement('div');
  box.id = 'pickachu-highlight-overlay';
  document.body.appendChild(box);
  return box;
}

export function removeOverlay(box) {
  if (box && box.parentNode) box.parentNode.removeChild(box);
}

export function createTooltip() {
  const tip = document.createElement('div');
  tip.id = 'pickachu-tooltip';
  document.body.appendChild(tip);
  return tip;
}

export function removeTooltip(tip) {
  if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard successfully');
  } catch (err) {
    console.error('Copy failed:', err);
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (!successful) {
        throw new Error('Fallback copy failed');
      }
      console.log('Text copied using fallback method');
    } catch (fallbackErr) {
      console.error('All copy methods failed:', fallbackErr);
      showToast('Copy failed. Please try manually.', 3000);
    }
  }
}

// Enhanced error handling
export function showError(message, duration = 3000) {
  showToast(`❌ ${message}`, duration);
}

export function showSuccess(message, duration = 2000) {
  showToast(`✅ ${message}`, duration);
}

export function showWarning(message, duration = 2500) {
  showToast(`⚠️ ${message}`, duration);
}

export function showInfo(message, duration = 2000) {
  showToast(`ℹ️ ${message}`, duration);
}

export function showToast(message, duration = 1500) {
  // Remove existing toasts
  document.querySelectorAll('#pickachu-toast').forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.id = 'pickachu-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--pickachu-button-bg, rgba(0,0,0,0.9));
    color: var(--pickachu-text, #fff);
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 2147483647;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: pickachu-toast-slide-in 0.3s ease-out;
    max-width: 90vw;
    word-wrap: break-word;
  `;
  
  // Add animation styles
  if (!document.querySelector('#pickachu-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'pickachu-toast-styles';
    style.textContent = `
      @keyframes pickachu-toast-slide-in {
        from {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'pickachu-toast-slide-in 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

async function getHistory() {
  try {
    const data = await chrome.storage.local.get('pickachuHistory');
    return data.pickachuHistory || [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
}

export async function saveHistory(item) {
  try {
    const hist = await getHistory();
    hist.unshift(item);
    if (hist.length > 20) hist.pop();
    await chrome.storage.local.set({ pickachuHistory: hist });
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

async function toggleFavorite(id) {
  try {
    const hist = await getHistory();
    const item = hist.find(i => i.id === id);
    if (item) {
      item.favorite = !item.favorite;
      await chrome.storage.local.set({ pickachuHistory: hist });
      return item.favorite;
    }
    return false;
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
}

export async function showHistory() {
  const data = await getHistory();
  const overlay = document.createElement('div');
  overlay.id = 'pickachu-modal-overlay';
  const modal = document.createElement('div');
  modal.id = 'pickachu-modal-content';
  applyTheme(modal);
  const h3 = document.createElement('h3');
  h3.textContent = t('history');
  const filter = document.createElement('select');
  const types = ['all', ...new Set(data.map(d => d.type))];
  types.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    filter.appendChild(opt);
  });
  const list = document.createElement('div');
  list.id = 'pickachu-history';
  function render(filterType) {
    list.innerHTML = '';
    data.filter(it => filterType === 'all' || it.type === filterType).forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      const fav = document.createElement('button');
      fav.textContent = item.favorite ? '★' : '☆';
      fav.title = t('favorite');
      fav.addEventListener('click', async () => {
        const val = await toggleFavorite(item.id);
        fav.textContent = val ? '★' : '☆';
        showToast(val ? t('favorite') : t('unfavorite'));
      });
      const copy = document.createElement('button');
      copy.textContent = t('copy');
      copy.title = t('copy');
      copy.addEventListener('click', () => {
        copyText(item.content);
        showToast(t('copy'));
      });
      const ta = document.createElement('textarea');
      ta.value = item.content;
      div.appendChild(fav);
      div.appendChild(copy);
      div.appendChild(ta);
      list.appendChild(div);
    });
  }
  render('all');
  filter.addEventListener('change', () => render(filter.value));
  const closeBtn = document.createElement('button');
  closeBtn.textContent = t('close');
  closeBtn.title = t('close');
  closeBtn.addEventListener('click', () => overlay.remove());
  modal.appendChild(h3);
  modal.appendChild(filter);
  modal.appendChild(list);
  modal.appendChild(closeBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  return overlay;
}

export async function showModal(title, content, icon = '', type = '') {
  // Remove existing modals
  document.querySelectorAll('#pickachu-modal-overlay').forEach(modal => modal.remove());
  
  const overlay = document.createElement('div');
  overlay.id = 'pickachu-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--pickachu-modal-backdrop, rgba(0, 0, 0, 0.5));
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pickachu-fade-in 0.3s ease-out;
  `;
  
  const modal = document.createElement('div');
  modal.id = 'pickachu-modal-content';
  modal.style.cssText = `
    background: var(--pickachu-bg, #fff);
    border: 1px solid var(--pickachu-border, #ddd);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: pickachu-modal-slide-in 0.3s ease-out;
  `;
  
  // Add animation styles
  if (!document.querySelector('#pickachu-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'pickachu-modal-styles';
    style.textContent = `
      @keyframes pickachu-modal-slide-in {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes pickachu-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  applyTheme(overlay);
  applyTheme(modal);
  
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--pickachu-border, #eee);
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--pickachu-header-bg, #f8f9fa);
  `;
  
  const h3 = document.createElement('h3');
  h3.style.cssText = `
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--pickachu-text, #333);
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  `;
  h3.textContent = `${icon} ${title}`;
  
  const body = document.createElement('div');
  body.style.cssText = `
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.5;
    color: var(--pickachu-text, #333);
  `;
  
  // Enhanced content with preview based on type
  if (type === 'color' && content.includes('#')) {
    const colorMatch = content.match(/#[0-9a-fA-F]{6}/);
    if (colorMatch) {
      const color = colorMatch[0];
      body.innerHTML = `
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
          <div style="width: 60px; height: 60px; background-color: ${color}; border-radius: 8px; border: 2px solid var(--pickachu-border, #ddd);"></div>
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 8px;">Color Preview</div>
            <div class="code-preview">${color}</div>
          </div>
        </div>
        <textarea style="width: 100%; height: 200px;">${content}</textarea>
      `;
    } else {
      body.innerHTML = `<textarea style="width: 100%; height: 200px;">${content}</textarea>`;
    }
  } else if (type === 'image' && content.includes('http')) {
    const urlMatch = content.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const imageUrl = urlMatch[0];
      body.innerHTML = `
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Image Preview</div>
          <img src="${imageUrl}" style="max-width: 200px; max-height: 150px; border-radius: 6px; border: 1px solid var(--pickachu-border, #ddd);" onerror="this.style.display='none'">
        </div>
        <textarea style="width: 100%; height: 200px;">${content}</textarea>
      `;
    } else {
      body.innerHTML = `<textarea style="width: 100%; height: 200px;">${content}</textarea>`;
    }
  } else if (type === 'font') {
    body.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Font Preview</div>
        <div class="code-preview">
          <div style="font-size: 18px; margin-bottom: 8px;">The quick brown fox jumps over the lazy dog</div>
          <div style="font-size: 14px;" class="secondary-text">ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
        </div>
      </div>
      <textarea style="width: 100%; height: 200px;">${content}</textarea>
    `;
  } else {
    body.innerHTML = `<textarea style="width: 100%; height: 200px;">${content}</textarea>`;
  }
  
  const buttons = document.createElement('div');
  buttons.id = 'pickachu-modal-buttons';
  buttons.style.cssText = `
    padding: 16px 20px;
    border-top: 1px solid var(--pickachu-border, #eee);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    background: var(--pickachu-header-bg, #f8f9fa);
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = t('close');
  closeBtn.title = t('close');
  closeBtn.style.cssText = `
    padding: 8px 16px;
    border: 1px solid var(--pickachu-border, #ddd);
    background: var(--pickachu-button-bg, #fff);
    color: var(--pickachu-text, #333);
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  const copyBtn = document.createElement('button');
  copyBtn.textContent = t('copy');
  copyBtn.className = 'copy';
  copyBtn.title = t('copy');
  copyBtn.style.cssText = `
    padding: 8px 16px;
    border: 1px solid var(--pickachu-border, #ddd);
    background: var(--pickachu-primary-color, #007bff);
    color: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  const exportBtn = document.createElement('button');
  exportBtn.textContent = t('export');
  exportBtn.title = t('export');
  exportBtn.style.cssText = `
    padding: 8px 16px;
    border: 1px solid var(--pickachu-border, #ddd);
    background: var(--pickachu-success-color, #28a745);
    color: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  const favBtn = document.createElement('button');
  favBtn.textContent = '☆';
  favBtn.title = t('favorite');
  favBtn.style.cssText = `
    padding: 8px 12px;
    border: 1px solid var(--pickachu-border, #ddd);
    background: var(--pickachu-warning-color, #ffc107);
    color: var(--pickachu-text, #333);
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  const historyBtn = document.createElement('button');
  historyBtn.textContent = t('history');
  historyBtn.title = t('history');
  historyBtn.style.cssText = `
    padding: 8px 16px;
    border: 1px solid var(--pickachu-border, #ddd);
    background: var(--pickachu-secondary-color, #6c757d);
    color: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  // Event handlers
  closeBtn.addEventListener('click', () => overlay.remove());
  
  copyBtn.addEventListener('click', async () => {
    const textarea = body.querySelector('textarea');
    if (textarea) {
      await copyText(textarea.value);
      showToast(t('copy'));
    }
  });
  
  exportBtn.addEventListener('click', () => {
    const textarea = body.querySelector('textarea');
    if (textarea) {
      const blob = new Blob([textarea.value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pickachu-export-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
  
  favBtn.addEventListener('click', async () => {
    const textarea = body.querySelector('textarea');
    if (textarea) {
      const val = await toggleFavorite(content);
      favBtn.textContent = val ? '★' : '☆';
      showToast(val ? t('favorite') : t('unfavorite'));
    }
  });
  
  historyBtn.addEventListener('click', () => {
    overlay.remove();
    showHistory();
  });
  
  buttons.appendChild(closeBtn);
  buttons.appendChild(copyBtn);
  buttons.appendChild(exportBtn);
  buttons.appendChild(favBtn);
  buttons.appendChild(historyBtn);
  
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(buttons);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  let startX, startY, isDragging = false;
  
  function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const newX = e.clientX - startX;
    const newY = e.clientY - startY;
    
    // Keep modal within viewport bounds
    const maxX = window.innerWidth - modal.offsetWidth;
    const maxY = window.innerHeight - modal.offsetHeight;
    
    modal.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
    modal.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
  }
  
  function endDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('mouseleave', endDrag);
  }
  
  h3.style.cursor = 'move';
  h3.addEventListener('mousedown', e => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - modal.offsetLeft;
    startY = e.clientY - modal.offsetTop;
    modal.style.transform = 'none';
    modal.style.transition = 'none';
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('mouseleave', endDrag);
  });
  return overlay;
}

export function getCssSelector(el) {
  if (!(el instanceof Element)) return '';
  
  const path = [];
  let current = el;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    
    // Use ID if available and unique
    if (current.id) {
      const idSelector = `#${current.id}`;
      // Check if ID is unique
      if (document.querySelectorAll(idSelector).length === 1) {
        selector += idSelector;
        path.unshift(selector);
        break;
      }
    }
    
    // Add class names if they exist
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(cls => cls.length > 0);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    // Add nth-of-type if there are siblings with same tag
    const siblings = Array.from(current.parentNode?.children || [])
      .filter(sibling => sibling.nodeName === current.nodeName);
    
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }
    
    path.unshift(selector);
    current = current.parentNode;
  }
  
  return path.join(' > ');
}

export function getXPath(el) {
  if (el.id) return `//*[@id="${el.id}"]`;
  const parts = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let nb = 1;
    let sib = el.previousSibling;
    while (sib) {
      if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === el.nodeName) nb++;
      sib = sib.previousSibling;
    }
    const part = `${el.nodeName.toLowerCase()}[${nb}]`;
    parts.unshift(part);
    el = el.parentNode;
  }
  return '/' + parts.join('/');
}
