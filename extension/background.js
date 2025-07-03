// background.js
chrome.runtime.onMessage.addListener(request => {
  if (request.type === 'ACTIVATE_TOOL') {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'ACTIVATE_TOOL_ON_PAGE',
          tool: request.tool
        });
      }
    });
  }
});

chrome.commands.onCommand.addListener(command => {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'ACTIVATE_TOOL_ON_PAGE',
        tool: command
      });
    }
  });
});
