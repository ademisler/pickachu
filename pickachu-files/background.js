// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ACTIVATE_TOOL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'ACTIVATE_TOOL_ON_PAGE',
          tool: request.tool,
        });
      }
    });
  }
});