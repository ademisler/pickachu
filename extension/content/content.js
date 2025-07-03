let activeModule = null;
const modules = {};

async function loadModule(name) {
  if (modules[name]) return modules[name];
  const url = chrome.runtime.getURL(`modules/${name}.js`);
  const mod = await import(url);
  modules[name] = mod;
  return mod;
}

function deactivate() {
  if (activeModule && activeModule.deactivate) {
    activeModule.deactivate();
  }
  activeModule = null;
  document.body.style.cursor = '';
}

chrome.runtime.onMessage.addListener(async msg => {
  if (msg.type === 'ACTIVATE_TOOL_ON_PAGE') {
    deactivate();
    const moduleName = msg.tool.replace(/-([a-z])/g, (_,c)=>c.toUpperCase());
    try {
      const mod = await loadModule(moduleName);
      if (mod && mod.activate) {
        activeModule = mod;
        mod.activate(deactivate);
      }
    } catch(e){
      console.error('Pickachu: failed to load', moduleName, e);
    }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    deactivate();
  }
});
