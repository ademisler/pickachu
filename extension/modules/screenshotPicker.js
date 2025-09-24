import { showError, showSuccess, showInfo, handleError, safeExecute, sanitizeInput } from './helpers.js';

// Screenshot state management
let screenshotState = {
  isCapturing: false,
  currentTab: null,
  retryCount: 0,
  chunks: [],
  totalChunks: 0,
  currentChunk: 0
};

// Configuration
const SCREENSHOT_CONFIG = {
  format: 'png',
  quality: 100,
  timeout: 15000,
  maxRetries: 3,
  chunkHeight: 1000, // Height in pixels for each chunk
  delayBetweenChunks: 200, // ms
  scrollDelay: 100 // ms
};

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
    
    // Use Chrome downloads API if available
    if (chrome.downloads) {
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = format === 'jpeg' ? 'jpg' : format;
      const finalFilename = `${sanitizeInput(filename)}-${timestamp}.${extension}`;
      
      chrome.downloads.download({
        url: url,
        filename: finalFilename,
        saveAs: false
      }, (downloadId) => {
        try {
          URL.revokeObjectURL(url);
          if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
            // Fallback to anchor download
            fallbackDownload(dataUrl, finalFilename);
          }
        } catch (error) {
          handleError(error, 'downloadScreenshot cleanup');
        }
      });
    } else {
      // Fallback to anchor download
      fallbackDownload(dataUrl, filename);
    }
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

// Get page dimensions - simplified approach
function getPageDimensions() {
  try {
    const dimensions = {
      width: Math.max(
        document.documentElement.scrollWidth || 0,
        document.body.scrollWidth || 0,
        window.innerWidth || 0
      ),
      height: Math.max(
        document.documentElement.scrollHeight || 0,
        document.body.scrollHeight || 0,
        window.innerHeight || 0
      ),
      scrollHeight: document.documentElement.scrollHeight || document.body.scrollHeight || 0,
      scrollWidth: document.documentElement.scrollWidth || document.body.scrollWidth || 0
    };
    
    console.log('Page dimensions calculated:', dimensions);
    return dimensions;
  } catch (error) {
    handleError(error, 'getPageDimensions');
    return {
      width: window.innerWidth || 1024,
      height: window.innerHeight || 768,
      scrollHeight: window.innerHeight || 768,
      scrollWidth: window.innerWidth || 1024
    };
  }
}

// Capture visible area screenshot - using direct approach
async function captureVisibleArea() {
  try {
    console.log('Capturing visible area...');
    
    // Try to use chrome.tabs.captureVisibleTab directly if available
    if (chrome.tabs && chrome.tabs.captureVisibleTab) {
      console.log('Using direct chrome.tabs.captureVisibleTab');
      return await chrome.tabs.captureVisibleTab(null, {
        format: SCREENSHOT_CONFIG.format,
        quality: SCREENSHOT_CONFIG.quality
      });
    }
    
    // Fallback: use background script
    console.log('Using background script for capture');
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Screenshot capture timeout - please try again'));
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

// Capture full page screenshot using GoFullPage-like approach
async function captureFullPage() {
  try {
    console.log('Starting full page capture...');
    
    const dimensions = getPageDimensions();
    console.log('Page dimensions:', dimensions);
    
    // Check if page is too large for full capture
    const maxHeight = 100000; // Chrome's limit
    if (dimensions.height > maxHeight) {
      throw new Error(`Page too large (${dimensions.height}px). Maximum supported height is ${maxHeight}px.`);
    }
    
    // Check if page is too small (already fits in viewport)
    if (dimensions.height <= window.innerHeight) {
      console.log('Page fits in viewport, using visible area capture');
      return await captureVisibleArea();
    }
    
    // Calculate number of chunks needed
    const chunkHeight = SCREENSHOT_CONFIG.chunkHeight;
    const totalChunks = Math.ceil(dimensions.height / chunkHeight);
    
    screenshotState.chunks = [];
    screenshotState.totalChunks = totalChunks;
    screenshotState.currentChunk = 0;
    
    showInfo(`Capturing full page (${totalChunks} parts)...`, 0);
    
    // Store original scroll position
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    
    try {
      // Capture each chunk
      for (let i = 0; i < totalChunks; i++) {
        screenshotState.currentChunk = i;
        const scrollTop = i * chunkHeight;
        
        // Scroll to position
        window.scrollTo(0, scrollTop);
        
        // Wait for scroll to complete
        await new Promise(resolve => setTimeout(resolve, SCREENSHOT_CONFIG.scrollDelay));
        
        // Capture this chunk
        const chunkDataUrl = await captureVisibleArea();
        
        if (!chunkDataUrl) {
          throw new Error(`Failed to capture chunk ${i + 1}/${totalChunks}`);
        }
        
        screenshotState.chunks.push({
          dataUrl: chunkDataUrl,
          scrollTop: scrollTop,
          index: i,
          height: Math.min(chunkHeight, dimensions.height - scrollTop)
        });
        
        // Update progress
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        showInfo(`Capturing full page... ${progress}%`, 0);
        
        // Add delay between chunks
        if (i < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, SCREENSHOT_CONFIG.delayBetweenChunks));
        }
      }
      
      // Scroll back to original position
      window.scrollTo(originalScrollX, originalScrollY);
      
      // Stitch chunks together
      showInfo('Stitching image chunks...', 0);
      const fullPageDataUrl = await stitchChunks(screenshotState.chunks, dimensions);
      
      return fullPageDataUrl;
      
    } catch (error) {
      // Always scroll back to original position on error
      window.scrollTo(originalScrollX, originalScrollY);
      throw error;
    }
    
  } catch (error) {
    handleError(error, 'captureFullPage');
    throw error;
  }
}

// Stitch multiple image chunks into one full page image
async function stitchChunks(chunks, dimensions) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    // Fill background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw each chunk
    for (const chunk of chunks) {
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout loading chunk ${chunk.index}`));
        }, 10000);
        
        img.onload = () => {
          clearTimeout(timeout);
          try {
            const y = chunk.scrollTop;
            const chunkHeight = chunk.height;
            
            // Ensure we don't draw outside canvas bounds
            const drawHeight = Math.min(chunkHeight, canvas.height - y);
            if (drawHeight > 0) {
              ctx.drawImage(img, 0, y, canvas.width, drawHeight);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load chunk ${chunk.index}`));
        };
        
        // Set crossOrigin to handle potential CORS issues
        img.crossOrigin = 'anonymous';
        img.src = chunk.dataUrl;
      });
    }
    
    const quality = SCREENSHOT_CONFIG.quality / 100;
    const format = SCREENSHOT_CONFIG.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    
    return canvas.toDataURL(format, quality);
  } catch (error) {
    handleError(error, 'stitchChunks');
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
      type = 'fullpage', // Default to fullpage
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
    
    // Download the screenshot
    const filename = type === 'fullpage' ? 'fullpage-screenshot' : 'screenshot';
    downloadScreenshot(dataUrl, filename, format);
    showSuccess(`${type === 'fullpage' ? 'Full page' : 'Visible area'} screenshot captured and downloaded!`);
    
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
    // Clean up chunks
    screenshotState.chunks = [];
    screenshotState.totalChunks = 0;
    screenshotState.currentChunk = 0;
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
  screenshotState.chunks = [];
  screenshotState.totalChunks = 0;
  screenshotState.currentChunk = 0;
}