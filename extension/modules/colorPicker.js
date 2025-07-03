import { copyText } from './helpers.js';

export function activate(deactivate) {
  if (!window.EyeDropper) {
    alert('EyeDropper API not supported');
    deactivate();
    return;
  }
  const ed = new EyeDropper();
  ed.open().then(res => {
    const color = res.sRGBHex;
    copyText(color);
    alert(`Color copied: ${color}`);
    deactivate();
  }).catch(() => deactivate());
}

export function deactivate() {}
