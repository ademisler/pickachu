import { showError, showSuccess, showInfo } from './helpers.js';

// Style manipulation stack for cleanup
let styleStack = [];
let fixedStack = [];

// Helper to download screenshot using Chrome downloads API
function downloadScreenshot(dataUrl, filename) {
  // Convert data URL to blob
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
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
      filename: `${filename}-${Date.now()}.png`,
      saveAs: false
    }, () => {
      URL.revokeObjectURL(url);
    });
  } else {
    // Fallback to anchor download
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filename}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// Get accurate page dimensions
function getPageDimensions() {
  const body = document.body;
  const docElt = document.documentElement;
  
  // Get computed styles
  const bodyStyle = body ? window.getComputedStyle(body) : {};
  const docEltStyle = window.getComputedStyle(docElt);
  
  // Calculate widths
  const widths = [
    docElt.clientWidth,
    docElt.offsetWidth,
    bodyStyle.overflowX !== 'hidden' ? docElt.scrollWidth : 0,
    body ? body.offsetWidth : 0,
    body && bodyStyle.overflowX !== 'hidden' ? body.scrollWidth : 0
  ];
  
  // Calculate heights
  const isOverflowHidden = bodyStyle.overflowY === 'hidden' && bodyStyle.overflowX === 'hidden';
  const heights = [
    docElt.clientHeight,
    docElt.offsetHeight,
    isOverflowHidden ? 0 : docElt.scrollHeight,
    body ? body.offsetHeight : 0,
    body && !isOverflowHidden ? body.scrollHeight : 0
  ];
  
  return {
    width: Math.max(...widths.filter(w => typeof w === 'number')),
    height: Math.max(...heights.filter(h => typeof h === 'number')),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    bodyMaxHeight: body ? Math.max(body.offsetHeight, body.scrollHeight) : 0,
    docEltMaxHeight: Math.max(docElt.clientHeight, docElt.offsetHeight, docElt.scrollHeight)
  };
}

// Apply styles and track for cleanup
function applyStyles(element, styles, stack = styleStack) {
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
}

// Clean up applied styles
function cleanupStyles(stack = styleStack) {
  while (stack.length > 0) {
    const item = stack.pop();
    if (item.action === 'remove') {
      // Remove added style elements
      if (item.element && item.element.parentNode) {
        item.element.parentNode.removeChild(item.element);
      }
    } else if (item.element && item.element.style) {
      // Restore original styles
      item.element.style.cssText = item.before;
    }
  }
  // Clear the stack
  stack.length = 0;
}

// Disable animations and transitions
function disableAnimations() {
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
}

// Handle fixed elements
function handleFixedElements() {
  const fixedElements = document.querySelectorAll('*');
  const fixed = [];
  
  fixedElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed') {
      const rect = el.getBoundingClientRect();
      
      // Convert fixed to absolute positioning
      applyStyles(el, {
        position: 'absolute',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        transition: 'none'
      }, fixedStack);
      
      fixed.push(el);
    }
  });
  
  return fixed;
}

// Hide scrollbars
function hideScrollbars() {
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
}

// Scroll to position with better stabilization
function scrollToPosition(x, y) {
  return new Promise((resolve) => {
    // Disable smooth scrolling temporarily
    const html = document.documentElement;
    const body = document.body;
    const originalScrollBehavior = html.style.scrollBehavior;
    
    html.style.scrollBehavior = 'auto';
    if (body) body.style.scrollBehavior = 'auto';
    
    window.scrollTo(x, y);
    
    // Wait for scroll to complete
    setTimeout(() => {
      html.style.scrollBehavior = originalScrollBehavior;
      if (body) body.style.scrollBehavior = originalScrollBehavior;
      resolve();
    }, 150);
  });
}

// Capture visible area with retry logic
async function captureVisibleArea(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'CAPTURE_VISIBLE_TAB',
          options: {
            format: 'png',
            quality: 100
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.dataUrl);
          } else {
            reject(new Error('Failed to capture visible area'));
          }
        });
      });
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Convert data URL to image
function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Stitch images together with overlap handling
function stitchImages(images, canvasWidth, canvasHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  
  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw each image
  images.forEach(({ img, x, y }) => {
    ctx.drawImage(img, x, y);
  });
  
  return canvas.toDataURL('image/png');
}

// Enhanced full page screenshot functionality
async function captureFullPageScreenshot() {
  try {
    showInfo('Preparing page for capture...', 0);
    
    // Store original state
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    
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
    
    console.log('Page dimensions:', dimensions);
    
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
    
    console.log(`Capturing ${tilesX}x${tilesY} tiles`);
    
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
      
      // Download final image
      downloadScreenshot(finalDataUrl, 'fullpage-screenshot');
      showSuccess('Full page screenshot captured and downloaded!');
      
    } finally {
      // Cleanup: restore original state
      cleanupStyles(styleStack);
      cleanupStyles(fixedStack);
      
      // Restore original scroll position
      window.scrollTo(originalScrollX, originalScrollY);
    }
    
  } catch (error) {
    console.error('Screenshot error:', error);
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
    console.error('Screenshot picker activation error:', error);
    showError('Failed to activate screenshot tool. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  // No cleanup needed for screenshot picker
}