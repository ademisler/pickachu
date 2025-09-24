// Helper utilities for Pickachu
let langMap = {};
let userTheme = 'system';

async function loadLanguage(lang = 'en') {
  try {
    const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    langMap = await res.json();
  } catch (error) {
    console.error('Failed to load language:', error);
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

export function showToast(message, duration = 1500) {
  const toast = document.createElement('div');
  toast.id = 'pickachu-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
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

async function saveHistory(item) {
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
  const overlay = document.createElement('div');
  overlay.id = 'pickachu-modal-overlay';
  const modal = document.createElement('div');
  modal.id = 'pickachu-modal-content';
  applyTheme(overlay);
  applyTheme(modal);
  const h3 = document.createElement('h3');
  h3.textContent = `${icon} ${title}`;
  const ta = document.createElement('textarea');
  ta.value = content;
  const buttons = document.createElement('div');
  buttons.id = 'pickachu-modal-buttons';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = t('close');
  closeBtn.title = t('close');
  const copyBtn = document.createElement('button');
  copyBtn.textContent = t('copy');
  copyBtn.className = 'copy';
  copyBtn.title = t('copy');
  const exportBtn = document.createElement('button');
  exportBtn.textContent = t('export');
  exportBtn.title = t('export');
  const favBtn = document.createElement('button');
  favBtn.textContent = '☆';
  favBtn.title = t('favorite');
  const historyBtn = document.createElement('button');
  historyBtn.textContent = t('history');
  historyBtn.title = t('history');
  buttons.appendChild(copyBtn);
  buttons.appendChild(exportBtn);
  buttons.appendChild(favBtn);
  buttons.appendChild(historyBtn);
  buttons.appendChild(closeBtn);
  modal.appendChild(h3);
  modal.appendChild(ta);
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
  closeBtn.addEventListener('click', () => overlay.remove());
  copyBtn.addEventListener('click', () => {
    copyText(ta.value);
    showToast(t('copy'));
  });
  exportBtn.addEventListener('click', () => {
    const promptMsg = t('exportPrompt');
    const format = prompt(promptMsg, 'txt');
    let dataStr = ta.value;
    let typeStr = 'text/plain';
    let fileName = 'pickachu.' + (format || 'txt');
    if (format === 'json') { typeStr = 'application/json'; }
    if (format === 'csv') { typeStr = 'text/csv'; }
    const blob = new Blob([dataStr], { type: typeStr });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('export'));
  });
  const item = { id: Date.now(), title, content, type, favorite: false };
  saveHistory(item);
  favBtn.addEventListener('click', async () => {
    const val = await toggleFavorite(item.id);
    favBtn.textContent = val ? '★' : '☆';
    showToast(val ? t('favorite') : t('unfavorite'));
  });
  historyBtn.addEventListener('click', () => {
    overlay.remove();
    showHistory();
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
