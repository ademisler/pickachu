import { showSuccess } from './helpers.js';

let deactivateCb;
let notes = [];
let noteCounter = 0;

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
  deactivateCb = deactivate;
  
  // Load existing notes
  loadNotes().then(() => {
    showNotesManager();
  });
}

export function deactivate() {
  // Save notes before deactivating
  saveNotes();
  
  // Remove any existing note managers
  const existingManager = document.getElementById('pickachu-notes-manager');
  if (existingManager) {
    existingManager.remove();
  }
  
  // Remove any existing sticky notes from the page
  document.querySelectorAll('.pickachu-sticky-note').forEach(note => note.remove());
  
  if (deactivateCb) deactivateCb();
}

// Create a new sticky note
function createStickyNote(x, y, color = NOTE_COLORS[0].value) {
  const noteId = `note-${++noteCounter}`;
  const note = {
    id: noteId,
    x: x,
    y: y,
    color: color,
    content: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  notes.push(note);
  renderStickyNote(note);
  saveNotes();
  
  return note;
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
  title.textContent = 'Sticky Note';
  title.style.cssText = `
    font-weight: 600;
    color: var(--pickachu-text, #333);
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
    color: var(--pickachu-text, #333);
  `;
  
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showColorPicker(note);
  });
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = '×';
  deleteBtn.title = 'Delete note';
  deleteBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 2px 4px;
    border-radius: 3px;
    color: var(--pickachu-error-color, #dc3545);
    font-weight: bold;
  `;
  
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteNote(note.id);
  });
  
  controls.appendChild(colorBtn);
  controls.appendChild(deleteBtn);
  header.appendChild(title);
  header.appendChild(controls);
  
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
    color: var(--pickachu-text, #333);
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
    
    noteElement.style.left = Math.max(0, Math.min(window.innerWidth - 250, x)) + 'px';
    noteElement.style.top = Math.max(0, Math.min(window.innerHeight - 150, y)) + 'px';
    
    note.x = parseInt(noteElement.style.left);
    note.y = parseInt(noteElement.style.top);
  }
  
  function handleDragEnd() {
    isDragging = false;
    noteElement.style.transform = 'scale(1)';
    noteElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    
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
      <button id="cancel-color" class="modal-close">×</button>
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

// Delete a note
function deleteNote(noteId) {
  const noteElement = document.getElementById(noteId);
  if (noteElement) {
    noteElement.remove();
  }
  
  notes = notes.filter(note => note.id !== noteId);
  saveNotes();
  
  showSuccess('Note deleted');
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
      <button id="close-notes-manager" class="modal-close">×</button>
    </div>
    
    <div style="padding: 20px;">
      <div style="margin-bottom: 16px;">
        <button id="create-new-note" class="btn btn-primary">+ Add New Note</button>
        <button id="clear-all-notes" class="btn btn-danger" style="margin-left: 12px;">🗑️ Clear All</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: var(--pickachu-text, #333);">Instructions:</div>
        <div style="font-size: 14px; color: var(--pickachu-secondary-text, #666); line-height: 1.4;">
          • Click "Add New Note" to create a sticky note<br>
          • Drag notes by their header to move them<br>
          • Click the 🎨 button to change note color<br>
          • Click × to delete individual notes<br>
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
  document.getElementById('close-notes-manager').addEventListener('click', () => {
    manager.remove();
    deactivate();
  });
  
  document.getElementById('create-new-note').addEventListener('click', () => {
    manager.remove();
    const centerX = window.innerWidth / 2 - 125;
    const centerY = window.innerHeight / 2 - 75;
    createStickyNote(centerX, centerY);
  });
  
  document.getElementById('clear-all-notes').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all notes? This cannot be undone.')) {
      notes.forEach(note => {
        const noteElement = document.getElementById(note.id);
        if (noteElement) noteElement.remove();
      });
      notes = [];
      saveNotes();
      document.getElementById('notes-list').innerHTML = '<div style="text-align: center; padding: 20px; color: var(--pickachu-secondary-text, #666);">No notes found</div>';
      showSuccess('All notes cleared');
    }
  });
  
  // Load existing notes
  loadExistingNotes();
}

// Load existing notes from storage
async function loadNotes() {
  try {
    const result = await chrome.storage.local.get(['stickyNotes']);
    notes = result.stickyNotes || [];
    noteCounter = Math.max(0, ...notes.map(note => parseInt(note.id.split('-')[1]) || 0));
  } catch (error) {
    console.error('Failed to load notes:', error);
    notes = [];
  }
}

// Load existing notes onto the page
function loadExistingNotes() {
  notes.forEach(note => {
    renderStickyNote(note);
  });
}

// Save notes to storage
async function saveNotes() {
  try {
    await chrome.storage.local.set({ stickyNotes: notes });
  } catch (error) {
    console.error('Failed to save notes:', error);
  }
}

// Render notes list in manager
function renderNotesList() {
  if (notes.length === 0) {
    return '<div style="text-align: center; padding: 20px; color: var(--pickachu-secondary-text, #666);">No notes found</div>';
  }
  
  return notes.map(note => `
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
          Note ${note.id.split('-')[1]}
        </div>
        <div style="font-size: 12px; color: var(--pickachu-secondary-text, #666);">
          ${note.content ? note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '') : 'Empty note'}
        </div>
        <div style="font-size: 11px; color: var(--pickachu-secondary-text, #666); margin-top: 4px;">
          Created: ${new Date(note.createdAt).toLocaleString()}
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="focusNote('${note.id}')" style="
          padding: 4px 8px;
          border: 1px solid var(--pickachu-border, #ddd);
          background: var(--pickachu-button-bg, #f0f0f0);
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          color: var(--pickachu-text, #333);
        ">Focus</button>
        <button onclick="deleteNote('${note.id}')" style="
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
  `).join('');
}

// Global functions for inline onclick handlers
window.focusNote = function(noteId) {
  const noteElement = document.getElementById(noteId);
  if (noteElement) {
    noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    noteElement.style.transform = 'scale(1.1)';
    noteElement.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    setTimeout(() => {
      noteElement.style.transform = 'scale(1)';
      noteElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    }, 1000);
  }
};

window.deleteNote = deleteNote;