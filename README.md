# Pickachu – Web Development Toolkit

Pickachu is a powerful, free and open-source Chrome extension that provides 9 essential web development tools in one unified toolbox. Extract, analyze, and capture content from any webpage with professional-grade precision.

**Version 1.1.0**

## 🚀 Core Tools

- **🎨 Color Picker** - Extract colors using the EyeDropper API with RGB/HSL conversion
- **🅰️ Font Inspector** - Analyze typography: family, size, weight, color, and CSS properties  
- **🖼️ Media Extractor** - Preview, download, and analyze images and videos
- **🔗 Link Analyzer** - Extract and categorize all page links with URL validation
- **📝 Text Selector** - Copy text content from any element (including protected pages)
- **🧱 Element Inspector** - Deep HTML analysis with CSS selectors and XPath generation
- **📸 Screenshot Tool** - Capture full-page screenshots with automatic stitching
- **📌 Sticky Notes** - Add persistent notes to any webpage (site-specific storage)
- **🔍 Site Analyzer** - Comprehensive website analysis: tech stack, performance, SEO, accessibility

## ✨ Key Features

- **Professional Interface** - Clean, intuitive design with dark/light mode support
- **Keyboard Shortcuts** - Quick access with customizable hotkeys (Ctrl+Shift+1-9)
- **Multi-Language UI** - English, Français, Türkçe localization
- **Smart Notifications** - Real-time feedback with clipboard integration
- **Privacy First** - Zero data collection, local processing only
- **Developer Friendly** - Open source with comprehensive documentation
- **No Limits** - All features free, no premium restrictions or ads

## Installation
1. Clone this repository.
2. Open `chrome://extensions` in your browser and enable **Developer mode**.
3. Click **Load unpacked** and choose the `extension` folder.

The popup provides buttons to activate each tool. Data from the page is copied to your
clipboard and displayed in a short notification.

## ⌨️ Keyboard Shortcuts

Pickachu provides keyboard shortcuts for quick access to tools:

| Action | Shortcut |
| ------ | -------- |
| Toggle popup | `Ctrl+Shift+P` / `Cmd+Shift+P` (macOS) |
| Color Picker | `Alt+Shift+1` / `Option+Shift+1` (macOS) |
| Element Picker | `Alt+Shift+2` / `Option+Shift+2` (macOS) |
| Screenshot Tool | `Alt+Shift+3` / `Option+Shift+3` (macOS) |

*Note: Additional tool shortcuts can be added through Chrome's extension keyboard shortcuts settings.*

## 📁 Repository Structure
```
extension/
├── background.js           # Service worker
├── manifest.json           # Chrome extension manifest
├── content/                # Content script and styling
│   ├── content.js
│   └── content.css
├── popup/                  # Popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── modules/                # Tool modules
│   ├── colorPicker.js
│   ├── elementPicker.js
│   ├── fontPicker.js
│   ├── linkPicker.js
│   ├── mediaPicker.js
│   ├── screenshotPicker.js
│   ├── stickyNotesPicker.js
│   ├── siteInfoPicker.js
│   ├── textPicker.js
│   ├── helpers.js
│   └── icons.js
├── icons/                  # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── tools/              # Tool icons
└── _locales/               # Internationalization
    ├── en/messages.json
    ├── fr/messages.json
    └── tr/messages.json
```

## 📦 Packaging

### For Chrome Web Store
Create a zip archive ready for Chrome Web Store submission:
```bash
cd extension
zip -r ../pickachu-v1.1-chrome-store.zip .
```

### For Development
Install dependencies and run tests:
```bash
npm install
npm test
npm run lint
```

## 🛠️ Development

### Prerequisites
- Node.js 16+ 
- Chrome browser for testing

### Setup
```bash
# Clone the repository
git clone https://github.com/ademisler/pickachu.git
cd pickachu

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing
The project includes comprehensive unit tests for all modules:
- Color picker functionality
- Element inspection
- Font analysis
- Link extraction
- Media handling
- Screenshot capture
- Sticky notes persistence
- Site information analysis

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

## 🔐 Privacy & Security

- **No data collection** - Pickachu does not collect, store, or transmit any user data
- **Local processing only** - All operations happen within your browser
- **No external servers** - No data is sent to external services
- **Open source** - Full transparency with publicly available source code

For detailed information, see our [Privacy Policy](PRIVACY_POLICY.md).

## 👨‍💻 Credits

Created by [Adem İsler](https://ademisler.com/). 

If you find this project useful, consider [buying me a coffee](https://buymeacoffee.com/ademisler) ☕

## 🌟 Support

- ⭐ Star this repository if you like it
- 🐛 Report bugs via [GitHub Issues](https://github.com/ademisler/pickachu/issues)
- 💡 Suggest new features via [GitHub Discussions](https://github.com/ademisler/pickachu/discussions)
- 📧 Contact: [ademisler.com](https://ademisler.com/)
