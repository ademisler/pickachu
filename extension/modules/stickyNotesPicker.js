import { showSuccess, showError, handleError, safeExecute, sanitizeInput, addEventListenerWithCleanup } from './helpers.js';

let deactivateCb;
let notes = [];
let noteCounter = 0;
let cleanupFunctions = []; // Array to store cleanup functions for event listeners

// Default note colors
const NOTE_COLORS = [
  { name: 'Yellow', value: '#fff3cd' },
  { name: 'Green', value: '#d4edda' },
  { name: 'Blue', value: '#d1ecf1' },
  { name: 'Pink', value: '#f8d7da' },
  { name: 'Purple', value: '#e2e3f1' },
  { name: 'Orange', value: '#ffeaa7' },
  { name: 'Gray', value: '#f8f9fa' }
];

export function activate(deactivate) {
  try {
    deactivateCb = deactivate;
    
    // Load existing notes
    loadNotes().then(() => {
      showNotesManager();
    }).catch(error => {
      handleError(error, 'stickyNotesPicker activation loadNotes');
      showError('Failed to load existing notes. Please try again.');
      deactivate();
    });
  } catch (error) {
    handleError(error, 'stickyNotesPicker activation');
    showError('Failed to activate sticky notes. Please try again.');
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
    
    // Remove any existing note managers
    const existingManager = safeExecute(() => document.getElementById('pickachu-notes-manager'), 'get notes manager');
    if (existingManager) {
      existingManager.remove();
    }
    
    // Don't remove sticky notes from page - they should persist
    // Only call deactivateCb if it exists and we haven't called it yet
    if (deactivateCb && !deactivateCb.called) {
      deactivateCb.called = true;
      deactivateCb();
    }
  } catch (error) {
    handleError(error, 'stickyNotesPicker deactivation');
  }
}

// Create a new sticky note with enhanced error handling
function createStickyNote(x, y, color = NOTE_COLORS[0].value) {
  try {
    const noteId = `note-${++noteCounter}`;
    const note = {
      id: sanitizeInput(noteId),
      x: safeExecute(() => Math.max(0, Math.min(window.innerWidth - 250, x)), 'constrain x') || 0,
      y: safeExecute(() => Math.max(0, Math.min(window.innerHeight - 150, y)), 'constrain y') || 0,
      color: sanitizeInput(color),
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      siteUrl: sanitizeInput(safeExecute(() => window.location.href, 'get location href') || ''),
      siteTitle: sanitizeInput(safeExecute(() => document.title, 'get title') || '')
    };
    
    notes.push(note);
    renderStickyNote(note);
    saveNotes();
    
    return note;
  } catch (error) {
    handleError(error, 'createStickyNote');
    showError('Failed to create sticky note. Please try again.');
    return null;
  }
}

// Render a sticky note on the page
function renderStickyNote(note) {
  const noteElement = document.createElement('div');
  noteElement.className = 'pickachu-sticky-note';
  noteElement.id = note.id;
  noteElement.style.cssText = `
    position: absolute;
    left: ${note.x}px;
    top: ${note.y}px;
    width: 250px;
    min-height: 150px;
    background: ${note.color};
    border: 2px solid var(--pickachu-border, #ddd);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2147483646;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    cursor: move;
    user-select: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  `;
  
  // Note header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--pickachu-border, #ddd);
    background: rgba(255,255,255,0.3);
    border-radius: 6px 6px 0 0;
  `;
  
  const title = document.createElement('span');
  // Show site name or domain instead of "Sticky Note"
  const siteName = note.siteTitle || new URL(note.siteUrl).hostname || 'Sticky Note';
  title.textContent = siteName.length > 20 ? siteName.substring(0, 20) + '...' : siteName;
  title.style.cssText = `
    font-weight: 600;
    color: #000000;
    font-size: 12px;
  `;
  
  const controls = document.createElement('div');
  controls.style.cssText = `
    display: flex;
    gap: 4px;
  `;
  
  // Color picker button
  const colorBtn = document.createElement('button');
  colorBtn.innerHTML = '🎨';
  colorBtn.title = 'Change color';
  colorBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 2px;
    border-radius: 3px;
    color: #000000;
  `;
  
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showColorPicker(note);
  });
  
  // Close button (instead of delete)
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.title = 'Close note';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 2px 4px;
    border-radius: 3px;
    color: var(--pickachu-secondary-text, #666);
    font-weight: bold;
  `;
  
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Just hide the note, don't delete it
    noteElement.style.display = 'none';
  });
  
  controls.appendChild(colorBtn);
  controls.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(controls);
  
  // Make header clickable to focus the note
  header.addEventListener('click', (e) => {
    // Don't trigger if clicking on buttons
    if (e.target === colorBtn || e.target === closeBtn) return;
    
    e.stopPropagation();
    focusNote(noteElement);
  });
  
  // Note content
  const content = document.createElement('textarea');
  content.value = note.content;
  content.placeholder = 'Click to add note...';
  content.style.cssText = `
    width: 100%;
    min-height: 100px;
    border: none;
    background: transparent;
    padding: 12px;
    font-family: inherit;
    font-size: inherit;
    color: #000000;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  `;
  
  content.addEventListener('input', (e) => {
    note.content = e.target.value;
    note.updatedAt = new Date().toISOString();
    saveNotes();
  });
  
  content.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  noteElement.appendChild(header);
  noteElement.appendChild(content);
  
  // Make note draggable
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = noteElement.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    noteElement.style.transform = 'scale(1.05)';
    noteElement.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    
    e.preventDefault();
  });
  
  function handleDrag(e) {
    if (!isDragging) return;
    
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    // Constrain to viewport with better bounds
    const maxX = window.innerWidth - 250;
    const maxY = window.innerHeight - 150;
    
    const constrainedX = Math.max(0, Math.min(maxX, x));
    const constrainedY = Math.max(0, Math.min(maxY, y));
    
    noteElement.style.left = constrainedX + 'px';
    noteElement.style.top = constrainedY + 'px';
    
    // Update note position in real-time
    note.x = constrainedX;
    note.y = constrainedY;
  }
  
  function handleDragEnd() {
    isDragging = false;
    noteElement.style.transform = '';
    noteElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    
    // Update note with timestamp and save
    note.updatedAt = new Date().toISOString();
    saveNotes();
  }
  
  // Add to page
  document.body.appendChild(noteElement);
  
  // Focus the textarea
  setTimeout(() => content.focus(), 100);
}

// Show color picker for note
function showColorPicker(note) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--pickachu-bg, #fff);
    border: 1px solid var(--pickachu-border, #ddd);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  modal.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">Choose Color</h3>
      <button id="cancel-color" style="
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
      <div class="grid-4" style="margin-bottom: 16px;">
        ${NOTE_COLORS.map(color => `
          <button class="color-option" data-color="${color.value}" style="
            width: 40px;
            height: 40px;
            border: 2px solid ${color.value === note.color ? 'var(--pickachu-text, #333)' : 'transparent'};
            border-radius: 6px;
            background: ${color.value};
            cursor: pointer;
            transition: transform 0.2s ease;
          " title="${color.name}"></button>
        `).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  modal.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      note.color = color;
      const noteElement = document.getElementById(note.id);
      if (noteElement) {
        noteElement.style.background = color;
      }
      saveNotes();
      modal.remove();
    });
    
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
  });
  
  document.getElementById('cancel-color').addEventListener('click', () => {
    modal.remove();
  });
}


// Show notes manager
function showNotesManager() {
  // Remove existing manager if any
  const existingManager = document.getElementById('pickachu-notes-manager');
  if (existingManager) {
    existingManager.remove();
  }
  
  const manager = document.createElement('div');
  manager.id = 'pickachu-notes-manager';
  manager.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--pickachu-bg, #fff);
    border: 1px solid var(--pickachu-border, #ddd);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    z-index: 2147483647;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  manager.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">
        📝 Sticky Notes Manager
      </h3>
      <button id="close-notes-manager" style="
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
      <div style="margin-bottom: 16px;">
        <button id="create-new-note" class="btn btn-primary">+ Add New Note</button>
        <button id="save-notes" class="btn btn-success" style="margin-left: 8px;">💾 Save Notes</button>
        <button id="export-notes" class="btn btn-info" style="margin-left: 8px;">📤 Export</button>
        <button id="import-notes" class="btn btn-warning" style="margin-left: 8px;">📥 Import</button>
        <button id="clear-all-notes" class="btn btn-danger" style="margin-left: 8px;">🗑️ Clear All</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: var(--pickachu-text, #333);">All Notes from All Sites:</div>
        <div id="all-notes-list" style="
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid var(--pickachu-border, #ddd);
          border-radius: 6px;
          padding: 12px;
          background: var(--pickachu-code-bg, #f8f9fa);
        "></div>
      </div>
      
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: var(--pickachu-text, #333);">Instructions:</div>
        <div style="font-size: 14px; color: var(--pickachu-secondary-text, #666); line-height: 1.4;">
          • Click "Add New Note" to create a sticky note<br>
          • Drag notes by their header to move them<br>
          • Click the 🎨 button to change note color<br>
          • Click × to close individual notes<br>
          • Click on note headers to focus them<br>
          • Notes are automatically saved and will persist
        </div>
      </div>
      
      <div id="notes-list" style="max-height: 300px; overflow-y: auto;">
        ${renderNotesList()}
      </div>
    </div>
  `;
  
  document.body.appendChild(manager);
  
  // Add event listeners
  const closeBtn = document.getElementById('close-notes-manager');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      manager.remove();
      // Don't deactivate - just hide the manager, notes stay on page
    });
  }
  
  const createBtn = document.getElementById('create-new-note');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      manager.remove();
      const centerX = window.innerWidth / 2 - 125;
      const centerY = window.innerHeight / 2 - 75;
      createStickyNote(centerX, centerY);
    });
  }
  
  const saveBtn = document.getElementById('save-notes');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveNotes();
    });
  }

  const exportBtn = document.getElementById('export-notes');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportNotes();
    });
  }

  const importBtn = document.getElementById('import-notes');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      importNotes();
    });
  }

  const clearBtn = document.getElementById('clear-all-notes');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (window.confirm('Are you sure you want to delete all notes? This action cannot be undone.')) {
        notes.forEach(note => {
          const noteElement = document.getElementById(note.id);
          if (noteElement) noteElement.remove();
        });
        notes = [];
        saveNotes();
        const notesList = document.getElementById('notes-list');
        if (notesList) {
          notesList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--pickachu-secondary-text, #666);">No notes found</div>';
        }
        showSuccess('All notes cleared');
      }
    });
  }
  
  // Load and display all notes from all sites
  const allNotesList = document.getElementById('all-notes-list');
  if (allNotesList) {
    renderAllNotesList().then(html => {
      allNotesList.innerHTML = html;
    });
  }
  
  // Load existing notes
  loadExistingNotes();
}


// Load existing notes onto the page
function loadExistingNotes() {
  notes.forEach(note => {
    renderStickyNote(note);
  });
}

// Save notes to storage (site-specific) with enhanced error handling
async function saveNotes() {
  try {
    const currentUrl = safeExecute(() => window.location.href, 'get current url') || '';
    if (!currentUrl) {
      throw new Error('Unable to get current URL');
    }
    
    const siteKey = `stickyNotes_${sanitizeInput(currentUrl)}`;
    await safeExecute(async () => 
      await chrome.storage.local.set({ [siteKey]: notes }), 'save notes to storage');
    showSuccess('Notes saved successfully!');
  } catch (error) {
    handleError(error, 'saveNotes');
    showError('Failed to save notes');
  }
}

// Load notes from storage (site-specific) with enhanced error handling
async function loadNotes() {
  try {
    const currentUrl = safeExecute(() => window.location.href, 'get current url') || '';
    if (!currentUrl) {
      throw new Error('Unable to get current URL');
    }
    
    const siteKey = `stickyNotes_${sanitizeInput(currentUrl)}`;
    const result = await safeExecute(async () => 
      await chrome.storage.local.get([siteKey]), 'load notes from storage') || {};
    notes = result[siteKey] || [];
  } catch (error) {
    handleError(error, 'loadNotes');
    notes = [];
  }
}

// Load all notes from all sites with enhanced error handling
async function loadAllNotes() {
  try {
    const result = await safeExecute(async () => 
      await chrome.storage.local.get(), 'get all storage') || {};
    const allNotes = [];
    
    for (const [key, value] of Object.entries(result)) {
      try {
        if (key.startsWith('stickyNotes_') && Array.isArray(value)) {
          allNotes.push(...value);
        }
      } catch (error) {
        handleError(error, `process storage key ${key}`);
      }
    }
    
    return allNotes;
  } catch (error) {
    handleError(error, 'loadAllNotes');
    return [];
  }
}

// Export notes as JSON with enhanced error handling
function exportNotes() {
  try {
    const dataStr = safeExecute(() => JSON.stringify(notes, null, 2), 'stringify notes');
    if (!dataStr) {
      throw new Error('Failed to serialize notes');
    }
    
    const dataBlob = safeExecute(() => new Blob([dataStr], { type: 'application/json' }), 'create blob');
    if (!dataBlob) {
      throw new Error('Failed to create data blob');
    }
    
    const url = safeExecute(() => URL.createObjectURL(dataBlob), 'create object URL');
    if (!url) {
      throw new Error('Failed to create download URL');
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `sticky-notes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove(); // Modern API: use remove() instead of deprecated removeChild()
    
    safeExecute(() => URL.revokeObjectURL(url), 'revoke object URL');
    
    showSuccess('Notes exported successfully!');
  } catch (error) {
    handleError(error, 'exportNotes');
    showError('Failed to export notes');
  }
}

// Import notes from JSON with enhanced error handling
function importNotes() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    const cleanup = addEventListenerWithCleanup(input, 'change', (e) => {
      try {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          
          const readerCleanup = addEventListenerWithCleanup(reader, 'load', (e) => {
            try {
              const importedNotes = safeExecute(() => JSON.parse(e.target.result), 'parse imported notes');
              if (!importedNotes) {
                throw new Error('Failed to parse notes file');
              }
              
              if (Array.isArray(importedNotes)) {
                notes = importedNotes;
                saveNotes();
                loadExistingNotes();
                updateNotesList();
                showSuccess('Notes imported successfully!');
              } else {
                showError('Invalid notes file format');
              }
            } catch (error) {
              handleError(error, 'import notes file reader load');
              showError('Failed to parse notes file');
            }
          });
          cleanupFunctions.push(readerCleanup);
          
          safeExecute(() => reader.readAsText(file), 'read file as text');
        }
      } catch (error) {
        handleError(error, 'import notes input change');
        showError('Failed to process selected file');
      }
    });
    cleanupFunctions.push(cleanup);
    
    input.click();
  } catch (error) {
    handleError(error, 'importNotes');
    showError('Failed to import notes');
  }
}

// Delete a note with enhanced error handling
function deleteNote(noteId) {
  try {
    if (!noteId || typeof noteId !== 'string') {
      throw new Error('Invalid note ID');
    }
    
    const sanitizedNoteId = sanitizeInput(noteId);
    
    if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      // Remove from DOM
      const noteElement = safeExecute(() => document.getElementById(sanitizedNoteId), 'get note element');
      if (noteElement) {
        noteElement.remove();
      }
      
      // Remove from notes array
      const noteIndex = notes.findIndex(note => note.id === sanitizedNoteId);
      if (noteIndex !== -1) {
        notes.splice(noteIndex, 1);
        saveNotes();
        showSuccess('Note deleted successfully');
      }
    }
  } catch (error) {
    handleError(error, 'deleteNote');
    showError('Failed to delete note');
  }
}

// Focus a note with enhanced error handling
function focusNoteById(noteId) {
  try {
    if (!noteId || typeof noteId !== 'string') {
      throw new Error('Invalid note ID');
    }
    
    const sanitizedNoteId = sanitizeInput(noteId);
    const noteElement = safeExecute(() => document.getElementById(sanitizedNoteId), 'get note element');
    if (noteElement) {
      safeExecute(() => noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), 'scroll into view');
      noteElement.style.transform = 'scale(1.1)';
      noteElement.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
      setTimeout(() => {
        try {
          noteElement.style.transform = 'scale(1)';
          noteElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        } catch (error) {
          handleError(error, 'focus note timeout');
        }
      }, 1000);
    }
  } catch (error) {
    handleError(error, 'focusNoteById');
    showError('Failed to focus note');
  }
}

// Render all notes from all sites with enhanced error handling
async function renderAllNotesList() {
  try {
    const allNotes = await loadAllNotes();
    
    if (allNotes.length === 0) {
      return '<div style="text-align: center; color: var(--pickachu-secondary-text, #666); padding: 20px;">No notes found</div>';
    }
    
    return allNotes.map(note => {
      try {
        const siteName = sanitizeInput(note.siteTitle || safeExecute(() => new URL(note.siteUrl).hostname, 'get hostname') || 'Unknown Site');
        const shortContent = sanitizeInput(note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content);
        const createdAt = safeExecute(() => new Date(note.createdAt).toLocaleDateString(), 'format date') || 'Unknown';
        const sanitizedUrl = sanitizeInput(note.siteUrl);
        
        return `
          <div style="
            padding: 12px;
            border: 1px solid var(--pickachu-border, #ddd);
            border-radius: 6px;
            margin-bottom: 8px;
            background: var(--pickachu-bg, #fff);
            cursor: pointer;
            transition: background-color 0.2s ease;
          " onclick="window.open('${sanitizedUrl}', '_blank')">
            <div style="font-weight: 600; color: var(--pickachu-text, #333); margin-bottom: 4px;">
              ${siteName}
            </div>
            <div style="font-size: 12px; color: var(--pickachu-secondary-text, #666); margin-bottom: 4px;">
              Created: ${createdAt}
            </div>
            <div style="font-size: 13px; color: var(--pickachu-text, #333);">
              ${shortContent || 'Empty note'}
            </div>
          </div>
        `;
      } catch (error) {
        handleError(error, 'render note item');
        return '';
      }
    }).join('');
  } catch (error) {
    handleError(error, 'renderAllNotesList');
    return '<div style="text-align: center; color: var(--pickachu-error-color, #dc3545); padding: 20px;">Failed to load notes</div>';
  }
}

// Update notes list in manager with enhanced error handling
function updateNotesList() {
  try {
    const notesList = safeExecute(() => document.getElementById('notes-list'), 'get notes list');
    if (notesList) {
      notesList.innerHTML = renderNotesList();
    }
  } catch (error) {
    handleError(error, 'updateNotesList');
  }
}

// Render notes list in manager with enhanced error handling
function renderNotesList() {
  try {
    if (notes.length === 0) {
      return '<div style="text-align: center; padding: 20px; color: var(--pickachu-secondary-text, #666);">No notes found</div>';
    }
    
    return notes.map(note => {
      try {
        const noteNumber = safeExecute(() => note.id.split('-')[1], 'get note number') || '?';
        const shortContent = sanitizeInput(note.content ? note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '') : 'Empty note');
        const createdAt = safeExecute(() => new Date(note.createdAt).toLocaleString(), 'format created date') || 'Unknown';
        const sanitizedNoteId = sanitizeInput(note.id);
        
        return `
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            border: 1px solid var(--pickachu-border, #ddd);
            border-radius: 6px;
            margin-bottom: 8px;
            background: var(--pickachu-code-bg, #f8f9fa);
          ">
            <div style="flex: 1;">
              <div style="font-weight: 600; margin-bottom: 4px; color: var(--pickachu-text, #333);">
                Note ${noteNumber}
              </div>
              <div style="font-size: 12px; color: var(--pickachu-secondary-text, #666);">
                ${shortContent}
              </div>
              <div style="font-size: 11px; color: var(--pickachu-secondary-text, #666); margin-top: 4px;">
                Created: ${createdAt}
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="window.stickyNotesModule.focusNote('${sanitizedNoteId}')" style="
                padding: 4px 8px;
                border: 1px solid var(--pickachu-border, #ddd);
                background: var(--pickachu-button-bg, #f0f0f0);
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                color: #000000;
              ">Focus</button>
              <button onclick="window.stickyNotesModule.deleteNote('${sanitizedNoteId}')" style="
                padding: 4px 8px;
                border: 1px solid var(--pickachu-border, #ddd);
                background: var(--pickachu-error-color, #dc3545);
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                color: var(--pickachu-bg, #fff);
              ">Delete</button>
            </div>
          </div>
        `;
      } catch (error) {
        handleError(error, 'render note list item');
        return '';
      }
    }).join('');
  } catch (error) {
    handleError(error, 'renderNotesList');
    return '<div style="text-align: center; color: var(--pickachu-error-color, #dc3545); padding: 20px;">Failed to render notes</div>';
  }
}

// Focus a specific note (bring to front and highlight) with enhanced error handling
function focusNote(noteElement) {
  try {
    if (!noteElement) {
      throw new Error('No note element provided');
    }
    
    // Bring to front
    noteElement.style.zIndex = '2147483647';
    
    // Add highlight effect
    noteElement.style.transform = 'scale(1.05)';
    noteElement.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
    
    // Focus the textarea
    const textarea = safeExecute(() => noteElement.querySelector('textarea'), 'get textarea');
    if (textarea) {
      safeExecute(() => textarea.focus(), 'focus textarea');
    }
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
      try {
        noteElement.style.transform = '';
        noteElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      } catch (error) {
        handleError(error, 'focus note cleanup');
      }
    }, 2000);
  } catch (error) {
    handleError(error, 'focusNote');
  }
}

// Expose functions globally in a controlled way to avoid pollution
if (typeof window !== 'undefined') {
  window.stickyNotesModule = {
    deleteNote: deleteNote,
    focusNote: focusNoteById
  };
}