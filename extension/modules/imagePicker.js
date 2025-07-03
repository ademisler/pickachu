import { copyText, showModal } from './helpers.js';
export function activate(deactivate){
  const imgs=[...document.images].map(img=>({src:img.src, alt:img.alt, width:img.naturalWidth, height:img.naturalHeight}));
  const text=JSON.stringify(imgs,null,2);
  copyText(text);
  const title = chrome.i18n ? chrome.i18n.getMessage('images') : 'Images';
  showModal(title, text);
  deactivate();
}
export function deactivate(){}
