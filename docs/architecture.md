# Antigravity RTL Architecture & Engineering Guide

## Overview
Antigravity 2.0 is an Electron-based AI coding assistant desktop app. By default, markdown transcripts, artifact viewers, and message input boxes are constrained to left-to-right (`LTR`) directionality.

This project delivers update-proof, per-block **Auto-Bidi RTL** support for Arabic-script languages (Arabic, Persian, Urdu, Kurdish, Pashto), with strict LTR isolation for code and technical syntax.

---

## Three-Layer Architecture

```
Layer 1: Auto-Bidi Engine (src/rtl-inject.js)
  ├── Per-paragraph / per-element Auto-Bidi detection (Telegram / Notion style)
  ├── Precision Prose BiDi Algorithm (correctly handles sentences starting with English terms)
  ├── Smart Inline Code Auto-Bidi (preserves RTL for Arabic-script text inside backticks)
  ├── Real-time Lexical Editor input listener (dynamic per-line typing direction)
  └── Layout adjustments for Tailwind lists, blockquotes, alerts, and tables

Layer 2: Safe ASAR Patcher & CDP Live Injector (src/patch-asar.mjs)
  ├── Native buffer-based ASAR parser and repacker (zero external CLI dependencies)
  ├── Automated pristine backup (app.asar.rtl-backup.bak)
  ├── Electron lifecycle hooks on `dom-ready` and `did-finish-load`
  └── Instant hot-injection into running windows via Chrome DevTools Protocol (CDP)

Layer 3: Update Resilience & Automation (plugin/ & Windows Startup)
  ├── Plugin SessionStart hook: validates ASAR integrity on every session launch (<100ms)
  ├── Silent Windows Startup script (Antigravity-RTL-AutoCheck.vbs): background re-patch on logon
  └── Behavioral rule (rules/AGENTS.md): guides AI models on newline formatting and code isolation
```

---

## Precision Prose BiDi Algorithm

Traditional web engines inspect only the first strong directional character. When a sentence begins with an English technical term (e.g. `README`, `Docker`, `Git`, `API`), naive engines incorrectly classify the entire block as LTR.

`src/rtl-inject.js` solves this with **Precision Prose BiDi**:
1. If the sentence begins with an RTL character, it is marked `rtl`.
2. If it begins with an LTR token, the algorithm evaluates:
   - Does the sentence conclude with RTL prose characters (`/[\u0600-\u08FF][\s.,!؛؟]*$/`) and have at least 4 RTL characters?
   - Or do RTL characters outnumber Latin characters?
3. If true, the block is assigned `dir="rtl"`. The leading English term remains at the visual start of the sentence on the right.
