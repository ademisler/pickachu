import { createOverlay, removeOverlay, copyText, showModal, showError, showSuccess, showInfo, throttle, getCachedComputedStyle, handleError, safeExecute, sanitizeInput, addEventListenerWithCleanup } from './helpers.js';

let overlay, deactivateCb;
let currentElement = null;
let cleanupFunctions = []; // New: Array to store cleanup functions for event listeners

// Performance optimized move handler with enhanced error handling
const throttledOnMove = throttle((e) => {
  try {
    const target = e.target instanceof Element
      ? e.target
      : (typeof document.elementFromPoint === 'function'
        ? document.elementFromPoint(e.clientX ?? 0, e.clientY ?? 0)
        : null);

    if (!(target instanceof Element) || target === overlay) return;

    currentElement = target;
    const rect = target.getBoundingClientRect();
    overlay.style.top = rect.top + window.scrollY + 'px';
    overlay.style.left = rect.left + window.scrollX + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  } catch (error) {
    console.debug('Font picker move handler error:', error);
  }
}, 16);

// Enhanced click handler with comprehensive font information and error handling
function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!(currentElement instanceof Element)) return;

  try {
    const el = currentElement;
    const cs = safeExecute(() => getCachedComputedStyle(el), 'getCachedComputedStyle');
    
    if (!cs) {
      throw new Error('Failed to get computed styles');
    }
    
    // Extract comprehensive font information with enhanced validation
    const familyList = cs.fontFamily.split(',').map(f => f.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    const primaryFamily = familyList[0] || 'Unknown';

    const cssSnippet = `font-family: ${sanitizeInput(primaryFamily)};
font-size: ${cs.fontSize};`;

    copyText(cssSnippet);
    showSuccess('Font info copied to clipboard!');

    const title = sanitizeInput(primaryFamily);
    const bodyContent = `Font: ${primaryFamily}\nSize: ${cs.fontSize}`;

    showModal(title, bodyContent, 'font', 'font-simple');
    deactivateCb();
    
  } catch (error) {
    handleError(error, 'fontPicker');
    showError('Failed to extract font information. Please try again.');
  }
}

// Keyboard navigation with enhanced error handling
function onKeyDown(e) {
  try {
    if (!overlay || !currentElement) return;
    
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        onClick({ target: currentElement, preventDefault: () => {}, stopPropagation: () => {} });
        break;
      case 'Escape':
        e.preventDefault();
        deactivateCb();
        break;
    }
  } catch (error) {
    handleError(error, 'onKeyDown');
  }
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    overlay = createOverlay();
    
    // Enhanced overlay styling for font picker
    overlay.style.cssText = `
      position: absolute;
      background-color: var(--pickachu-highlight-bg, rgba(255, 193, 7, 0.2));
      border: 2px solid var(--pickachu-primary-color, #ffc107);
      border-radius: 4px;
      z-index: 2147483646;
      pointer-events: none;
      box-sizing: border-box;
      box-shadow: 0 0 6px var(--pickachu-highlight-shadow, rgba(255, 193, 7, 0.6));
      transition: all 0.15s ease-out;
      animation: pickachu-fade-in 0.2s ease-out;
    `;
    
    document.body.style.cursor = 'crosshair';
    
    // Add event listeners with cleanup tracking
    const cleanupMove = addEventListenerWithCleanup(document, 'mousemove', throttledOnMove, true);
    const cleanupClick = addEventListenerWithCleanup(document, 'click', onClick, true);
    const cleanupKeydown = addEventListenerWithCleanup(document, 'keydown', onKeyDown, true);
    
    cleanupFunctions.push(cleanupMove, cleanupClick, cleanupKeydown);
    
    showInfo('Hover over text elements to inspect fonts • Click to select • Enter to select • Esc to cancel', 3000);
    
  } catch (error) {
    handleError(error, 'fontPicker activation');
    showError('Failed to activate font picker. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  try {
    // Cleanup all event listeners
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        handleError(error, 'event listener cleanup');
      }
    });
    cleanupFunctions.length = 0;
    
    removeOverlay(overlay);
    overlay = null;
    currentElement = null;
    
    document.body.style.cursor = '';
    
  } catch (error) {
    handleError(error, 'fontPicker deactivation');
  }
}
