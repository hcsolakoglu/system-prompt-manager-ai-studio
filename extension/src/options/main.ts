import { getState, setSettings, upsertProfile, deleteProfile, exportJson, importJson } from '../shared/storage';
import type { Profile, Settings } from '../shared/types';

let editingId: string | null = null;

function el<T extends HTMLElement>(id: string) { return document.getElementById(id) as T; }

function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function renderRows(profiles: Profile[]) {
  const tbody = el<HTMLTableSectionElement>('rows');
  tbody.innerHTML = '';
  for (const p of profiles) {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    const tdContent = document.createElement('td');
    const tdAct = document.createElement('td');
    tdAct.className = 'actions';

    tdName.textContent = p.name;
    tdContent.textContent = p.content.length > 200 ? p.content.slice(0, 200) + '…' : p.content;

    const edit = document.createElement('button'); edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      editingId = p.id;
      el<HTMLInputElement>('name').value = p.name;
      el<HTMLTextAreaElement>('content').value = p.content;
    });

    const del = document.createElement('button'); del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      if (confirm('Delete this profile?')) {
        await deleteProfile(p.id);
        await refresh();
      }
    });

    tdAct.append(edit, ' ', del);
    tr.append(tdName, tdContent, tdAct);
    tbody.appendChild(tr);
  }
}

async function refresh() {
  const state = await getState();
  // settings
  el<HTMLSelectElement>('insertMode').value = state.settings.insertMode;
  el<HTMLInputElement>('showContextMenu').checked = !!state.settings.showContextMenu;
  el<HTMLSelectElement>('theme').value = state.settings.theme ?? 'auto';
  applyTheme(state.settings.theme ?? 'auto');
  renderRows(state.profiles);
}

async function main() {
  await refresh();

  el<HTMLButtonElement>('add').addEventListener('click', async () => {
    const name = el<HTMLInputElement>('name').value.trim();
    const content = el<HTMLTextAreaElement>('content').value.trim();
    if (!name || !content) return alert('Name and content are required.');
    await upsertProfile({ id: editingId ?? undefined, name, content });
    editingId = null;
    el<HTMLInputElement>('name').value = '';
    el<HTMLTextAreaElement>('content').value = '';
    await refresh();
  });

  el<HTMLSelectElement>('insertMode').addEventListener('change', async (e) => {
    const value = (e.target as HTMLSelectElement).value as Settings['insertMode'];
    await setSettings({ insertMode: value });
  });

  el<HTMLInputElement>('showContextMenu').addEventListener('change', async (e) => {
    const value = (e.target as HTMLInputElement).checked;
    await setSettings({ showContextMenu: value });
  });

  el<HTMLSelectElement>('theme').addEventListener('change', async (e) => {
    const value = (e.target as HTMLSelectElement).value as Settings['theme'];
    applyTheme(value);
    await setSettings({ theme: value });
  });

  el<HTMLButtonElement>('export').addEventListener('click', async () => {
    const data = await exportJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aistudio-system-profiles.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  el<HTMLButtonElement>('import').addEventListener('click', async () => {
    const input = el<HTMLInputElement>('importFile');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        await importJson(text);
        await refresh();
        alert('Imported successfully');
      } catch (e) {
        alert('Import failed: ' + (e as Error).message);
      }
    };
    input.click();
  });
}

main();
