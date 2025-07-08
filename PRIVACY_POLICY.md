# Privacy Policy for Pickachu – Web Picker Tool

Pickachu – Web Picker Tool ("the extension") is a Chrome extension that lets you easily grab colors, elements, links, fonts, images and text from any webpage. This document explains what data the extension collects and how it is used.

## Data Collection and Storage

The extension stores the following information **locally** in your browser using Chrome's `storage` API:

- Your selected language and theme preferences.
- A history list of the items you have copied using the extension (limited to the most recent 20 entries).

This information never leaves your device. The extension does not transmit any collected data to remote servers or third parties.

## Permissions and Their Use

- `activeTab` – required to activate the extension on the current tab when you click a tool button.
- `scripting` – used to execute the content script that extracts data from the page.
- `clipboardWrite` – allows the extension to copy the selected content to your clipboard.
- `storage` – saves your language, theme and history data locally.
- `host_permissions` (`<all_urls>`) – lets the extension run on any webpage so that you can capture content anywhere.

The extension does not include or execute remote code. All scripts are bundled with the extension package.

## Data Usage

The information listed above is used solely to provide the extension's functionality—displaying your history, remembering your preferences and copying content you choose. We do not collect any personally identifiable information, financial information, health information or authentication details. Nothing is sold or shared with third parties.

## Disclosures

- We do **not** sell or transfer user data to third parties.
- We do **not** use data for purposes unrelated to the extension's single function.
- We do **not** use data to determine creditworthiness or for lending purposes.

If you have any questions about this policy, please contact the project maintainer.
