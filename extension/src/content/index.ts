import type { RuntimeMessage } from '../shared/messages';
import type { InsertMode } from '../shared/types';
import { getState, setSettings } from '../shared/storage';

function isTextarea(el: Element | null): el is HTMLTextAreaElement {
  return !!el && el.tagName.toLowerCase() === 'textarea';
}

function isEditable(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const t = el.tagName?.toLowerCase();
  if (t === 'textarea') return true;
  if (t === 'input' && (el as HTMLInputElement).type === 'text') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.getAttribute('role') === 'textbox') return true;
  return false;
}

function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const node = el as HTMLElement;
  if (node.hidden) return false;
  const style = window.getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  if (node.getClientRects().length === 0) return false;
  return true;
}

function looksLikeMainPrompt(el: Element): boolean {
  return !!(el.closest('.prompt-input-wrapper-container'));
}

function findSystemTextarea(root: ParentNode = document): HTMLTextAreaElement | null {
  // Most stable: aria-label in EN
  let el = root.querySelector('textarea[aria-label="System instructions"]');
  if (el && !looksLikeMainPrompt(el) && isVisible(el)) return el as HTMLTextAreaElement;

  // Fallback: placeholder text observed
  el = root.querySelector('textarea[placeholder="Optional tone and style instructions for the model"]');
  if (el && !looksLikeMainPrompt(el) && isVisible(el)) return el as HTMLTextAreaElement;

  // Fallback: class hints from probe
  el = root.querySelector('textarea.cdk-textarea-autosize.textarea.toolbar-expand-textarea');
  if (el && !looksLikeMainPrompt(el) && isVisible(el)) return el as HTMLTextAreaElement;

  // Avoid the main prompt textarea explicitly
  const candidates = Array.from(root.querySelectorAll('textarea'))
    .filter(e => !looksLikeMainPrompt(e) && isVisible(e));
  return (candidates[0] as HTMLTextAreaElement) || null;
}

function applyInsert(target: HTMLTextAreaElement | HTMLElement, text: string, mode: InsertMode = 'replace') {
  if (isTextarea(target)) {
    const ta = target as HTMLTextAreaElement;
    const prev = ta.value;
    let next = text;
    if (mode === 'append') next = prev ? prev + (prev.endsWith('\n') ? '' : '\n') + text : text;
    if (mode === 'prepend') next = text + (text.endsWith('\n') ? '' : '\n') + prev;
    ta.focus();
    ta.value = next;
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // contenteditable/role=textbox fallback
    const el = target as HTMLElement;
    const prev = el.innerText || '';
    let next = text;
    if (mode === 'append') next = prev ? prev + (prev.endsWith('\n') ? '' : '\n') + text : text;
    if (mode === 'prepend') next = text + (text.endsWith('\n') ? '' : '\n') + prev;
    el.focus();
    el.innerText = next;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

async function handleInsertAsync(text: string, mode: InsertMode = 'replace') {
  // Ensure system instructions panel is open if needed
  await openSystemPanelIfNeeded();

  let target: HTMLElement | null = findSystemTextarea();
  if (!target || !isEditable(target)) {
    // Fallback: currently focused element if editable
    const active = document.activeElement as HTMLElement | null;
    if (isEditable(active) && !looksLikeMainPrompt(active)) {
      target = active;
    }
  }
  if (!target) {
    console.warn('[AI Studio Profiles] No suitable system message field found.');
    return;
  }
  // Confirm overwrite if replacing and content already exists
  if (mode === 'replace') {
    const current = isTextarea(target) ? (target as HTMLTextAreaElement).value : (target as HTMLElement).innerText || '';
    if (current.trim().length > 0) {
      const state = await getState();
      if (state.settings.confirmOverwriteSystem) {
        const theme = state.settings.theme ?? 'auto';
        const darkPreferred = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const res = await confirmOverwriteModal(darkPreferred);
        if (!res.confirmed) return;
        if (res.dontAskAgain) {
          await setSettings({ confirmOverwriteSystem: false });
        }
      }
    }
  }
  applyInsert(target, text, mode);
}

chrome.runtime.onMessage.addListener((msg: RuntimeMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  (async () => {
    if (msg.type === 'INSERT_PROFILE') {
      await handleInsertAsync(msg.profile.content, msg.mode);
      sendResponse({ ok: true });
    }
  })();
  // Keep the message channel open for async response
  return true;
});

function findSystemButton(root: ParentNode = document): HTMLButtonElement | null {
  // Prefer explicit aria-label, fallback to data attribute seen in probes
  const btn = root.querySelector(
    'button[aria-label="System instructions"], button[data-test-si]'
  );
  return (btn as HTMLButtonElement) || null;
}

async function waitForSystemTextarea(timeoutMs = 5000): Promise<HTMLTextAreaElement | null> {
  const existing = findSystemTextarea();
  if (existing) return existing;

  return new Promise((resolve) => {
    let observer: MutationObserver;
    const timeout = setTimeout(() => {
      observer?.disconnect();
      resolve(findSystemTextarea());
    }, timeoutMs);

    observer = new MutationObserver(() => {
      const ta = findSystemTextarea();
      if (ta) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve(ta);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

// Lightweight confirm modal isolated with Shadow DOM
function confirmOverwriteModal(darkPreferred = false): Promise<{ confirmed: boolean; dontAskAgain: boolean }> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';
    // Ensure native controls match
    (host.style as any).colorScheme = darkPreferred ? 'dark' : 'light';
    const shadow = host.attachShadow({ mode: 'open' });

    const overlay = document.createElement('div');
    overlay.setAttribute('part', 'overlay');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = darkPreferred ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.pointerEvents = 'auto';

    const panel = document.createElement('div');
    panel.setAttribute('part', 'panel');
    panel.style.maxWidth = '420px';
    panel.style.width = 'min(92vw, 420px)';
    panel.style.background = darkPreferred ? '#2b2b2b' : 'white';
    panel.style.color = darkPreferred ? '#e9eaee' : '#111';
    panel.style.borderRadius = '12px';
    panel.style.boxShadow = darkPreferred ? '0 10px 30px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.25)';
    panel.style.padding = '16px';
    panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif';

    const title = document.createElement('div');
    title.textContent = 'Overwrite system instructions?';
    title.style.fontSize = '16px';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';

    const body = document.createElement('div');
    body.textContent = 'There is already text in the System instructions. Replacing it will discard the current text.';
    body.style.fontSize = '13px';
    body.style.lineHeight = '1.5';
    body.style.marginBottom = '12px';

    const askWrap = document.createElement('label');
    askWrap.style.display = 'flex';
    askWrap.style.alignItems = 'center';
    askWrap.style.gap = '8px';
    askWrap.style.margin = '8px 0 16px';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    const cbTxt = document.createElement('span');
    cbTxt.textContent = "Don't ask again";
    cbTxt.style.fontSize = '12px';
    askWrap.append(cb, cbTxt);

    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';
    btns.style.gap = '8px';

    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.padding = '6px 12px';
    cancel.style.border = darkPreferred ? '1px solid #3c4043' : '1px solid #dadce0';
    cancel.style.background = darkPreferred ? '#1f1f1f' : 'white';
    cancel.style.color = darkPreferred ? '#e9eaee' : '#1f1f1f';
    cancel.style.borderRadius = '8px';
    cancel.style.cursor = 'pointer';

    const confirm = document.createElement('button');
    confirm.textContent = 'Replace';
    confirm.style.padding = '6px 12px';
    confirm.style.border = '1px solid #1a73e8';
    confirm.style.background = '#1a73e8';
    confirm.style.color = '#fff';
    confirm.style.borderRadius = '8px';
    confirm.style.cursor = 'pointer';

    btns.append(cancel, confirm);
    panel.append(title, body, askWrap, btns);
    overlay.append(panel);
    shadow.append(overlay);
    document.documentElement.appendChild(host);

    const cleanup = () => host.remove();

    cancel.addEventListener('click', () => {
      cleanup();
      resolve({ confirmed: false, dontAskAgain: false });
    });
    confirm.addEventListener('click', () => {
      const dont = !!cb.checked;
      cleanup();
      resolve({ confirmed: true, dontAskAgain: dont });
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false, dontAskAgain: false });
      }
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', onKey, true);
        cleanup();
        resolve({ confirmed: false, dontAskAgain: false });
      }
    };
    window.addEventListener('keydown', onKey, true);
  });
}

async function openSystemPanelIfNeeded(): Promise<boolean> {
  // If already visible, nothing to do
  const present = findSystemTextarea();
  if (present) return true;

  const btn = findSystemButton();
  if (!btn) return false;
  btn.click();
  const ta = await waitForSystemTextarea(5000);
  return !!ta;
}

// Observe SPA mutations; if needed, we could auto-attach helpers. Here we just keep the file alive.
const observer = new MutationObserver(() => {
  // no-op for now; placeholder for future improvements
});
observer.observe(document.documentElement, { childList: true, subtree: true });
