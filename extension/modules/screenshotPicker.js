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

// Full page screenshot functionality using html2canvas
async function captureFullPageScreenshot() {
  try {
    showInfo('Capturing full page screenshot...', 2000);
    
    // Send message to background script to capture visible tab
    const dataUrl = await chrome.runtime.sendMessage({ 
      type: 'CAPTURE_VISIBLE_TAB',
      options: {
        format: 'png',
        quality: 100
      }
    });
    
    if (dataUrl && dataUrl.success) {
      downloadScreenshot(dataUrl.dataUrl, 'screenshot');
      showSuccess('Screenshot captured and downloaded!');
    } else {
      showError('Failed to capture screenshot. Please try again.');
    }
    
  } catch (error) {
    console.error('Screenshot error:', error);
    showError('Failed to capture screenshot. Please try again.');
  }
}

export function activate(deactivate) {
  try {
    // Simple one-click full page screenshot
    captureFullPageScreenshot();
    deactivate();
    
  } catch (error) {
    console.error('Screenshot picker activation error:', error);
    showError('Failed to activate screenshot tool. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  // No cleanup needed for simplified screenshot picker
}