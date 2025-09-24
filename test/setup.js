// Jest setup file
import { jest } from '@jest/globals';

// Mock global objects
global.jest = jest;

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve())
  },
  writable: true
});

// Mock document.createElement
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  const element = originalCreateElement.call(document, tagName);
  return element;
});

// Mock document.body.appendChild
document.body.appendChild = jest.fn();

// Mock document.body.removeChild
document.body.removeChild = jest.fn();

// Mock document.execCommand
document.execCommand = jest.fn(() => true);

// Mock document querySelector methods
document.querySelector = jest.fn(() => null);
document.querySelectorAll = jest.fn((selector) => {
  if (selector === '#test-id') return [mockElement];
  return [];
});

// Mock window.getComputedStyle
window.getComputedStyle = jest.fn(() => ({
  fontSize: '16px',
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal',
  color: '#000000',
  backgroundColor: 'transparent',
  textAlign: 'left',
  lineHeight: 'normal',
  letterSpacing: 'normal',
  textTransform: 'none'
}));

// Mock chrome object
global.chrome = {
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://test/${path}`),
    sendMessage: jest.fn(() => Promise.resolve()),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  i18n: {
    getMessage: jest.fn((key) => key)
  }
};

// Mock EyeDropper API
global.EyeDropper = jest.fn().mockImplementation(() => ({
  open: jest.fn(() => Promise.resolve({ sRGBHex: '#ff0000' }))
}));

// Mock html2canvas
global.html2canvas = jest.fn(() => Promise.resolve({
  toDataURL: jest.fn(() => 'data:image/png;base64,test')
}));