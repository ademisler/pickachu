import { createOverlay, removeOverlay, copyText, showModal, showError, showSuccess, showInfo, throttle } from './helpers.js';

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
    
    showModal(title, content, '🖼️', 'image');
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
      background-color: rgba(76, 175, 80, 0.2);
      border: 2px solid #4caf50;
      border-radius: 4px;
      z-index: 2147483646;
      pointer-events: none;
      box-sizing: border-box;
      box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
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
