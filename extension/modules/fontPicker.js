import { createOverlay, removeOverlay, copyText, showModal, showError, showSuccess, showInfo, throttle, getCachedComputedStyle } from './helpers.js';

let overlay, deactivateCb;
let currentElement = null;

// Performance optimized move handler
const throttledOnMove = throttle((e) => {
  const el = e.target;
  if (!el || el === overlay) return;
  
  currentElement = el;
  const rect = el.getBoundingClientRect();
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
}, 16);

// Enhanced click handler with comprehensive font information
function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!currentElement) return;
  
  try {
    const el = currentElement;
    const cs = getCachedComputedStyle(el);
    
    // Extract comprehensive font information
    const fontInfo = {
      // Basic font properties
      fontFamily: cs.fontFamily,
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
      
      // Computed values
      computed: {
        fontSize: parseFloat(cs.fontSize),
        lineHeight: parseFloat(cs.lineHeight),
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily.split(',').map(f => f.trim().replace(/['"]/g, '')),
        isWebFont: cs.fontFamily.includes('Google') || cs.fontFamily.includes('Font'),
        isSystemFont: cs.fontFamily.includes('system') || cs.fontFamily.includes('Arial')
      },
      
      // Element context
      element: {
        tagName: el.tagName.toLowerCase(),
        textContent: el.textContent.trim().substring(0, 100),
        className: el.className,
        id: el.id
      }
    };
    
    // Generate CSS code
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
    console.error('Font picker error:', error);
    showError('Failed to extract font information. Please try again.');
  }
}

// Keyboard navigation
function onKeyDown(e) {
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
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    overlay = createOverlay();
    
    // Enhanced overlay styling for font picker
    overlay.style.cssText = `
      position: absolute;
      background-color: rgba(255, 193, 7, 0.2);
      border: 2px solid #ffc107;
      border-radius: 4px;
      z-index: 2147483646;
      pointer-events: none;
      box-sizing: border-box;
      box-shadow: 0 0 6px rgba(255, 193, 7, 0.6);
      transition: all 0.15s ease-out;
      animation: pickachu-fade-in 0.2s ease-out;
    `;
    
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', throttledOnMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    
    showInfo('Hover over text elements to inspect fonts • Click to select • Enter to select • Esc to cancel', 3000);
    
  } catch (error) {
    console.error('Font picker activation error:', error);
    showError('Failed to activate font picker. Please try again.');
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
    currentElement = null;
    
    document.body.style.cursor = '';
    
  } catch (error) {
    console.error('Font picker deactivation error:', error);
  }
}
