// content.js
let activeTool = null;
let pickerModules = {};

const state = {
    isActive: false,
    currentTool: null,
};

async function loadModule(tool) {
    if (pickerModules[tool]) {
        return pickerModules[tool];
    }
    const src = chrome.runtime.getURL(`modules/${tool}.js`);
    const module = await import(src);
    pickerModules[tool] = module;
    return module;
}

function deactivateCurrentTool() {
    if (state.isActive && state.currentTool && pickerModules[state.currentTool]) {
        pickerModules[state.currentTool].deactivate();
    }
    state.isActive = false;
    state.currentTool = null;
    document.body.style.cursor = 'default';
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === 'ACTIVATE_TOOL_ON_PAGE') {
        deactivateCurrentTool();
        const toolName = request.tool.replace(/-/g, '_').replace(/_picker|_generator/g, '') + 'Picker';
        const moduleName = `${request.tool.split('-')[0]}Picker`;

        try {
            const module = await loadModule(moduleName + '.js');
            if (module && typeof module.activate === 'function') {
                state.isActive = true;
                state.currentTool = moduleName;
                module.activate(deactivateCurrentTool);
            }
        } catch (error) {
            console.error(`Pickachu: Error loading module for ${request.tool}`, error);
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        deactivateCurrentTool();
    }
});