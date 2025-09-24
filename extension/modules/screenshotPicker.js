import { showError, showSuccess, showInfo, handleError, safeExecute, sanitizeInput } from './helpers.js';

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

// Simple screenshot capture function
async function captureScreenshot() {
  try {
    showInfo('Capturing screenshot...', 0);
    
    // Try direct capture first (if available in content script)
    let dataUrl = null;
    
    try {
      // Check if we can access chrome.tabs directly
      if (chrome.tabs && chrome.tabs.captureVisibleTab) {
        console.log('Using direct chrome.tabs.captureVisibleTab');
        dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: 'png',
          quality: 100
        });
      }
    } catch (directError) {
      console.log('Direct capture failed, trying background script:', directError);
    }
    
    // If direct capture failed, try background script
    if (!dataUrl) {
      console.log('Using background script for capture');
      const response = await new Promise((resolve, reject) => {
        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Screenshot capture timeout - please try again'));
        }, 10000); // 10 second timeout
        
        chrome.runtime.sendMessage({
          type: 'CAPTURE_VISIBLE_TAB'
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
      
      dataUrl = response;
    }
    
    if (!dataUrl) {
      throw new Error('No screenshot data received');
    }
    
    // Download the screenshot
    downloadScreenshot(dataUrl, 'screenshot');
    showSuccess('Screenshot captured and downloaded!');
    
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    handleError(error, 'captureScreenshot');
    showError(`Failed to capture screenshot: ${error.message}`);
  }
}

export function activate(deactivate) {
  try {
    console.log('Screenshot tool activated');
    captureScreenshot();
    deactivate();
  } catch (error) {
    handleError(error, 'screenshotPicker activation');
    showError('Failed to activate screenshot tool. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  // Nothing to clean up in simple version
}