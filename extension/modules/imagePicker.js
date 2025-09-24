import { createOverlay, removeOverlay, copyText, showError, showSuccess, showInfo, throttle } from './helpers.js';

// Helper to download image
function downloadImage(imageUrl, filename) {
  const a = document.createElement('a');
  a.href = imageUrl;
  a.download = filename || `image-${Date.now()}.jpg`;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Custom modal for image with download button
function showImageModal(title, content, imageUrl, icon = '🖼️') {
  const modal = document.createElement('div');
  modal.id = 'pickachu-image-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--pickachu-modal-backdrop, rgba(0, 0, 0, 0.5));
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: pickachu-fade-in 0.3s ease-out;
  `;

  const contentDiv = document.createElement('div');
  contentDiv.style.cssText = `
    background: var(--pickachu-bg, #fff);
    border: 1px solid var(--pickachu-border, #ddd);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    color: var(--pickachu-text, #333);
    position: relative;
  `;

  contentDiv.innerHTML = `
    <div class="modal-header" style="
      padding: 16px 20px;
      border-bottom: 1px solid var(--pickachu-border, #eee);
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--pickachu-header-bg, #f8f9fa);
    ">
      <h3 style="
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--pickachu-text, #333);
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        ${icon} ${title}
      </h3>
      <button id="close-image-modal" style="
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--pickachu-secondary-text, #666);
        padding: 4px 8px;
        border-radius: 4px;
      ">×</button>
    </div>
    
    <div style="padding: 20px;">
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 8px; color: var(--pickachu-text, #333);">Preview:</div>
          <img src="${imageUrl}" style="
            max-width: 200px;
            max-height: 150px;
            border-radius: 6px;
            border: 1px solid var(--pickachu-border, #ddd);
            object-fit: cover;
          " onerror="this.style.display='none'">
        </div>
        <div style="flex: 2;">
          <pre style="
            background: var(--pickachu-code-bg, #f8f9fa);
            border: 1px solid var(--pickachu-border, #ddd);
            border-radius: 6px;
            padding: 12px;
            font-size: 12px;
            color: var(--pickachu-code-text, #333);
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 200px;
            overflow-y: auto;
          ">${content}</pre>
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="download-image-btn" style="
          padding: 8px 16px;
          border: 1px solid var(--pickachu-primary-color, #007bff);
          background: var(--pickachu-primary-color, #007bff);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">📥 Download Image</button>
        
        <button id="copy-image-url-btn" style="
          padding: 8px 16px;
          border: 1px solid var(--pickachu-border, #ddd);
          background: var(--pickachu-button-bg, #f0f0f0);
          color: var(--pickachu-text, #333);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">📋 Copy URL</button>
      </div>
    </div>
  `;

  modal.appendChild(contentDiv);
  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('close-image-modal').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('download-image-btn').addEventListener('click', () => {
    downloadImage(imageUrl);
    showSuccess('Image download started!');
  });

  document.getElementById('copy-image-url-btn').addEventListener('click', () => {
    copyText(imageUrl);
    showSuccess('Image URL copied to clipboard!');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on Escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
}

let overlay, deactivateCb;
let currentImage = null;

// Performance optimized move handler
const throttledOnMove = throttle((e) => {
  const img = e.target.closest('img');
  if (!img) {
    overlay.style.display = 'none';
    currentImage = null;
    return;
  }
  
  currentImage = img;
  const r = img.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.top = r.top + window.scrollY + 'px';
  overlay.style.left = r.left + window.scrollX + 'px';
  overlay.style.width = r.width + 'px';
  overlay.style.height = r.height + 'px';
}, 16);

// Enhanced click handler with comprehensive image information
function onClick(e) {
  const img = e.target.closest('img');
  if (!img) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  try {
    // Extract comprehensive image information
    const imageInfo = {
      // Basic image properties
      src: img.src,
      alt: img.alt || '',
      title: img.title || '',
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      
      // Display properties
      displayWidth: img.width,
      displayHeight: img.height,
      aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2),
      
      // File information
      fileName: img.src.split('/').pop().split('?')[0],
      fileExtension: img.src.split('.').pop().split('?')[0].toLowerCase(),
      fileSize: 'Unknown', // Can't determine without fetch
      
      // Image format detection
      format: {
        isWebP: img.src.includes('.webp'),
        isJpeg: img.src.includes('.jpg') || img.src.includes('.jpeg'),
        isPng: img.src.includes('.png'),
        isGif: img.src.includes('.gif'),
        isSvg: img.src.includes('.svg'),
        isAvif: img.src.includes('.avif')
      },
      
      // Quality indicators
      quality: {
        isRetina: img.width < img.naturalWidth,
        isCompressed: img.width < img.naturalWidth,
        isResponsive: img.srcset ? true : false
      },
      
      // Accessibility
      accessibility: {
        alt: img.alt,
        title: img.title,
        role: img.getAttribute('role'),
        ariaLabel: img.getAttribute('aria-label'),
        ariaDescribedBy: img.getAttribute('aria-describedby')
      },
      
      // CSS properties
      styles: {
        objectFit: getComputedStyle(img).objectFit,
        objectPosition: getComputedStyle(img).objectPosition,
        borderRadius: getComputedStyle(img).borderRadius,
        boxShadow: getComputedStyle(img).boxShadow,
        filter: getComputedStyle(img).filter
      },
      
      // Context information
      context: {
        tagName: img.tagName.toLowerCase(),
        className: img.className,
        id: img.id,
        parentElement: img.parentElement?.tagName.toLowerCase(),
        isLazyLoaded: img.loading === 'lazy',
        hasSrcset: !!img.srcset,
        srcset: img.srcset || null
      },
      
      // URLs and sources
      urls: {
        original: img.src,
        base64: img.src.startsWith('data:') ? img.src : null,
        relative: img.src.replace(window.location.origin, ''),
        domain: new URL(img.src).hostname
      }
    };
    
    // Generate different output formats
    const formats = {
      url: imageInfo.src,
      markdown: `![${imageInfo.alt || 'image'}](${imageInfo.src})`,
      html: `<img src="${imageInfo.src}" alt="${imageInfo.alt || ''}" width="${imageInfo.displayWidth}" height="${imageInfo.displayHeight}">`,
      css: `background-image: url('${imageInfo.src}');`,
      json: JSON.stringify(imageInfo, null, 2)
    };
    
    // Copy primary format (URL)
    copyText(imageInfo.src);
    
    showSuccess(`Image URL copied to clipboard!`);
    
    const title = chrome.i18n ? chrome.i18n.getMessage('image') : 'Image Information';
    const content = `URL: ${imageInfo.src}\n\nAlt: ${imageInfo.alt || 'No alt text'}\nDimensions: ${imageInfo.displayWidth}x${imageInfo.displayHeight}\nNatural: ${imageInfo.width}x${imageInfo.height}\nFormat: ${imageInfo.fileExtension.toUpperCase()}\n\nFull Info:\n${formats.json}`;
    
    // Create modal with download button
    showImageModal(title, content, imageInfo.src, '🖼️');
    deactivateCb();
    
  } catch (error) {
    console.error('Image picker error:', error);
    showError('Failed to extract image information. Please try again.');
  }
}

// Keyboard navigation
function onKeyDown(e) {
  if (!overlay || !currentImage) return;
  
  switch (e.key) {
    case 'Enter':
      e.preventDefault();
      onClick({ target: currentImage, preventDefault: () => {}, stopPropagation: () => {} });
      break;
    case 'Escape':
      e.preventDefault();
      deactivateCb();
      break;
  }
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    overlay = createOverlay();
    overlay.style.display = 'none';
    
    // Enhanced overlay styling for image picker
    overlay.style.cssText = `
      position: absolute;
      background-color: var(--pickachu-highlight-bg, rgba(76, 175, 80, 0.2));
      border: 2px solid var(--pickachu-primary-color, #4caf50);
      border-radius: 4px;
      z-index: 2147483646;
      pointer-events: none;
      box-sizing: border-box;
      box-shadow: 0 0 6px var(--pickachu-highlight-shadow, rgba(76, 175, 80, 0.6));
      transition: all 0.15s ease-out;
      animation: pickachu-fade-in 0.2s ease-out;
    `;
    
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', throttledOnMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    
    showInfo('Hover over images to inspect • Click to select • Enter to select • Esc to cancel', 3000);
    
  } catch (error) {
    console.error('Image picker activation error:', error);
    showError('Failed to activate image picker. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  try {
    document.removeEventListener('mousemove', throttledOnMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    
    removeOverlay(overlay);
    overlay = null;
    currentImage = null;
    
    document.body.style.cursor = '';
    
  } catch (error) {
    console.error('Image picker deactivation error:', error);
  }
}
