# AI Studio System Profiles (Chrome MV3)

Save and quickly insert reusable "System instructions" profiles on Google AI Studio.

- Manifest v3, TypeScript, Vite + @crxjs
- Popup to search/select and insert
- Options page for profiles CRUD + import/export
- Background handles keyboard shortcuts and context menu
- Content script inserts into the System instructions textarea (selectors tuned from live DOM)

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

## License
MIT
