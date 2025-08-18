import type { Profile } from '../shared/types';
import { getState, setLastUsedProfile } from '../shared/storage';

// Ensure context menu rebuilds don't overlap (which can cause duplicate-id errors)
let rebuildInFlight: Promise<void> | null = null;

// Context Menus
async function rebuildContextMenus() {
  if (rebuildInFlight) return rebuildInFlight;
  rebuildInFlight = (async () => {
    try {
      const state = await getState();
      await new Promise<void>((resolve) => { chrome.contextMenus.removeAll(() => resolve()); });
      if (!state.settings.showContextMenu) return;

      chrome.contextMenus.create({
        id: 'open_profiles',
        title: 'Open Profiles…',
        contexts: ['all'],
        documentUrlPatterns: ['https://aistudio.google.com/*']
      }, () => { void (chrome.runtime as any).lastError; });

      chrome.contextMenus.create({
        id: 'insert_last_profile',
        title: 'Insert last profile',
        contexts: ['all'],
        documentUrlPatterns: ['https://aistudio.google.com/*']
      }, () => { void (chrome.runtime as any).lastError; });
    } catch (e) {
      console.warn('contextMenus setup error', e);
    } finally {
      rebuildInFlight = null;
    }
  })();
  return rebuildInFlight;
}

chrome.runtime.onInstalled.addListener(async () => { await rebuildContextMenus(); });
chrome.runtime.onStartup.addListener(async () => { await rebuildContextMenus(); });

chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
  if (areaName !== 'sync') return;
  if (changes.settings) {
    rebuildContextMenus();
  }
});

chrome.contextMenus.onClicked.addListener(async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === 'open_profiles') {
    try {
      await chrome.action.openPopup();
    } catch {
      // fallback: open options
      chrome.runtime.openOptionsPage();
    }
  } else if (info.menuItemId === 'insert_last_profile') {
    await insertLastProfileIntoTab(tab.id);
  }
});

chrome.commands.onCommand.addListener(async (command: string) => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  if (command === 'open_palette') {
    try {
      await chrome.action.openPopup();
    } catch (e) {
      console.warn('openPopup failed', e);
    }
  } else if (command === 'insert_last_profile') {
    await insertLastProfileIntoTab(tab.id);
  }
});

async function insertLastProfileIntoTab(tabId: number) {
  const state = await getState();
  const prof = state.profiles.find(p => p.id === state.lastUsedProfileId) || state.profiles[0];
  if (!prof) return;
  await sendInsertMessage(tabId, prof, state.settings.insertMode);
}

async function sendInsertMessage(tabId: number, profile: Profile, mode?: 'replace'|'append'|'prepend') {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'INSERT_PROFILE', profile, mode });
    await setLastUsedProfile(profile.id);
  } catch (e) {
    // If this fails, the content script may not be available on the page.
    console.error('Failed to insert profile (content script unavailable?)', e);
  }
}
