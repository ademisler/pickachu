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
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      const injected = await ensureContentScriptInjected(tab.id);
      if (!injected) {
        console.error('Failed to inject content script');
        sendResponse({ success: false, error: 'Failed to inject content script' });
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
      
      sendResponse({ success: true });
      
    } catch (error) {
      console.error('Error in ACTIVATE_TOOL:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'CAPTURE_VISIBLE_TAB') {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (!tab) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      // Capture visible tab with high quality
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 100
      });
      
      sendResponse({ success: true, dataUrl: dataUrl });
      
    } catch (error) {
      console.error('Error capturing visible tab:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-popup' || command === 'toggle-popup') {
    try {
      // Try to open popup first
      await chrome.action.openPopup();
    } catch (error) {
      // If popup fails (common on macOS), fallback to tab-based approach
      console.log('Popup failed, trying alternative approach:', error);
      
      try {
        // Get the current active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (tab) {
          // Ensure content script is injected
          const injected = await ensureContentScriptInjected(tab.id);
          if (injected) {
            // Send message to show popup in content script
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                type: 'SHOW_PICKACHU_POPUP'
              }).catch(error => {
                console.error('Failed to show popup via content script:', error);
              });
            }, 100);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback popup method also failed:', fallbackError);
      }
    }
    return;
  }
});

// Clean up cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});
