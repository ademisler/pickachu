import { copyText, showModal } from './helpers.js';
export function activate(deactivate){
  const imgs=[...document.images].map(img=>({src:img.src, alt:img.alt, width:img.naturalWidth, height:img.naturalHeight}));
  const text=JSON.stringify(imgs,null,2);
  copyText(text);
  showModal('Images', text);
  deactivate();
}
export function deactivate(){}
