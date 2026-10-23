# Antigravity RTL

Smart, update-resilient Auto-Bidi RTL layout support for Google Antigravity 2.0.

<p align="center">
  <a href="README.md"><b>English</b></a> &nbsp;|&nbsp;
  <a href="README.fa.md"><b>فارسی</b></a> &nbsp;|&nbsp;
  <a href="README.ar.md"><b>العربية</b></a>
</p>

---

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/Shahin-Kohzadpour/antigravity-rtl@main/assets/preview.png?v=3" alt="Antigravity RTL Preview" width="100%">
</p>

## Why Antigravity RTL?

By default, Antigravity 2.0 enforces left-to-right (`LTR`) directionality across chat transcripts, artifact panels, and input boxes. For languages written right-to-left—such as Arabic, Persian, and Urdu—this breaks paragraph flow, reverses punctuation, and scrambles mixed-language sentences.

**Antigravity RTL** adds seamless bidirectional intelligence without changing application fonts, modifying UI chrome, or breaking auto-updates.

---

## Key Features

| Capability | Behavior |
| :--- | :--- |
| **Per-Block Auto-Bidi** | Automatically aligns paragraphs, headings, and lists to `RTL` or `LTR` based on content (Telegram / Notion style). |
| **Precision Prose BiDi** | Detects RTL sentences starting with English terms (e.g., `Docker`, `README`, `API`) and keeps them at the correct visual start on the right. |
| **Smart Inline Code** | Preserves RTL for Arabic-script text inside backticks (`code`), while keeping pure code tokens (`npm`, `git`, file paths) strictly isolated in LTR. |
| **Strict Code Isolation** | Code blocks (`<pre>`), diffs, KaTeX formulas, and Mermaid diagrams always remain intact in LTR. |
| **Real-Time Input** | Live bidirectional direction switching in the message input box and artifact comments as you type. |
| **Update Resilience** | Three-layer persistence (session hook, startup watcher, and ASAR patcher) guarantees RTL survives application updates without manual intervention. |
| **Safe Recovery** | Clean backup (`app.asar.rtl-backup.bak`) created automatically before any modification; reverts to factory state in one click. |

---

## Quick Start

### Prerequisites
- Windows 10 / 11 (64-bit)
- [Node.js](https://nodejs.org) (v18 or newer)
- Google Antigravity 2.0 desktop app

### Installation

Clone the repository and run the installer:

```cmd
git clone https://github.com/YOUR_USERNAME/antigravity-rtl.git
cd antigravity-rtl
bin\install.cmd
```

*Or via npm:*

```bash
npm run apply
```

If Antigravity is currently running, the patch activates **live** in your open window—no restart required.

---

## Revert / Uninstall

To remove all modifications and restore the original factory file:

```cmd
bin\uninstall.cmd
```

*Or via npm:*

```bash
npm run revert
```

---

## How It Works

1. **Auto-Bidi Engine (`src/rtl-inject.js`)**: Evaluates DOM text nodes, applies directional styling, overrides hardcoded Tailwind padding, and isolates inline code tokens.
2. **Safe ASAR Patcher (`src/patch-asar.mjs`)**: Directly inspects and patches `resources/app.asar` using native Node buffers (zero third-party dependencies). Hooks window lifecycle events (`dom-ready`, `did-finish-load`) and communicates with open windows via the Chrome DevTools Protocol (CDP).
3. **Automated Resilience (`plugin/` & Startup)**: A background session hook checks ASAR integrity whenever a session starts. A silent Windows logon script checks whether a fresh Antigravity update overwrote the binary and re-applies the patch in under 100ms.

See [docs/architecture.md](docs/architecture.md) for full engineering details.

---

## Disclaimer

This is an independent, community-driven open-source project and is not affiliated with, endorsed by, or sponsored by Google. "Antigravity" is a trademark of its respective owner.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
