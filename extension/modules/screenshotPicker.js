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

// Capture full page screenshot - EXACT copy of working extension logic
function captureFullPage() {
  try {
    console.log('Starting full page capture...');
    showInfo('Capturing full page screenshot...', 0);

    const { scrollHeight, clientHeight } = document.documentElement;
    const devicePixelRatio = window.devicePixelRatio || 1;

    let capturedHeight = 0;
    let capturedImages = [];

    const captureAndScroll = () => {
      const scrollAmount = clientHeight * devicePixelRatio;

      chrome.runtime.sendMessage({ 
        action: "captureVisibleTab", 
        pixelRatio: devicePixelRatio 
      }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError);
          showError('Failed to capture screenshot: ' + chrome.runtime.lastError.message);
          return;
        }

        if (!dataUrl) {
          console.error('No data URL received');
          showError('Failed to capture screenshot - no data received');
          return;
        }

        capturedHeight += scrollAmount;
        capturedImages.push(dataUrl);
        console.log(`Captured chunk ${capturedImages.length}, height: ${capturedHeight}/${scrollHeight * devicePixelRatio}`);

        if (capturedHeight < scrollHeight * devicePixelRatio) {
          // Scroll to next part
          window.scrollTo(0, capturedHeight);
          setTimeout(captureAndScroll, 2000); // Use same delay as working extension
        } else {
          // All parts captured, stitch images
          console.log('All chunks captured, stitching...');
          stitchImages(capturedImages);
        }
      });
    };

    // Start capturing
    captureAndScroll();

  } catch (error) {
    handleError(error, 'captureFullPage');
    showError('Failed to capture full page screenshot');
  }
}

// Stitch multiple images together - EXACT copy of working extension logic
function stitchImages(images) {
  try {
    console.log('Stitching images...');
    showInfo('Stitching images...', 0);

    if (images.length === 0) {
      throw new Error('No images to stitch');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Use the width of the first image to set the canvas width
    const firstImage = new Image();
    firstImage.onload = () => {
      canvas.width = firstImage.width;
      canvas.height = images.length * firstImage.height;

      // Counter to keep track of loaded images
      let imagesLoaded = 0;

      // Callback function to draw an image onto the canvas
      const drawImageOnCanvas = (image, index) => {
        context.drawImage(image, 0, index * firstImage.height);
        imagesLoaded++;

        // Check if all images are loaded
        if (imagesLoaded === images.length) {
          const fullPageDataUrl = canvas.toDataURL('image/png');
          const filename = getFilename(window.location.href);
          downloadScreenshot(fullPageDataUrl, filename);
          showSuccess('Full page screenshot captured and downloaded!');
        }
      };

      // Load and draw each image onto the canvas
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

    firstImage.src = images[0];

  } catch (error) {
    handleError(error, 'stitchImages');
    showError('Failed to stitch images');
  }
}

// Main activation function
export function activate(deactivate) {
  try {
    console.log('Screenshot tool activated');
    
    if (isCapturing) {
      showError('Screenshot capture already in progress. Please wait...');
      deactivate();
      return;
    }
    
    isCapturing = true;
    
    // Start full page capture
    captureFullPage();
    
    deactivate();
    
  } catch (error) {
    handleError(error, 'screenshotPicker activation');
    showError('Failed to activate screenshot tool. Please try again.');
    deactivate();
  } finally {
    isCapturing = false;
  }
}

export function deactivate() {
  // Reset state
  isCapturing = false;
}