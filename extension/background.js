// background.js
chrome.runtime.onMessage.addListener(request => {
  if (request.type === 'ACTIVATE_TOOL') {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ['content/content.js']
        }, () => {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'ACTIVATE_TOOL_ON_PAGE',
            tool: request.tool
          });
        });
      }
    });
  }
});

const commandMap = {
  'activate-color-picker': 'color-picker',
  'activate-element-picker': 'element-picker',
  'activate-link-picker': 'link-picker',
  'activate-selector-generator': 'selector-generator'
};

chrome.commands.onCommand.addListener(command => {
  const tool = commandMap[command];
  if (!tool) return;
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content/content.js']
      }, () => {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'ACTIVATE_TOOL_ON_PAGE',
          tool
        });
      });
    }
  });
});
