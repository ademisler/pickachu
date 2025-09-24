import { copyText, showModal, showError, showSuccess, showInfo, showWarning, throttle } from './helpers.js';

let startX, startY, box, deactivateCb;
let isSelecting = false;

// Enhanced mouse down handler
function onMouseDown(e) {
  if (isSelecting) return;
  
  startX = e.pageX;
  startY = e.pageY;
  isSelecting = true;
  
  box = document.createElement('div');
  box.id = 'pickachu-highlight-overlay';
  box.style.cssText = `
    position: absolute;
    background-color: rgba(33, 150, 243, 0.2);
    border: 2px solid #2196f3;
    border-radius: 4px;
    z-index: 2147483646;
    pointer-events: none;
    box-sizing: border-box;
    box-shadow: 0 0 6px rgba(33, 150, 243, 0.6);
    transition: all 0.15s ease-out;
  `;
  
  document.body.appendChild(box);
  document.addEventListener('mousemove', throttledOnMove, true);
  document.addEventListener('mouseup', onUp, true);
  
  showInfo('Drag to select area • Release to extract links', 2000);
}

// Performance optimized move handler
const throttledOnMove = throttle((e) => {
  if (!isSelecting) return;
  
  const x = Math.min(startX, e.pageX);
  const y = Math.min(startY, e.pageY);
  const w = Math.abs(startX - e.pageX);
  const h = Math.abs(startY - e.pageY);
  
  box.style.left = x + 'px';
  box.style.top = y + 'px';
  box.style.width = w + 'px';
  box.style.height = h + 'px';
}, 16);

// Enhanced mouse up handler with comprehensive link analysis
function onUp() {
  if (!isSelecting) return;
  
  isSelecting = false;
  document.removeEventListener('mousemove', throttledOnMove, true);
  document.removeEventListener('mouseup', onUp, true);
  
  try {
    const rect = box.getBoundingClientRect();
    box.remove();
    
    // Find all links in the selected area
    const allLinks = [...document.querySelectorAll('a')];
    const selectedLinks = allLinks.filter(link => {
      const linkRect = link.getBoundingClientRect();
      return linkRect.left < rect.right && 
             linkRect.right > rect.left && 
             linkRect.top < rect.bottom && 
             linkRect.bottom > rect.top;
    });
    
    if (selectedLinks.length === 0) {
      showWarning('No links found in the selected area.');
      deactivateCb();
      return;
    }
    
    // Analyze each link
    const linkAnalysis = selectedLinks.map(link => {
      const href = link.href;
      const text = link.textContent.trim();
      const title = link.title || '';
      const target = link.target || '_self';
      const rel = link.rel || '';
      
      // Determine link type
      const isExternal = !href.includes(window.location.hostname);
      const isEmail = href.startsWith('mailto:');
      const isPhone = href.startsWith('tel:');
      const isAnchor = href.startsWith('#');
      const isDownload = link.hasAttribute('download');
      
      // Check if link is broken (basic check)
      const isBroken = href === '' || href === '#' || href.includes('javascript:');
      
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
          className: link.className,
          id: link.id,
          parentElement: link.parentElement?.tagName.toLowerCase()
        },
        accessibility: {
          ariaLabel: link.getAttribute('aria-label'),
          ariaDescribedBy: link.getAttribute('aria-describedby'),
          role: link.getAttribute('role')
        }
      };
    });
    
    // Remove duplicates based on URL
    const uniqueLinks = linkAnalysis.filter((link, index, self) => 
      index === self.findIndex(l => l.url === link.url)
    );
    
    // Generate different output formats
    const formats = {
      urls: uniqueLinks.map(link => link.url).join('\n'),
      markdown: uniqueLinks.map(link => `[${link.text || link.url}](${link.url})`).join('\n'),
      html: uniqueLinks.map(link => `<a href="${link.url}"${link.target !== '_self' ? ` target="${link.target}"` : ''}${link.title ? ` title="${link.title}"` : ''}>${link.text || link.url}</a>`).join('\n'),
      json: JSON.stringify(uniqueLinks, null, 2),
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
    console.error('Link picker error:', error);
    showError('Failed to extract links. Please try again.');
    deactivateCb();
  }
}

// Keyboard navigation
function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (isSelecting) {
      isSelecting = false;
      document.removeEventListener('mousemove', throttledOnMove, true);
      document.removeEventListener('mouseup', onUp, true);
      if (box) box.remove();
    }
    deactivateCb();
  }
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    
    showInfo('Click and drag to select an area • Release to extract all links • Esc to cancel', 3000);
    
  } catch (error) {
    console.error('Link picker activation error:', error);
    showError('Failed to activate link picker. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  try {
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
    
    if (isSelecting) {
      isSelecting = false;
      document.removeEventListener('mousemove', throttledOnMove, true);
      document.removeEventListener('mouseup', onUp, true);
    }
    
    if (box) {
      box.remove();
      box = null;
    }
    
    document.body.style.cursor = '';
    
  } catch (error) {
    console.error('Link picker deactivation error:', error);
  }
}
