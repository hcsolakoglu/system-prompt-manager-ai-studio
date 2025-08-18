import type { RuntimeMessage } from '../shared/messages';
import type { InsertMode } from '../shared/types';

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
