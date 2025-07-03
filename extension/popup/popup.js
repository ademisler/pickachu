document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({type: 'ACTIVATE_TOOL', tool: btn.id});
      window.close();
    });
  });
});
