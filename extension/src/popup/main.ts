import { getState, setLastUsedProfile } from '../shared/storage';
import type { Profile, Settings } from '../shared/types';

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id;
}

async function sendInsert(profile: Profile) {
  const state = await getState();
  const tabId = await getActiveTabId();
  if (!tabId) return;
  await chrome.tabs.sendMessage(tabId, { type: 'INSERT_PROFILE', profile, mode: state.settings.insertMode });
  await setLastUsedProfile(profile.id);
  window.close();
}

function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function render(profiles: Profile[]) {
  const ul = document.getElementById('list')!;
  ul.innerHTML = '';
  profiles.forEach(p => {
    const li = document.createElement('li');
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = p.name;
    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = p.content.slice(0, 300);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = 'Insert';
    btn.addEventListener('click', (e) => { e.stopPropagation(); sendInsert(p); });
    actions.appendChild(btn);
    li.appendChild(name);
    li.appendChild(content);
    li.appendChild(actions);
    li.addEventListener('click', () => sendInsert(p));
    ul.appendChild(li);
  });
}

async function main() {
  const state = await getState();
  applyTheme(state.settings.theme ?? 'auto');
  const input = document.getElementById('search') as HTMLInputElement;
  const openOptions = document.getElementById('openOptions') as HTMLAnchorElement;
  let list = state.profiles.slice();
  const update = () => {
    const q = input.value.toLowerCase();
    const filtered = list.filter(p => p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    render(filtered);
  };
  input.addEventListener('input', update);
  openOptions.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
  update();
}

main();
