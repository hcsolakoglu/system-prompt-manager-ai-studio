# System Prompt Manager for AI Studio (Chrome MV3)

Save and quickly insert reusable "System instructions" profiles on Google AI Studio.

- Manifest v3, TypeScript, Vite + @crxjs
- Popup to search/select and insert
- Options page for profiles CRUD + import/export
- Background handles keyboard shortcuts and context menu
- Content script inserts into the System instructions textarea (selectors tuned from live DOM)

## Disclaimer

Not affiliated with or endorsed by Google. Do not use Google/AI Studio logos in the extension, store listing, or any promotional material. "Google" and "Google AI Studio" are trademarks of Google LLC; names are used only to indicate compatibility.

## Privacy

This extension does not collect, transmit, sell, or share any personal information. Your data stays in your browser via Chrome storage. See the full policy in [PRIVACY.md](./PRIVACY.md).

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
- Open popup: Ctrl/Cmd+Shift+P
- Insert last profile: Ctrl/Cmd+Shift+I

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
