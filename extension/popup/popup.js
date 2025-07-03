async function loadLang(lang){
  const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
  return res.json();
}

function applyLang(map){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = map[el.dataset.i18n]?.message || el.textContent;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = map[el.dataset.i18nTitle]?.message || el.title;
  });
}

function applyTheme(theme){
  document.body.classList.remove('light','dark');
  if(theme==='light') document.body.classList.add('light');
  if(theme==='dark') document.body.classList.add('dark');
}

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['language','theme']);
  const lang = stored?.language || 'en';
  const theme = stored?.theme || 'system';
  const map = await loadLang(lang);
  applyLang(map);
  document.getElementById('lang-select').value = lang;
  document.getElementById('theme-select').value = theme;
  applyTheme(theme);
  document.getElementById('lang-select').addEventListener('change', async e => {
    const newLang = e.target.value;
    chrome.storage.local.set({language:newLang});
    const m = await loadLang(newLang);
    applyLang(m);
  });
  document.getElementById('theme-select').addEventListener('change', e => {
    const t = e.target.value;
    chrome.storage.local.set({theme:t});
    applyTheme(t);
  });
  document.querySelectorAll('.grid button').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({type: 'ACTIVATE_TOOL', tool: btn.id});
      window.close();
    });
  });
});
