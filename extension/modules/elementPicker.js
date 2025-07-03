import { createOverlay, removeOverlay, createTooltip, removeTooltip, copyText, getCssSelector, showModal } from './helpers.js';

let overlay, tooltip, deactivateCb;

function onMove(e) {
  const el = e.target;
  if (!el || el === overlay) return;
  const rect = el.getBoundingClientRect();
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  tooltip.style.top = rect.bottom + window.scrollY + 5 + 'px';
  tooltip.style.left = rect.left + window.scrollX + 'px';
  tooltip.textContent = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(/\s+/).join('.') : ''}`;
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
  const text = JSON.stringify(info, null, 2);
  copyText(text);
  const title = chrome.i18n ? chrome.i18n.getMessage('elementInfo') : 'Element Info';
  showModal(title, text);
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
