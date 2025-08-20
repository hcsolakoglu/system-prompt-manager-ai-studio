# System Prompt Manager for AI Studio (Chrome MV3)

Repository/Homepage: https://github.com/hcsolakoglu/system-prompt-manager-ai-studio

Save and quickly insert reusable "System instructions" profiles on Google AI Studio.

- Manifest v3, TypeScript, Vite + @crxjs
- Popup to search/select and insert
- Options page for profiles CRUD + import/export
- Background handles keyboard shortcuts and context menu
- Content script inserts into the System instructions textarea (selectors tuned from live DOM)

## Install on Chrome and Chromium-based browsers

### Install from GitHub Releases (no build)

1. Go to Releases: https://github.com/hcsolakoglu/system-prompt-manager-ai-studio/releases
2. Download the latest prebuilt archive
3. Extract the archive locally
4. Open your browser’s extensions page and enable Developer mode
5. Click "Load unpacked" and select the extracted folder that contains `manifest.json` (often `dist`)
6. Optional: Click "Reload" on the extension card after future updates

## Installing the extension by building it:
1. Build the extension
    - `pnpm build` (or `npm run build`)
2. Open your browser’s extensions page
    - Chrome: `chrome://extensions`
    - Microsoft Edge: `edge://extensions`
    - Brave: `brave://extensions`
    - Opera: `opera://extensions`
    - Vivaldi: `vivaldi://extensions`
3. Enable Developer mode
4. Click "Load unpacked" and select the `dist` folder created by the build
5. Optional: Pin the extension to the toolbar for quicker access
6. Update: After rebuilding, click "Reload" on the extension card

## Disclaimer

Not affiliated with or endorsed by Google. Do not use Google/AI Studio logos in the extension, store listing, or any promotional material. "Google" and "Google AI Studio" are trademarks of Google LLC; names are used only to indicate compatibility.

## Privacy

This extension does not collect, transmit, sell, or share any personal information. Your data stays in your browser via Chrome storage. See the full policy in [PRIVACY.md](https://github.com/hcsolakoglu/system-prompt-manager-ai-studio/blob/main/PRIVACY.md).

## Development

1. Install deps
```bash
pnpm i # or npm i / yarn
```
2. Start dev build
```bash
pnpm dev # or npm run dev
```
3. In Chrome: Extensions → Enable Developer mode → Load unpacked → select the `dist` folder created by Vite.

## Shortcuts
- Open popup: Alt+Shift+1
- Insert last profile: Alt+Shift+2

These can be changed at chrome://extensions/shortcuts

## Permissions
- storage, activeTab, scripting, contextMenus, commands
- host_permissions: https://aistudio.google.com/*

Rationale:
- `storage`: Save profiles and settings locally (and sync if Chrome sync is enabled).
- `contextMenus`: Provide right‑click actions for quick access.
- `activeTab` + `scripting`: Inject content script on AI Studio pages to insert the selected profile when requested.

## License
MIT

## Built by

Created and maintained by **Hakan Can Solakoğlu**.

- X/Twitter: https://x.com/HCSolakoglu
- GitHub: https://github.com/hcsolakoglu/system-prompt-manager-ai-studio
