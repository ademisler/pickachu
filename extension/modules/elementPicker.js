import { createOverlay, removeOverlay, createTooltip, removeTooltip, copyText, getCssSelector } from './helpers.js';

let overlay, tooltip, deactivateCb;

function onMove(e) {
  const el = e.target;
  if (!el || el === overlay) return;
  const rect = el.getBoundingClientRect();
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
}

function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const el = e.target;
  const info = {
    outerHTML: el.outerHTML,
    class: el.className,
    id: el.id,
    selector: getCssSelector(el)
  };
  copyText(JSON.stringify(info, null, 2));
  showModal('Element Info', JSON.stringify(info, null, 2));
  deactivateCb();
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  overlay = createOverlay();
  tooltip = createTooltip();
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
}

export function deactivate() {
  document.removeEventListener('mousemove', onMove, true);
  document.removeEventListener('click', onClick, true);
  removeOverlay(overlay); overlay = null;
  removeTooltip(tooltip); tooltip = null;
}

function showModal(title, text) {
  const overlay = document.createElement('div');
  overlay.id = 'pickachu-modal-overlay';
  const modal = document.createElement('div');
  modal.id = 'pickachu-modal-content';
  const h3 = document.createElement('h3');
  h3.textContent = title;
  const pre = document.createElement('pre');
  pre.textContent = text;
  const buttons = document.createElement('div');
  buttons.id = 'pickachu-modal-buttons';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.className = 'copy';
  buttons.appendChild(copyBtn);
  buttons.appendChild(closeBtn);
  modal.appendChild(h3);
  modal.appendChild(pre);
  modal.appendChild(buttons);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  closeBtn.addEventListener('click', () => overlay.remove());
  copyBtn.addEventListener('click', () => copyText(text));
}
