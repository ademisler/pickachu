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
  isReady = true;
  // Send ready signal to background script
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch(() => {
    // Ignore errors if background script is not available
  });
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
  } else if (msg.type === 'GET_PAGE_DIMENSIONS') {
    // For screenshot tool
    const dimensions = {
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
      viewportHeight: window.innerHeight
    };
    sendResponse(dimensions);
  } else if (msg.type === 'GET_PAGE_INFO') {
    // For screenshot tool
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
      url: window.location.href
    };
    sendResponse(pageInfo);
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
