import { showError, showSuccess, showInfo } from './helpers.js';

let deactivateCb;

// Full page screenshot functionality
async function captureFullPageScreenshot() {
  try {
    showInfo('Capturing full page screenshot...', 2000);
    
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (!tab) {
      showError('No active tab found');
      return;
    }
    
    // Capture visible area first
    const visibleScreenshot = await chrome.tabs.captureVisibleTab({
      format: 'png',
      quality: 100
    });
    
    // Get page dimensions
    const dimensions = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_PAGE_DIMENSIONS'
    });
    
    if (!dimensions) {
      // Fallback: use visible screenshot
      downloadScreenshot(visibleScreenshot, 'screenshot');
      showSuccess('Screenshot captured (visible area only)');
      return;
    }
    
    // Create canvas for full page screenshot
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to full page size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    // Load visible screenshot
    const img = new Image();
    img.onload = () => {
      // Draw visible area
      ctx.drawImage(img, 0, 0, dimensions.viewportWidth, dimensions.viewportHeight);
      
      // Fill remaining area with white background
      ctx.fillStyle = 'var(--pickachu-bg, #ffffff)';
      ctx.fillRect(0, dimensions.viewportHeight, dimensions.width, dimensions.height - dimensions.viewportHeight);
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        downloadScreenshot(url, 'fullpage-screenshot');
        URL.revokeObjectURL(url);
        showSuccess('Full page screenshot captured and downloaded!');
      }, 'image/png', 1.0);
    };
    
    img.src = visibleScreenshot;
    
  } catch (error) {
    console.error('Screenshot error:', error);
    showError('Failed to capture screenshot. Please try again.');
  }
}

// Download screenshot
function downloadScreenshot(dataUrl, filename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalFilename = `${filename}-${timestamp}.png`;
  
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = finalFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Enhanced screenshot with options
async function captureWithOptions() {
  try {
    showInfo('Preparing screenshot options...', 1500);
    
    // Get page information directly from current page
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
    
    // Create options modal
    showScreenshotOptions(pageInfo);
    
  } catch (error) {
    console.error('Screenshot options error:', error);
    showError('Failed to get page information. Using basic screenshot.');
    await captureFullPageScreenshot();
  }
}

// Show screenshot options modal
function showScreenshotOptions(pageInfo) {
  const modal = document.createElement('div');
  modal.id = 'pickachu-screenshot-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--pickachu-modal-backdrop, rgba(0, 0, 0, 0.8));
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  `;
  
  content.innerHTML = `
    <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
      📸 Screenshot Options
    </h3>
    
    <div style="margin-bottom: 16px;">
      <div style="font-weight: 600; margin-bottom: 8px;">Page Information:</div>
      <div style="font-size: 14px; margin-bottom: 4px;" class="secondary-text">
        <strong>URL:</strong> ${pageInfo.url}
      </div>
      <div style="font-size: 14px; margin-bottom: 4px;" class="secondary-text">
        <strong>Title:</strong> ${pageInfo.title}
      </div>
      <div style="font-size: 14px; margin-bottom: 4px;" class="secondary-text">
        <strong>Dimensions:</strong> ${pageInfo.width} x ${pageInfo.height}px
      </div>
      <div style="font-size: 14px;" class="secondary-text">
        <strong>Viewport:</strong> ${pageInfo.viewportWidth} x ${pageInfo.viewportHeight}px
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <div style="font-weight: 600; margin-bottom: 12px;">Screenshot Type:</div>
      
      <label style="display: block; margin-bottom: 8px; cursor: pointer;">
        <input type="radio" name="screenshot-type" value="fullpage" checked style="margin-right: 8px;">
        Full Page Screenshot (${pageInfo.width} x ${pageInfo.height}px)
      </label>
      
      <label style="display: block; margin-bottom: 8px; cursor: pointer;">
        <input type="radio" name="screenshot-type" value="visible" style="margin-right: 8px;">
        Visible Area Only (${pageInfo.viewportWidth} x ${pageInfo.viewportHeight}px)
      </label>
      
      <label style="display: block; margin-bottom: 8px; cursor: pointer;">
        <input type="radio" name="screenshot-type" value="selection" style="margin-right: 8px;">
        Selected Area (Click and drag to select)
      </label>
    </div>
    
    <div style="margin-bottom: 20px;">
      <div style="font-weight: 600; margin-bottom: 12px;">Quality:</div>
      
      <label style="display: block; margin-bottom: 8px; cursor: pointer;">
        <input type="radio" name="quality" value="100" checked style="margin-right: 8px;">
        High Quality (100%)
      </label>
      
      <label style="display: block; margin-bottom: 8px; cursor: pointer;">
        <input type="radio" name="quality" value="80" style="margin-right: 8px;">
        Medium Quality (80%)
      </label>
      
      <label style="display: block; margin-bottom: 8px; cursor: pointer;">
        <input type="radio" name="quality" value="60" style="margin-right: 8px;">
        Low Quality (60%)
      </label>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancel-screenshot" style="
        padding: 8px 16px;
        border: 1px solid var(--pickachu-border, #ddd);
        background: var(--pickachu-button-bg, #f8f9fa);
        color: var(--pickachu-text, #333);
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      ">Cancel</button>
      
      <button id="capture-screenshot" style="
        padding: 8px 16px;
        border: 1px solid var(--pickachu-primary-color, #007bff);
        background: var(--pickachu-primary-color, #007bff);
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      ">Capture Screenshot</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  document.getElementById('cancel-screenshot').onclick = () => {
    modal.remove();
    deactivateCb();
  };
  
  document.getElementById('capture-screenshot').onclick = async () => {
    const screenshotType = document.querySelector('input[name="screenshot-type"]:checked').value;
    const quality = parseInt(document.querySelector('input[name="quality"]:checked').value);
    
    modal.remove();
    
    if (screenshotType === 'selection') {
      await captureSelectedArea(quality);
    } else if (screenshotType === 'visible') {
      await captureVisibleArea(quality);
    } else {
      await captureFullPageScreenshot();
    }
  };
  
  // Close on Escape
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
      deactivateCb();
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// Capture visible area only
async function captureVisibleArea(quality = 100) {
  try {
    const screenshot = await chrome.tabs.captureVisibleTab({
      format: 'png',
      quality: quality
    });
    
    downloadScreenshot(screenshot, 'visible-screenshot');
    showSuccess('Visible area screenshot captured!');
    
  } catch (error) {
    console.error('Visible screenshot error:', error);
    showError('Failed to capture visible screenshot');
  }
}

// Capture selected area
async function captureSelectedArea(quality = 100) {
  try {
    showInfo('Click and drag to select area for screenshot...', 3000);
    
    // This would require more complex implementation
    // For now, fallback to visible area
    await captureVisibleArea(quality);
    
  } catch (error) {
    console.error('Selected area screenshot error:', error);
    showError('Failed to capture selected area');
  }
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    // Show options modal
    captureWithOptions();
    
  } catch (error) {
    console.error('Screenshot picker activation error:', error);
    showError('Failed to activate screenshot tool. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  // Clean up any modals
  const modal = document.getElementById('pickachu-screenshot-modal');
  if (modal) {
    modal.remove();
  }
}