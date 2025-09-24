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
    (async () => {
      try {
        console.log('Capturing visible tab...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (!tab) {
          console.error('No active tab found');
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }
        
        console.log('Active tab found:', tab.id, tab.url);
        
        // Capture visible tab with specified format and quality
        const format = request.format || 'png';
        const quality = request.quality || 100;
        
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: format,
          quality: quality
        });
        
        if (!dataUrl) {
          throw new Error('Failed to capture visible tab - no data URL returned');
        }
        
        console.log('Screenshot captured successfully, data URL length:', dataUrl.length);
        sendResponse({ success: true, dataUrl: dataUrl });
        
      } catch (error) {
        console.error('Error capturing visible tab:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
      }
    })();
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'GET_PAGE_DIMENSIONS') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (!tab) {
          console.error('No active tab found');
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }
        
        // Execute script to get page dimensions
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return {
              width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
              height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight),
              scrollWidth: document.documentElement.scrollWidth,
              scrollHeight: document.documentElement.scrollHeight,
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight
            };
          }
        });
        
        if (results && results[0] && results[0].result) {
          sendResponse({ success: true, dimensions: results[0].result });
        } else {
          throw new Error('Failed to get page dimensions');
        }
        
      } catch (error) {
        console.error('Error getting page dimensions:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
      }
    })();
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
