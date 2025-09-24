import { showError, showSuccess, showInfo } from './helpers.js';

let notes = [];
let isCreatingNote = false;

// Load notes for current page
async function loadNotesForPage() {
  try {
    const url = window.location.href;
    const { stickyNotes = {} } = await chrome.storage.local.get('stickyNotes');
    notes = stickyNotes[url] || [];
    return notes;
  } catch (error) {
    console.error('Failed to load notes:', error);
    return [];
  }
}

// Save notes for current page
async function saveNotesForPage() {
  try {
    const url = window.location.href;
    const { stickyNotes = {} } = await chrome.storage.local.get('stickyNotes');
    stickyNotes[url] = notes;
    await chrome.storage.local.set({ stickyNotes });
  } catch (error) {
    console.error('Failed to save notes:', error);
  }
}

// Create new sticky note
function createStickyNote(x = null, y = null) {
  if (isCreatingNote) return;
  
  isCreatingNote = true;
  
  const noteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const note = {
    id: noteId,
    title: 'New Note',
    content: '',
    x: x || Math.random() * (window.innerWidth - 300),
    y: y || Math.random() * (window.innerHeight - 200),
    width: 280,
    height: 200,
    color: '#fff3cd',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: window.location.href,
    pageTitle: document.title
  };
  
  notes.push(note);
  renderNote(note);
  saveNotesForPage();
  
  showSuccess('New sticky note created!');
  isCreatingNote = false;
}

// Render a single note
function renderNote(note) {
  const noteElement = document.createElement('div');
  noteElement.id = note.id;
  noteElement.className = 'pickachu-sticky-note';
  noteElement.style.cssText = `
    position: fixed;
    left: ${note.x}px;
    top: ${note.y}px;
    width: ${note.width}px;
    height: ${note.height}px;
    background: ${note.color};
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2147483646;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    cursor: move;
    resize: both;
    overflow: hidden;
    animation: pickachu-note-appear 0.3s ease-out;
  `;
  
  noteElement.innerHTML = `
    <div class="note-header" style="
      padding: 8px 12px;
      background: rgba(0,0,0,0.05);
      border-bottom: 1px solid rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      user-select: none;
    ">
      <input type="text" class="note-title" value="${note.title}" style="
        background: none;
        border: none;
        font-weight: 600;
        font-size: 14px;
        color: var(--pickachu-text, #333);
        flex: 1;
        outline: none;
        padding: 2px 4px;
        border-radius: 3px;
      ">
      <div class="note-controls" style="display: flex; gap: 4px;">
        <button class="note-color-btn" style="
          width: 16px;
          height: 16px;
          border: 1px solid #ddd;
          border-radius: 3px;
          cursor: pointer;
          background: ${note.color};
        " title="Change Color"></button>
        <button class="note-minimize-btn" style="
          width: 16px;
          height: 16px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 12px;
          color: var(--pickachu-secondary-text, #666);
        " title="Minimize">−</button>
        <button class="note-delete-btn" style="
          width: 16px;
          height: 16px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 12px;
          color: var(--pickachu-error-color, #dc3545);
        " title="Delete">×</button>
      </div>
    </div>
    <div class="note-content" style="
      padding: 12px;
      height: calc(100% - 40px);
      overflow-y: auto;
    ">
      <textarea class="note-textarea" style="
        width: 100%;
        height: 100%;
        border: none;
        background: none;
        resize: none;
        outline: none;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        color: var(--pickachu-text, #333);
      " placeholder="Write your note here...">${note.content}</textarea>
    </div>
  `;
  
  // Add event listeners
  setupNoteEventListeners(noteElement, note);
  
  document.body.appendChild(noteElement);
  
  // Focus on title input
  const titleInput = noteElement.querySelector('.note-title');
  titleInput.focus();
  titleInput.select();
}

// Setup event listeners for a note
function setupNoteEventListeners(noteElement, note) {
  let isDragging = false;
  let isResizing = false;
  let startX, startY, startWidth, startHeight;
  
  // Drag functionality
  const header = noteElement.querySelector('.note-header');
  header.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    
    isDragging = true;
    startX = e.clientX - noteElement.offsetLeft;
    startY = e.clientY - noteElement.offsetTop;
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  });
  
  function onDrag(e) {
    if (!isDragging) return;
    
    const newX = e.clientX - startX;
    const newY = e.clientY - startY;
    
    // Keep note within viewport
    const maxX = window.innerWidth - noteElement.offsetWidth;
    const maxY = window.innerHeight - noteElement.offsetHeight;
    
    noteElement.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
    noteElement.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
  }
  
  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    // Update note position
    note.x = noteElement.offsetLeft;
    note.y = noteElement.offsetTop;
    saveNotesForPage();
  }
  
  // Resize functionality
  noteElement.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const rect = noteElement.getBoundingClientRect();
    const isResizeHandle = (
      e.clientX > rect.right - 10 && e.clientY > rect.bottom - 10
    );
    
    if (isResizeHandle) {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = noteElement.offsetWidth;
      startHeight = noteElement.offsetHeight;
      
      document.addEventListener('mousemove', onResize);
      document.addEventListener('mouseup', stopResize);
      e.preventDefault();
    }
  });
  
  function onResize(e) {
    if (!isResizing) return;
    
    const newWidth = Math.max(200, startWidth + (e.clientX - startX));
    const newHeight = Math.max(150, startHeight + (e.clientY - startY));
    
    noteElement.style.width = newWidth + 'px';
    noteElement.style.height = newHeight + 'px';
  }
  
  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
    
    // Update note dimensions
    note.width = noteElement.offsetWidth;
    note.height = noteElement.offsetHeight;
    saveNotesForPage();
  }
  
  // Title editing
  const titleInput = noteElement.querySelector('.note-title');
  titleInput.addEventListener('blur', () => {
    note.title = titleInput.value || 'Untitled Note';
    note.updatedAt = new Date().toISOString();
    saveNotesForPage();
  });
  
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleInput.blur();
    }
  });
  
  // Content editing
  const textarea = noteElement.querySelector('.note-textarea');
  textarea.addEventListener('input', () => {
    note.content = textarea.value;
    note.updatedAt = new Date().toISOString();
    saveNotesForPage();
  });
  
  // Color change
  const colorBtn = noteElement.querySelector('.note-color-btn');
  colorBtn.addEventListener('click', () => {
    const colors = [
      '#fff3cd', '#d1ecf1', '#d4edda', '#f8d7da', 
      '#e2e3e5', '#fce4ec', '#e8f5e8', '#fff8e1'
    ];
    const currentIndex = colors.indexOf(note.color);
    const nextIndex = (currentIndex + 1) % colors.length;
    note.color = colors[nextIndex];
    
    noteElement.style.background = note.color;
    colorBtn.style.background = note.color;
    saveNotesForPage();
  });
  
  // Minimize functionality
  const minimizeBtn = noteElement.querySelector('.note-minimize-btn');
  minimizeBtn.addEventListener('click', () => {
    const content = noteElement.querySelector('.note-content');
    const isMinimized = content.style.display === 'none';
    
    if (isMinimized) {
      content.style.display = 'block';
      noteElement.style.height = note.height + 'px';
      minimizeBtn.textContent = '−';
    } else {
      content.style.display = 'none';
      noteElement.style.height = '40px';
      minimizeBtn.textContent = '+';
    }
  });
  
  // Delete functionality
  const deleteBtn = noteElement.querySelector('.note-delete-btn');
  deleteBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this note?')) {
      noteElement.remove();
      const index = notes.findIndex(n => n.id === note.id);
      if (index > -1) {
        notes.splice(index, 1);
        saveNotesForPage();
        showSuccess('Note deleted');
      }
    }
  });
}

// Load all notes for current page
async function loadAllNotes() {
  const pageNotes = await loadNotesForPage();
  pageNotes.forEach(note => {
    renderNote(note);
  });
  
  if (pageNotes.length > 0) {
    showInfo(`${pageNotes.length} notes loaded for this page`, 2000);
  }
}

// Show notes management modal (currently unused)
// function showNotesManager() {
  const modal = document.createElement('div');
  modal.id = 'pickachu-notes-manager';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 800px;
    max-height: 80vh;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
        📝 Notes Manager
      </h3>
      <button id="close-notes-manager" style="
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--pickachu-secondary-text, #666);
        padding: 4px 8px;
        border-radius: 4px;
      ">×</button>
    </div>
    
    <div style="margin-bottom: 16px;">
      <button id="create-new-note" style="
        padding: 8px 16px;
        border: 1px solid #007bff;
        background: var(--pickachu-button-bg, #007bff);
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        margin-right: 8px;
      ">Create New Note</button>
      
      <button id="export-notes" style="
        padding: 8px 16px;
        border: 1px solid #28a745;
        background: var(--pickachu-button-bg, #28a745);
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        margin-right: 8px;
      ">Export All Notes</button>
      
      <button id="import-notes" style="
        padding: 8px 16px;
        border: 1px solid #6c757d;
        background: var(--pickachu-button-bg, #6c757d);
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      ">Import Notes</button>
    </div>
    
    <div id="notes-list" style="
      flex: 1;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 12px;
    ">
      Loading notes...
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Load and display all notes
  loadAllNotesForManager();
  
  // Event handlers
  document.getElementById('close-notes-manager').onclick = () => {
    modal.remove();
  };
  
  document.getElementById('create-new-note').onclick = () => {
    modal.remove();
    createStickyNote();
  };
  
  document.getElementById('export-notes').onclick = () => {
    exportAllNotes();
  };
  
  document.getElementById('import-notes').onclick = () => {
    importNotes();
  };
  
  // Close on Escape
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
// }

// Load all notes for manager
async function loadAllNotesForManager() {
  try {
    const { stickyNotes = {} } = await chrome.storage.local.get('stickyNotes');
    const allNotes = Object.entries(stickyNotes).flatMap(([url, notes]) => 
      notes.map(note => ({ ...note, url }))
    );
    
    const notesList = document.getElementById('notes-list');
    
    if (allNotes.length === 0) {
      notesList.innerHTML = '<div style="text-align: center; padding: 20px;" class="secondary-text">No notes found</div>';
      return;
    }
    
    // Group notes by page
    const notesByPage = allNotes.reduce((acc, note) => {
      if (!acc[note.url]) acc[note.url] = [];
      acc[note.url].push(note);
      return acc;
    }, {});
    
    let html = '';
    Object.entries(notesByPage).forEach(([url, pageNotes]) => {
      const pageTitle = pageNotes[0].pageTitle || new URL(url).hostname;
      html += `
        <div style="margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
          <h4 style="margin: 0 0 8px 0; font-size: 16px;">
            📄 ${pageTitle}
          </h4>
          <div style="font-size: 12px; margin-bottom: 8px;" class="secondary-text">
            ${url} (${pageNotes.length} notes)
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${pageNotes.map(note => `
              <div style="
                background: ${note.color};
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 8px;
                min-width: 200px;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="openNote('${note.id}')">
                <div style="font-weight: 600; margin-bottom: 4px; font-size: 13px;">
                  ${note.title}
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;" class="secondary-text">
                  ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}
                </div>
                <div style="font-size: 11px;" class="secondary-text">
                  ${new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
    
    notesList.innerHTML = html;
    
  } catch (error) {
    console.error('Failed to load notes for manager:', error);
    document.getElementById('notes-list').innerHTML = '<div style="text-align: center; padding: 20px; color: var(--pickachu-error-color, #dc3545);">Error loading notes</div>';
  }
}

// Export all notes
async function exportAllNotes() {
  try {
    const { stickyNotes = {} } = await chrome.storage.local.get('stickyNotes');
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      notes: stickyNotes
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pickachu-notes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccess('Notes exported successfully!');
    
  } catch (error) {
    console.error('Export error:', error);
    showError('Failed to export notes');
  }
}

// Import notes
function importNotes() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.notes) {
        await chrome.storage.local.set({ stickyNotes: data.notes });
        showSuccess('Notes imported successfully!');
        
        // Reload current page notes
        await loadAllNotes();
      } else {
        showError('Invalid notes file format');
      }
    } catch (error) {
      console.error('Import error:', error);
      showError('Failed to import notes');
    }
  };
  
  input.click();
}

// Global function to open note (called from manager)
window.openNote = function(noteId) {
  // Find and focus the note
  const noteElement = document.getElementById(noteId);
  if (noteElement) {
    noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    noteElement.style.animation = 'pickachu-note-highlight 1s ease-out';
    setTimeout(() => {
      noteElement.style.animation = '';
    }, 1000);
  }
};

export function activate(deactivate) {
  
  try {
    // Add CSS animations
    if (!document.querySelector('#pickachu-notes-styles')) {
      const style = document.createElement('style');
      style.id = 'pickachu-notes-styles';
      style.textContent = `
        @keyframes pickachu-note-appear {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes pickachu-note-highlight {
          0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          50% { box-shadow: 0 8px 24px rgba(255, 193, 7, 0.6); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Load existing notes
    loadAllNotes();
    
    // Show options
    showInfo('Sticky Notes activated! Click anywhere to create a note, or use the manager.', 3000);
    
    // Add click handler for creating notes
    document.addEventListener('click', createNoteOnClick, true);
    
  } catch (error) {
    console.error('Sticky notes activation error:', error);
    showError('Failed to activate sticky notes. Please try again.');
    deactivate();
  }
}

// Create note on click
function createNoteOnClick(e) {
  if (e.target.closest('.pickachu-sticky-note') || 
      e.target.closest('#pickachu-notes-manager')) {
    return;
  }
  
  createStickyNote(e.clientX, e.clientY);
}

export function deactivate() {
  try {
    document.removeEventListener('click', createNoteOnClick, true);
    
    // Close manager if open
    const manager = document.getElementById('pickachu-notes-manager');
    if (manager) {
      manager.remove();
    }
    
    showInfo('Sticky Notes deactivated. Your notes are saved and will appear when you return to this page.', 2000);
    
  } catch (error) {
    console.error('Sticky notes deactivation error:', error);
  }
}