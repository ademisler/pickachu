import { copyText, showModal, showError, showSuccess, showInfo, handleError, safeExecute, sanitizeInput, addEventListenerWithCleanup } from './helpers.js';

// Color format utilities with enhanced validation
function hexToRgb(hex) {
  try {
    if (!hex || typeof hex !== 'string') return null;
    
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }

    if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) return null;
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  } catch (error) {
    handleError(error, 'hexToRgb');
    return null;
  }
}

function hexToHsl(hex) {
  try {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  } catch (error) {
    handleError(error, 'hexToHsl');
    return null;
  }
}

function getColorFormats(hex) {
  try {
    const rgb = hexToRgb(hex);
    const hsl = hexToHsl(hex);
    
    if (!rgb || !hsl) {
      throw new Error('Invalid color format');
    }
    
    return {
      hex: hex,
      hexShort: hex.replace('#', ''),
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`,
      css: `#${hex.replace('#', '')}`,
      cssVar: `--color: ${hex};`
    };
  } catch (error) {
    handleError(error, 'getColorFormats');
    throw error;
  }
}

// Color history management with enhanced error handling
async function saveColorToHistory(color) {
  try {
    if (!color || typeof color !== 'string') {
      throw new Error('Invalid color value');
    }
    
    const sanitizedColor = sanitizeInput(color);
    const { colorHistory = [] } = await safeExecute(async () => 
      await chrome.storage.local.get('colorHistory'), 'get color history') || { colorHistory: [] };
    const newHistory = [sanitizedColor, ...colorHistory.filter(c => c !== sanitizedColor)].slice(0, 20);
    await safeExecute(async () => 
      await chrome.storage.local.set({ colorHistory: newHistory }), 'save color history');
  } catch (error) {
    handleError(error, 'saveColorToHistory');
  }
}

let cleanupFunctions = []; // Array to store cleanup functions for event listeners
let previousCursor = '';
let indicatorOverlay = null;

function showCursorOverlay() {
  if (indicatorOverlay) return;

  indicatorOverlay = document.createElement('div');
  indicatorOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    inset: 16px;
    border: 2px dashed rgba(255, 255, 255, 0.6);
    border-radius: 12px;
    z-index: 2147483646;
    mix-blend-mode: difference;
  `;

  document.body.appendChild(indicatorOverlay);
}

function hideCursorOverlay() {
  if (indicatorOverlay) {
    indicatorOverlay.remove();
    indicatorOverlay = null;
  }
}

export function activate(deactivate) {
  try {
    if (!window.EyeDropper) {
      showError('EyeDropper API not supported in this browser. Please use Chrome 95+ or try a different tool.');
      deactivate();
      return;
    }
    
    showInfo('Click anywhere to pick a color...', 2000);

    previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';
    showCursorOverlay();
    
    // Wait for user interaction before opening EyeDropper
    const handleClick = async (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        
        const ed = safeExecute(() => new EyeDropper(), 'create EyeDropper');
        if (!ed) {
          throw new Error('Failed to create EyeDropper instance');
        }
        
        const res = await safeExecute(async () => await ed.open(), 'open EyeDropper');
        if (!res) {
          throw new Error('EyeDropper operation failed');
        }
        
        const color = res.sRGBHex;
        
        // Validate color
        if (!color || typeof color !== 'string') {
          throw new Error('Invalid color received from EyeDropper');
        }
        
        const formats = safeExecute(() => getColorFormats(color), 'getColorFormats');
        if (!formats) {
          throw new Error('Failed to generate color formats');
        }
        
        // Save to history
        await saveColorToHistory(color);
        
        // Copy primary format (hex)
        await copyText(color);
        
        // Show success message
        showSuccess(`Color ${color} copied to clipboard!`);
        
        // Show modal with all formats
        const title = chrome.i18n ? chrome.i18n.getMessage('colorCopied') : 'Color Picked';
        const content = Object.entries(formats)
          .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
          .join('\n');
        
        showModal(title, content, 'color', 'color');
        deactivate();
        
      } catch (error) {
        handleError(error, 'colorPicker handleClick');
        if (error.name === 'AbortError') {
          showInfo('Color picking cancelled');
        } else {
          showError('Failed to process color. Please try again.');
        }
        deactivate();
      }
    };

    // Add click listener with cleanup tracking
    const cleanup = addEventListenerWithCleanup(document, 'click', handleClick, true);
    cleanupFunctions.push(cleanup);

  } catch (error) {
    handleError(error, 'colorPicker activation');
    showError('Failed to activate color picker. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  try {
    document.body.style.cursor = previousCursor;
    previousCursor = '';
    hideCursorOverlay();

    // Cleanup all event listeners
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        handleError(error, 'event listener cleanup');
      }
    });
    cleanupFunctions.length = 0;
    
  } catch (error) {
    handleError(error, 'colorPicker deactivation');
  }
}
