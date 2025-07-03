# Pickachu Chrome Extension

Pickachu is a lightweight toolbox for grabbing colors, elements, links, fonts, images,
text and generating selectors from any webpage.

## Features
- Color picker using the EyeDropper API
- Element, link, font, image and text pickers
- Selector and XPath generator

## Installation
1. Clone this repository.
2. Open `chrome://extensions` in your browser and enable **Developer mode**.
3. Click **Load unpacked** and choose the `extension` folder.

The popup provides buttons to activate each tool. Data from the page is copied to your
clipboard and displayed in a short notification.

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

