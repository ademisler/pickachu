import { showError, showSuccess, showInfo, handleError, safeExecute, sanitizeInput } from './helpers.js';

// Screenshot configuration
const SCREENSHOT_CONFIG = {
  format: 'png',
  quality: 100,
  timeout: 15000, // 15 seconds
  maxRetries: 3,
  chunkSize: 2000, // Height in pixels for full page capture
  delayBetweenChunks: 100 // ms
};

// Screenshot state management
let screenshotState = {
  isCapturing: false,
  currentTab: null,
  retryCount: 0
};

// Helper to create blob from data URL
function dataUrlToBlob(dataUrl) {
  try {
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
    
    return new Blob([ab], { type: mimeString });
  } catch (error) {
    handleError(error, 'dataUrlToBlob');
    throw error;
  }
}

// Helper to download screenshot with multiple format options
function downloadScreenshot(dataUrl, filename, format = 'png') {
  try {
    if (!dataUrl || !filename) {
      throw new Error('Missing required parameters for download');
    }
    
    const blob = dataUrlToBlob(dataUrl);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'jpeg' ? 'jpg' : format;
    const finalFilename = `${sanitizeInput(filename)}-${timestamp}.${extension}`;
    
    // Use Chrome downloads API if available
    if (chrome.downloads) {
      const url = URL.createObjectURL(blob);
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
      fallbackDownload(dataUrl, finalFilename);
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

// Get page dimensions for full-page capture
async function getPageDimensions() {
  try {
    const dimensions = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout getting page dimensions'));
      }, 5000);
      
      chrome.runtime.sendMessage({
        type: 'GET_PAGE_DIMENSIONS'
      }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          console.log('Failed to get page dimensions:', chrome.runtime.lastError);
          resolve({ 
            width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
            height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight)
          });
        } else if (response && response.success && response.dimensions) {
          resolve(response.dimensions);
        } else {
          resolve({ 
            width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
            height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight)
          });
        }
      });
    });
    
    return {
      width: dimensions.width || Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
      height: Math.max(dimensions.height || document.body.scrollHeight, window.innerHeight),
      scrollHeight: document.documentElement.scrollHeight || document.body.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth || document.body.scrollWidth
    };
  } catch (error) {
    handleError(error, 'getPageDimensions');
    return {
      width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
      height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight),
      scrollHeight: document.documentElement.scrollHeight || document.body.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth || document.body.scrollWidth
    };
  }
}

// Capture visible area screenshot
async function captureVisibleArea() {
  try {
    console.log('Capturing visible area...');
    
    // Always use background script since chrome.tabs is not available in content scripts
    console.log('Using background script for capture');
    const dataUrl = await new Promise((resolve, reject) => {
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
    
    return dataUrl;
  } catch (error) {
    handleError(error, 'captureVisibleArea');
    throw error;
  }
}

// Capture full page screenshot by stitching multiple captures
async function captureFullPage() {
  try {
    console.log('Starting full page capture...');
    
    const dimensions = await getPageDimensions();
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
    
    const chunks = [];
    const chunkHeight = SCREENSHOT_CONFIG.chunkSize;
    const totalChunks = Math.ceil(dimensions.height / chunkHeight);
    
    showInfo(`Capturing full page (${totalChunks} parts)...`, 0);
    
    // Capture each chunk
    for (let i = 0; i < totalChunks; i++) {
      const scrollTop = i * chunkHeight;
      
      // Scroll to position
      window.scrollTo(0, scrollTop);
      
      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, SCREENSHOT_CONFIG.delayBetweenChunks));
      
      // Capture this chunk
      const chunkDataUrl = await captureVisibleArea();
      
      if (!chunkDataUrl) {
        throw new Error(`Failed to capture chunk ${i + 1}/${totalChunks}`);
      }
      
      chunks.push({
        dataUrl: chunkDataUrl,
        scrollTop: scrollTop,
        index: i
      });
      
      // Update progress
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      showInfo(`Capturing full page... ${progress}%`, 0);
    }
    
    // Scroll back to top
    window.scrollTo(0, 0);
    
    // Stitch chunks together
    showInfo('Stitching image chunks...', 0);
    const fullPageDataUrl = await stitchChunks(chunks, dimensions);
    
    return fullPageDataUrl;
  } catch (error) {
    // Scroll back to top on error
    window.scrollTo(0, 0);
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
            const chunkHeight = Math.min(SCREENSHOT_CONFIG.chunkSize, dimensions.height - y);
            
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

// Main screenshot capture function with retry logic
async function captureScreenshot(options = {}) {
  if (screenshotState.isCapturing) {
    showError('Screenshot capture already in progress. Please wait...');
    return;
  }
  
  screenshotState.isCapturing = true;
  
  try {
    const { 
      type = 'visible', // 'visible' or 'fullpage'
      format = SCREENSHOT_CONFIG.format,
      quality = SCREENSHOT_CONFIG.quality,
      showPreview = false
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
    
    // Show preview if requested
    if (showPreview) {
      await showScreenshotPreview(dataUrl, type);
    } else {
      // Download immediately
      const filename = type === 'fullpage' ? 'fullpage-screenshot' : 'screenshot';
      downloadScreenshot(dataUrl, filename, format);
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
  }
}

// Show screenshot preview modal
async function showScreenshotPreview(dataUrl, type) {
  try {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    const preview = document.createElement('div');
    preview.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = `
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    `;
    
    const controls = document.createElement('div');
    controls.style.cssText = `
      margin-top: 15px;
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    `;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '📥 Download';
    downloadBtn.style.cssText = `
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    downloadBtn.onclick = () => {
      const filename = type === 'fullpage' ? 'fullpage-screenshot' : 'screenshot';
      downloadScreenshot(dataUrl, filename);
      modal.remove();
      showSuccess('Screenshot downloaded!');
    };
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copy to Clipboard';
    copyBtn.style.cssText = `
      padding: 8px 16px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    copyBtn.onclick = async () => {
      try {
        // Check if clipboard API is available
        if (!navigator.clipboard || !navigator.clipboard.write) {
          throw new Error('Clipboard API not available');
        }
        
        const blob = dataUrlToBlob(dataUrl);
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        showSuccess('Screenshot copied to clipboard!');
      } catch (error) {
        handleError(error, 'copyScreenshot');
        showError('Failed to copy screenshot to clipboard. Try downloading instead.');
      }
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '❌ Close';
    closeBtn.style.cssText = `
      padding: 8px 16px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    closeBtn.onclick = () => modal.remove();
    
    controls.appendChild(downloadBtn);
    controls.appendChild(copyBtn);
    controls.appendChild(closeBtn);
    
    preview.appendChild(img);
    preview.appendChild(controls);
    modal.appendChild(preview);
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.body.appendChild(modal);
    
  } catch (error) {
    handleError(error, 'showScreenshotPreview');
    showError('Failed to show screenshot preview');
  }
}

// Show screenshot options modal
function showScreenshotOptions() {
  try {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    const options = document.createElement('div');
    options.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 30px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    options.innerHTML = `
      <h3 style="margin: 0 0 20px 0; text-align: center; color: #333;">📸 Screenshot Options</h3>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Capture Type:</label>
        <div style="display: flex; gap: 10px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="radio" name="captureType" value="visible" checked style="margin-right: 8px;">
            <span>Visible Area</span>
          </label>
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="radio" name="captureType" value="fullpage" style="margin-right: 8px;">
            <span>Full Page</span>
          </label>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Format:</label>
        <select id="screenshotFormat" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <option value="png">PNG (High Quality)</option>
          <option value="jpeg">JPEG (Smaller File)</option>
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="showPreview" style="margin-right: 8px;">
          <span>Show preview before download</span>
        </label>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="captureBtn" style="
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        ">📸 Capture</button>
        <button id="cancelBtn" style="
          padding: 10px 20px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">❌ Cancel</button>
      </div>
    `;
    
    modal.appendChild(options);
    document.body.appendChild(modal);
    
    // Event listeners
    const captureBtn = document.getElementById('captureBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (captureBtn) {
      captureBtn.onclick = () => {
        const captureTypeRadio = document.querySelector('input[name="captureType"]:checked');
        const formatSelect = document.getElementById('screenshotFormat');
        const previewCheckbox = document.getElementById('showPreview');
        
        const captureType = captureTypeRadio ? captureTypeRadio.value : 'visible';
        const format = formatSelect ? formatSelect.value : 'png';
        const showPreview = previewCheckbox ? previewCheckbox.checked : false;
        
        modal.remove();
        
        captureScreenshot({
          type: captureType,
          format: format,
          showPreview: showPreview
        });
      };
    }
    
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        modal.remove();
      };
    }
    
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
  } catch (error) {
    handleError(error, 'showScreenshotOptions');
    showError('Failed to show screenshot options');
  }
}

// Main activation function
export function activate(deactivate) {
  try {
    console.log('Screenshot tool activated');
    
    // Show options modal
    showScreenshotOptions();
    
    // Don't deactivate immediately, let user interact with options
    setTimeout(() => {
      if (!screenshotState.isCapturing) {
        deactivate();
      }
    }, 100);
    
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
}