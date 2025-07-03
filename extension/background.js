// background.js
async function ensureContent(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
  } catch (e) {
    // script likely already injected
  }
}

chrome.runtime.onMessage.addListener(request => {
  if (request.type === 'ACTIVATE_TOOL') {
    chrome.tabs.query({active: true, currentWindow: true}, async tabs => {
      if (tabs[0]) {
        await ensureContent(tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'ACTIVATE_TOOL_ON_PAGE',
          tool: request.tool
        });
      }
    });
  }
});

chrome.commands.onCommand.addListener(command => {
  chrome.tabs.query({active: true, currentWindow: true}, async tabs => {
    if (tabs[0]) {
      const tool = command.replace('activate-','');
      await ensureContent(tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'ACTIVATE_TOOL_ON_PAGE',
        tool
      });
    }
  });
});
