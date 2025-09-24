// Helper utilities for Pickachu
let langMap = {};
let userTheme = 'system';

// Event listener cleanup system
const activeListeners = new Map();

export function addEventListenerWithCleanup(element, event, handler, options = {}) {
  const key = `${element.constructor.name}-${event}`;
  if (!activeListeners.has(key)) {
    activeListeners.set(key, []);
  }
  
  element.addEventListener(event, handler, options);
  activeListeners.get(key).push({ element, handler, options });
  
  return () => {
    element.removeEventListener(event, handler, options);
    const listeners = activeListeners.get(key);
    const index = listeners.findIndex(l => l.element === element && l.handler === handler);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

export function cleanupAllEventListeners() {
  for (const [key, listeners] of activeListeners) {
    for (const { element, handler, options } of listeners) {
      element.removeEventListener(key.split('-')[1], handler, options);
    }
    listeners.length = 0;
  }
  activeListeners.clear();
  console.debug('All event listeners cleaned up');
}

// Convert emoji to icon
export function getIcon(icon) {
  const iconMap = {
    '🎨': '🎨', // Keep color picker as is
    '🧾': '📄', // Text picker
    '🧱': '🔍', // Element picker
    '📸': '📷', // Screenshot
    '🔗': '🔗', // Link picker
    '🔤': '🔤', // Font picker
    '🖼️': '🖼️', // Image picker
    '🔍': 'ℹ️', // Site info
    '📝': '📝', // Sticky notes
  };
  return iconMap[icon] || icon;
}

// Performance utilities with enhanced error handling
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

export function throttle(func, limit, options = {}) {
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Optimized DOM query caching
const queryCache = new Map();
const QUERY_CACHE_SIZE = 50;

export function cachedQuerySelector(selector, context = document) {
  const key = `${context.constructor.name}-${selector}`;
  
  if (queryCache.has(key)) {
    return queryCache.get(key);
  }
  
  if (queryCache.size >= QUERY_CACHE_SIZE) {
    queryCache.clear();
  }
  
  const result = context.querySelector(selector);
  queryCache.set(key, result);
  return result;
}

export function cachedQuerySelectorAll(selector, context = document) {
  const key = `${context.constructor.name}-${selector}-all`;
  
  if (queryCache.has(key)) {
    return queryCache.get(key);
  }
  
  if (queryCache.size >= QUERY_CACHE_SIZE) {
    queryCache.clear();
  }
  
  const result = Array.from(context.querySelectorAll(selector));
  queryCache.set(key, result);
  return result;
}

// Cache for computed styles and DOM queries
const styleCache = new Map();
const MAX_CACHE_SIZE = 100;
const CACHE_CLEANUP_THRESHOLD = 80;

export function getCachedComputedStyle(element) {
  const key = `${element.tagName}-${element.id}-${element.className}`;
  if (!styleCache.has(key)) {
    // Check cache size and cleanup if needed
    if (styleCache.size >= MAX_CACHE_SIZE) {
      clearStyleCache();
    }
    styleCache.set(key, getComputedStyle(element));
  }
  return styleCache.get(key);
}

export function clearStyleCache() {
  styleCache.clear();
  console.debug('Style cache cleared');
}

export function getCacheStats() {
  return {
    size: styleCache.size,
    maxSize: MAX_CACHE_SIZE,
    usage: Math.round((styleCache.size / MAX_CACHE_SIZE) * 100)
  };
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
      handleError(error, 'loadInitialLanguage');
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
        handleError(error, 'loadInitialTheme');
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
    try {
      const msg = chrome.i18n.getMessage(id);
      if (msg) return msg;
    } catch (error) {
      // Message not found - using fallback
    }
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
  if (box && box.parentNode) {
    box.remove(); // Modern approach
  }
}

export function createTooltip() {
  const tip = document.createElement('div');
  tip.id = 'pickachu-tooltip';
  document.body.appendChild(tip);
  return tip;
}

export function removeTooltip(tip) {
  if (tip && tip.parentNode) {
    tip.remove(); // Modern approach
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    // Text copied successfully
  } catch (err) {
    handleError(err, 'copyText primary method');
    // Modern fallback approach
    try {
      const data = new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' })
      });
      await navigator.clipboard.write([data]);
      // Text copied using modern fallback method
    } catch (fallbackErr) {
      handleError(fallbackErr, 'copyText fallback method');
      showToast('Copy failed. Please try manually.', 3000);
      throw new Error('Copy operation failed');
    }
  }
}

// Enhanced error handling system
export class PickachuError extends Error {
  constructor(message, type = 'UNKNOWN', context = {}) {
    super(message);
    this.name = 'PickachuError';
    this.type = type;
    this.context = context;
    this.timestamp = Date.now();
  }
}

export function handleError(error, context = '') {
  const errorInfo = {
    message: error.message,
    type: error.type || 'UNKNOWN',
    context: context,
    timestamp: Date.now(),
    stack: error.stack
  };
  
  console.error(`[Pickachu Error] ${context}:`, errorInfo);
  
  // Send to error reporting service if available
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({
      type: 'ERROR_REPORT',
      error: errorInfo
    }).catch(() => {
      // Ignore if background script is not available
    });
  }
  
  return errorInfo;
}

export function safeExecute(fn, context = '', fallback = null) {
  try {
    return fn();
  } catch (error) {
    handleError(error, context);
    return fallback;
  }
}

export async function safeExecuteAsync(fn, context = '', fallback = null) {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return fallback;
  }
}

// Security utilities
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

export function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function safeSetInnerHTML(element, content) {
  if (!element || typeof content !== 'string') return;
  
  // Use textContent instead of innerHTML for security
  element.textContent = content;
}

// Safe function to create textarea with content
export function createSafeTextarea(content, styles = 'width: 100%; height: 200px;') {
  const textarea = document.createElement('textarea');
  textarea.style.cssText = styles;
  textarea.textContent = content; // Safe: using textContent instead of innerHTML
  return textarea;
}

export function validateUrl(url) {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

export function validateSelector(selector) {
  if (typeof selector !== 'string') return false;
  
  // Basic validation for CSS selectors
  const dangerousPatterns = [
    /javascript:/i,
    /on\w+=/i,
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(selector));
}

export function showError(message, duration = 3000) {
  showToast(`❌ ${message}`, duration, 'error');
}

export function showSuccess(message, duration = 2000) {
  showToast(`✅ ${message}`, duration, 'success');
}

export function showWarning(message, duration = 2500) {
  showToast(`⚠️ ${message}`, duration, 'warning');
}

export function showInfo(message, duration = 2000) {
  showToast(`ℹ️ ${message}`, duration, 'info');
}

export function showToast(message, duration = 1500, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('#pickachu-toast').forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.id = 'pickachu-toast';
  toast.textContent = message;
  
  // Type-specific styling
  const typeStyles = {
    error: 'background: var(--pickachu-error-color, #dc3545);',
    success: 'background: var(--pickachu-success-color, #28a745);',
    warning: 'background: var(--pickachu-warning-color, #ffc107); color: var(--pickachu-text, #333);',
    info: 'background: var(--pickachu-button-bg, rgba(0,0,0,0.9));'
  };
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    ${typeStyles[type] || typeStyles.info}
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    handleError(error, 'getHistory');
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
    handleError(error, 'saveHistory');
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
    handleError(error, 'toggleFavorite');
    return false;
  }
}

export async function showHistory() {
  try {
    const data = await getHistory();
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'pickachu-history-overlay';
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: pickachu-fade-in 0.3s ease-out;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--pickachu-bg, #fff);
      border: 1px solid var(--pickachu-border, #ddd);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      max-width: 80vw;
      max-height: 80vh;
      overflow: hidden;
      color: var(--pickachu-text, #333);
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 600px;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid var(--pickachu-border, #eee);
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--pickachu-header-bg, #f8f9fa);
    `;

    header.innerHTML = `
      <h3 style="
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--pickachu-text, #333);
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      ">
        📚 History
      </h3>
      <button id="close-history-modal" style="
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--pickachu-secondary-text, #666);
        padding: 4px 8px;
        border-radius: 4px;
      ">×</button>
    `;

    // Filter section
    const filterSection = document.createElement('div');
    filterSection.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid var(--pickachu-border, #eee);
      background: var(--pickachu-header-bg, #f8f9fa);
    `;

    const filter = document.createElement('select');
    const types = ['all', ...new Set(data.map(d => d.type))];
    types.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      filter.appendChild(opt);
    });

    filter.style.cssText = `
      padding: 8px 12px;
      border: 1px solid var(--pickachu-border, #ddd);
      background: var(--pickachu-bg, #fff);
      color: var(--pickachu-text, #333);
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    `;

    filterSection.innerHTML = `
      <label style="
        display: block;
        font-weight: 600;
        color: var(--pickachu-text, #333);
        margin-bottom: 8px;
      ">Filter by type:</label>
    `;
    filterSection.appendChild(filter);

    // Content area
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 0;
    `;

    const list = document.createElement('div');
    list.id = 'pickachu-history-list';
    list.style.cssText = `
      padding: 0;
    `;

    function renderHistory(filterType) {
      list.innerHTML = '';
      
      const filteredData = data.filter(d => filterType === 'all' || d.type === filterType);
      
      if (filteredData.length === 0) {
        list.innerHTML = `
          <div style="
            text-align: center;
            padding: 40px 20px;
            color: var(--pickachu-secondary-text, #666);
          ">
            No history items found
          </div>
        `;
        return;
      }

      filteredData.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = `
          padding: 16px 20px;
          border-bottom: 1px solid var(--pickachu-border, #eee);
          cursor: pointer;
          transition: background-color 0.2s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        `;

        const icon = getIcon(getTypeIcon(item.type));
        
        itemDiv.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: var(--pickachu-code-bg, #f8f9fa);
            border: 1px solid var(--pickachu-border, #ddd);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
          ">${icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-weight: 600;
              color: var(--pickachu-text, #333);
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <span style="
                background: var(--pickachu-primary-color, #007bff);
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                text-transform: uppercase;
              ">${item.type}</span>
              <span>${formatTimestamp(item.timestamp)}</span>
            </div>
            <div style="
              font-size: 13px;
              color: var(--pickachu-secondary-text, #666);
              word-break: break-all;
              line-height: 1.4;
            ">
              ${item.content.length > 120 ? item.content.substring(0, 120) + '...' : item.content}
            </div>
          </div>
          <button style="
            background: var(--pickachu-primary-color, #007bff);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            flex-shrink: 0;
          ">Copy</button>
        `;

        itemDiv.addEventListener('click', () => {
          copyText(item.content);
          showSuccess('Copied to clipboard!');
        });

        itemDiv.addEventListener('mouseenter', () => {
          itemDiv.style.backgroundColor = 'var(--pickachu-hover, #f0f0f0)';
        });

        itemDiv.addEventListener('mouseleave', () => {
          itemDiv.style.backgroundColor = '';
        });

        list.appendChild(itemDiv);
      });
    }

    function getTypeIcon(type) {
      const iconMap = {
        'color': '🎨',
        'text': '📄',
        'element': '🔍',
        'link': '🔗',
        'font': '🔤',
        'image': '🖼️',
        'screenshot': '📷',
        'site-info': 'ℹ️'
      };
      return iconMap[type] || '📄';
    }

    function formatTimestamp(timestamp) {
      try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString();
      } catch {
        return 'Unknown';
      }
    }

    // Initialize with all items
    renderHistory('all');

    // Filter change handler
    filter.addEventListener('change', (e) => {
      renderHistory(e.target.value);
    });

    // Event listeners
    document.getElementById('close-history-modal').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Close on Escape key
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    // Assemble modal
    content.appendChild(list);
    modal.appendChild(filterSection);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

  } catch (error) {
    handleError(error, 'showHistory');
    showError('Failed to load history');
  }
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
  
  const body = document.createElement('div');
  body.style.cssText = `
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.5;
    color: var(--pickachu-text, #333);
  `;
  
  // Enhanced content with preview based on type - SECURITY FIX: Use safe textarea creation
  if (type === 'color' && content.includes('#')) {
    const colorMatch = content.match(/#[0-9a-fA-F]{6}/);
    if (colorMatch) {
      const color = escapeHtml(colorMatch[0]);
      body.innerHTML = `
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
          <div style="width: 60px; height: 60px; background-color: ${color}; border-radius: 8px; border: 2px solid var(--pickachu-border, #ddd);"></div>
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 8px;">Color Preview</div>
            <div class="code-preview">${color}</div>
          </div>
        </div>
      `;
      body.appendChild(createSafeTextarea(content));
    } else {
      body.appendChild(createSafeTextarea(content));
    }
  } else if (type === 'image' && content.includes('http')) {
    const urlMatch = content.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const imageUrl = escapeHtml(urlMatch[0]);
      body.innerHTML = `
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Image Preview</div>
          <img src="${imageUrl}" style="max-width: 200px; max-height: 150px; border-radius: 6px; border: 1px solid var(--pickachu-border, #ddd);" onerror="this.style.display='none'">
        </div>
      `;
      body.appendChild(createSafeTextarea(content));
    } else {
      body.appendChild(createSafeTextarea(content));
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
    `;
    body.appendChild(createSafeTextarea(content));
  } else {
    body.appendChild(createSafeTextarea(content));
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
  
  modal.appendChild(body);
  modal.appendChild(buttons);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  return overlay;
}

export function getCssSelector(el) {
  if (!el || !(el instanceof Element)) return '';
  
  // Simple implementation for testing
  if (el.id) {
    return `#${el.id}`;
  }
  
  const path = [];
  let current = el;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    
    // Use ID if available
    if (current.id) {
      const idSelector = `#${current.id}`;
      return idSelector;
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
