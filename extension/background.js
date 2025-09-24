// background.js
// Content script injection cache
const injectedTabs = new Set();

async function ensureContentScriptInjected(tabId) {
  if (injectedTabs.has(tabId)) {
    return true;
  }
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/content.js']
    });
    injectedTabs.add(tabId);
    return true;
  } catch (error) {
    console.error('Failed to inject content script:', error);
    return false;
  }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'ACTIVATE_TOOL') {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (!tab) {
        console.error('No active tab found');
        return;
      }

      const injected = await ensureContentScriptInjected(tab.id);
      if (!injected) {
        console.error('Failed to inject content script');
        return;
      }

      // Wait a bit for content script to be ready
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'ACTIVATE_TOOL_ON_PAGE',
          tool: request.tool
        }).catch(error => {
          console.error('Failed to send message to content script:', error);
        });
      }, 100);
      
    } catch (error) {
      console.error('Error in ACTIVATE_TOOL:', error);
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-popup') {
    chrome.action.openPopup();
    return;
  }
});

// Clean up cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});
