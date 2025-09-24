import { createOverlay, removeOverlay, copyText, showModal, showError, showSuccess, showInfo, throttle, getCachedComputedStyle, handleError, safeExecute, sanitizeInput, addEventListenerWithCleanup } from './helpers.js';

let overlay, deactivateCb;
let currentElement = null;
let cleanupFunctions = []; // New: Array to store cleanup functions for event listeners

// Performance optimized move handler with enhanced error handling
const throttledOnMove = throttle((e) => {
  try {
    const el = e.target;
    if (!el || el === overlay) return;
    
    currentElement = el;
    const rect = el.getBoundingClientRect();
    overlay.style.top = rect.top + window.scrollY + 'px';
    overlay.style.left = rect.left + window.scrollX + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  } catch (error) {
    handleError(error, 'throttledOnMove');
  }
}, 16);

// Enhanced click handler with comprehensive font information and error handling
function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!currentElement) return;
  
  try {
    const el = currentElement;
    const cs = safeExecute(() => getCachedComputedStyle(el), 'getCachedComputedStyle');
    
    if (!cs) {
      throw new Error('Failed to get computed styles');
    }
    
    // Extract comprehensive font information with enhanced validation
    const fontInfo = {
      // Basic font properties
      fontFamily: sanitizeInput(cs.fontFamily),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      fontVariant: cs.fontVariant,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      wordSpacing: cs.wordSpacing,
      textTransform: cs.textTransform,
      textDecoration: cs.textDecoration,
      
      // Color and background
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      
      // Text properties
      textAlign: cs.textAlign,
      textIndent: cs.textIndent,
      textShadow: cs.textShadow,
      textOverflow: cs.textOverflow,
      whiteSpace: cs.whiteSpace,
      
      // Font loading status
      fontDisplay: cs.fontDisplay,
      
      // Computed values with enhanced error handling
      computed: {
        fontSize: safeExecute(() => parseFloat(cs.fontSize), 'parseFloat fontSize') || 0,
        lineHeight: safeExecute(() => parseFloat(cs.lineHeight), 'parseFloat lineHeight') || 0,
        fontWeight: cs.fontWeight,
        fontFamily: safeExecute(() => cs.fontFamily.split(',').map(f => f.trim().replace(/['"]/g, '')), 'fontFamily split') || [],
        isWebFont: safeExecute(() => cs.fontFamily.includes('Google') || cs.fontFamily.includes('Font'), 'isWebFont check') || false,
        isSystemFont: safeExecute(() => cs.fontFamily.includes('system') || cs.fontFamily.includes('Arial'), 'isSystemFont check') || false
      },
      
      // Element context with sanitization
      element: {
        tagName: el.tagName.toLowerCase(),
        textContent: sanitizeInput(el.textContent.trim().substring(0, 100)),
        className: sanitizeInput(el.className),
        id: sanitizeInput(el.id)
      }
    };
    
    // Generate CSS code with enhanced formatting
    const cssCode = `/* Font styles for ${el.tagName.toLowerCase()} */
font-family: ${fontInfo.fontFamily};
font-size: ${fontInfo.fontSize};
font-weight: ${fontInfo.fontWeight};
font-style: ${fontInfo.fontStyle};
line-height: ${fontInfo.lineHeight};
letter-spacing: ${fontInfo.letterSpacing};
color: ${fontInfo.color};
text-align: ${fontInfo.textAlign};
text-transform: ${fontInfo.textTransform};
text-decoration: ${fontInfo.textDecoration};`;
    
    // Copy CSS code
    copyText(cssCode);
    
    showSuccess(`Font information copied to clipboard!`);
    
    const title = chrome.i18n ? chrome.i18n.getMessage('fontInfo') : 'Font Information';
    const content = JSON.stringify(fontInfo, null, 2);
    showModal(title, content, '🔤', 'font');
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
