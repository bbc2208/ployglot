import type { TranslationMode } from '@/shared/text-splitter';
import {
  collectTextSegments,
  sampleTextForDetection,
  applyTranslation,
  isReactManaged,
} from '@/shared/text-splitter';
import { detectPageLangFromDOM, getLangName } from '@/shared/languages';
import {
  getSettings,
  isSiteBlacklisted,
  getSiteInputPreference,
  setSiteInputPreference,
} from '@/shared/storage';

// ── Notification Bar ──

let notificationBar: HTMLDivElement | null = null;

function showNotification(
  message: string,
  type: 'info' | 'error' | 'success' = 'info',
  actionLabel?: string,
  actionFn?: () => void,
): void {
  removeNotification();

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });

  const colors: Record<string, { bg: string; border: string; text: string }> = {
    error: { bg: '#4a1515', border: '#ff5252', text: '#ff8a80' },
    success: { bg: '#0d2818', border: '#4caf50', text: '#81c784' },
    info: { bg: '#16213e', border: '#4a90d9', text: '#90caf9' },
  };
  const c = colors[type];

  const style = document.createElement('style');
  style.textContent = `
    .polyglot-bar {
      position:fixed;top:0;left:0;right:0;z-index:2147483646;
      background:${c.bg};border-bottom:2px solid ${c.border};color:${c.text};
      padding:10px 16px;font-size:13px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      display:flex;align-items:center;justify-content:space-between;
      animation:polyglot-slide 0.3s ease;
    }
    @keyframes polyglot-slide{from{transform:translateY(-100%)}to{transform:translateY(0)}}
    .polyglot-bar .p-left{display:flex;align-items:center;gap:10px;}
    .polyglot-bar .p-close{background:none;border:none;color:#888;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;}
    .polyglot-bar .p-close:hover{color:#fff;}
    .polyglot-bar .p-action{background:${c.border};color:#fff;border:none;border-radius:4px;padding:4px 12px;font-size:12px;cursor:pointer;font-weight:500;}
    .polyglot-bar .p-action:hover{filter:brightness(1.15);}
  `;

  const bar = document.createElement('div');
  bar.className = 'polyglot-bar';
  const left = document.createElement('div');
  left.className = 'p-left';
  const msg = document.createElement('span');
  msg.textContent = message;
  left.appendChild(msg);

  if (actionLabel && actionFn) {
    const btn = document.createElement('button');
    btn.className = 'p-action';
    btn.textContent = actionLabel;
    btn.onclick = actionFn;
    left.appendChild(btn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'p-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = removeNotification;

  bar.appendChild(left);
  bar.appendChild(closeBtn);
  shadow.appendChild(style);
  shadow.appendChild(bar);
  notificationBar = host;
  if (document.body) {
    document.body.insertBefore(host, document.body.firstChild);
  } else {
    document.documentElement.appendChild(host);
  }
}

function removeNotification(): void {
  if (notificationBar) {
    notificationBar.remove();
    notificationBar = null;
  }
}

// ── Selection Popover ──

let popover: HTMLDivElement | null = null;

function showPopover(
  x: number,
  y: number,
  original: string,
  translated: string,
): void {
  removePopover();

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .polyglot-popover {
      position:fixed;z-index:2147483647;background:#1a1a2e;color:#e0e0e0;
      border-radius:10px;padding:14px 16px;font-size:14px;max-width:420px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      box-shadow:0 6px 24px rgba(0,0,0,0.4);line-height:1.5;
      animation:polyglot-pop 0.15s ease;
    }
    @keyframes polyglot-pop{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    .polyglot-popover .p-orig{color:#888;font-size:12px;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:6px;max-height:60px;overflow:hidden;text-overflow:ellipsis;}
    .polyglot-popover .p-trans{color:#e0e0e0;margin-bottom:10px;}
    .polyglot-popover .p-actions{display:flex;gap:8px;}
    .polyglot-popover button{border:none;border-radius:4px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:500;}
    .polyglot-popover .p-copy{background:#4a90d9;color:#fff;}
    .polyglot-popover .p-copy:hover{background:#5a9fe9;}
    .polyglot-popover .p-close{background:transparent;color:#888;border:1px solid #444;}
    .polyglot-popover .p-close:hover{background:#333;}
  `;

  const container = document.createElement('div');
  container.className = 'polyglot-popover';

  const origEl = document.createElement('div');
  origEl.className = 'p-orig';
  origEl.textContent = original;

  const transEl = document.createElement('div');
  transEl.className = 'p-trans';
  transEl.textContent = translated;

  const actions = document.createElement('div');
  actions.className = 'p-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'p-copy';
  copyBtn.textContent = '复制译文';
  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(translated);
    copyBtn.textContent = '已复制';
    setTimeout(() => { copyBtn.textContent = '复制译文'; }, 1500);
  };

  const closeBtn = document.createElement('button');
  closeBtn.className = 'p-close';
  closeBtn.textContent = '关闭';
  closeBtn.onclick = removePopover;

  actions.appendChild(copyBtn);
  actions.appendChild(closeBtn);
  container.appendChild(origEl);
  container.appendChild(transEl);
  container.appendChild(actions);
  shadow.appendChild(style);
  shadow.appendChild(container);

  popover = host;
  document.body.appendChild(host);

  const popRect = host.getBoundingClientRect();
  const left = Math.max(10, Math.min(x, window.innerWidth - 430));
  const top = Math.max(10, Math.min(y, window.innerHeight - popRect.height - 10));
  container.style.left = `${left}px`;
  container.style.top = `${top}px`;
}

function removePopover(): void {
  if (popover) {
    popover.remove();
    popover = null;
  }
}

// ── Input Translation Prompt ──

let inputPromptEl: HTMLDivElement | null = null;

async function translateAndReplaceInput(
  inputEl: HTMLElement,
  userLang: string,
  pageLang: string,
): Promise<void> {
  const text = (inputEl as HTMLInputElement).value || inputEl.textContent || '';
  if (!text.trim()) return;
  try {
    const result = await browser.runtime.sendMessage({
      type: 'TRANSLATE_SELECTION',
      text: text.trim(),
      source: userLang,
      target: pageLang,
    });
    if (inputEl instanceof HTMLInputElement || inputEl instanceof HTMLTextAreaElement) {
      inputEl.value = result.translated;
    } else {
      inputEl.textContent = result.translated;
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  } catch {
    // silent
  }
}

function createInputPrompt(
  inputEl: HTMLElement,
  userLang: string,
  pageLang: string,
  domain: string,
): HTMLDivElement {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .polyglot-prompt {
      position:fixed;z-index:2147483647;background:#1a1a2e;color:#e0e0e0;
      border-radius:8px;padding:10px 14px;font-size:13px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      box-shadow:0 4px 16px rgba(0,0,0,0.35);display:flex;align-items:center;gap:8px;
      white-space:nowrap;animation:polyglot-fadein 0.2s ease;
    }
    @keyframes polyglot-fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    .polyglot-prompt .p-label{max-width:240px;overflow:hidden;text-overflow:ellipsis;}
    .polyglot-prompt button{border:none;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;font-weight:500;flex-shrink:0;}
    .polyglot-prompt .p-yes{background:#4a90d9;color:#fff;}
    .polyglot-prompt .p-yes:hover{background:#5a9fe9;}
    .polyglot-prompt .p-no{background:transparent;color:#999;border:1px solid #555;}
    .polyglot-prompt .p-no:hover{background:#333;}
    .polyglot-prompt .p-always{background:transparent;color:#4a90d9;border:1px solid #4a90d9;font-size:11px;}
    .polyglot-prompt .p-always:hover{background:rgba(74,144,217,0.15);}
  `;

  const container = document.createElement('div');
  container.className = 'polyglot-prompt';

  const label = document.createElement('span');
  label.className = 'p-label';
  label.textContent = `将输入的${getLangName(userLang)}翻译为${getLangName(pageLang)}？`;

  const yesBtn = document.createElement('button');
  yesBtn.className = 'p-yes';
  yesBtn.textContent = '翻译';
  yesBtn.onclick = async () => {
    await translateAndReplaceInput(inputEl, userLang, pageLang);
    removeInputPrompt();
  };

  const alwaysBtn = document.createElement('button');
  alwaysBtn.className = 'p-always';
  alwaysBtn.textContent = '始终翻译';
  alwaysBtn.onclick = async () => {
    await setSiteInputPreference(domain, 'always');
    await translateAndReplaceInput(inputEl, userLang, pageLang);
    removeInputPrompt();
  };

  const noBtn = document.createElement('button');
  noBtn.className = 'p-no';
  noBtn.textContent = '忽略';
  noBtn.onclick = async () => {
    await setSiteInputPreference(domain, 'never');
    removeInputPrompt();
  };

  container.appendChild(label);
  container.appendChild(yesBtn);
  container.appendChild(alwaysBtn);
  container.appendChild(noBtn);
  shadow.appendChild(style);
  shadow.appendChild(container);

  // Position relative to input, reposition on scroll/resize
  const reposition = () => {
    const rect = inputEl.getBoundingClientRect();
    host.style.position = 'fixed';
    host.style.left = `${Math.max(8, rect.left)}px`;
    host.style.top = `${rect.bottom + 8}px`;
  };
  reposition();
  window.addEventListener('scroll', reposition, { passive: true, capture: true });
  window.addEventListener('resize', reposition);

  // Attach cleanup to host
  (host as any).__polyglotCleanup = () => {
    window.removeEventListener('scroll', reposition, { capture: true });
    window.removeEventListener('resize', reposition);
  };

  return host;
}

function removeInputPrompt(): void {
  if (inputPromptEl) {
    (inputPromptEl as any).__polyglotCleanup?.();
    inputPromptEl.remove();
    inputPromptEl = null;
  }
}



// ── Dedup guard: prevents React VDOM re-render → re-translate loops ──

const recentlyTranslated = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000;

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function wasRecentlyTranslated(text: string): boolean {
  const key = hashText(text);
  const ts = recentlyTranslated.get(key);
  if (ts && Date.now() - ts < DEDUP_WINDOW_MS) return true;
  return false;
}

function markRecentlyTranslated(text: string): void {
  const key = hashText(text);
  recentlyTranslated.set(key, Date.now());
  // Clean stale entries periodically
  if (recentlyTranslated.size > 5000) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [k, v] of recentlyTranslated) {
      if (v < cutoff) recentlyTranslated.delete(k);
    }
  }
}

// ── Translation engine helpers ──

async function translatePage(
  root: Element,
  source: string,
  target: string,
  mode: TranslationMode,
): Promise<void> {
  const segments = collectTextSegments(root);
  console.log('[Polyglot] Found', segments.length, 'text segments to translate');
  if (segments.length === 0) return;

  const texts = segments.map((s) => s.text);
  const uniqueTexts = [...new Set(texts)].filter((t) => !wasRecentlyTranslated(t));

  if (uniqueTexts.length === 0) return;

  const result = await browser.runtime.sendMessage({
    type: 'TRANSLATE',
    texts: uniqueTexts,
    source,
    target,
  });

  const translationMap = result.translations as Record<string, string>;

  for (const { node, text } of segments) {
    const translated = translationMap[text];
    if (translated && translated !== text) {
      applyTranslation(node, translated, mode, text);
    }
    markRecentlyTranslated(text);
  }
}

async function translateNewNodes(
  source: string,
  target: string,
  mode: TranslationMode,
  roots?: Node[],
): Promise<void> {
  let elementsToScan: Element[];

  if (roots && roots.length > 0) {
    // Layer B: targeted scanning — only scan subtrees of added nodes
    const unprocessed = new Set<Element>();
    const skipTags = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'SVG', 'IFRAME']);
    for (const root of roots) {
      if (root.nodeType === Node.ELEMENT_NODE) {
        const el = root as Element;
        if (!el.hasAttribute('data-polyglot-translated') && !skipTags.has(el.tagName)) {
          unprocessed.add(el);
        }
        if ('querySelectorAll' in el) {
          const descendants = el.querySelectorAll('*');
          for (const d of descendants) {
            if (!d.hasAttribute('data-polyglot-translated') && !skipTags.has(d.tagName)) {
              unprocessed.add(d);
            }
          }
        }
      }
    }
    elementsToScan = [...unprocessed];
  } else {
    elementsToScan = [...document.querySelectorAll(
      'body *:not([data-polyglot-translated]):not(script):not(style):not(code):not(pre)',
    )];
  }

  const texts: { node: Text; text: string }[] = [];
  for (const el of elementsToScan) {
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        const textNode = child as Text;
        // Layer A: skip React-managed nodes
        if (isReactManaged(textNode)) continue;
        const text = textNode.textContent.trim();
        if (text.length > 1) {
          texts.push({ node: textNode, text });
        }
      }
    }
  }

  if (texts.length === 0) return;

  // Filter out texts that were translated within the last 5 seconds
  const filtered = texts.filter((t) => !wasRecentlyTranslated(t.text));
  if (filtered.length === 0) return;

  const uniqueTexts = [...new Set(filtered.map((t) => t.text))];

  try {
    const result = await browser.runtime.sendMessage({
      type: 'TRANSLATE',
      texts: uniqueTexts,
      source,
      target,
    });
    const translationMap = result.translations as Record<string, string>;
    for (const { node, text } of filtered) {
      const translated = translationMap[text];
      if (translated && translated !== text) {
        applyTranslation(node, translated, mode, text);
      }
      markRecentlyTranslated(text);
    }
  } catch {
    // Silently fail for dynamic content
  }
}

// ══════════════════════════════════════════════════════════
// Main Content Script Entry Point
// ══════════════════════════════════════════════════════════

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',

  async main() {
    let translationMode: TranslationMode = 'replace';
    let targetLang = 'zh';
    let pageLang = '';
    let isEnabled = true;
    let inputPromptEnabled = false;

    console.log('[Polyglot] Content script loaded');

    // ── Load settings ──

    let settings;
    try {
      settings = await getSettings();
      console.log('[Polyglot] Settings:', {
        enabled: settings.enabled,
        targetLang: settings.targetLang,
        hasApiKey: !!(settings.secretId && settings.secretKey),
        mode: settings.defaultMode,
        inputBehavior: settings.inputBehavior,
      });
    } catch (e) {
      console.error('[Polyglot] Failed to load settings:', e);
      showNotification('Polyglot: 无法加载设置，请刷新页面重试', 'error');
      return;
    }

    translationMode = settings.defaultMode;
    targetLang = settings.targetLang;
    isEnabled = settings.enabled;

    const domain = window.location.hostname;

    if (await isSiteBlacklisted(domain)) {
      console.log('[Polyglot] Site blacklisted:', domain);
      return;
    }
    if (!isEnabled) {
      console.log('[Polyglot] Extension disabled');
      return;
    }

    // ── API key check ──

    if (!settings.secretId || !settings.secretKey) {
      showNotification(
        '尚未配置腾讯云 API 密钥',
        'error',
        '点击配置',
        () => browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' }),
      );
      return;
    }

    // ── Detect page language ──

    const domLang = detectPageLangFromDOM();
    const sample = sampleTextForDetection(document.body, 500);
    console.log('[Polyglot] DOM lang hint:', domLang, '| sample length:', sample.length);

    if (sample.length > 10) {
      try {
        const result = await browser.runtime.sendMessage({
          type: 'DETECT_LANGUAGE',
          text: sample,
        });
        pageLang = result.detectedLang;
        console.log('[Polyglot] Detected:', pageLang, 'confidence:', result.confidence);
      } catch (e) {
        console.error('[Polyglot] Language detection failed:', e);
        pageLang = domLang || window.navigator.language.split('-')[0];
      }
    } else {
      pageLang = domLang || window.navigator.language.split('-')[0];
    }

    const userLang = targetLang;

    // ── Page Translation ──

    if (pageLang !== userLang) {
      console.log(`[Polyglot] Translating ${getLangName(pageLang)} → ${getLangName(userLang)}`);

      try {
        await translatePage(document.body, pageLang, userLang, translationMode);
        console.log('[Polyglot] Page translation done');
      } catch (e) {
        console.error('[Polyglot] Translation failed:', e);
        showNotification(
          `翻译失败 — ${e instanceof Error ? e.message : '未知错误'}`,
          'error',
          '检查配置',
          () => browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' }),
        );
      }

      // MutationObserver for dynamic content — Layers B & C
      let domObserver: MutationObserver | null = null;
      let observerReconnectTimer: ReturnType<typeof setTimeout> | null = null;

      domObserver = new MutationObserver((mutations: MutationRecord[]) => {
        // Layer B: collect only added nodes from mutation records (targeted scanning)
        const addedNodes: Node[] = [];
        for (const mut of mutations) {
          for (const node of mut.addedNodes) {
            addedNodes.push(node);
          }
        }

        if (addedNodes.length === 0) return;

        // Layer C: disconnect observer during translation to prevent re-entry
        if (domObserver) domObserver.disconnect();
        if (observerReconnectTimer) clearTimeout(observerReconnectTimer);

        translateNewNodes(pageLang, userLang, translationMode, addedNodes).finally(() => {
          // Reconnect after 500ms cool-down
          observerReconnectTimer = setTimeout(() => {
            if (domObserver && document.body) {
              domObserver.observe(document.body, { childList: true, subtree: true });
            }
          }, 500);
        });
      });

      domObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } else {
      console.log('[Polyglot] Page already in target language, skipping translation');
    }

    // ── Input Translation Listener ──

    console.log('[Polyglot] Setting up input listener. inputBehavior:', settings.inputBehavior);
    if (settings.inputBehavior !== 'never') {
      const savedPref = await getSiteInputPreference(domain);
      if (savedPref !== 'never') {
        inputPromptEnabled = savedPref === 'always';

        const autoMode = settings.inputBehavior === 'auto_translate' || inputPromptEnabled;
        let activeInputEl: HTMLElement | null = null;

        document.addEventListener('focusin', (e) => {
          const target = e.target as HTMLElement;
          if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target.getAttribute('contenteditable') === 'true'
          ) {
            console.log('[Polyglot] Input focus, promptEnabled:', inputPromptEnabled,
              'pageLang:', pageLang, 'userLang:', userLang);

            if (!pageLang || pageLang === userLang) return;

            activeInputEl = target;
            removeInputPrompt();

            if (!autoMode) {
              inputPromptEl = createInputPrompt(target, userLang, pageLang, domain);
              document.body.appendChild(inputPromptEl);
            }
          }
        });

        document.addEventListener('focusout', () => {
          const el = activeInputEl;
          activeInputEl = null;
          setTimeout(async () => {
            if (autoMode && el) {
              if (!pageLang || pageLang === userLang) return;
              await translateAndReplaceInput(el, userLang, pageLang);
            }
            removeInputPrompt();
          }, 150);
        });
      }
    }

    // ── Selection Translation Listener ──

    document.addEventListener('mouseup', () => {
      setTimeout(async () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
          removePopover();
          return;
        }

        const text = selection.toString().trim();
        if (text.length < 2 || text.length > 5000) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        try {
          const result = await browser.runtime.sendMessage({
            type: 'TRANSLATE_SELECTION',
            text,
            source: 'auto',
            target: userLang,
          });
          showPopover(rect.right, rect.bottom + 8, text, result.translated);
        } catch {
          // API not configured or translation failed
        }
      }, 50);
    });

    document.addEventListener('mousedown', (e) => {
      if (popover && !popover.contains(e.target as Node)) {
        removePopover();
      }
    });

    // ── Popup message listener ──

    browser.runtime.onMessage.addListener(
      (msg: { type: string; mode?: TranslationMode; enabled?: boolean; targetLang?: string }) => {
        if (msg.type === 'TRANSLATION_MODE_CHANGED' && msg.mode) {
          translationMode = msg.mode;
        }
        if (msg.type === 'TRANSLATION_ENABLED' && msg.enabled !== undefined) {
          isEnabled = msg.enabled;
          if (isEnabled && pageLang) {
            translatePage(document.body, pageLang, userLang, translationMode);
          }
        }
      },
    );

    console.log('[Polyglot] All systems ready');
  },
});
