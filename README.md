# Pickachu – Web Picker Tool

Pickachu – Web Picker Tool is a lightweight toolbox for grabbing colors, elements, links, fonts, images, text, screenshots, sticky notes, and site information from any webpage.

**Version 1.1**

## Features
- **9 Powerful Tools**: Color, Element, Link, Font, Image, Text, Screenshot, Sticky Notes, and Site Info pickers
- **Editable modal** with favorites and export options
- **Color picker** using the EyeDropper API with multiple format support
- **Element picker** with comprehensive element analysis and keyboard navigation
- **Link picker** with area selection and link type analysis
- **Font picker** with detailed typography information
- **Media picker** (images & videos) with metadata extraction and quick download options
- **Text picker** with content analysis and formatting detection
- **Screenshot picker** for full-page and visible area captures
- **Sticky Notes** for page-specific annotations with persistence
- **Site Info** for technology detection and performance analysis
- **History panel** grouped by type with favorites
- **Multi-language support** (English, Turkish, French)
- **Theme options** (Auto, Light, Dark)
- **Keyboard shortcuts** for all tools
- **Icons adapt** to light and dark mode

## Installation
1. Clone this repository.
2. Open `chrome://extensions` in your browser and enable **Developer mode**.
3. Click **Load unpacked** and choose the `extension` folder.

The popup provides buttons to activate each tool. Data from the page is copied to your
clipboard and displayed in a short notification.

## Keyboard Shortcuts
Pickachu defines a single shortcut using the Chrome `commands` API to open the popup:

| Action | Shortcut |
| ------ | -------- |
| Open popup | `Ctrl+Shift+9` / `Cmd+Shift+9` (macOS) |
| Toggle popup | `Ctrl+Shift+P` / `Cmd+Shift+P` (macOS) |

Pickachu also exposes global shortcuts for each tool:

| Tool | Shortcut |
| ---- | -------- |
| Color Picker | `Alt+Shift+1` / `Option+Shift+1` (macOS) |
| Element Picker | `Alt+Shift+2` / `Option+Shift+2` (macOS) |
| Link Picker | `Alt+Shift+3` / `Option+Shift+3` (macOS) |
| Font Picker | `Alt+Shift+4` / `Option+Shift+4` (macOS) |
| Media Picker | `Alt+Shift+5` / `Option+Shift+5` (macOS) |
| Text Picker | `Alt+Shift+6` / `Option+Shift+6` (macOS) |
| Screenshot Picker | `Alt+Shift+7` / `Option+Shift+7` (macOS) |
| Sticky Notes Picker | `Alt+Shift+8` / `Option+Shift+8` (macOS) |
| Site Info Picker | `Alt+Shift+9` / `Option+Shift+9` (macOS) |

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

## Credits
Created by [Adem İsler](https://ademisler.com/). If you find this project useful,
consider [buying me a coffee](https://buymeacoffee.com/ademisler).


## License

This project is licensed under the [MIT License](LICENSE). You are free to use and modify the code as long as you retain the original copyright notice.

## Privacy Policy

This extension stores your language and theme preferences and a short history of copied items in Chrome's local storage. None of this information is transmitted or shared. For details see the [privacy policy](PRIVACY_POLICY.md).
