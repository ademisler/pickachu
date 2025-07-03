# Pickachu Chrome Extension

Pickachu is a lightweight toolbox for grabbing colors, elements, links, fonts, images,
text and generating selectors from any webpage.

## Features
- Editable modal with favorites and export
- Color picker using the EyeDropper API
- Element, link, font, image and text pickers
- Selector and XPath generator
- History panel grouped by type
- Language and theme selectors

## Installation
1. Clone this repository.
2. Open `chrome://extensions` in your browser and enable **Developer mode**.
3. Click **Load unpacked** and choose the `extension` folder.

The popup provides buttons to activate each tool. Data from the page is copied to your
clipboard and displayed in a short notification.

## Keyboard Shortcuts
Pickachu defines a few default shortcuts using the Chrome `commands` API. Due to a
Chrome limitation only **four** commands can be registered. The following shortcuts
are included by default and can be customised from the extension settings page:

| Action | Shortcut |
| ------ | -------- |
| Activate color picker | `Alt+Shift+C` |
| Activate element picker | `Alt+Shift+E` |
| Activate link picker | `Alt+Shift+L` |
| Activate selector generator | `Alt+Shift+S` |
| Activate font picker | `Alt+Shift+F` |
| Activate image picker | `Alt+Shift+I` |
| Activate text picker | `Alt+Shift+T` |

Other tools remain accessible from the popup menu.

## Repository Structure
```
extension/
  background.js       - service worker
  content/            - content script and styling
  icons/              - extension icons
  modules/            - picker modules
  popup/              - popup HTML, CSS and JS
  manifest.json       - Chrome extension manifest
```

## Packaging
Run the following to create a zip archive ready for distribution:
```bash
cd extension
zip -r ../pickachu.zip .
```

## Development
After installing dependencies with `npm install`, run the unit tests with:
```bash
npm test
```

