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
- **Image picker** with metadata extraction and quality analysis
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
Pickachu defines shortcuts using the Chrome `commands` API. All tools can be activated directly with keyboard shortcuts:

| Action | Shortcut |
| ------ | -------- |
| Open popup | `Ctrl+Shift+9` / `Cmd+Shift+9` (macOS) |
| Color Picker | `Ctrl+Shift+C` / `Cmd+Shift+C` (macOS) |
| Element Picker | `Ctrl+Shift+E` / `Cmd+Shift+E` (macOS) |
| Link Picker | `Ctrl+Shift+L` / `Cmd+Shift+L` (macOS) |
| Font Picker | `Ctrl+Shift+F` / `Cmd+Shift+F` (macOS) |
| Image Picker | `Ctrl+Shift+M` / `Cmd+Shift+M` (macOS) |
| Text Picker | `Ctrl+Shift+T` / `Cmd+Shift+T` (macOS) |
| Screenshot Picker | `Ctrl+Shift+S` / `Cmd+Shift+S` (macOS) |
| Sticky Notes | `Ctrl+Shift+N` / `Cmd+Shift+N` (macOS) |
| Site Info | `Ctrl+Shift+D` / `Cmd+Shift+D` (macOS) |

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
