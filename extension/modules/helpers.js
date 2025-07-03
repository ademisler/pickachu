export function createOverlay() {
  const box = document.createElement('div');
  box.id = 'pickachu-highlight-overlay';
  document.body.appendChild(box);
  return box;
}

export function removeOverlay(box) {
  if (box && box.parentNode) box.parentNode.removeChild(box);
}

export function createTooltip() {
  const tip = document.createElement('div');
  tip.id = 'pickachu-tooltip';
  document.body.appendChild(tip);
  return tip;
}

export function removeTooltip(tip) {
  if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
}

export function copyText(text) {
  navigator.clipboard.writeText(text).catch(err => console.error('Copy failed', err));
}

export function showModal(title, content) {
  const overlay = document.createElement('div');
  overlay.id = 'pickachu-modal-overlay';
  const modal = document.createElement('div');
  modal.id = 'pickachu-modal-content';
  const h3 = document.createElement('h3');
  h3.textContent = title;
  const pre = document.createElement('pre');
  pre.textContent = content;
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
  copyBtn.addEventListener('click', () => copyText(content));
  return overlay;
}
export function getCssSelector(el) {
  if (!(el instanceof Element)) return '';
  const path = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break;
    } else {
      let sib = el, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() === selector) nth++;
      }
      if (nth !== 1) selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(' > ');
}

export function getXPath(el) {
  if (el.id) return `//*[@id="${el.id}"]`;
  const parts = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let nb = 1;
    let sib = el.previousSibling;
    while (sib) {
      if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === el.nodeName) nb++;
      sib = sib.previousSibling;
    }
    const part = `${el.nodeName.toLowerCase()}[${nb}]`;
    parts.unshift(part);
    el = el.parentNode;
  }
  return '/' + parts.join('/');
}
