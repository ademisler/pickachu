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

// Capture full page screenshot using proven approach
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

      chrome.runtime.sendMessage({ 
        type: 'CAPTURE_VISIBLE_TAB',
        format: 'png',
        quality: 100
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError);
          throw new Error(chrome.runtime.lastError.message);
        }
        
        if (!response || !response.success || !response.dataUrl) {
          console.error('Invalid response:', response);
          throw new Error('Failed to capture screenshot - invalid response');
        }

        capturedHeight += scrollAmount;
        capturedImages.push(response.dataUrl);
        console.log(`Captured chunk ${capturedImages.length}, height: ${capturedHeight}/${scrollHeight * devicePixelRatio}`);

        if (capturedHeight < scrollHeight * devicePixelRatio) {
          // Scroll to next part
          window.scrollTo(0, capturedHeight);
          setTimeout(captureAndScroll, 1000); // Wait for scroll to settle
        } else {
          // All parts captured, stitch images
          console.log('All chunks captured, stitching...');
          stitchImages(capturedImages);
        }
      });
    };

    // Start capturing
    captureAndScroll();

    // Restore original scroll position after a delay
    setTimeout(() => {
      window.scrollTo(0, originalScrollY);
    }, 5000);

  } catch (error) {
    handleError(error, 'captureFullPage');
    throw error;
  }
}

// Stitch multiple images together
function stitchImages(images) {
  try {
    console.log('Stitching images...');
    showInfo('Stitching images...', 0);

    if (images.length === 0) {
      throw new Error('No images to stitch');
    }

    if (images.length === 1) {
      // Single image, download directly
      const filename = getFilename(window.location.href);
      downloadScreenshot(images[0], filename);
      showSuccess('Full page screenshot captured and downloaded!');
      return;
    }

    // Multiple images, stitch them
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const firstImage = new Image();
    firstImage.src = images[0];

    firstImage.onload = () => {
      canvas.width = firstImage.width;
      canvas.height = images.length * firstImage.height;

      let imagesLoaded = 0;

      const drawImageOnCanvas = (image, index) => {
        context.drawImage(image, 0, index * firstImage.height);
        imagesLoaded++;

        if (imagesLoaded === images.length) {
          const fullPageDataUrl = canvas.toDataURL('image/png');
          const filename = getFilename(window.location.href);
          downloadScreenshot(fullPageDataUrl, filename);
          showSuccess('Full page screenshot captured and downloaded!');
        }
      };

      images.forEach((dataUrl, index) => {
        const image = new Image();
        image.onload = () => drawImageOnCanvas(image, index);
        image.onerror = () => {
          console.error(`Failed to load image ${index}`);
          showError('Failed to load some images for stitching');
        };
        image.src = dataUrl;
      });
    };

    firstImage.onerror = () => {
      console.error('Failed to load first image');
      showError('Failed to load first image for stitching');
    };

  } catch (error) {
    handleError(error, 'stitchImages');
    showError('Failed to stitch images');
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
    await captureFullPage();
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