# Contributing to Antigravity RTL

Thank you for helping improve RTL support for Arabic, Persian, Urdu, and related languages in Antigravity!

---

## Reporting Issues

If you encounter an unhandled text-direction edge case or a misaligned UI component:
1. Check existing issues to see if it has already been reported.
2. Open a new issue using the **Bug Report** template.
3. Include the exact text snippet and a screenshot of the rendering anomaly.

---

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/antigravity-rtl.git
   cd antigravity-rtl
   ```

2. Test changes locally:
   - Edit `src/rtl-inject.js` (CSS rules, MutationObserver, or `detectStringDir` logic).
   - Apply the patch:
     ```bash
     npm run apply
     ```
   - If Antigravity is open with DevTools enabled, changes will be hot-injected live into the active window.

3. Verify:
   - Check status: `npm run status`
   - Test plain paragraphs, mixed English/RTL sentences, inline code backticks, lists, blockquotes, and the Lexical editor.
   - Revert whenever needed: `npm run revert`

---

## Submitting Pull Requests

- Keep PRs focused on a single bug fix or enhancement.
- Follow the existing code style: vanilla ES modules, buffer-based ASAR operations, zero runtime dependencies.
- Ensure all comments and documentation remain concise, professional, and in English.
