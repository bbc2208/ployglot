const BLOCK_TAGS = new Set([
  'SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD', 'NOSCRIPT',
  'IFRAME', 'SVG', 'MATH', 'CANVAS', 'TEXTAREA', 'INPUT',
]);

const INLINE_TAGS = new Set([
  'A', 'SPAN', 'EM', 'STRONG', 'B', 'I', 'U', 'MARK', 'SMALL',
  'SUP', 'SUB', 'ABBR', 'LABEL', 'TIME',
]);

// React attaches internal fiber references to managed DOM nodes.
// These keys indicate the node is controlled by React's VDOM and should NOT be
// mutated directly — doing so triggers reconciliation → re-render → translate loop.
const REACT_FIBER_PROPS = [
  '__reactFiber$',
  '__reactInternalInstance$',
  '__reactContainer$',
  '_reactRootContainer',
];

function shouldSkipElement(el: Element): boolean {
  if (BLOCK_TAGS.has(el.tagName)) return true;
  if (el.hasAttribute('data-polyglot-original')) return true;
  if (el.hasAttribute('data-polyglot-translated')) return true;
  if (el.getAttribute('translate') === 'no') return true;
  return false;
}

/** Check if a text node is inside a React-managed DOM subtree */
export function isReactManaged(node: Text): boolean {
  let el: Element | null = node.parentElement;
  while (el) {
    for (const key of REACT_FIBER_PROPS) {
      if (key in el) return true;
    }
    // React 16+ also sets this data attribute on roots
    if (el.hasAttribute('data-reactroot')) return true;
    el = el.parentElement;
  }
  return false;
}

function isBlockLevel(el: Element): boolean {
  if (INLINE_TAGS.has(el.tagName)) return false;
  const display = getComputedStyle(el).display;
  return display === 'block' || display === 'flex' || display === 'grid' || display === 'list-item';
}

/** Collect all text segments from the page that need translation */
export function collectTextSegments(root: Element): { node: Text; text: string }[] {
  const segments: { node: Text; text: string }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Text): number {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      if (isReactManaged(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent.trim();
    if (text.length > 1) {
      segments.push({ node, text });
    }
  }

  return segments;
}

/** Collect texts from visible text nodes for language detection sampling */
export function sampleTextForDetection(
  root: Element,
  maxChars: number = 500,
): string {
  const texts: string[] = [];
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Text): number {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      if (isReactManaged(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent.trim();
    if (text.length > 2) {
      texts.push(text);
      total += text.length;
      if (total >= maxChars) break;
    }
  }

  return texts.join(' ').slice(0, maxChars);
}

/** Split text into sentences for more accurate chunking */
function splitSentences(text: string): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?]?(\s|$)/g);
  if (!sentences || sentences.length === 0) return [text];

  const merged: string[] = [];
  let buffer = '';
  for (const s of sentences) {
    if ((buffer + s).length > 5000) {
      if (buffer) merged.push(buffer.trim());
      buffer = s;
    } else {
      buffer += s;
    }
  }
  if (buffer.trim()) merged.push(buffer.trim());
  return merged;
}

/** Apply translated text to DOM based on translation mode */
export type TranslationMode = 'replace' | 'keep_original' | 'selection_only';

export function applyTranslation(
  textNode: Text,
  translatedText: string,
  mode: TranslationMode,
  originalText: string,
): void {
  const parent = textNode.parentElement;
  if (!parent) return;

  if (mode === 'replace') {
    textNode.textContent = translatedText;
    parent.setAttribute('data-polyglot-translated', '');
    parent.setAttribute('data-polyglot-original', originalText);
  } else if (mode === 'keep_original') {
    // Mark parent to prevent re-scanning
    parent.setAttribute('data-polyglot-translated', '');
    const span = document.createElement('span');
    span.className = 'polyglot-trans';
    span.setAttribute('data-polyglot-translated', '');
    span.textContent = translatedText;
    span.style.cssText =
      'color:#666;font-style:italic;display:block;font-size:0.92em;border-left:3px solid #4a90d9;padding-left:8px;margin-top:2px;';
    const container = document.createDocumentFragment();
    container.appendChild(document.createTextNode(originalText));
    container.appendChild(document.createElement('br'));
    container.appendChild(span);
    textNode.replaceWith(container);
  }
}
