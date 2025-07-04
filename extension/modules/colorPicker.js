import { copyText, showModal } from './helpers.js';

export function activate(deactivate) {
  if (!window.EyeDropper) {
    const msg = chrome.i18n ? chrome.i18n.getMessage('eyeDropperNotSupported') : 'EyeDropper API not supported';
    alert(msg);
    deactivate();
    return;
  }
  const ed = new EyeDropper();
  ed.open().then(res => {
    const color = res.sRGBHex;
    copyText(color);
    const title = chrome.i18n ? chrome.i18n.getMessage('colorCopied') : 'Color copied';
    showModal(title, color, '🎨', 'color');
    deactivate();
  }).catch(() => deactivate());
}

export function deactivate() {}
