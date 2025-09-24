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
    
    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
      showError('Screenshot functionality requires html2canvas library. Please install it or use browser screenshot tools.');
      return;
    }
    
    // Capture full page with html2canvas
    const canvas = await html2canvas(document.body, {
      scrollX: -window.scrollY,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      scale: 1
    });
    
    // Convert to data URL and download
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    downloadScreenshot(dataUrl, 'full-page-screenshot');
    showSuccess('Full page screenshot captured and downloaded!');
    
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