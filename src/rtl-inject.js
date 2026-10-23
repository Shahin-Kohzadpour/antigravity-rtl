/**
 * Antigravity 2.0 - Smart Auto-Bidi RTL Support (Arabic / Persian / Urdu / Kurdish / Pashto)
 * Location: src/rtl-inject.js
 *
 * Version: 1.5.0
 * Features:
 * - Smart Inline Code Auto-Bidi: inline code blocks (`...`) containing RTL or English-leading RTL
 *   sentences (e.g. `README هنوز...`, `Docker رو...`) correctly detect and display as RTL instead of being
 *   blindly forced to LTR, while keeping pure English code tokens (e.g. `npm install`, `README`) strictly LTR
 * - Precision Sentence Prose BiDi: RTL sentences starting with English words (e.g. "README هنوز...",
 *   "Docker رو...", "Visual Studio Code رو باز کن") automatically detect as RTL without manual marks
 * - Preserves LTR for English sentences containing parenthesized RTL annotations
 * - Per-paragraph / per-element Auto-Bidi detection (Telegram / Notion style)
 * - Supports User Messages, Sticky Prompt Headers, Agent Responses, Artifacts Panel, and Lexical Input Boxes
 * - Ask Question & /grill-me Modal: Auto-Bidi for questions & options, plus automatic newline/Enter formatting
 *   after (Recommended) so English recommendation tags never clash with RTL option descriptions
 * - Strictly preserves LTR for code blocks, inline code, file/command pills (.context-scope-mention), KaTeX, and Mermaid
 * - Fixes Tailwind hardcoded LTR paddings/borders on lists, blockquotes, alerts, and tables
 * - Live RTL/LTR switching inside Lexical message & comment input boxes
 * - Does not alter default application fonts or non-content UI layout
 */
(function () {
  'use strict';

  const STYLE_ID = 'ag-rtl-support-style';
  const VERSION = '1.5.0';

  if (window.__AG_RTL_OBSERVER__) {
    try { window.__AG_RTL_OBSERVER__.disconnect(); } catch {}
  }
  window.__AG_RTL_SUPPORT_VERSION__ = VERSION;

  // Strong RTL character ranges (Arabic, Persian, Urdu, Kurdish, Pashto, Sindhi, Uyghur, Presentation Forms)
  const RTL_CHAR_RE = /[\u0600-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/;
  const RTL_CHAR_RE_GLOBAL = /[\u0600-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/g;
  // Strong LTR character ranges (Basic/Extended Latin, Greek, Cyrillic)
  const LTR_CHAR_RE = /[A-Za-z\u00C0-\u02B8\u0370-\u052F]/;
  const LTR_CHAR_RE_GLOBAL = /[A-Za-z\u00C0-\u02B8\u0370-\u052F]/g;

  const CSS_RULES = `
/* === Antigravity 2.0 Smart Auto-Bidi RTL Support === */

/* 1. Markdown Block Elements (.md-divider-spacing covers Agent Responses & Artifacts Panel) */
.md-divider-spacing p[dir="rtl"],
.md-divider-spacing h1[dir="rtl"],
.md-divider-spacing h2[dir="rtl"],
.md-divider-spacing h3[dir="rtl"],
.md-divider-spacing h4[dir="rtl"],
.md-divider-spacing h5[dir="rtl"],
.md-divider-spacing h6[dir="rtl"],
.md-divider-spacing li[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

.md-divider-spacing p[dir="ltr"],
.md-divider-spacing h1[dir="ltr"],
.md-divider-spacing h2[dir="ltr"],
.md-divider-spacing h3[dir="ltr"],
.md-divider-spacing h4[dir="ltr"],
.md-divider-spacing h5[dir="ltr"],
.md-divider-spacing h6[dir="ltr"],
.md-divider-spacing li[dir="ltr"] {
  direction: ltr;
  text-align: left;
}

/* 1b. User Messages in Chat Log & Sticky User Prompt Preview */
div.whitespace-pre-wrap.text-sm[dir="rtl"] {
  direction: rtl;
  text-align: start;
  unicode-bidi: plaintext;
}

div.whitespace-pre-wrap.text-sm[dir="ltr"] {
  direction: ltr;
  text-align: start;
  unicode-bidi: plaintext;
}

/* 2. Lists (Override Antigravity's hardcoded [&_ul]:pl-10 and [&>ul]:!pl-4 in RTL) */
.md-divider-spacing ul[dir="rtl"]:not(.contains-task-list),
.md-divider-spacing ol[dir="rtl"]:not(.contains-task-list) {
  direction: rtl !important;
  text-align: right !important;
  padding-right: 1.5rem !important;
  padding-left: 0 !important;
}

.md-divider-spacing > ul[dir="rtl"]:not(.contains-task-list),
.md-divider-spacing > ol[dir="rtl"]:not(.contains-task-list) {
  padding-right: 1.25rem !important;
  padding-left: 0 !important;
}

.md-divider-spacing ul ul[dir="rtl"]:not(.contains-task-list),
.md-divider-spacing ol ol[dir="rtl"]:not(.contains-task-list),
.md-divider-spacing ul ol[dir="rtl"]:not(.contains-task-list),
.md-divider-spacing ol ul[dir="rtl"]:not(.contains-task-list) {
  padding-right: 1.75rem !important;
  padding-left: 0 !important;
}

.md-divider-spacing ul.contains-task-list[dir="rtl"],
.md-divider-spacing ol.contains-task-list[dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
}

/* Keep bullets visible if a mixed list has an item with opposite direction */
.md-divider-spacing ul[dir="ltr"] > li[dir="rtl"],
.md-divider-spacing ol[dir="ltr"] > li[dir="rtl"],
.md-divider-spacing ul[dir="rtl"] > li[dir="ltr"],
.md-divider-spacing ol[dir="rtl"] > li[dir="ltr"] {
  list-style-position: inside;
}

/* Task list checkbox / status icon spacing in RTL */
.md-divider-spacing li.task-list-item[dir="rtl"] > div.mr-1,
.md-divider-spacing li.task-list-item[dir="rtl"] > input[type="checkbox"] {
  margin-left: 0.35rem !important;
  margin-right: 0 !important;
}

/* 3. Blockquotes & GitHub Alerts */
.md-divider-spacing blockquote[dir="rtl"]:not(.markdown-alert) {
  direction: rtl !important;
  text-align: right !important;
  border-left: none !important;
  border-right: 4px solid var(--border) !important;
}

.md-divider-spacing .markdown-alert[dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
  border-left: none !important;
  border-right: 0.25em solid var(--border, #30363d) !important;
}

.md-divider-spacing .markdown-alert.markdown-alert-note[dir="rtl"] {
  border-right-color: #0969da !important;
}
.md-divider-spacing .markdown-alert.markdown-alert-tip[dir="rtl"] {
  border-right-color: #1a7f37 !important;
}
.md-divider-spacing .markdown-alert.markdown-alert-important[dir="rtl"] {
  border-right-color: #8250df !important;
}
.md-divider-spacing .markdown-alert.markdown-alert-warning[dir="rtl"] {
  border-right-color: #9a6700 !important;
}
.md-divider-spacing .markdown-alert.markdown-alert-caution[dir="rtl"] {
  border-right-color: #cf222e !important;
}

.md-divider-spacing .markdown-alert[dir="rtl"] > .markdown-alert-title {
  direction: rtl !important;
}

.md-divider-spacing .markdown-alert[dir="rtl"] .markdown-alert-title svg.octicon {
  margin-left: 8px !important;
  margin-right: 0 !important;
}

/* 4. Tables (Override hardcoded text-left on <th> and fix border-separate edges) */
.md-divider-spacing table[dir="rtl"] {
  direction: rtl !important;
}

.md-divider-spacing th[dir="rtl"],
.md-divider-spacing td[dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
}

.md-divider-spacing th[dir="ltr"],
.md-divider-spacing td[dir="ltr"] {
  direction: ltr !important;
  text-align: left !important;
}

.md-divider-spacing table[dir="rtl"] th:first-child,
.md-divider-spacing table[dir="rtl"] td:first-child {
  border-right-width: 0 !important;
  border-left-width: 1px !important;
}

.md-divider-spacing table[dir="rtl"] th:last-child,
.md-divider-spacing table[dir="rtl"] td:last-child {
  border-left-width: 0 !important;
}

/* 5. Strictly Isolate & Keep LTR for Code, Mentions/Pills, Paths, Math, and Diagrams */
.md-divider-spacing :not(pre) > code,
.context-scope-mention {
  unicode-bidi: isolate !important;
}

.md-divider-spacing :not(pre) > code[dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
}

.md-divider-spacing :not(pre) > code:not([dir="rtl"]),
.context-scope-mention {
  direction: ltr !important;
  text-align: left !important;
}

.md-divider-spacing pre,
.md-divider-spacing pre code,
.md-divider-spacing code[class*="language-"],
.md-divider-spacing pre[class*="language-"],
.md-divider-spacing .katex,
.md-divider-spacing .katex-display {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

/* 6. Lexical Editor (Main Chat Message Input & Artifact Comment Box) */
div[data-lexical-editor="true"] > p[dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
}

div[data-lexical-editor="true"] > p[dir="ltr"] {
  direction: ltr !important;
  text-align: left !important;
}

/* 7. Ask Question & /grill-me Modal Options & Question Headers */
div[data-testid="ask-question-header-text"],
label[data-testid="ask-question-option"] > span.break-words,
label[data-testid="ask-question-option"] > span:last-child,
span[data-testid="ask-question-option-hover-card"] {
  white-space: pre-line !important;
}

div[data-testid="ask-question-header-text"][dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
}

label[data-testid="ask-question-option"][dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
}

label[data-testid="ask-question-option"][dir="rtl"] > span.break-words,
label[data-testid="ask-question-option"][dir="rtl"] > span:last-child {
  direction: rtl !important;
  text-align: right !important;
}
`;

  function ensureStyles() {
    if (!document.head) return;
    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }
    if (styleEl.textContent !== CSS_RULES) {
      styleEl.textContent = CSS_RULES;
    }
  }

  /**
   * Smart prose direction detector for pure and mixed Persian/English blocks.
   * Accurately detects RTL for Persian sentences that begin with English words/terms
   * (e.g. "README هنوز پروژه رو...", "Docker یک ابزار...", "Visual Studio Code رو باز کن").
   */
  function detectStringDir(text, options) {
    if (!text || !text.trim()) return null;
    let cleanText = text.trim();
    if (options && options.stripRecommended) {
      cleanText = cleanText.replace(/^\s*\((?:recommended|پیشنهادی)\)\s*/i, '');
    }

    const rtlMatches = cleanText.match(RTL_CHAR_RE_GLOBAL);
    const ltrMatches = cleanText.match(LTR_CHAR_RE_GLOBAL);
    const rtlCount = rtlMatches ? rtlMatches.length : 0;
    const ltrCount = ltrMatches ? ltrMatches.length : 0;

    if (rtlCount === 0 && ltrCount === 0) return null;
    if (rtlCount === 0) return 'ltr';
    if (ltrCount === 0) return 'rtl';

    // 1. If it starts with an RTL character, it is definitely an RTL block
    for (let i = 0; i < cleanText.length; i++) {
      const ch = cleanText[i];
      if (RTL_CHAR_RE.test(ch)) return 'rtl';
      if (LTR_CHAR_RE.test(ch)) break;
    }

    // 2. Starts with LTR (e.g. "README هنوز...", "Docker رو...", "Visual Studio Code رو باز کن"):
    // If the sentence concludes in Persian prose (e.g. "... رو باز کن", "... مبنا میگیریم.")
    // and has at least 4 Persian characters:
    const endsWithPersianProse = /[\u0600-\u06FF][\s.,!؛؟]*$/.test(cleanText);
    if (endsWithPersianProse && rtlCount >= 4) {
      return 'rtl';
    }

    // If majority of characters are Persian
    if (rtlCount > ltrCount) {
      return 'rtl';
    }

    return 'ltr';
  }

  /**
   * Walks text nodes inside `rootEl`, skipping code/pre/math/svg/mentions and nested lists/tables,
   * to find the natural prose direction of the block using full-sentence analysis.
   */
  function detectBlockDir(rootEl, options) {
    if (!rootEl) return null;
    const skipNestedLists = options && options.skipNestedLists;
    const skipAlertTitle = options && options.skipAlertTitle;
    const stripRecommended = options && options.stripRecommended;

    const walker = document.createTreeWalker(
      rootEl,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          let curr = node.parentElement;
          while (curr && curr !== rootEl) {
            const tag = curr.tagName;
            if (
              tag === 'CODE' ||
              tag === 'PRE' ||
              tag === 'SCRIPT' ||
              tag === 'STYLE' ||
              tag === 'SVG' ||
              curr.classList.contains('katex') ||
              curr.classList.contains('context-scope-mention')
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            if (skipNestedLists && (tag === 'UL' || tag === 'OL' || tag === 'TABLE')) {
              return NodeFilter.FILTER_REJECT;
            }
            if (skipAlertTitle && curr.classList.contains('markdown-alert-title')) {
              return NodeFilter.FILTER_REJECT;
            }
            curr = curr.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let combinedProse = '';
    let textNode;
    while ((textNode = walker.nextNode())) {
      combinedProse += ' ' + textNode.nodeValue;
    }

    if (combinedProse.trim()) {
      return detectStringDir(combinedProse.trim(), { stripRecommended }) || 'ltr';
    }

    // Fallback: if the block only contained inline code or symbols, check full textContent
    return detectStringDir(rootEl.textContent, { stripRecommended }) || 'ltr';
  }

  function setDirIfChanged(el, dir) {
    if (!el || !dir) return;
    if (el.getAttribute('dir') !== dir) {
      el.setAttribute('dir', dir);
    }
  }

  /**
   * Processes a Markdown container (`.md-divider-spacing`) or a subtree inside it.
   */
  function processMarkdownContainer(container) {
    if (!container || container.nodeType !== 1) return;

    // 1. Inline code elements: smart Auto-Bidi detection
    const inlineCodes = container.querySelectorAll(':not(pre) > code');
    for (let i = 0; i < inlineCodes.length; i++) {
      const codeEl = inlineCodes[i];
      const dir = detectStringDir(codeEl.textContent) || 'ltr';
      setDirIfChanged(codeEl, dir);
    }

    // 2. Paragraphs and Headings
    const blocks = container.querySelectorAll('p:not(.markdown-alert-title), h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < blocks.length; i++) {
      const el = blocks[i];
      if (el.closest('pre')) continue;
      const dir = detectBlockDir(el);
      setDirIfChanged(el, dir);
    }

    // 3. List items (<li>)
    const listItems = container.querySelectorAll('li');
    for (let i = 0; i < listItems.length; i++) {
      const li = listItems[i];
      const dir = detectBlockDir(li, { skipNestedLists: true });
      setDirIfChanged(li, dir);
    }

    // 4. Lists (<ul>, <ol>) - inherit direction from their first direct <li>
    const lists = container.querySelectorAll('ul, ol');
    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      const firstLi = list.querySelector(':scope > li');
      if (firstLi) {
        const liDir = firstLi.getAttribute('dir') || detectBlockDir(firstLi, { skipNestedLists: true });
        setDirIfChanged(list, liDir);
      }
    }

    // 5. Standard Blockquotes
    const blockquotes = container.querySelectorAll('blockquote:not(.markdown-alert)');
    for (let i = 0; i < blockquotes.length; i++) {
      const bq = blockquotes[i];
      const dir = detectBlockDir(bq);
      setDirIfChanged(bq, dir);
    }

    // 6. GitHub Alerts (.markdown-alert) - ignore English title ("Note", "Warning", etc.) when detecting body language
    const alerts = container.querySelectorAll('.markdown-alert');
    for (let i = 0; i < alerts.length; i++) {
      const alertEl = alerts[i];
      const dir = detectBlockDir(alertEl, { skipAlertTitle: true });
      setDirIfChanged(alertEl, dir);
      const titleEl = alertEl.querySelector(':scope > .markdown-alert-title');
      if (titleEl) {
        setDirIfChanged(titleEl, dir);
      }
    }

    // 7. Tables (<th>, <td>, and <table>)
    const cells = container.querySelectorAll('th, td');
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const dir = detectBlockDir(cell);
      setDirIfChanged(cell, dir);
    }

    const tables = container.querySelectorAll('table');
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const headers = table.querySelectorAll('th');
      let rtlCount = 0;
      for (let j = 0; j < headers.length; j++) {
        if (headers[j].getAttribute('dir') === 'rtl') rtlCount++;
      }
      if (headers.length > 0) {
        const tableDir = rtlCount > 0 && (headers[0].getAttribute('dir') === 'rtl' || rtlCount >= headers.length / 2)
          ? 'rtl'
          : 'ltr';
        setDirIfChanged(table, tableDir);
      } else {
        const firstCell = table.querySelector('td');
        if (firstCell) {
          setDirIfChanged(table, firstCell.getAttribute('dir') || 'ltr');
        }
      }
    }
  }

  /**
   * Processes User Message bubbles & Sticky Prompt Headers (`div.whitespace-pre-wrap.text-sm`).
   */
  function processUserPromptBlock(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.closest('pre, code, .md-divider-spacing')) return;
    const dir = detectBlockDir(el);
    setDirIfChanged(el, dir);
  }

  /**
   * Processes Lexical rich-text input boxes (Chat Message Input & Artifact Comment Box).
   */
  function processLexicalEditor(editorEl) {
    if (!editorEl || editorEl.nodeType !== 1) return;
    const paragraphs = editorEl.querySelectorAll(':scope > p');
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (p.classList.contains('pointer-events-none')) continue; // Never touch placeholder
      const text = p.textContent || '';
      if (!text.trim()) {
        setDirIfChanged(p, 'ltr');
      } else {
        const dir = detectBlockDir(p) || 'ltr';
        setDirIfChanged(p, dir);
      }
    }
  }

  /**
   * Processes Ask Question & /grill-me interactive modal options and question headers.
   * Auto-inserts Enter (\\n) after '(Recommended)' so recommendation tags never clash with RTL Persian text.
   */
  function processAskQuestionElements() {
    // 1. Question header texts
    const headers = document.querySelectorAll('div[data-testid="ask-question-header-text"]');
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const dir = detectBlockDir(h);
      setDirIfChanged(h, dir);
    }

    // 2. Question option labels
    const options = document.querySelectorAll('label[data-testid="ask-question-option"]');
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const textSpan = opt.querySelector('span.break-words') || opt.querySelector(':scope > span:last-child');
      if (!textSpan) continue;

      // Auto-insert newline after (Recommended) if missing
      const rawText = textSpan.textContent || '';
      if (/^\s*\((?:recommended|پیشنهادی)\)(?!\n)\s+/i.test(rawText)) {
        const walker = document.createTreeWalker(textSpan, NodeFilter.SHOW_TEXT);
        const firstText = walker.nextNode();
        if (firstText && /^\s*\((?:recommended|پیشنهادی)\)(?!\n)\s+/i.test(firstText.nodeValue)) {
          firstText.nodeValue = firstText.nodeValue.replace(/^(\s*\((?:recommended|پیشنهادی)\))\s+/i, '$1\n');
        }
      }

      const dir = detectBlockDir(textSpan, { stripRecommended: true });
      setDirIfChanged(opt, dir);
      setDirIfChanged(textSpan, dir);
    }

    // 3. Question hover cards
    const hoverCards = document.querySelectorAll('span[data-testid="ask-question-option-hover-card"]');
    for (let i = 0; i < hoverCards.length; i++) {
      const card = hoverCards[i];
      const rawText = card.textContent || '';
      if (/^\s*\((?:recommended|پیشنهادی)\)(?!\n)\s+/i.test(rawText)) {
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        const firstText = walker.nextNode();
        if (firstText && /^\s*\((?:recommended|پیشنهادی)\)(?!\n)\s+/i.test(firstText.nodeValue)) {
          firstText.nodeValue = firstText.nodeValue.replace(/^(\s*\((?:recommended|پیشنهادی)\))\s+/i, '$1\n');
        }
      }
      const dir = detectBlockDir(card, { stripRecommended: true });
      setDirIfChanged(card, dir);
    }
  }

  function scanAll() {
    ensureStyles();
    const mdContainers = document.querySelectorAll('.md-divider-spacing');
    for (let i = 0; i < mdContainers.length; i++) {
      processMarkdownContainer(mdContainers[i]);
    }
    const userBlocks = document.querySelectorAll('div.whitespace-pre-wrap.text-sm');
    for (let i = 0; i < userBlocks.length; i++) {
      processUserPromptBlock(userBlocks[i]);
    }
    const editors = document.querySelectorAll('div[data-lexical-editor="true"]');
    for (let i = 0; i < editors.length; i++) {
      processLexicalEditor(editors[i]);
    }
    processAskQuestionElements();
  }

  window.__AG_RTL_SCAN_ALL__ = scanAll;

  // Efficient batched MutationObserver for streaming AI responses & dynamic UI updates
  const pendingMarkdown = new Set();
  const pendingUserBlocks = new Set();
  const pendingEditors = new Set();
  let pendingQuestionCheck = false;
  let rafScheduled = false;

  function flushPending() {
    rafScheduled = false;
    pendingMarkdown.forEach((container) => {
      if (container.isConnected) processMarkdownContainer(container);
    });
    pendingMarkdown.clear();

    pendingUserBlocks.forEach((block) => {
      if (block.isConnected) processUserPromptBlock(block);
    });
    pendingUserBlocks.clear();

    pendingEditors.forEach((editor) => {
      if (editor.isConnected) processLexicalEditor(editor);
    });
    pendingEditors.clear();

    if (pendingQuestionCheck) {
      pendingQuestionCheck = false;
      processAskQuestionElements();
    }
  }

  function scheduleFlush() {
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flushPending);
    }
  }

  function enqueueNode(node) {
    if (!node) return;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el || !el.closest) return;

    if (el.closest('label[data-testid="ask-question-option"], div[data-testid="ask-question-header-text"], span[data-testid="ask-question-option-hover-card"], [role="radiogroup"]')) {
      pendingQuestionCheck = true;
      scheduleFlush();
      return;
    }

    const editor = el.closest('div[data-lexical-editor="true"]');
    if (editor) {
      pendingEditors.add(editor);
      scheduleFlush();
      return;
    }

    const md = el.closest('.md-divider-spacing');
    if (md) {
      pendingMarkdown.add(md);
      scheduleFlush();
      return;
    }

    const userBlock = el.closest('div.whitespace-pre-wrap.text-sm');
    if (userBlock) {
      pendingUserBlocks.add(userBlock);
      scheduleFlush();
      return;
    }

    if (node.nodeType === 1 && el.querySelectorAll) {
      const nestedMds = el.querySelectorAll('.md-divider-spacing');
      for (let i = 0; i < nestedMds.length; i++) {
        pendingMarkdown.add(nestedMds[i]);
      }
      const nestedUserBlocks = el.querySelectorAll('div.whitespace-pre-wrap.text-sm');
      for (let i = 0; i < nestedUserBlocks.length; i++) {
        pendingUserBlocks.add(nestedUserBlocks[i]);
      }
      const nestedEditors = el.querySelectorAll('div[data-lexical-editor="true"]');
      for (let i = 0; i < nestedEditors.length; i++) {
        pendingEditors.add(nestedEditors[i]);
      }
      if (el.querySelector('label[data-testid="ask-question-option"], div[data-testid="ask-question-header-text"]')) {
        pendingQuestionCheck = true;
      }
      if (nestedMds.length > 0 || nestedUserBlocks.length > 0 || nestedEditors.length > 0 || pendingQuestionCheck) {
        scheduleFlush();
      }
    }
  }

  function init() {
    scanAll();

    if (window.__AG_RTL_OBSERVER__) {
      window.__AG_RTL_OBSERVER__.disconnect();
    }

    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'characterData') {
          enqueueNode(m.target);
        } else if (m.type === 'childList') {
          enqueueNode(m.target);
          for (let j = 0; j < m.addedNodes.length; j++) {
            enqueueNode(m.addedNodes[j]);
          }
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    window.__AG_RTL_OBSERVER__ = observer;

    // Instant response on typing in Lexical editor
    document.addEventListener(
      'input',
      (e) => {
        const target = e.target;
        if (target && target.closest) {
          const editor = target.closest('div[data-lexical-editor="true"]');
          if (editor) {
            processLexicalEditor(editor);
          }
        }
      },
      true
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
