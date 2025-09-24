import { createOverlay, removeOverlay, copyText, showError, showSuccess, showInfo, throttle, handleError, safeExecute, sanitizeInput, addEventListenerWithCleanup, validateUrl } from './helpers.js';

// Helper to download image with enhanced error handling
function downloadImage(imageUrl, filename) {
  try {
    if (!imageUrl || !validateUrl(imageUrl)) {
      throw new Error('Invalid image URL');
    }
    
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename || `image-${Date.now()}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove(); // Modern API: use remove() instead of deprecated removeChild()
  } catch (error) {
    handleError(error, 'downloadImage');
    showError('Failed to download image. Please try manually.');
  }
}

// Custom modal for image with download button and enhanced error handling
function showImageModal(title, content, imageUrl, icon = '🖼️') {
  try {
    if (!title || !content || !imageUrl) {
      throw new Error('Missing required parameters for modal');
    }
    
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
          ${icon} ${sanitizeInput(title)}
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
            <img src="${sanitizeInput(imageUrl)}" style="
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
            ">${sanitizeInput(content)}</pre>
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

    // Event listeners with enhanced error handling
    const closeBtn = document.getElementById('close-image-modal');
    const downloadBtn = document.getElementById('download-image-btn');
    const copyBtn = document.getElementById('copy-image-url-btn');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        try {
          modal.remove();
        } catch (error) {
          handleError(error, 'close modal');
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        try {
          downloadImage(imageUrl);
          showSuccess('Image download started!');
        } catch (error) {
          handleError(error, 'download button click');
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        try {
          copyText(imageUrl);
          showSuccess('Image URL copied to clipboard!');
        } catch (error) {
          handleError(error, 'copy button click');
        }
      });
    }

    modal.addEventListener('click', (e) => {
      try {
        if (e.target === modal) {
          modal.remove();
        }
      } catch (error) {
        handleError(error, 'modal click');
      }
    });

    // Close on Escape key with enhanced error handling
    const handleKeydown = (e) => {
      try {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', handleKeydown);
        }
      } catch (error) {
        handleError(error, 'escape key handler');
      }
    };
    document.addEventListener('keydown', handleKeydown);
    
  } catch (error) {
    handleError(error, 'showImageModal');
    showError('Failed to show image modal. Please try again.');
  }
}

let overlay, deactivateCb;
let currentImage = null;
let cleanupFunctions = []; // New: Array to store cleanup functions for event listeners

// Performance optimized move handler with enhanced error handling
const throttledOnMove = throttle((e) => {
  try {
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
  } catch (error) {
    handleError(error, 'throttledOnMove');
  }
}, 16);

// Enhanced click handler with comprehensive image information and error handling
function onClick(e) {
  const img = e.target.closest('img');
  if (!img) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  try {
    // Extract comprehensive image information with enhanced validation
    const imageInfo = {
      // Basic image properties with sanitization
      src: sanitizeInput(img.src),
      alt: sanitizeInput(img.alt || ''),
      title: sanitizeInput(img.title || ''),
      width: safeExecute(() => img.naturalWidth || img.width, 'get width') || 0,
      height: safeExecute(() => img.naturalHeight || img.height, 'get height') || 0,
      
      // Display properties
      displayWidth: img.width,
      displayHeight: img.height,
      aspectRatio: safeExecute(() => (img.naturalWidth / img.naturalHeight).toFixed(2), 'calculate aspect ratio') || '0',
      
      // File information with enhanced validation
      fileName: safeExecute(() => img.src.split('/').pop().split('?')[0], 'extract filename') || 'unknown',
      fileExtension: safeExecute(() => img.src.split('.').pop().split('?')[0].toLowerCase(), 'extract extension') || 'unknown',
      fileSize: 'Unknown', // Can't determine without fetch
      
      // Image format detection with enhanced validation
      format: {
        isWebP: safeExecute(() => img.src.includes('.webp'), 'check webp') || false,
        isJpeg: safeExecute(() => img.src.includes('.jpg') || img.src.includes('.jpeg'), 'check jpeg') || false,
        isPng: safeExecute(() => img.src.includes('.png'), 'check png') || false,
        isGif: safeExecute(() => img.src.includes('.gif'), 'check gif') || false,
        isSvg: safeExecute(() => img.src.includes('.svg'), 'check svg') || false,
        isAvif: safeExecute(() => img.src.includes('.avif'), 'check avif') || false
      },
      
      // Quality indicators with enhanced validation
      quality: {
        isRetina: safeExecute(() => img.width < img.naturalWidth, 'check retina') || false,
        isCompressed: safeExecute(() => img.width < img.naturalWidth, 'check compressed') || false,
        isResponsive: safeExecute(() => img.srcset ? true : false, 'check responsive') || false
      },
      
      // Accessibility with sanitization
      accessibility: {
        alt: sanitizeInput(img.alt),
        title: sanitizeInput(img.title),
        role: sanitizeInput(img.getAttribute('role')),
        ariaLabel: sanitizeInput(img.getAttribute('aria-label')),
        ariaDescribedBy: sanitizeInput(img.getAttribute('aria-describedby'))
      },
      
      // CSS properties with enhanced error handling
      styles: {
        objectFit: safeExecute(() => getComputedStyle(img).objectFit, 'get objectFit') || 'fill',
        objectPosition: safeExecute(() => getComputedStyle(img).objectPosition, 'get objectPosition') || '50% 50%',
        borderRadius: safeExecute(() => getComputedStyle(img).borderRadius, 'get borderRadius') || '0px',
        boxShadow: safeExecute(() => getComputedStyle(img).boxShadow, 'get boxShadow') || 'none',
        filter: safeExecute(() => getComputedStyle(img).filter, 'get filter') || 'none'
      },
      
      // Context information with sanitization
      context: {
        tagName: img.tagName.toLowerCase(),
        className: sanitizeInput(img.className),
        id: sanitizeInput(img.id),
        parentElement: img.parentElement?.tagName.toLowerCase(),
        isLazyLoaded: img.loading === 'lazy',
        hasSrcset: !!img.srcset,
        srcset: sanitizeInput(img.srcset) || null
      },
      
      // URLs and sources with enhanced validation
      urls: {
        original: sanitizeInput(img.src),
        base64: safeExecute(() => img.src.startsWith('data:') ? img.src : null, 'check base64') || null,
        relative: safeExecute(() => img.src.replace(window.location.origin, ''), 'get relative url') || '',
        domain: safeExecute(() => new URL(img.src).hostname, 'get domain') || 'unknown'
      }
    };
    
    // Generate different output formats with enhanced error handling
    const formats = {
      url: imageInfo.src,
      markdown: `![${imageInfo.alt || 'image'}](${imageInfo.src})`,
      html: `<img src="${imageInfo.src}" alt="${imageInfo.alt || ''}" width="${imageInfo.displayWidth}" height="${imageInfo.displayHeight}">`,
      css: `background-image: url('${imageInfo.src}');`,
      json: safeExecute(() => JSON.stringify(imageInfo, null, 2), 'stringify json') || '{}'
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
    handleError(error, 'imagePicker');
    showError('Failed to extract image information. Please try again.');
  }
}

// Keyboard navigation with enhanced error handling
function onKeyDown(e) {
  try {
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
  } catch (error) {
    handleError(error, 'onKeyDown');
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
    
    // Add event listeners with cleanup tracking
    const cleanupMove = addEventListenerWithCleanup(document, 'mousemove', throttledOnMove, true);
    const cleanupClick = addEventListenerWithCleanup(document, 'click', onClick, true);
    const cleanupKeydown = addEventListenerWithCleanup(document, 'keydown', onKeyDown, true);
    
    cleanupFunctions.push(cleanupMove, cleanupClick, cleanupKeydown);
    
    showInfo('Hover over images to inspect • Click to select • Enter to select • Esc to cancel', 3000);
    
  } catch (error) {
    handleError(error, 'imagePicker activation');
    showError('Failed to activate image picker. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  try {
    // Cleanup all event listeners
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        handleError(error, 'event listener cleanup');
      }
    });
    cleanupFunctions.length = 0;
    
    removeOverlay(overlay);
    overlay = null;
    currentImage = null;
    
    document.body.style.cursor = '';
    
  } catch (error) {
    handleError(error, 'imagePicker deactivation');
  }
}
