# Pickachu – Web Picker Tool

Pickachu – Web Picker Tool is a lightweight toolbox for grabbing colors, elements, links, fonts, images
and text from any webpage.

## Features
- Editable modal with favorites and export
- Color picker using the EyeDropper API
- Element, link, font, image and text pickers
- History panel grouped by type
- Language and theme options
- Icons adapt to light and dark mode

## Installation
1. Clone this repository.
2. Open `chrome://extensions` in your browser and enable **Developer mode**.
3. Click **Load unpacked** and choose the `extension` folder.

The popup provides buttons to activate each tool. Data from the page is copied to your
clipboard and displayed in a short notification.

## Keyboard Shortcuts
Pickachu defines a single shortcut using the Chrome `commands` API. Press `Ctrl+Shift+9` (or `Cmd+Shift+9` on macOS) to open the popup from any page.

| Action | Shortcut |
| ------ | -------- |
| Open popup | `Ctrl+Shift+9` / `Cmd+Shift+9` (macOS) |

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
