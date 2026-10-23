#!/usr/bin/env bash
# Antigravity RTL Support Installer for Linux / macOS
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="$(which node 2>/dev/null || true)"

if [ -z "$NODE_BIN" ]; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    exit 1
fi

echo "================================================================"
echo "   Antigravity 2.0 - Smart Auto-Bidi RTL Installer"
echo "================================================================"
node "$SCRIPT_DIR/../src/patch-asar.mjs" apply
echo "[SUCCESS] Antigravity RTL patch applied."
