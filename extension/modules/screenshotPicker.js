import { showError, showSuccess, showInfo, handleError, sanitizeInput } from './helpers.js';

// Simple and effective screenshot capture
let isCapturing = false;

// Helper to get filename from URL
function getFilename(url) {
  if (!url) return 'screenshot';
  
  let name = url.split('?')[0].split('#')[0];
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

// Download screenshot
function downloadScreenshot(dataUrl, filename) {
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    handleError(error, 'downloadScreenshot');
    showError('Failed to download screenshot');
  }
}

// Capture full page screenshot using simple approach
async function captureFullPage() {
  try {
    console.log('Starting full page capture...');
    showInfo('Capturing full page screenshot...', 0);

    const { scrollHeight, clientHeight } = document.documentElement;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    let capturedHeight = 0;
    let capturedImages = [];
    
    const originalScrollY = window.scrollY;
    
    // Scroll to top first
    window.scrollTo(0, 0);
    
    const captureAndScroll = () => {
      const scrollAmount = clientHeight * devicePixelRatio;
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ 
          type: 'CAPTURE_VISIBLE_TAB',
          format: 'png',
          quality: 100
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success && response.dataUrl) {
            capturedHeight += scrollAmount;
            capturedImages.push(response.dataUrl);
            
            if (capturedHeight < scrollHeight * devicePixelRatio) {
              // Scroll to next part
              window.scrollTo(0, capturedHeight);
              setTimeout(() => {
                captureAndScroll().then(resolve).catch(reject);
              }, 500); // Wait for scroll to settle
            } else {
              // All parts captured
              resolve(capturedImages);
            }
          } else {
            reject(new Error('Failed to capture screenshot'));
          }
        });
      });
    };
    
    // Start capturing
    const images = await captureAndScroll();
    
    // Restore original scroll position
    window.scrollTo(0, originalScrollY);
    
    // Stitch images together
    if (images.length === 0) {
      throw new Error('No images captured');
    }
    
    if (images.length === 1) {
      // Single image, download directly
      return images[0];
    }
    
    // Multiple images, stitch them
    showInfo('Stitching images...', 0);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const firstImage = new Image();
    firstImage.src = images[0];
    
    return new Promise((resolve, reject) => {
      firstImage.onload = () => {
        canvas.width = firstImage.width;
        canvas.height = images.length * firstImage.height;
        
        let imagesLoaded = 0;
        
        const drawImageOnCanvas = (image, index) => {
          context.drawImage(image, 0, index * firstImage.height);
          imagesLoaded++;
          
          if (imagesLoaded === images.length) {
            const fullPageDataUrl = canvas.toDataURL('image/png');
            resolve(fullPageDataUrl);
          }
        };
        
        images.forEach((dataUrl, index) => {
          const image = new Image();
          image.onload = () => drawImageOnCanvas(image, index);
          image.onerror = () => reject(new Error(`Failed to load image ${index}`));
          image.src = dataUrl;
        });
      };
      
      firstImage.onerror = () => reject(new Error('Failed to load first image'));
    });
    
  } catch (error) {
    handleError(error, 'captureFullPage');
    throw error;
  }
}

// Main screenshot capture function
async function captureScreenshot() {
  if (isCapturing) {
    showError('Screenshot capture already in progress. Please wait...');
    return;
  }
  
  isCapturing = true;
  
  try {
    showInfo('Starting full page capture...', 0);
    
    const dataUrl = await captureFullPage();
    
    if (!dataUrl) {
      throw new Error('No screenshot data received');
    }
    
    // Get current tab for filename
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const filename = currentTab ? getFilename(currentTab.url) : 'screenshot.png';
    
    // Download the screenshot
    downloadScreenshot(dataUrl, filename);
    showSuccess('Full page screenshot captured and downloaded!');
    
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    handleError(error, 'captureScreenshot');
    showError(`Failed to capture screenshot: ${error.message}`);
  } finally {
    isCapturing = false;
  }
}

// Main activation function
export function activate(deactivate) {
  try {
    console.log('Screenshot tool activated');
    
    // Directly start full page capture
    captureScreenshot();
    
    deactivate();
    
  } catch (error) {
    handleError(error, 'screenshotPicker activation');
    showError('Failed to activate screenshot tool. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  // Reset state
  isCapturing = false;
}