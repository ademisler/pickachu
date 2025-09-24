import { createOverlay, removeOverlay, copyText, showModal, showError, showSuccess, showInfo, throttle } from './helpers.js';

let overlay, deactivateCb;
let selectedElements = [];
let isBatchMode = false;
let currentElement = null;

// Performance optimized move handler
const throttledOnMove = throttle((e) => {
  const el = e.target;
  if (!el || el === overlay) return;
  
  currentElement = el;
  const rect = el.getBoundingClientRect();
  
  // Update overlay position
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  
  // Update overlay color based on selection status
  const isSelected = selectedElements.includes(el);
  overlay.style.backgroundColor = isSelected ? 'rgba(255, 193, 7, 0.3)' : 'rgba(33, 150, 243, 0.2)';
  overlay.style.borderColor = isSelected ? '#ffc107' : '#2196f3';
}, 16);

// Enhanced click handler for batch selection
function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!currentElement) return;
  
  try {
    const el = currentElement;
    const index = selectedElements.indexOf(el);
    
    if (index > -1) {
      // Remove from selection
      selectedElements.splice(index, 1);
      showInfo(`Element removed from selection (${selectedElements.length} selected)`, 1500);
    } else {
      // Add to selection
      selectedElements.push(el);
      showInfo(`Element added to selection (${selectedElements.length} selected)`, 1500);
    }
    
    updateSelectionUI();
    
  } catch (error) {
    console.error('Batch picker error:', error);
    showError('Failed to toggle element selection. Please try again.');
  }
}

// Update selection UI
function updateSelectionUI() {
  // Update overlay colors for all selected elements
  selectedElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const indicator = document.createElement('div');
    indicator.className = 'pickachu-selection-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY - 2}px;
      left: ${rect.left + window.scrollX - 2}px;
      width: ${rect.width + 4}px;
      height: ${rect.height + 4}px;
      border: 2px solid #ffc107;
      background: rgba(255, 193, 7, 0.1);
      border-radius: 4px;
      z-index: 2147483645;
      pointer-events: none;
      animation: pickachu-pulse 2s infinite;
    `;
    
    // Remove existing indicator for this element
    document.querySelectorAll('.pickachu-selection-indicator').forEach(ind => {
      if (ind.dataset.elementId === el.id || 
          (ind.offsetLeft === rect.left + window.scrollX - 2 && 
           ind.offsetTop === rect.top + window.scrollY - 2)) {
        ind.remove();
      }
    });
    
    indicator.dataset.elementId = el.id;
    document.body.appendChild(indicator);
  });
  
  // Remove indicators for deselected elements
  document.querySelectorAll('.pickachu-selection-indicator').forEach(indicator => {
    const elementId = indicator.dataset.elementId;
    const isStillSelected = selectedElements.some(el => el.id === elementId);
    if (!isStillSelected) {
      indicator.remove();
    }
  });
}

// Keyboard navigation
function onKeyDown(e) {
  if (!overlay || !currentElement) return;
  
  switch (e.key) {
    case 'Enter':
      e.preventDefault();
      onClick({ target: currentElement, preventDefault: () => {}, stopPropagation: () => {} });
      break;
    case 'Escape':
      e.preventDefault();
      if (selectedElements.length > 0) {
        processBatchSelection();
      } else {
        deactivateCb();
      }
      break;
    case 'a':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        selectAllVisible();
      }
      break;
    case 'd':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        clearSelection();
      }
      break;
  }
}

// Select all visible elements
function selectAllVisible() {
  const allElements = Array.from(document.querySelectorAll('*'))
    .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0 && 
                  el !== overlay && !el.classList.contains('pickachu-selection-indicator'));
  
  selectedElements = [...new Set([...selectedElements, ...allElements])];
  updateSelectionUI();
  showSuccess(`All visible elements selected (${selectedElements.length} total)`);
}

// Clear selection
function clearSelection() {
  selectedElements = [];
  document.querySelectorAll('.pickachu-selection-indicator').forEach(indicator => indicator.remove());
  showInfo('Selection cleared');
}

// Process batch selection
function processBatchSelection() {
  if (selectedElements.length === 0) {
    showWarning('No elements selected for batch processing.');
    return;
  }
  
  try {
    const batchData = selectedElements.map((el, index) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = getComputedStyle(el);
      
      return {
        index: index + 1,
        tagName: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        textContent: el.textContent.trim().substring(0, 100),
        position: {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height
        },
        styles: {
          backgroundColor: computedStyle.backgroundColor,
          color: computedStyle.color,
          fontSize: computedStyle.fontSize,
          fontFamily: computedStyle.fontFamily,
          display: computedStyle.display
        },
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}),
        innerHTML: el.innerHTML,
        outerHTML: el.outerHTML
      };
    });
    
    // Generate different output formats
    const formats = {
      json: JSON.stringify(batchData, null, 2),
      csv: generateCSV(batchData),
      html: generateHTML(batchData),
      markdown: generateMarkdown(batchData),
      summary: generateSummary(batchData)
    };
    
    // Copy summary format
    copyText(formats.summary);
    
    showSuccess(`${selectedElements.length} elements processed and copied!`);
    
    const title = 'Batch Element Analysis';
    const content = `Processed ${selectedElements.length} elements:\n\n${formats.summary}\n\nFull Data:\n${formats.json}`;
    
    showModal(title, content, '📦', 'batch');
    deactivateCb();
    
  } catch (error) {
    console.error('Batch processing error:', error);
    showError('Failed to process batch selection. Please try again.');
  }
}

// Generate CSV format
function generateCSV(data) {
  const headers = ['Index', 'Tag', 'ID', 'Class', 'Text', 'X', 'Y', 'Width', 'Height', 'Background', 'Color'];
  const rows = data.map(item => [
    item.index,
    item.tagName,
    item.id || '',
    item.className || '',
    `"${item.textContent.replace(/"/g, '""')}"`,
    item.position.x,
    item.position.y,
    item.position.width,
    item.position.height,
    item.styles.backgroundColor,
    item.styles.color
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Generate HTML format
function generateHTML(data) {
  return data.map(item => 
    `<div class="batch-item" data-index="${item.index}">
      <h4>${item.tagName}${item.id ? '#' + item.id : ''}${item.className ? '.' + item.className.split(' ').join('.') : ''}</h4>
      <p>${item.textContent}</p>
      <div class="styles">
        <strong>Background:</strong> ${item.styles.backgroundColor}<br>
        <strong>Color:</strong> ${item.styles.color}<br>
        <strong>Font:</strong> ${item.styles.fontFamily} ${item.styles.fontSize}
      </div>
    </div>`
  ).join('\n');
}

// Generate Markdown format
function generateMarkdown(data) {
  return data.map(item => 
    `## ${item.index}. ${item.tagName}${item.id ? '#' + item.id : ''}${item.className ? '.' + item.className.split(' ').join('.') : ''}

**Text:** ${item.textContent}
**Position:** ${item.position.x}, ${item.position.y} (${item.position.width}x${item.position.height})
**Styles:** Background: ${item.styles.backgroundColor}, Color: ${item.styles.color}

---`
  ).join('\n');
}

// Generate summary format
function generateSummary(data) {
  const tagCounts = {};
  const classCounts = {};
  const idCounts = {};
  
  data.forEach(item => {
    tagCounts[item.tagName] = (tagCounts[item.tagName] || 0) + 1;
    if (item.className) {
      item.className.split(' ').forEach(cls => {
        if (cls.trim()) classCounts[cls.trim()] = (classCounts[cls.trim()] || 0) + 1;
      });
    }
    if (item.id) {
      idCounts[item.id] = (idCounts[item.id] || 0) + 1;
    }
  });
  
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topClasses = Object.entries(classCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  return `Batch Analysis Summary:
Total Elements: ${data.length}
Top Tags: ${topTags.map(([tag, count]) => `${tag}(${count})`).join(', ')}
Top Classes: ${topClasses.map(([cls, count]) => `${cls}(${count})`).join(', ')}
Elements with IDs: ${Object.keys(idCounts).length}
Average Width: ${Math.round(data.reduce((sum, item) => sum + item.position.width, 0) / data.length)}px
Average Height: ${Math.round(data.reduce((sum, item) => sum + item.position.height, 0) / data.length)}px`;
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    overlay = createOverlay();
    isBatchMode = true;
    selectedElements = [];
    
    // Enhanced overlay styling for batch picker
    overlay.style.cssText = `
      position: absolute;
      background-color: rgba(33, 150, 243, 0.2);
      border: 2px solid #2196f3;
      border-radius: 4px;
      z-index: 2147483646;
      pointer-events: none;
      box-sizing: border-box;
      box-shadow: 0 0 6px rgba(33, 150, 243, 0.6);
      transition: all 0.15s ease-out;
      animation: pickachu-fade-in 0.2s ease-out;
    `;
    
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', throttledOnMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    
    showInfo('Batch Mode: Click elements to select • Ctrl+A to select all • Ctrl+D to clear • Esc to process', 4000);
    
  } catch (error) {
    console.error('Batch picker activation error:', error);
    showError('Failed to activate batch picker. Please try again.');
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
    currentElement = null;
    
    // Clean up selection indicators
    document.querySelectorAll('.pickachu-selection-indicator').forEach(indicator => indicator.remove());
    
    selectedElements = [];
    isBatchMode = false;
    
    document.body.style.cursor = '';
    
  } catch (error) {
    console.error('Batch picker deactivation error:', error);
  }
}