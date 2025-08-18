import type { Profile, StorageSchema, Settings } from './types';

const DEFAULT_SETTINGS: Settings = {
  insertMode: 'replace',
  showContextMenu: true,
  theme: 'auto',
};

const DEFAULT_PROFILE: Profile = {
  id: crypto.randomUUID(),
  name: 'Concise Helpful Assistant',
  content: `You are a helpful, concise assistant.\n- Prefer short, clear answers with bullet points.\n- Ask one clarifying question if requirements are ambiguous.\n- Avoid speculation; state uncertainties explicitly.\n- When code is relevant, show minimal, runnable snippets.`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const DEFAULT_STATE: StorageSchema = {
  profiles: [DEFAULT_PROFILE],
  lastUsedProfileId: DEFAULT_PROFILE.id,
  settings: DEFAULT_SETTINGS,
  version: 1,
};

export async function getState(): Promise<StorageSchema> {
  const raw = await chrome.storage.sync.get(null);
  if (!raw || Object.keys(raw).length === 0) {
    await chrome.storage.sync.set(DEFAULT_STATE);
    return structuredClone(DEFAULT_STATE);
  }
  // hydrate with defaults
  const state: StorageSchema = {
    profiles: Array.isArray(raw.profiles) ? raw.profiles : [],
    lastUsedProfileId: raw.lastUsedProfileId,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
    version: typeof raw.version === 'number' ? raw.version : 1,
  };
  if (!state.profiles || state.profiles.length === 0) {
    state.profiles = [DEFAULT_PROFILE];
    state.lastUsedProfileId = DEFAULT_PROFILE.id;
  }
  return state;
}

export async function setState(partial: Partial<StorageSchema>) {
  await chrome.storage.sync.set(partial);
}

export async function upsertProfile(p: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Profile, 'id'>>): Promise<Profile> {
  const state = await getState();
  const now = Date.now();
  let prof: Profile;
  if (p.id) {
    const idx = state.profiles.findIndex(x => x.id === p.id);
    if (idx >= 0) {
      prof = { ...state.profiles[idx], ...p, updatedAt: now } as Profile;
      state.profiles[idx] = prof;
    } else {
      prof = { id: p.id, name: p.name, content: p.content, tags: p.tags, favorite: p.favorite, createdAt: now, updatedAt: now } as Profile;
      state.profiles.push(prof);
    }
  } else {
    prof = { id: crypto.randomUUID(), name: p.name, content: p.content, tags: p.tags, favorite: p.favorite, createdAt: now, updatedAt: now } as Profile;
    state.profiles.push(prof);
  }
  await setState({ profiles: state.profiles });
  return prof;
}

export async function deleteProfile(id: string) {
  const state = await getState();
  const profiles = state.profiles.filter(p => p.id !== id);
  const partial: Partial<StorageSchema> = { profiles };
  if (state.lastUsedProfileId === id) partial.lastUsedProfileId = profiles[0]?.id;
  await setState(partial);
}

export async function setLastUsedProfile(id: string) {
  await setState({ lastUsedProfileId: id });
}

export async function setSettings(settings: Partial<Settings>) {
  const state = await getState();
  await setState({ settings: { ...state.settings, ...settings } });
}

export async function exportJson(): Promise<string> {
  const state = await getState();
  const blob = {
    version: state.version,
    settings: state.settings,
    profiles: state.profiles,
  };
  return JSON.stringify(blob, null, 2);
}

export async function importJson(text: string) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.profiles)) throw new Error('Invalid import file');
  const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) } as Settings;
  const profiles = parsed.profiles as Profile[];
  await setState({ settings, profiles, lastUsedProfileId: profiles[0]?.id });
}
