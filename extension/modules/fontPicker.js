import { createOverlay, removeOverlay, copyText, showModal } from './helpers.js';
let overlay,deactivateCb;
function onMove(e){
  const el=e.target;
  const r=el.getBoundingClientRect();
  overlay.style.top=r.top+window.scrollY+'px';
  overlay.style.left=r.left+window.scrollX+'px';
  overlay.style.width=r.width+'px';
  overlay.style.height=r.height+'px';
}
function onClick(e){
  e.preventDefault();
  e.stopPropagation();
  const cs=getComputedStyle(e.target);
  const info=`font-family: ${cs.fontFamily}\nfont-size: ${cs.fontSize}\nline-height: ${cs.lineHeight}\nfont-weight: ${cs.fontWeight}`;
  copyText(info);
  const title = chrome.i18n ? chrome.i18n.getMessage('fontInfo') : 'Font Info';
  showModal(title, info);
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
