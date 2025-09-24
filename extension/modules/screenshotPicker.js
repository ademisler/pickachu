import { showError, showSuccess, showInfo } from './helpers.js';

// Helper to download screenshot
function downloadScreenshot(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${filename}-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Get page dimensions
function getPageDimensions() {
  return {
    width: Math.max(
      document.body.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.clientWidth,
      document.documentElement.scrollWidth,
      document.documentElement.offsetWidth
    ),
    height: Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    ),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  };
}

// Scroll to position and wait for stabilization
function scrollToPosition(x, y) {
  return new Promise((resolve) => {
    window.scrollTo(x, y);
    setTimeout(resolve, 100);
  });
}

// Capture visible area
async function captureVisibleArea() {
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

// Stitch images together
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

// Full page screenshot functionality
async function captureFullPageScreenshot() {
  try {
    showInfo('Capturing full page screenshot...', 0);
    
    const dimensions = getPageDimensions();
    const viewportWidth = dimensions.viewportWidth;
    const viewportHeight = dimensions.viewportHeight;
    const pageWidth = dimensions.width;
    const pageHeight = dimensions.height;
    
    console.log('Page dimensions:', dimensions);
    
    // If page fits in viewport, just capture once
    if (pageWidth <= viewportWidth && pageHeight <= viewportHeight) {
      const dataUrl = await captureVisibleArea();
      downloadScreenshot(dataUrl, 'screenshot');
      showSuccess('Screenshot captured and downloaded!');
      return;
    }
    
    // Calculate number of tiles needed
    const tilesX = Math.ceil(pageWidth / viewportWidth);
    const tilesY = Math.ceil(pageHeight / viewportHeight);
    
    console.log(`Capturing ${tilesX}x${tilesY} tiles`);
    
    const images = [];
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    
    try {
      // Capture each tile
      for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
          const scrollX = x * viewportWidth;
          const scrollY = y * viewportHeight;
          
          // Scroll to position
          await scrollToPosition(scrollX, scrollY);
          
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
      // Restore original scroll position
      window.scrollTo(originalScrollX, originalScrollY);
    }
    
  } catch (error) {
    console.error('Screenshot error:', error);
    showError('Failed to capture screenshot. Please try again.');
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