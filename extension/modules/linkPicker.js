import { copyText, showModal, showError, showSuccess, showInfo, showWarning, throttle, handleError, safeExecute, sanitizeInput, addEventListenerWithCleanup, validateUrl } from './helpers.js';

let startX, startY, box, deactivateCb;
let isSelecting = false;
let cleanupFunctions = []; // New: Array to store cleanup functions for event listeners

// Enhanced mouse down handler with error handling
function onMouseDown(e) {
  try {
    if (isSelecting) return;
    
    startX = e.pageX;
    startY = e.pageY;
    isSelecting = true;
    
    box = document.createElement('div');
    box.id = 'pickachu-highlight-overlay';
    box.style.cssText = `
      position: absolute;
      background-color: var(--pickachu-highlight-bg, rgba(33, 150, 243, 0.2));
      border: 2px solid var(--pickachu-primary-color, #2196f3);
      border-radius: 4px;
      z-index: 2147483646;
      pointer-events: none;
      box-sizing: border-box;
      box-shadow: 0 0 6px var(--pickachu-highlight-shadow, rgba(33, 150, 243, 0.6));
      transition: all 0.15s ease-out;
    `;
    
    document.body.appendChild(box);
    
    // Add event listeners with cleanup tracking
    const cleanupMove = addEventListenerWithCleanup(document, 'mousemove', throttledOnMove, true);
    const cleanupUp = addEventListenerWithCleanup(document, 'mouseup', onUp, true);
    
    cleanupFunctions.push(cleanupMove, cleanupUp);
    
    showInfo('Drag to select area • Release to extract links', 2000);
    
  } catch (error) {
    handleError(error, 'onMouseDown');
    showError('Failed to start link selection. Please try again.');
  }
}

// Performance optimized move handler with enhanced error handling
const throttledOnMove = throttle((e) => {
  try {
    if (!isSelecting) return;
    
    const x = Math.min(startX, e.pageX);
    const y = Math.min(startY, e.pageY);
    const w = Math.abs(startX - e.pageX);
    const h = Math.abs(startY - e.pageY);
    
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
  } catch (error) {
    handleError(error, 'throttledOnMove');
  }
}, 16);

// Enhanced mouse up handler with comprehensive link analysis and error handling
function onUp() {
  try {
    if (!isSelecting) return;
    
    isSelecting = false;
    
    // Cleanup event listeners
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        handleError(error, 'event listener cleanup');
      }
    });
    cleanupFunctions.length = 0;
    
    const rect = box.getBoundingClientRect();
    box.remove();
    
    // Find all links in the selected area with enhanced error handling
    const allLinks = safeExecute(() => [...document.querySelectorAll('a')], 'querySelectorAll links') || [];
    const selectedLinks = allLinks.filter(link => {
      try {
        const linkRect = link.getBoundingClientRect();
        return linkRect.left < rect.right && 
               linkRect.right > rect.left && 
               linkRect.top < rect.bottom && 
               linkRect.bottom > rect.top;
      } catch (error) {
        handleError(error, 'link rect calculation');
        return false;
      }
    });
    
    if (selectedLinks.length === 0) {
      showWarning('No links found in the selected area.');
      deactivateCb();
      return;
    }
    
    // Analyze each link with enhanced validation and sanitization
    const linkAnalysis = selectedLinks.map(link => {
      try {
        const href = sanitizeInput(link.href);
        const text = sanitizeInput(link.textContent.trim());
        const title = sanitizeInput(link.title || '');
        const target = sanitizeInput(link.target || '_self');
        const rel = sanitizeInput(link.rel || '');
        
        // Determine link type with enhanced validation
        const isExternal = safeExecute(() => !href.includes(window.location.hostname), 'check external') || false;
        const isEmail = safeExecute(() => href.startsWith('mailto:'), 'check email') || false;
        const isPhone = safeExecute(() => href.startsWith('tel:'), 'check phone') || false;
        const isAnchor = safeExecute(() => href.startsWith('#'), 'check anchor') || false;
        const isDownload = link.hasAttribute('download');
        
        // Check if link is broken (basic check) with enhanced validation
        const isBroken = safeExecute(() => {
          return href === '' || href === '#' || href.includes('javascript:') || !validateUrl(href);
        }, 'check broken') || false;
        
        return {
          url: href,
          text: text,
          title: title,
          target: target,
          rel: rel,
          type: {
            external: isExternal,
            internal: !isExternal,
            email: isEmail,
            phone: isPhone,
            anchor: isAnchor,
            download: isDownload,
            broken: isBroken
          },
          context: {
            tagName: link.tagName.toLowerCase(),
            className: sanitizeInput(link.className),
            id: sanitizeInput(link.id),
            parentElement: link.parentElement?.tagName.toLowerCase()
          },
          accessibility: {
            ariaLabel: sanitizeInput(link.getAttribute('aria-label')),
            ariaDescribedBy: sanitizeInput(link.getAttribute('aria-describedby')),
            role: sanitizeInput(link.getAttribute('role'))
          }
        };
      } catch (error) {
        handleError(error, 'link analysis');
        return null;
      }
    }).filter(link => link !== null);
    
    // Remove duplicates based on URL
    const uniqueLinks = linkAnalysis.filter((link, index, self) => 
      index === self.findIndex(l => l.url === link.url)
    );
    
    // Generate different output formats with enhanced error handling
    const formats = {
      urls: uniqueLinks.map(link => link.url).join('\n'),
      markdown: uniqueLinks.map(link => `[${link.text || link.url}](${link.url})`).join('\n'),
      html: uniqueLinks.map(link => `<a href="${link.url}"${link.target !== '_self' ? ` target="${link.target}"` : ''}${link.title ? ` title="${link.title}"` : ''}>${link.text || link.url}</a>`).join('\n'),
      json: safeExecute(() => JSON.stringify(uniqueLinks, null, 2), 'stringify json') || '{}',
      csv: 'URL,Text,Title,Type\n' + uniqueLinks.map(link => `"${link.url}","${link.text}","${link.title}","${link.type.external ? 'external' : 'internal'}"`).join('\n')
    };
    
    // Copy primary format (URLs)
    copyText(formats.urls);
    
    showSuccess(`${uniqueLinks.length} links extracted and copied!`);
    
    const title = chrome.i18n ? chrome.i18n.getMessage('links') : 'Link Analysis';
    const content = `Found ${uniqueLinks.length} unique links:\n\n${formats.urls}\n\nAnalysis:\n- External: ${uniqueLinks.filter(l => l.type.external).length}\n- Internal: ${uniqueLinks.filter(l => l.type.internal).length}\n- Broken: ${uniqueLinks.filter(l => l.type.broken).length}\n\nFull Analysis:\n${formats.json}`;
    
    showModal(title, content, '🔗', 'links');
    deactivateCb();
    
  } catch (error) {
    handleError(error, 'linkPicker onUp');
    showError('Failed to extract links. Please try again.');
    deactivateCb();
  }
}

// Keyboard navigation with enhanced error handling
function onKeyDown(e) {
  try {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isSelecting) {
        isSelecting = false;
        
        // Cleanup event listeners
        cleanupFunctions.forEach(cleanup => {
          try {
            cleanup();
          } catch (error) {
            handleError(error, 'event listener cleanup');
          }
        });
        cleanupFunctions.length = 0;
        
        if (box) box.remove();
      }
      deactivateCb();
    }
  } catch (error) {
    handleError(error, 'onKeyDown');
  }
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    document.body.style.cursor = 'crosshair';
    
    // Add event listeners with cleanup tracking
    const cleanupMouseDown = addEventListenerWithCleanup(document, 'mousedown', onMouseDown, true);
    const cleanupKeydown = addEventListenerWithCleanup(document, 'keydown', onKeyDown, true);
    
    cleanupFunctions.push(cleanupMouseDown, cleanupKeydown);
    
    showInfo('Click and drag to select an area • Release to extract all links • Esc to cancel', 3000);
    
  } catch (error) {
    handleError(error, 'linkPicker activation');
    showError('Failed to activate link picker. Please try again.');
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
    
    if (isSelecting) {
      isSelecting = false;
    }
    
    if (box) {
      box.remove();
      box = null;
    }
    
    document.body.style.cursor = '';
    
  } catch (error) {
    handleError(error, 'linkPicker deactivation');
  }
}
