# Privacy Policy

Last updated: 2025-08-26

System Prompt Manager for AI Studio (the "Extension") is an open‑source Chrome extension. We care about your privacy and designed the Extension to operate entirely in your browser.

## Summary
- We do not collect, transmit, sell, or share any personal information.
- No analytics, tracking pixels, or telemetry.
- No external servers are contacted by the Extension.

## Data handling
- The Extension stores your settings and saved profiles using Chrome's `chrome.storage.sync` and/or `chrome.storage.local` APIs.
- This data stays within your browser profile (and may sync via your Google account if you have Chrome sync enabled). The developers do not receive or access this data.
- The Extension operates only on pages that match `https://aistudio.google.com/*` to provide its functionality.

## Permissions rationale
- `storage`: Save your profiles and settings.
- `contextMenus`: Provide quick actions from the right‑click menu.
- `activeTab`: After a user gesture (e.g., opening the popup, using a shortcut, or clicking a context menu), allows the extension to identify the active tab and send a message to the content script to perform the insertion.
- Content script is statically declared in `manifest.json` and runs only on the allowed host. No dynamic code injection (`scripting`) is used, and the broader `tabs` permission is not requested.

## Third parties
- The Extension does not use third‑party analytics, ad networks, or trackers.
- No data is sent to any external service by the Extension.

## Open source
- The source code is available in this repository. You can audit how data is handled and build the Extension yourself.

## Changes to this policy
We may update this document over time. Material changes will be reflected in the repository history. Continued use of the Extension after changes indicates acceptance of the updated policy.

## Contact
For questions or issues, please open an issue in this repository.

