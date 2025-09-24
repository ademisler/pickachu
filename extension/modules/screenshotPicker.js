import { showError, showSuccess, showInfo, handleError, safeExecute, sanitizeInput } from './helpers.js';

// Screenshot state management
let screenshotState = {
  isCapturing: false,
  currentTab: null,
  retryCount: 0,
  chunks: [],
  totalChunks: 0,
  currentChunk: 0,
  screenshots: [],
  arrangements: []
};

// Configuration
const SCREENSHOT_CONFIG = {
  format: 'png',
  quality: 100,
  timeout: 15000,
  maxRetries: 3,
  captureDelay: 150, // ms between captures
  scrollDelay: 100 // ms for scroll settling
};

// Constants for canvas size limits
const MAX_PRIMARY_DIMENSION = 15000 * 2;
const MAX_SECONDARY_DIMENSION = 4000 * 2;
const MAX_AREA = MAX_PRIMARY_DIMENSION * MAX_SECONDARY_DIMENSION;

// Helper to get filename from URL
function getFilename(contentURL) {
  let name = contentURL.split('?')[0].split('#')[0];
  if (name) {
    name = name
      .replace(/^https?:\/\//, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-_]+/, '')
      .replace(/[-_]+$/, '');
    name = '-' + name;
  } else {
    name = '';
  }
  return 'screencapture' + name + '-' + Date.now() + '.png';
}

// Helper to download screenshot
function downloadScreenshot(dataUrl, filename, format = 'png') {
  try {
    if (!dataUrl || !filename) {
      throw new Error('Missing required parameters for download');
    }
    
    // Convert data URL to blob
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
      throw new Error('Invalid data URL format');
    }
    
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    
    // Use Chrome downloads API
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'jpeg' ? 'jpg' : format;
    const finalFilename = `${sanitizeInput(filename)}-${timestamp}.${extension}`;
    
    chrome.downloads.download({
      url: url,
      filename: finalFilename,
      saveAs: false
    }, (downloadId) => {
      URL.revokeObjectURL(url);
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        fallbackDownload(dataUrl, finalFilename);
      }
    });
  } catch (error) {
    handleError(error, 'downloadScreenshot');
    showError('Failed to download screenshot. Please try again.');
  }
}

// Fallback download method
function fallbackDownload(dataUrl, filename) {
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    handleError(error, 'fallbackDownload');
    showError('Failed to download screenshot using fallback method.');
  }
}

// Get page dimensions and calculate scroll arrangements
function getPageDimensionsAndArrangements() {
  try {
    const body = document.body;
    const originalBodyOverflowYStyle = body ? body.style.overflowY : '';
    const originalX = window.scrollX;
    const originalY = window.scrollY;
    const originalOverflowStyle = document.documentElement.style.overflow;

    // Fix scrolling issues
    if (body) {
      body.style.overflowY = 'visible';
    }

    const widths = [
      document.documentElement.clientWidth,
      body ? body.scrollWidth : 0,
      document.documentElement.scrollWidth,
      body ? body.offsetWidth : 0,
      document.documentElement.offsetWidth
    ];
    
    const heights = [
      document.documentElement.clientHeight,
      body ? body.scrollHeight : 0,
      document.documentElement.scrollHeight,
      body ? body.offsetHeight : 0,
      document.documentElement.offsetHeight
    ];

    const fullWidth = Math.max.apply(Math, widths.filter(x => x));
    const fullHeight = Math.max.apply(Math, heights.filter(x => x));
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Pad for sticky headers
    const scrollPad = 200;
    const yDelta = windowHeight - (windowHeight > scrollPad ? scrollPad : 0);
    const xDelta = windowWidth;

    let yPos = fullHeight - windowHeight;
    const arrangements = [];

    // Fix zoom issues
    let adjustedFullWidth = fullWidth;
    if (fullWidth <= xDelta + 1) {
      adjustedFullWidth = xDelta;
    }

    // Disable scrollbars during capture
    document.documentElement.style.overflow = 'hidden';

    // Calculate scroll positions
    while (yPos > -yDelta) {
      let xPos = 0;
      while (xPos < adjustedFullWidth) {
        arrangements.push([xPos, yPos]);
        xPos += xDelta;
      }
      yPos -= yDelta;
    }

    return {
      dimensions: {
        fullWidth: adjustedFullWidth,
        fullHeight: fullHeight,
        windowWidth: windowWidth,
        windowHeight: windowHeight
      },
      arrangements: arrangements,
      cleanup: () => {
        document.documentElement.style.overflow = originalOverflowStyle;
        if (body) {
          body.style.overflowY = originalBodyOverflowYStyle;
        }
        window.scrollTo(originalX, originalY);
      }
    };
  } catch (error) {
    handleError(error, 'getPageDimensionsAndArrangements');
    throw error;
  }
}

// Initialize screenshot canvases
function initScreenshots(totalWidth, totalHeight) {
  const badSize = (totalHeight > MAX_PRIMARY_DIMENSION ||
                   totalWidth > MAX_PRIMARY_DIMENSION ||
                   totalHeight * totalWidth > MAX_AREA);
  
  const biggerWidth = totalWidth > totalHeight;
  const maxWidth = (!badSize ? totalWidth :
                    (biggerWidth ? MAX_PRIMARY_DIMENSION : MAX_SECONDARY_DIMENSION));
  const maxHeight = (!badSize ? totalHeight :
                     (biggerWidth ? MAX_SECONDARY_DIMENSION : MAX_PRIMARY_DIMENSION));
  
  const numCols = Math.ceil(totalWidth / maxWidth);
  const numRows = Math.ceil(totalHeight / maxHeight);
  
  const result = [];
  let canvasIndex = 0;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const canvas = document.createElement('canvas');
      canvas.width = (col === numCols - 1 ? totalWidth % maxWidth || maxWidth : maxWidth);
      canvas.height = (row === numRows - 1 ? totalHeight % maxHeight || maxHeight : maxHeight);

      const left = col * maxWidth;
      const top = row * maxHeight;

      result.push({
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        index: canvasIndex,
        left: left,
        right: left + canvas.width,
        top: top,
        bottom: top + canvas.height
      });

      canvasIndex++;
    }
  }

  return result;
}

// Filter screenshots that match image location
function filterScreenshots(imgLeft, imgTop, imgWidth, imgHeight, screenshots) {
  const imgRight = imgLeft + imgWidth;
  const imgBottom = imgTop + imgHeight;
  
  return screenshots.filter(screenshot => {
    return (imgLeft < screenshot.right &&
            imgRight > screenshot.left &&
            imgTop < screenshot.bottom &&
            imgBottom > screenshot.top);
  });
}

// Capture visible area screenshot
async function captureVisibleArea() {
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Screenshot capture timeout'));
      }, SCREENSHOT_CONFIG.timeout);
      
      chrome.runtime.sendMessage({
        type: 'CAPTURE_VISIBLE_TAB',
        format: SCREENSHOT_CONFIG.format,
        quality: SCREENSHOT_CONFIG.quality
      }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success && response.dataUrl) {
          resolve(response.dataUrl);
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          reject(new Error('Failed to capture screenshot - no response'));
        }
      });
    });
  } catch (error) {
    handleError(error, 'captureVisibleArea');
    throw error;
  }
}

// Process screenshot data and draw on canvases
async function processScreenshot(data, screenshots) {
  try {
    const dataUrl = await captureVisibleArea();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          data.image = { width: img.width, height: img.height };

          // Adjust for device pixel ratio or zooming
          if (data.windowWidth !== img.width) {
            const scale = img.width / data.windowWidth;
            data.x *= scale;
            data.y *= scale;
            data.totalWidth *= scale;
            data.totalHeight *= scale;
          }

          // Initialize screenshots if needed
          if (!screenshots.length) {
            screenshots.push(...initScreenshots(data.totalWidth, data.totalHeight));
          }

          // Draw on matching canvases
          const matchingScreenshots = filterScreenshots(
            data.x, data.y, img.width, img.height, screenshots
          );

          matchingScreenshots.forEach(screenshot => {
            screenshot.ctx.drawImage(
              img,
              data.x - screenshot.left,
              data.y - screenshot.top
            );
          });

          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load captured image'));
      };
      
      img.src = dataUrl;
    });
  } catch (error) {
    handleError(error, 'processScreenshot');
    throw error;
  }
}

// Capture full page screenshot
async function captureFullPage() {
  try {
    console.log('Starting full page capture...');
    showInfo('Starting full page capture...', 0);

    const pageData = getPageDimensionsAndArrangements();
    const { dimensions, arrangements, cleanup } = pageData;
    
    console.log('Page dimensions:', dimensions);
    console.log('Arrangements:', arrangements.length);

    screenshotState.screenshots = [];
    screenshotState.totalChunks = arrangements.length;
    screenshotState.currentChunk = 0;

    // Process each arrangement
    for (let i = 0; i < arrangements.length; i++) {
      screenshotState.currentChunk = i;
      const [x, y] = arrangements[i];

      // Scroll to position
      window.scrollTo(x, y);

      // Wait for scroll to settle
      await new Promise(resolve => setTimeout(resolve, SCREENSHOT_CONFIG.scrollDelay));

      // Prepare capture data
      const captureData = {
        x: window.scrollX,
        y: window.scrollY,
        complete: (i + 1) / arrangements.length,
        windowWidth: dimensions.windowWidth,
        totalWidth: dimensions.fullWidth,
        totalHeight: dimensions.fullHeight,
        devicePixelRatio: window.devicePixelRatio
      };

      // Wait for capture delay
      await new Promise(resolve => setTimeout(resolve, SCREENSHOT_CONFIG.captureDelay));

      // Process screenshot
      await processScreenshot(captureData, screenshotState.screenshots);

      // Update progress
      const progress = Math.round(((i + 1) / arrangements.length) * 100);
      showInfo(`Capturing full page... ${progress}%`, 0);
    }

    // Clean up
    cleanup();

    // Convert canvases to data URLs
    const dataUrls = screenshotState.screenshots.map(screenshot => 
      screenshot.canvas.toDataURL(`image/${SCREENSHOT_CONFIG.format}`, SCREENSHOT_CONFIG.quality / 100)
    );

    return dataUrls.length === 1 ? dataUrls[0] : dataUrls;
    
  } catch (error) {
    handleError(error, 'captureFullPage');
    throw error;
  }
}

// Main screenshot capture function
async function captureScreenshot(options = {}) {
  if (screenshotState.isCapturing) {
    showError('Screenshot capture already in progress. Please wait...');
    return;
  }
  
  screenshotState.isCapturing = true;
  
  try {
    const { 
      type = 'fullpage',
      format = SCREENSHOT_CONFIG.format,
      quality = SCREENSHOT_CONFIG.quality
    } = options;
    
    showInfo(`Capturing ${type === 'fullpage' ? 'full page' : 'visible area'} screenshot...`, 0);
    
    let dataUrl;
    
    if (type === 'fullpage') {
      dataUrl = await captureFullPage();
    } else {
      dataUrl = await captureVisibleArea();
    }
    
    if (!dataUrl) {
      throw new Error('No screenshot data received');
    }
    
    // Get current tab for filename
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const filename = currentTab ? getFilename(currentTab.url) : 'screenshot';
    
    // Handle multiple screenshots (if page was too large)
    if (Array.isArray(dataUrl)) {
      showInfo(`Page was too large, created ${dataUrl.length} screenshots`, 0);
      for (let i = 0; i < dataUrl.length; i++) {
        const suffix = dataUrl.length > 1 ? `-part${i + 1}` : '';
        const finalFilename = filename.replace('.png', `${suffix}.png`);
        downloadScreenshot(dataUrl[i], finalFilename.replace('.png', ''), format);
      }
      showSuccess(`Full page screenshot captured as ${dataUrl.length} parts!`);
    } else {
      // Single screenshot
      downloadScreenshot(dataUrl, filename.replace('.png', ''), format);
      showSuccess(`${type === 'fullpage' ? 'Full page' : 'Visible area'} screenshot captured and downloaded!`);
    }
    
    screenshotState.retryCount = 0;
    
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    
    // Retry logic
    if (screenshotState.retryCount < SCREENSHOT_CONFIG.maxRetries) {
      screenshotState.retryCount++;
      showInfo(`Retrying screenshot capture... (${screenshotState.retryCount}/${SCREENSHOT_CONFIG.maxRetries})`, 2000);
      
      setTimeout(() => {
        captureScreenshot(options);
      }, 1000);
      return;
    }
    
    handleError(error, 'captureScreenshot');
    showError(`Failed to capture screenshot: ${error.message}`);
    screenshotState.retryCount = 0;
    
  } finally {
    screenshotState.isCapturing = false;
    // Clean up state
    screenshotState.screenshots = [];
    screenshotState.totalChunks = 0;
    screenshotState.currentChunk = 0;
    screenshotState.arrangements = [];
  }
}

// Main activation function
export function activate(deactivate) {
  try {
    console.log('Screenshot tool activated');
    
    // Directly start full page capture
    captureScreenshot({
      type: 'fullpage',
      format: 'png',
      quality: 100
    });
    
    deactivate();
    
  } catch (error) {
    handleError(error, 'screenshotPicker activation');
    showError('Failed to activate screenshot tool. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  // Reset state
  screenshotState.isCapturing = false;
  screenshotState.retryCount = 0;
  screenshotState.screenshots = [];
  screenshotState.totalChunks = 0;
  screenshotState.currentChunk = 0;
  screenshotState.arrangements = [];
}