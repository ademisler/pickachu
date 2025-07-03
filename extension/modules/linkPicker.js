import { copyText, showModal } from './helpers.js';
let startX,startY,box,deactivateCb;
function onMouseDown(e){
  startX=e.pageX;startY=e.pageY;
  box=document.createElement('div');
  box.id='pickachu-highlight-overlay';
  box.style.pointerEvents='none';
  document.body.appendChild(box);
  document.addEventListener('mousemove',onMove,true);
  document.addEventListener('mouseup',onUp,true);
}
function onMove(e){
  const x=Math.min(startX,e.pageX), y=Math.min(startY,e.pageY);
  const w=Math.abs(startX-e.pageX), h=Math.abs(startY-e.pageY);
  box.style.left=x+'px';box.style.top=y+'px';box.style.width=w+'px';box.style.height=h+'px';
}
function onUp(){
  document.removeEventListener('mousemove',onMove,true);
  document.removeEventListener('mouseup',onUp,true);
  const rect=box.getBoundingClientRect();
  box.remove();
  const links=[...document.querySelectorAll('a')].filter(a=>{
    const r=a.getBoundingClientRect();
    return r.left<rect.right && r.right>rect.left && r.top<rect.bottom && r.bottom>rect.top;
  }).map(a=>a.href);
  const text=links.join('\n');
  copyText(text);
  showModal('Links', text);
  deactivateCb();
}
export function activate(deactivate){
  deactivateCb=deactivate;
  document.body.style.cursor='crosshair';
  document.addEventListener('mousedown',onMouseDown,true);
}
export function deactivate(){
  document.removeEventListener('mousedown',onMouseDown,true);
  if(box) box.remove();
}
