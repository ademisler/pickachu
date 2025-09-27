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

async function dispatchToolToActiveTab(toolId) {
  if (!toolId) {
    throw new Error('Missing tool identifier');
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab) {
    throw new Error('No active tab found');
  }

  const injected = await ensureContentScriptInjected(tab.id);
  if (!injected) {
    throw new Error('Unable to inject content script');
  }

  await new Promise(resolve => setTimeout(resolve, 80));

  await chrome.tabs.sendMessage(tab.id, {
    type: 'ACTIVATE_TOOL_ON_PAGE',
    tool: toolId
  });

  return true;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ACTIVATE_TOOL') {
    (async () => {
      try {
        await dispatchToolToActiveTab(request.tool);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error in ACTIVATE_TOOL:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.type === 'CAPTURE_VISIBLE_TAB') {
    (async () => {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png', quality: 100 });
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        if (!dataUrl) {
          throw new Error('No image data received.');
        }
        sendResponse({ success: true, dataUrl });
      } catch (error) {
        console.error('Error capturing visible tab:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.type === 'DOWNLOAD_MEDIA') {
    try {
      const { url, filename } = request;
      if (!url) {
        sendResponse({ success: false, error: 'Missing media URL.' });
        return true;
      }

      chrome.downloads.download({ url, filename }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true, downloadId });
      });
    } catch (error) {
      console.error('Failed to initiate download:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
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

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const rect = document.documentElement.getBoundingClientRect();
            return {
              width: rect.width,
              height: rect.height,
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
    return true;
  }
});

const COMMAND_TOOL_MAP = {
  'activate-color-picker': 'color-picker',
  'activate-element-picker': 'element-picker',
  'activate-screenshot-picker': 'screenshot-picker'
};

chrome.commands.onCommand.addListener(async (command) => {
  if (COMMAND_TOOL_MAP[command]) {
    try {
      await dispatchToolToActiveTab(COMMAND_TOOL_MAP[command]);
    } catch (error) {
      console.error(`Failed to run command ${command}:`, error);
    }
    return;
  }

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
