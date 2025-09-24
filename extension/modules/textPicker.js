import { createOverlay, removeOverlay, copyText, showModal, showError, showSuccess, showInfo, showWarning, throttle } from './helpers.js';

let overlay, deactivateCb;
let currentElement = null;

// Performance optimized move handler
const throttledOnMove = throttle((e) => {
  const el = e.target;
  if (!el || el === overlay) return;
  
  currentElement = el;
  const rect = el.getBoundingClientRect();
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
}, 16);

// Enhanced click handler with comprehensive text analysis
function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!currentElement) return;
  
  try {
    const el = currentElement;
    const text = el.textContent.trim();
    
    if (!text) {
      showWarning('No text content found in this element.');
      return;
    }
    
    // Comprehensive text analysis
    const textAnalysis = {
      // Basic text content
      text: text,
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: text.length,
      characterCountNoSpaces: text.replace(/\s/g, '').length,
      
      // Text statistics
      statistics: {
        sentences: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
        paragraphs: text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
        lines: text.split('\n').length,
        words: text.split(/\s+/).filter(word => word.length > 0),
        uniqueWords: [...new Set(text.toLowerCase().split(/\s+/).filter(word => word.length > 0))].length,
        averageWordLength: text.split(/\s+/).filter(word => word.length > 0).reduce((sum, word) => sum + word.length, 0) / text.split(/\s+/).filter(word => word.length > 0).length || 0
      },
      
      // Text formatting
      formatting: {
        hasBold: el.querySelector('b, strong') !== null,
        hasItalic: el.querySelector('i, em') !== null,
        hasUnderline: el.querySelector('u') !== null,
        hasLinks: el.querySelector('a') !== null,
        hasLists: el.querySelector('ul, ol') !== null,
        hasCode: el.querySelector('code, pre') !== null
      },
      
      // Language detection (basic)
      language: {
        detected: detectLanguage(text),
        hasUnicode: /[\u0080-\uFFFF]/.test(text),
        hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(text),
        hasNumbers: /\d/.test(text),
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(text)
      },
      
      // Element context
      element: {
        tagName: el.tagName.toLowerCase(),
        className: el.className,
        id: el.id,
        parentElement: el.parentElement?.tagName.toLowerCase(),
        innerHTML: el.innerHTML,
        outerHTML: el.outerHTML
      },
      
      // Text styles
      styles: {
        fontSize: getComputedStyle(el).fontSize,
        fontFamily: getComputedStyle(el).fontFamily,
        fontWeight: getComputedStyle(el).fontWeight,
        color: getComputedStyle(el).color,
        backgroundColor: getComputedStyle(el).backgroundColor,
        textAlign: getComputedStyle(el).textAlign,
        lineHeight: getComputedStyle(el).lineHeight,
        letterSpacing: getComputedStyle(el).letterSpacing,
        textTransform: getComputedStyle(el).textTransform
      },
      
      // Export formats
      formats: {
        plain: text,
        html: el.innerHTML,
        markdown: convertToMarkdown(el),
        json: JSON.stringify({ text, metadata: textAnalysis }, null, 2),
        csv: `"${text.replace(/"/g, '""')}"`,
        xml: `<text>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`
      }
    };
    
    // Copy primary format (plain text)
    copyText(text);
    
    showSuccess(`Text copied to clipboard! (${textAnalysis.wordCount} words)`);
    
    const title = chrome.i18n ? chrome.i18n.getMessage('textTitle') : 'Text Analysis';
    const content = `Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n\nStatistics:\n- Words: ${textAnalysis.wordCount}\n- Characters: ${textAnalysis.characterCount}\n- Sentences: ${textAnalysis.statistics.sentences}\n- Language: ${textAnalysis.language.detected}\n\nFull Analysis:\n${textAnalysis.formats.json}`;
    
    showModal(title, content, '🧾', 'text');
    deactivateCb();
    
  } catch (error) {
    console.error('Text picker error:', error);
    showError('Failed to analyze text. Please try again.');
  }
}

// Basic language detection
function detectLanguage(text) {
  const patterns = {
    english: /^[a-zA-Z\s.,!?;:'"()-]+$/,
    turkish: /[çğıöşüÇĞIİÖŞÜ]/,
    arabic: /[\u0600-\u06FF]/,
    chinese: /[\u4e00-\u9fff]/,
    japanese: /[\u3040-\u309f\u30a0-\u30ff]/,
    korean: /[\uac00-\ud7af]/,
    cyrillic: /[\u0400-\u04ff]/,
    hindi: /[\u0900-\u097f]/
  };
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }
  
  return 'unknown';
}

// Convert HTML to Markdown (basic)
function convertToMarkdown(el) {
  let markdown = el.innerHTML;
  
  // Basic conversions
  markdown = markdown.replace(/<strong>|<b>/g, '**').replace(/<\/strong>|<\/b>/g, '**');
  markdown = markdown.replace(/<em>|<i>/g, '*').replace(/<\/em>|<\/i>/g, '*');
  markdown = markdown.replace(/<u>/g, '').replace(/<\/u>/g, '');
  markdown = markdown.replace(/<br\s*\/?>/g, '\n');
  markdown = markdown.replace(/<p>/g, '\n\n').replace(/<\/p>/g, '');
  markdown = markdown.replace(/<h1>/g, '# ').replace(/<\/h1>/g, '\n');
  markdown = markdown.replace(/<h2>/g, '## ').replace(/<\/h2>/g, '\n');
  markdown = markdown.replace(/<h3>/g, '### ').replace(/<\/h3>/g, '\n');
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '[$2]($1)');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  return markdown.trim();
}

// Keyboard navigation
function onKeyDown(e) {
  if (!overlay || !currentElement) return;
  
  switch (e.key) {
    case 'Enter':
      e.preventDefault();
      onClick({ target: currentElement, preventDefault: () => {}, stopPropagation: () => {} });
      break;
    case 'Escape':
      e.preventDefault();
      deactivateCb();
      break;
  }
}

export function activate(deactivate) {
  deactivateCb = deactivate;
  
  try {
    overlay = createOverlay();
    
    // Enhanced overlay styling for text picker
    overlay.style.cssText = `
      position: absolute;
      background-color: rgba(156, 39, 176, 0.2);
      border: 2px solid #9c27b0;
      border-radius: 4px;
      z-index: 2147483646;
      pointer-events: none;
      box-sizing: border-box;
      box-shadow: 0 0 6px rgba(156, 39, 176, 0.6);
      transition: all 0.15s ease-out;
      animation: pickachu-fade-in 0.2s ease-out;
    `;
    
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', throttledOnMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    
    showInfo('Hover over text elements to analyze • Click to select • Enter to select • Esc to cancel', 3000);
    
  } catch (error) {
    console.error('Text picker activation error:', error);
    showError('Failed to activate text picker. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  try {
    document.removeEventListener('mousemove', throttledOnMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    
    removeOverlay(overlay);
    overlay = null;
    currentElement = null;
    
    document.body.style.cursor = '';
    
  } catch (error) {
    console.error('Text picker deactivation error:', error);
  }
}
