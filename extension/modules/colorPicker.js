import { copyText, showModal, showError, showSuccess, showInfo } from './helpers.js';

// Color format utilities
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function hexToHsl(hex) {
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
}

function getColorFormats(hex) {
  const rgb = hexToRgb(hex);
  const hsl = hexToHsl(hex);
  
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
}

// Color history management
async function saveColorToHistory(color) {
  try {
    const { colorHistory = [] } = await chrome.storage.local.get('colorHistory');
    const newHistory = [color, ...colorHistory.filter(c => c !== color)].slice(0, 20);
    await chrome.storage.local.set({ colorHistory: newHistory });
  } catch (error) {
    console.error('Failed to save color to history:', error);
  }
}


export function activate(deactivate) {
  if (!window.EyeDropper) {
    showError('EyeDropper API not supported in this browser. Please use Chrome 95+ or try a different tool.');
    deactivate();
    return;
  }
  
  showInfo('Click anywhere to pick a color...', 2000);
  
  // Wait for user interaction before opening EyeDropper
  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove the click listener since we only need it once
    document.removeEventListener('click', handleClick);
    
    const ed = new EyeDropper();
    try {
      const res = await ed.open();
      const color = res.sRGBHex;
      const formats = getColorFormats(color);
      
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
      
      showModal(title, content, '🎨', 'color');
      deactivate();
      
    } catch (error) {
      console.error('Color picker error:', error);
      if (error.name === 'AbortError') {
        showInfo('Color picking cancelled');
      } else {
        showError('Failed to process color. Please try again.');
      }
      deactivate();
    }
  };
  
  // Add click listener to wait for user gesture
  document.addEventListener('click', handleClick);
}

export function deactivate() {
  // Cleanup if needed
}
