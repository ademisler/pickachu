import { createOverlay, removeOverlay, copyText, showModal } from './helpers.js';
let overlay,deactivateCb;
function onMove(e){
  const r=e.target.getBoundingClientRect();
  overlay.style.top=r.top+window.scrollY+'px';
  overlay.style.left=r.left+window.scrollX+'px';
  overlay.style.width=r.width+'px';
  overlay.style.height=r.height+'px';
}
function onClick(e){
  e.preventDefault();
  e.stopPropagation();
  const text=e.target.textContent.trim();
  copyText(text);
  const title = chrome.i18n ? chrome.i18n.getMessage('textTitle') : 'Text';
  showModal(title, text);
  deactivateCb();
}
export function activate(deactivate){
  deactivateCb=deactivate;
  overlay=createOverlay();
  document.body.style.cursor='crosshair';
  document.addEventListener('mousemove',onMove,true);
  document.addEventListener('click',onClick,true);
}
export function deactivate(){
  document.removeEventListener('mousemove',onMove,true);
  document.removeEventListener('click',onClick,true);
  removeOverlay(overlay);overlay=null;
}
