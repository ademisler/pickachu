document.addEventListener('DOMContentLoaded', () => {
  if (chrome?.i18n) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = chrome.i18n.getMessage(el.dataset.i18n) || el.textContent;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = chrome.i18n.getMessage(el.dataset.i18nTitle) || el.title;
    });
  }
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({type: 'ACTIVATE_TOOL', tool: btn.id});
      window.close();
    });
  });
});
