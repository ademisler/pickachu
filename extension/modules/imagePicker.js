import { createOverlay, removeOverlay, copyText, showModal } from './helpers.js';

let overlay, deactivateCb;

function onMove(e) {
  const img = e.target.closest('img');
  if (!img) {
    overlay.style.display = 'none';
    return;
  }
  const r = img.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.top = r.top + window.scrollY + 'px';
  overlay.style.left = r.left + window.scrollX + 'px';
  overlay.style.width = r.width + 'px';
  overlay.style.height = r.height + 'px';
}

function onClick(e) {
  const img = e.target.closest('img');
  if (!img) return;
  e.preventDefault();
  e.stopPropagation();
  const src = img.src;
  copyText(src);
  const title = chrome.i18n ? chrome.i18n.getMessage('image') : 'Image';
  showModal(title, src, '🖼️', 'image');
  deactivateCb();
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  overlay = createOverlay();
  overlay.style.display = 'none';
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
}

export function deactivate() {
  document.removeEventListener('mousemove', onMove, true);
  document.removeEventListener('click', onClick, true);
  removeOverlay(overlay); overlay = null;
}
