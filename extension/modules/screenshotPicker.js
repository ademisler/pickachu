import { showError, showSuccess, showInfo, handleError, safeExecute, sanitizeInput } from './helpers.js';

// Style manipulation stack for cleanup
let styleStack = [];
let fixedStack = [];

// Helper to download screenshot using Chrome downloads API with enhanced error handling
function downloadScreenshot(dataUrl, filename) {
  try {
    if (!dataUrl || !filename) {
      throw new Error('Missing required parameters for download');
    }
    
    // Convert data URL to blob with enhanced validation
    const dataUrlParts = dataUrl.split(',');
    if (dataUrlParts.length !== 2) {
      throw new Error('Invalid data URL format');
    }
    
    const byteString = safeExecute(() => atob(dataUrlParts[1]), 'atob decode') || '';
    const mimeString = safeExecute(() => dataUrlParts[0].split(':')[1].split(';')[0], 'extract mime type') || 'image/png';
    
    if (!byteString) {
      throw new Error('Failed to decode data URL');
    }
    
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    
    // Use Chrome downloads API if available
    if (chrome.downloads) {
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: `${sanitizeInput(filename)}-${Date.now()}.png`,
        saveAs: false
      }, () => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          handleError(error, 'revokeObjectURL');
        }
      });
    } else {
      // Fallback to anchor download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${sanitizeInput(filename)}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove(); // Modern API: use remove() instead of deprecated removeChild()
    }
  } catch (error) {
    handleError(error, 'downloadScreenshot');
    showError('Failed to download screenshot. Please try again.');
  }
}

// Get accurate page dimensions with enhanced error handling
function getPageDimensions() {
  try {
    const body = document.body;
    const docElt = document.documentElement;
    
    // Get computed styles with enhanced error handling
    const bodyStyle = body ? safeExecute(() => window.getComputedStyle(body), 'getComputedStyle body') || {} : {};
    const docEltStyle = safeExecute(() => window.getComputedStyle(docElt), 'getComputedStyle docElt') || {};
    
    // Calculate widths with enhanced validation
    const widths = [
      safeExecute(() => docElt.clientWidth, 'docElt clientWidth') || 0,
      safeExecute(() => docElt.offsetWidth, 'docElt offsetWidth') || 0,
      safeExecute(() => bodyStyle.overflowX !== 'hidden' ? docElt.scrollWidth : 0, 'docElt scrollWidth') || 0,
      safeExecute(() => body ? body.offsetWidth : 0, 'body offsetWidth') || 0,
      safeExecute(() => body && bodyStyle.overflowX !== 'hidden' ? body.scrollWidth : 0, 'body scrollWidth') || 0
    ];
    
    // Calculate heights with enhanced validation
    const isOverflowHidden = safeExecute(() => bodyStyle.overflowY === 'hidden' && bodyStyle.overflowX === 'hidden', 'check overflow hidden') || false;
    const heights = [
      safeExecute(() => docElt.clientHeight, 'docElt clientHeight') || 0,
      safeExecute(() => docElt.offsetHeight, 'docElt offsetHeight') || 0,
      safeExecute(() => isOverflowHidden ? 0 : docElt.scrollHeight, 'docElt scrollHeight') || 0,
      safeExecute(() => body ? body.offsetHeight : 0, 'body offsetHeight') || 0,
      safeExecute(() => body && !isOverflowHidden ? body.scrollHeight : 0, 'body scrollHeight') || 0
    ];
    
    return {
      width: Math.max(...widths.filter(w => typeof w === 'number')),
      height: Math.max(...heights.filter(h => typeof h === 'number')),
      viewportWidth: safeExecute(() => window.innerWidth, 'window innerWidth') || 0,
      viewportHeight: safeExecute(() => window.innerHeight, 'window innerHeight') || 0,
      bodyMaxHeight: safeExecute(() => body ? Math.max(body.offsetHeight, body.scrollHeight) : 0, 'body max height') || 0,
      docEltMaxHeight: safeExecute(() => Math.max(docElt.clientHeight, docElt.offsetHeight, docElt.scrollHeight), 'docElt max height') || 0
    };
  } catch (error) {
    handleError(error, 'getPageDimensions');
    return {
      width: 0,
      height: 0,
      viewportWidth: 0,
      viewportHeight: 0,
      bodyMaxHeight: 0,
      docEltMaxHeight: 0
    };
  }
}

// Apply styles and track for cleanup with enhanced error handling
function applyStyles(element, styles, stack = styleStack) {
  try {
    if (!element || !element.style) return;
    
    const before = element.style.cssText;
    let cssText = element.style.cssText + '; ';
    
    for (const [property, value] of Object.entries(styles)) {
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      cssText += `${cssProperty}: ${value} !important; `;
    }
    
    element.style.cssText = cssText;
    
    stack.push({
      element,
      before,
      after: cssText
    });
  } catch (error) {
    handleError(error, 'applyStyles');
  }
}

// Clean up applied styles with enhanced error handling
function cleanupStyles(stack = styleStack) {
  try {
    while (stack.length > 0) {
      const item = stack.pop();
      if (item.action === 'remove') {
          // Remove added style elements
          if (item.element && item.element.parentNode) {
            item.element.remove(); // Modern API: use remove() instead of deprecated removeChild()
          }
      } else if (item.element && item.element.style) {
        // Restore original styles
        item.element.style.cssText = item.before;
      }
    }
    // Clear the stack
    stack.length = 0;
  } catch (error) {
    handleError(error, 'cleanupStyles');
  }
}

// Disable animations and transitions with enhanced error handling
function disableAnimations() {
  try {
    const style = document.createElement('style');
    style.textContent = `
      * {
        transition: none !important;
        transition-delay: 0s !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
    styleStack.push({
      element: style,
      before: '',
      after: style.textContent,
      action: 'remove'
    });
  } catch (error) {
    handleError(error, 'disableAnimations');
  }
}

// Handle fixed elements with enhanced error handling
function handleFixedElements() {
  try {
    const fixedElements = safeExecute(() => document.querySelectorAll('*'), 'querySelectorAll all elements') || [];
    const fixed = [];
    
    fixedElements.forEach(el => {
      try {
        const style = safeExecute(() => window.getComputedStyle(el), 'getComputedStyle') || {};
        if (style.position === 'fixed') {
          const rect = safeExecute(() => el.getBoundingClientRect(), 'getBoundingClientRect') || { left: 0, top: 0 };
          
          // Convert fixed to absolute positioning
          applyStyles(el, {
            position: 'absolute',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            transition: 'none'
          }, fixedStack);
          
          fixed.push(el);
        }
      } catch (error) {
        handleError(error, 'handleFixedElements element processing');
      }
    });
    
    return fixed;
  } catch (error) {
    handleError(error, 'handleFixedElements');
    return [];
  }
}

// Hide scrollbars with enhanced error handling
function hideScrollbars() {
  try {
    const style = document.createElement('style');
    style.textContent = `
      html::-webkit-scrollbar,
      body::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
      }
    `;
    document.head.appendChild(style);
    styleStack.push({
      element: style,
      before: '',
      after: style.textContent,
      action: 'remove'
    });
  } catch (error) {
    handleError(error, 'hideScrollbars');
  }
}

// Scroll to position with better stabilization and enhanced error handling
function scrollToPosition(x, y) {
  return new Promise((resolve, reject) => {
    try {
      // Disable smooth scrolling temporarily
      const html = document.documentElement;
      const body = document.body;
      const originalScrollBehavior = html.style.scrollBehavior;
      
      html.style.scrollBehavior = 'auto';
      if (body) body.style.scrollBehavior = 'auto';
      
      window.scrollTo(x, y);
      
      // Wait for scroll to complete
      setTimeout(() => {
        try {
          html.style.scrollBehavior = originalScrollBehavior;
          if (body) body.style.scrollBehavior = originalScrollBehavior;
          resolve();
        } catch (error) {
          handleError(error, 'scrollToPosition cleanup');
          resolve(); // Still resolve to continue
        }
      }, 150);
    } catch (error) {
      handleError(error, 'scrollToPosition');
      reject(error);
    }
  });
}

// Capture visible area with retry logic and enhanced error handling
async function captureVisibleArea(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({
            type: 'CAPTURE_VISIBLE_TAB',
            options: {
              format: 'png',
              quality: 100
            }
          }, (response) => {
            try {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (response && response.success) {
                resolve(response.dataUrl);
              } else {
                reject(new Error('Failed to capture visible area'));
              }
            } catch (error) {
              handleError(error, 'captureVisibleArea response handling');
              reject(error);
            }
          });
        } catch (error) {
          handleError(error, 'captureVisibleArea message sending');
          reject(error);
        }
      });
    } catch (error) {
      handleError(error, `captureVisibleArea attempt ${i + 1}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Convert data URL to image with enhanced error handling
function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    try {
      if (!dataUrl) {
        reject(new Error('No data URL provided'));
        return;
      }
      
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        handleError(error, 'dataUrlToImage image load');
        reject(error);
      };
      img.src = dataUrl;
    } catch (error) {
      handleError(error, 'dataUrlToImage');
      reject(error);
    }
  });
}

// Stitch images together with overlap handling and enhanced error handling
function stitchImages(images, canvasWidth, canvasHeight) {
  try {
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('No images provided for stitching');
    }
    
    if (!canvasWidth || !canvasHeight) {
      throw new Error('Invalid canvas dimensions');
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = safeExecute(() => canvas.getContext('2d'), 'getContext 2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw each image
    images.forEach(({ img, x, y }) => {
      try {
        if (img && typeof x === 'number' && typeof y === 'number') {
          ctx.drawImage(img, x, y);
        }
      } catch (error) {
        handleError(error, 'stitchImages drawImage');
      }
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    handleError(error, 'stitchImages');
    return '';
  }
}

// Enhanced full page screenshot functionality with comprehensive error handling
async function captureFullPageScreenshot() {
  try {
    showInfo('Preparing page for capture...', 0);
    
    // Store original state
    const originalScrollX = safeExecute(() => window.scrollX, 'get scrollX') || 0;
    const originalScrollY = safeExecute(() => window.scrollY, 'get scrollY') || 0;
    
    // Prepare page for capture
    disableAnimations();
    hideScrollbars();
    const fixedElements = handleFixedElements();
    
    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const dimensions = getPageDimensions();
    const viewportWidth = dimensions.viewportWidth;
    const viewportHeight = dimensions.viewportHeight;
    const pageWidth = dimensions.width;
    const pageHeight = dimensions.height;
    
      // Debug info removed for production
      // Page dimensions calculated: width=${pageWidth}, height=${pageHeight}
    
    showInfo('Capturing full page screenshot...', 0);
    
    // If page fits in viewport, just capture once
    if (pageWidth <= viewportWidth && pageHeight <= viewportHeight) {
      const dataUrl = await captureVisibleArea();
      downloadScreenshot(dataUrl, 'screenshot');
      showSuccess('Screenshot captured and downloaded!');
      return;
    }
    
    // Calculate number of tiles needed with overlap
    const overlap = 20; // pixels of overlap
    const tilesX = Math.ceil(pageWidth / (viewportWidth - overlap));
    const tilesY = Math.ceil(pageHeight / (viewportHeight - overlap));
    
      // Debug info removed for production
      // Capturing ${tilesX}x${tilesY} tiles for full page screenshot
    
    const images = [];
    
    try {
      // Capture each tile
      for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
          const scrollX = Math.min(x * (viewportWidth - overlap), pageWidth - viewportWidth);
          const scrollY = Math.min(y * (viewportHeight - overlap), pageHeight - viewportHeight);
          
          // Scroll to position
          await scrollToPosition(scrollX, scrollY);
          
          // Wait for any lazy loading
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Capture visible area
          const dataUrl = await captureVisibleArea();
          const img = await dataUrlToImage(dataUrl);
          
          images.push({
            img,
            x: scrollX,
            y: scrollY
          });
          
          // Update progress
          const progress = Math.round(((y * tilesX + x + 1) / (tilesX * tilesY)) * 100);
          showInfo(`Capturing screenshot... ${progress}%`, 0);
        }
      }
      
      // Stitch images together
      showInfo('Stitching images together...', 0);
      const finalDataUrl = stitchImages(images, pageWidth, pageHeight);
      
      if (!finalDataUrl) {
        throw new Error('Failed to stitch images');
      }
      
      // Download final image
      downloadScreenshot(finalDataUrl, 'fullpage-screenshot');
      showSuccess('Full page screenshot captured and downloaded!');
      
    } finally {
      // Cleanup: restore original state
      cleanupStyles(styleStack);
      cleanupStyles(fixedStack);
      
      // Restore original scroll position
      try {
        window.scrollTo(originalScrollX, originalScrollY);
      } catch (error) {
        handleError(error, 'restore scroll position');
      }
    }
    
  } catch (error) {
    handleError(error, 'captureFullPageScreenshot');
    showError('Failed to capture screenshot. Please try again.');
    
    // Cleanup on error
    cleanupStyles(styleStack);
    cleanupStyles(fixedStack);
  }
}

export function activate(deactivate) {
  try {
    // Start full page screenshot capture
    captureFullPageScreenshot();
    deactivate();
    
  } catch (error) {
    handleError(error, 'screenshotPicker activation');
    showError('Failed to activate screenshot tool. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  try {
    // Cleanup any remaining styles
    cleanupStyles(styleStack);
    cleanupStyles(fixedStack);
  } catch (error) {
    handleError(error, 'screenshotPicker deactivation');
  }
}