// Prevent multiple injections
if (window.pickachuInitialized) {
  console.log('Pickachu already initialized, skipping...');
} else {
  window.pickachuInitialized = true;

let activeModule = null;
const modules = {};

async function loadModule(name) {
  if (modules[name]) return modules[name];
  
  try {
    const url = chrome.runtime.getURL(`modules/${name}.js`);
    const mod = await import(url);
    modules[name] = mod;
    return mod;
  } catch (error) {
    console.error('Pickachu: Failed to load module', name, error);
    throw error;
  }
}

function resetActiveModule() {
  if (activeModule && activeModule.deactivate) {
    try {
      activeModule.deactivate();
    } catch (error) {
      console.error('Pickachu: Error deactivating module:', error);
    }
  }
  activeModule = null;
  document.body.style.cursor = '';
}


// Signal that content script is ready
function signalReady() {
  // Send ready signal to background script
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch(() => {
    // Ignore errors if background script is not available
  });
}

// Show Pickachu overlay when keyboard shortcut is used
function showPickachuOverlay() {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById('pickachu-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'pickachu-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: pickachu-fade-in 0.3s ease-out;
  `;
  
  const popup = document.createElement('div');
  popup.style.cssText = `
    background: var(--pickachu-bg, #fff);
    border: 1px solid var(--pickachu-border, #ddd);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    color: var(--pickachu-text, #333);
    min-width: 300px;
    text-align: center;
  `;
  
  popup.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0 0 16px 0; color: var(--pickachu-text, #333); display: flex; align-items: center; justify-content: center; gap: 8px;">
        🎯 Pickachu
      </h2>
      <p style="margin: 0; color: var(--pickachu-secondary-text, #666); font-size: 14px;">
        Use the extension icon in your browser toolbar to access all tools.
      </p>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
      <div style="padding: 12px; background: var(--pickachu-code-bg, #f8f9fa); border-radius: 8px; border: 1px solid var(--pickachu-border, #ddd);">
        <div style="font-size: 18px; margin-bottom: 4px;">🎨</div>
        <div style="font-size: 12px; font-weight: 600;">Color Picker</div>
      </div>
      <div style="padding: 12px; background: var(--pickachu-code-bg, #f8f9fa); border-radius: 8px; border: 1px solid var(--pickachu-border, #ddd);">
        <div style="font-size: 18px; margin-bottom: 4px;">🧾</div>
        <div style="font-size: 12px; font-weight: 600;">Text Picker</div>
      </div>
      <div style="padding: 12px; background: var(--pickachu-code-bg, #f8f9fa); border-radius: 8px; border: 1px solid var(--pickachu-border, #ddd);">
        <div style="font-size: 18px; margin-bottom: 4px;">🧱</div>
        <div style="font-size: 12px; font-weight: 600;">Element Picker</div>
      </div>
      <div style="padding: 12px; background: var(--pickachu-code-bg, #f8f9fa); border-radius: 8px; border: 1px solid var(--pickachu-border, #ddd);">
        <div style="font-size: 18px; margin-bottom: 4px;">📸</div>
        <div style="font-size: 12px; font-weight: 600;">Screenshot</div>
      </div>
    </div>
    
    <button id="close-pickachu-overlay" style="
      padding: 10px 20px;
      border: 1px solid var(--pickachu-border, #ddd);
      background: var(--pickachu-button-bg, #f0f0f0);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      color: var(--pickachu-text, #333);
    ">Close</button>
  `;
  
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  // Add event listeners
  document.getElementById('close-pickachu-overlay').addEventListener('click', () => {
    overlay.remove();
  });
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Close on Escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'ACTIVATE_TOOL_ON_PAGE') {
    try {
      resetActiveModule();
      
      const moduleName = msg.tool.replace(/-([a-z])/g, (_,c)=>c.toUpperCase());
      console.log('Pickachu: Activating tool:', moduleName);
      
      const mod = await loadModule(moduleName);
      if (mod && mod.activate) {
        activeModule = mod;
        mod.activate(resetActiveModule);
        console.log('Pickachu: Tool activated successfully:', moduleName);
      } else {
        console.error('Pickachu: Module does not have activate function:', moduleName);
      }
    } catch(e){
      console.error('Pickachu: Failed to activate tool', msg.tool, e);
    }
  } else if (msg.type === 'GET_PAGE_INFO') {
    // For screenshot tool - unified page info
    const pageInfo = {
      width: Math.max(
        document.body.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.clientWidth,
        document.documentElement.scrollWidth,
        document.documentElement.offsetWidth
      ),
      height: Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      ),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      title: document.title,
      url: window.location.href,
      timestamp: Date.now()
    };
    sendResponse(pageInfo);
  } else if (msg.type === 'SHOW_PICKACHU_POPUP') {
    // Show popup overlay when keyboard shortcut is used
    showPickachuOverlay();
  } else if (msg.type === 'SHOW_FAVORITES') {
    // Show favorites modal
    import('./modules/helpers.js').then(helpers => {
      helpers.showFavorites();
    }).catch(error => {
      console.error('Failed to load helpers for favorites:', error);
    });
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    resetActiveModule();
  }
});

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', signalReady);
} else {
  signalReady();
}

} // End of pickachu initialization check
