// Lucide-inspired icon helper without external dependencies

const ICON_DEFINITIONS = {
  color: {
    title: 'Color',
    elements: [
      { tag: 'path', attrs: { d: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z' } }
    ]
  },
  text: {
    title: 'Text',
    elements: [
      { tag: 'path', attrs: { d: 'M12 4v16' } },
      { tag: 'path', attrs: { d: 'M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2' } },
      { tag: 'path', attrs: { d: 'M9 20h6' } }
    ]
  },
  element: {
    title: 'Element',
    elements: [
      { tag: 'path', attrs: { d: 'M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z' } }
    ]
  },
  screenshot: {
    title: 'Screenshot',
    elements: [
      { tag: 'path', attrs: { d: 'M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z' } },
      { tag: 'circle', attrs: { cx: 12, cy: 13, r: 3 } }
    ]
  },
  link: {
    title: 'Link',
    elements: [
      { tag: 'path', attrs: { d: 'M9 17H7A5 5 0 0 1 7 7h2' } },
      { tag: 'path', attrs: { d: 'M15 7h2a5 5 0 1 1 0 10h-2' } },
      { tag: 'line', attrs: { x1: 8, y1: 12, x2: 16, y2: 12 } }
    ]
  },
  font: {
    title: 'Font',
    elements: [
      { tag: 'path', attrs: { d: 'M15 11h4.5a1 1 0 0 1 0 5h-4a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h3a1 1 0 0 1 0 5' } },
      { tag: 'path', attrs: { d: 'm2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16' } },
      { tag: 'path', attrs: { d: 'M3.304 13h6.392' } }
    ]
  },
  image: {
    title: 'Image',
    elements: [
      { tag: 'rect', attrs: { x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 } },
      { tag: 'circle', attrs: { cx: 9, cy: 9, r: 2 } },
      { tag: 'path', attrs: { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' } }
    ]
  },
  media: {
    title: 'Media',
    elements: [
      { tag: 'path', attrs: { d: 'M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z' } },
      { tag: 'path', attrs: { d: 'M6.2 5.3 9.3 9.2' } },
      { tag: 'path', attrs: { d: 'M12.4 3.4l3.1 4' } },
      { tag: 'path', attrs: { d: 'M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' } }
    ]
  },
  site: {
    title: 'Site information',
    elements: [
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
      { tag: 'path', attrs: { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' } },
      { tag: 'path', attrs: { d: 'M2 12h20' } }
    ]
  },
  note: {
    title: 'Sticky note',
    elements: [
      { tag: 'path', attrs: { d: 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z' } },
      { tag: 'path', attrs: { d: 'M15 3v4a2 2 0 0 0 2 2h4' } }
    ]
  },
  developer: {
    title: 'Developer',
    elements: [
      { tag: 'path', attrs: { d: 'M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z' } },
      { tag: 'line', attrs: { x1: 3.946, y1: 15.987, x2: 20.054, y2: 15.987 } }
    ]
  },
  copy: {
    title: 'Copy',
    elements: [
      { tag: 'rect', attrs: { x: 8, y: 8, width: 14, height: 14, rx: 2, ry: 2 } },
      { tag: 'path', attrs: { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' } }
    ]
  },
  download: {
    title: 'Download',
    elements: [
      { tag: 'path', attrs: { d: 'M12 15V3' } },
      { tag: 'path', attrs: { d: 'M7 10l5 5 5-5' } },
      { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } }
    ]
  },
  export: {
    title: 'Export',
    elements: [
      { tag: 'path', attrs: { d: 'M12 2v13' } },
      { tag: 'path', attrs: { d: 'm16 6-4-4-4 4' } },
      { tag: 'path', attrs: { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' } }
    ]
  },
  favorite: {
    title: 'Favorite',
    elements: [
      { tag: 'path', attrs: { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' } }
    ]
  },
  star: {
    title: 'Star',
    elements: [
      { tag: 'path', attrs: { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' } }
    ]
  },
  trash: {
    title: 'Delete',
    elements: [
      { tag: 'path', attrs: { d: 'M3 6h18' } },
      { tag: 'path', attrs: { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' } },
      { tag: 'path', attrs: { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' } },
      { tag: 'path', attrs: { d: 'M10 11v6' } },
      { tag: 'path', attrs: { d: 'M14 11v6' } }
    ]
  },
  info: {
    title: 'Info',
    elements: [
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
      { tag: 'path', attrs: { d: 'M12 16v-4' } },
      { tag: 'path', attrs: { d: 'M12 8h.01' } }
    ]
  },
  alert: {
    title: 'Warning',
    elements: [
      { tag: 'path', attrs: { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' } },
      { tag: 'path', attrs: { d: 'M12 9v4' } },
      { tag: 'path', attrs: { d: 'M12 17h.01' } }
    ]
  },
  success: {
    title: 'Success',
    elements: [
      { tag: 'path', attrs: { d: 'M20 6 9 17l-5-5' } }
    ]
  },
  close: {
    title: 'Close',
    elements: [
      { tag: 'path', attrs: { d: 'M18 6 6 18' } },
      { tag: 'path', attrs: { d: 'M6 6l12 12' } }
    ]
  },
  plus: {
    title: 'Add',
    elements: [
      { tag: 'path', attrs: { d: 'M5 12h14' } },
      { tag: 'path', attrs: { d: 'M12 5v14' } }
    ]
  }
};

const DEFAULT_ICON = {
  title: 'Item',
  elements: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 9 } }
  ]
};

function buildSvg(definition, options = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', options.strokeWidth ?? 1.8);
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const size = options.size ?? 20;
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  if (options.className) svg.setAttribute('class', options.className);
  const aria = options.decorative === false ? 'img' : 'presentation';
  svg.setAttribute('role', aria);
  svg.setAttribute('aria-hidden', options.decorative === false ? 'false' : 'true');

  const titleText = options.decorative === false ? (options.title || definition.title) : undefined;
  if (titleText) {
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = titleText;
    svg.appendChild(title);
  }

  (definition.elements || []).forEach(({ tag, attrs }) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      el.setAttribute(key, String(value));
    });
    svg.appendChild(el);
  });

  return svg;
}

export function getIconDefinition(name) {
  if (!name) return DEFAULT_ICON;
  return ICON_DEFINITIONS[name] || DEFAULT_ICON;
}

export function createIconElement(name, options = {}) {
  const definition = getIconDefinition(name);
  const svg = buildSvg(definition, options);
  svg.classList.add('pickachu-icon');
  return svg;
}

export function getIconSvg(name, options = {}) {
  const definition = getIconDefinition(name);
  const svg = buildSvg(definition, { size: options.size ?? 18, decorative: options.decorative ?? true });
  svg.classList.add('pickachu-icon');
  return new XMLSerializer().serializeToString(svg);
}

export const ICON_NAMES = Object.keys(ICON_DEFINITIONS);
