import { showError, handleError } from './helpers.js';

const CAPTURE_DELAY_MS = 120;
const MIN_CAPTURE_INTERVAL_MS = 650;
const MAX_CAPTURE_RETRIES = 3;
const MAX_SEGMENTS = 60;
let isCapturing = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function waitForNextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function getFilename(url) {
  if (!url) {
    return `pickachu-screenshot-${Date.now()}.png`;
  }

  try {
    const { hostname, pathname } = new URL(url);
    const slug = `${hostname}${pathname}`
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '')
      .toLowerCase();
    return `pickachu-screencap-${slug || 'page'}-${Date.now()}.png`;
  } catch {
    return `pickachu-screenshot-${Date.now()}.png`;
  }
}

function downloadScreenshot(dataUrl, filename) {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    handleError(error, 'downloadScreenshot');
    showError('Screenshot captured but download failed.');
  }
}

function getPageMetrics() {
  const body = document.body;
  const doc = document.documentElement;

  const totalHeight = Math.max(
    body?.scrollHeight ?? 0,
    doc?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    doc?.offsetHeight ?? 0,
    doc?.clientHeight ?? 0
  );

  const totalWidth = Math.max(
    body?.scrollWidth ?? 0,
    doc?.scrollWidth ?? 0,
    body?.offsetWidth ?? 0,
    doc?.offsetWidth ?? 0,
    doc?.clientWidth ?? 0
  );

  const viewportHeight = window.innerHeight || doc?.clientHeight || 0;
  const viewportWidth = window.innerWidth || doc?.clientWidth || 0;

  return { totalHeight, totalWidth, viewportHeight, viewportWidth };
}

function requestCapture() {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response?.success || !response?.dataUrl) {
          reject(new Error(response?.error || 'Failed to capture visible tab.'));
          return;
        }

        resolve(response.dataUrl);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load captured image.'));
    img.src = dataUrl;
  });
}

async function requestCaptureWithThrottle(lastCaptureAt, attempt = 0) {
  const elapsed = Date.now() - lastCaptureAt.value;
  if (elapsed < MIN_CAPTURE_INTERVAL_MS) {
    await wait(MIN_CAPTURE_INTERVAL_MS - elapsed);
  }

  try {
    const dataUrl = await requestCapture();
    lastCaptureAt.value = Date.now();
    return dataUrl;
  } catch (error) {
    if (
      attempt < MAX_CAPTURE_RETRIES &&
      typeof error.message === 'string' &&
      error.message.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')
    ) {
      await wait(MIN_CAPTURE_INTERVAL_MS + 200);
      return requestCaptureWithThrottle(lastCaptureAt, attempt + 1);
    }
    throw error;
  }
}

async function stitchCaptures(segments, totalHeight, devicePixelRatio) {
  if (!segments.length) {
    throw new Error('No capture data to stitch.');
  }

  const images = await Promise.all(segments.map((segment) => loadImage(segment.dataUrl)));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  const width = images[0].width;
  const height = Math.round(totalHeight * devicePixelRatio);

  canvas.width = width;
  canvas.height = height;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  images.forEach((image, index) => {
    const offsetY = Math.round(segments[index].scrollY * devicePixelRatio);
    context.drawImage(image, 0, offsetY);
  });

  const stitchedDataUrl = canvas.toDataURL('image/png');
  downloadScreenshot(stitchedDataUrl, getFilename(window.location.href));
}

async function captureFullPage() {
  const { totalHeight, viewportHeight } = getPageMetrics();

  if (totalHeight === 0 || viewportHeight === 0) {
    throw new Error('Unable to determine page dimensions.');
  }

  const devicePixelRatio = window.devicePixelRatio || 1;
  const maxScrollTop = Math.max(totalHeight - viewportHeight, 0);
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  const segments = [];
  let currentScroll = 0;
  let iterations = 0;

  const lastCaptureAt = { value: Date.now() - MIN_CAPTURE_INTERVAL_MS };

  try {
    while (true) {
      const targetScroll = Math.min(currentScroll, maxScrollTop);
      window.scrollTo(0, targetScroll);

      await waitForNextFrame();
      if (CAPTURE_DELAY_MS > 0) {
        await wait(CAPTURE_DELAY_MS);
      }

      const dataUrl = await requestCaptureWithThrottle(lastCaptureAt);
      segments.push({ dataUrl, scrollY: targetScroll });

      if (targetScroll >= maxScrollTop) {
        break;
      }

      currentScroll += viewportHeight;
      iterations += 1;

      if (iterations > MAX_SEGMENTS) {
        throw new Error('Page is too tall to capture completely.');
      }
    }
  } finally {
    window.scrollTo(originalScrollX, originalScrollY);
  }

  await stitchCaptures(segments, totalHeight, devicePixelRatio);
}

export async function activate(deactivate) {
  if (isCapturing) {
    showError('Screenshot capture already in progress. Please wait…');
    deactivate();
    return;
  }

  isCapturing = true;

  try {
    await captureFullPage();
  } catch (error) {
    handleError(error, 'screenshotPicker.capture');
    showError(error.message || 'Failed to capture screenshot.');
  } finally {
    isCapturing = false;
    deactivate();
  }
}

export function deactivate() {
  isCapturing = false;
}
