import { createOverlay, removeOverlay, createTooltip, removeTooltip, copyText, getCssSelector, showModal, showError, showSuccess, showInfo, debounce, throttle, getCachedComputedStyle } from './helpers.js';

let overlay, tooltip, deactivateCb;
let currentElement = null;
let elementIndex = 0;
let elements = [];

// Performance optimized move handler
const throttledOnMove = throttle((e) => {
  const el = e.target;
  if (!el || el === overlay || el === tooltip) return;
  
  currentElement = el;
  const rect = el.getBoundingClientRect();
  
  // Update overlay position
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  
  // Update tooltip with enhanced info
  const tagName = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className ? `.${el.className.split(/\s+/).join('.')}` : '';
  const textContent = el.textContent.trim().substring(0, 30);
  const textSuffix = el.textContent.trim().length > 30 ? '...' : '';
  
  tooltip.style.top = rect.bottom + window.scrollY + 5 + 'px';
  tooltip.style.left = rect.left + window.scrollX + 'px';
  tooltip.innerHTML = `
    <div style="font-weight: bold;">${tagName}${id}${classes}</div>
    <div style="font-size: 11px; opacity: 0.8;">${textContent}${textSuffix}</div>
    <div style="font-size: 10px; opacity: 0.6;">Click to select • Arrow keys to navigate</div>
  `;
}, 16); // 60fps

// Enhanced click handler
function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!currentElement) return;
  
  try {
    const el = currentElement;
    const computedStyle = getCachedComputedStyle(el);
    
    // Enhanced element information
    const info = {
      // Basic info
      tagName: el.tagName.toLowerCase(),
      id: el.id || null,
      className: el.className || null,
      textContent: el.textContent.trim(),
      
      // Attributes
      attributes: Array.from(el.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {}),
      
      // Position and size
      position: {
        x: el.offsetLeft,
        y: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      },
      
      // Computed styles
      styles: {
        display: computedStyle.display,
        position: computedStyle.position,
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
        margin: computedStyle.margin,
        padding: computedStyle.padding,
        border: computedStyle.border,
        borderRadius: computedStyle.borderRadius,
        boxShadow: computedStyle.boxShadow,
        zIndex: computedStyle.zIndex
      },
      
      // Selectors
      selectors: {
        css: getCssSelector(el),
        xpath: getXPath(el),
        tag: el.tagName.toLowerCase(),
        id: el.id ? `#${el.id}` : null,
        classes: el.className ? `.${el.className.split(/\s+/).join('.')}` : null
      },
      
      // Content
      innerHTML: el.innerHTML,
      outerHTML: el.outerHTML,
      
      // Accessibility
      accessibility: {
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        ariaLabel: el.getAttribute('aria-label'),
        ariaDescribedBy: el.getAttribute('aria-describedby'),
        tabIndex: el.getAttribute('tabindex'),
        alt: el.getAttribute('alt'),
        title: el.getAttribute('title')
      }
    };
    
    const text = JSON.stringify(info, null, 2);
    copyText(text);
    
    showSuccess(`Element ${el.tagName.toLowerCase()} selected and copied!`);
    
    const title = chrome.i18n ? chrome.i18n.getMessage('elementInfo') : 'Element Information';
    showModal(title, text, '🧱', 'element');
    deactivateCb();
    
  } catch (error) {
    console.error('Element picker error:', error);
    showError('Failed to extract element information. Please try again.');
  }
}

// XPath generator
function getXPath(el) {
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

// Keyboard navigation
function onKeyDown(e) {
  if (!overlay || !currentElement) return;
  
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      navigateElement(-1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      navigateElement(1);
      break;
    case 'Enter':
      e.preventDefault();
      onClick({ target: currentElement, preventDefault: () => {}, stopPropagation: () => {} });
      break;
    case 'Escape':
      e.preventDefault();
      deactivateCb();
      break;
  }
}

function navigateElement(direction) {
  const allElements = Array.from(document.querySelectorAll('*'))
    .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
  
  const currentIndex = allElements.indexOf(currentElement);
  const newIndex = Math.max(0, Math.min(allElements.length - 1, currentIndex + direction));
  
  if (allElements[newIndex]) {
    currentElement = allElements[newIndex];
    const rect = currentElement.getBoundingClientRect();
    
    // Update overlay
    overlay.style.top = rect.top + window.scrollY + 'px';
    overlay.style.left = rect.left + window.scrollX + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    
    // Update tooltip
    const tagName = currentElement.tagName.toLowerCase();
    const id = currentElement.id ? `#${currentElement.id}` : '';
    const classes = currentElement.className ? `.${currentElement.className.split(/\s+/).join('.')}` : '';
    
    tooltip.style.top = rect.bottom + window.scrollY + 5 + 'px';
    tooltip.style.left = rect.left + window.scrollX + 'px';
    tooltip.innerHTML = `
      <div style="font-weight: bold;">${tagName}${id}${classes}</div>
      <div style="font-size: 10px; opacity: 0.6;">Arrow keys to navigate • Enter to select • Esc to cancel</div>
    `;
    
    // Scroll element into view
    currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    overlay = createOverlay();
    tooltip = createTooltip();
    
    // Enhanced tooltip styling
    tooltip.style.cssText = `
      position: absolute;
      background: var(--pickachu-button-bg, rgba(0,0,0,0.9));
      color: var(--pickachu-text, #fff);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 2147483647;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      max-width: 300px;
      line-height: 1.4;
    `;
    
    document.body.style.cursor = 'crosshair';
    
    // Add event listeners
    document.addEventListener('mousemove', throttledOnMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    
    showInfo('Hover over elements to inspect • Click to select • Use arrow keys to navigate', 3000);
    
  } catch (error) {
    console.error('Element picker activation error:', error);
    showError('Failed to activate element picker. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  try {
    document.removeEventListener('mousemove', throttledOnMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    
    removeOverlay(overlay); 
    overlay = null;
    removeTooltip(tooltip); 
    tooltip = null;
    
    currentElement = null;
    elements = [];
    
    document.body.style.cursor = '';
    
  } catch (error) {
    console.error('Element picker deactivation error:', error);
  }
}
