// background.js
chrome.runtime.onMessage.addListener(request => {
  if (request.type === 'ACTIVATE_TOOL') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (tab) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        }).finally(() => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'ACTIVATE_TOOL_ON_PAGE',
            tool: request.tool
          });
        });
      }
    });
  }
});

chrome.commands.onCommand.addListener(command => {
  if (command === 'open-popup') {
    chrome.action.openPopup();
    return;
  }
  const tool = command.replace(/^activate-/, '');
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (tab) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      }).finally(() => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'ACTIVATE_TOOL_ON_PAGE',
          tool
        });
      });
    }
  });
});
