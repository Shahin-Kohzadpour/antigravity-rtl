/**
 * Antigravity 2.0 - Safe ASAR Patcher & Live CDP Injector for RTL Support
 *
 * Usage:
 *   node patch-asar.mjs apply
 *   node patch-asar.mjs revert
 *   node patch-asar.mjs status
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOME = os.homedir();
const USER_RTL_DIR = path.join(HOME, '.gemini', 'antigravity', 'rtl-support');
const USER_RTL_INJECT_PATH = path.join(USER_RTL_DIR, 'rtl-inject.js');
const LOCAL_RTL_INJECT_PATH = path.join(__dirname, 'rtl-inject.js');

function resolveAntigravityPaths() {
  const platform = process.platform;
  const candidateDirs = [];

  if (platform === 'win32') {
    candidateDirs.push(path.join(HOME, 'AppData', 'Local', 'Programs', 'Antigravity', 'resources'));
    candidateDirs.push('C:\\Program Files\\Antigravity\\resources');
  } else if (platform === 'darwin') {
    candidateDirs.push('/Applications/Antigravity.app/Contents/Resources');
    candidateDirs.push(path.join(HOME, 'Applications', 'Antigravity.app', 'Contents', 'Resources'));
  } else {
    candidateDirs.push('/opt/Antigravity/resources');
    candidateDirs.push(path.join(HOME, '.local', 'share', 'Antigravity', 'resources'));
    candidateDirs.push('/usr/lib/antigravity/resources');
  }

  let resourcesDir = candidateDirs[0];
  for (const dir of candidateDirs) {
    if (fs.existsSync(path.join(dir, 'app.asar'))) {
      resourcesDir = dir;
      break;
    }
  }

  const asarPath = path.join(resourcesDir, 'app.asar');
  const asarBakPath = path.join(resourcesDir, 'app.asar.rtl-backup.bak');

  let devToolsPortFile;
  if (platform === 'win32') {
    devToolsPortFile = path.join(HOME, 'AppData', 'Roaming', 'Antigravity', 'DevToolsActivePort');
  } else if (platform === 'darwin') {
    devToolsPortFile = path.join(HOME, 'Library', 'Application Support', 'Antigravity', 'DevToolsActivePort');
  } else {
    devToolsPortFile = path.join(HOME, '.config', 'Antigravity', 'DevToolsActivePort');
  }

  return { resourcesDir, asarPath, asarBakPath, devToolsPortFile };
}

const { asarPath: ASAR_PATH, asarBakPath: ASAR_BAK_PATH, devToolsPortFile: DEVTOOLS_PORT_FILE } = resolveAntigravityPaths();

const PATCH_MARKER_START = '// [AG-RTL-SUPPORT-START]';
const PATCH_MARKER_END = '// [AG-RTL-SUPPORT-END]';

const HOOK_CODE = `
    ${PATCH_MARKER_START}
    const injectAgRtlSupport = () => {
        try {
            const rtlScriptPath = path_1.default.join(electron_1.app.getPath('home'), '.gemini', 'antigravity', 'rtl-support', 'rtl-inject.js');
            if (fs.existsSync(rtlScriptPath)) {
                const rtlCode = fs.readFileSync(rtlScriptPath, 'utf-8');
                void win.webContents.executeJavaScript(rtlCode, true).catch(() => {});
            }
        } catch (_err) {}
    };
    win.webContents.on('dom-ready', injectAgRtlSupport);
    win.webContents.on('did-finish-load', injectAgRtlSupport);
    ${PATCH_MARKER_END}
`;

function ensureUserRtlFiles() {
  if (!fs.existsSync(USER_RTL_DIR)) {
    fs.mkdirSync(USER_RTL_DIR, { recursive: true });
  }
  const sourceScript = fs.existsSync(LOCAL_RTL_INJECT_PATH) ? LOCAL_RTL_INJECT_PATH : USER_RTL_INJECT_PATH;
  if (fs.existsSync(sourceScript)) {
    fs.copyFileSync(sourceScript, USER_RTL_INJECT_PATH);
  }

  // Also sync plugin files if present in the repo
  const repoPluginDir = path.resolve(__dirname, '..', 'plugin');
  const userPluginDir = path.join(HOME, '.gemini', 'config', 'plugins', 'persian-rtl');
  if (fs.existsSync(repoPluginDir)) {
    fs.mkdirSync(userPluginDir, { recursive: true });
    const copyRecursive = (src, dest) => {
      if (!fs.existsSync(src)) return;
      const stats = fs.statSync(src);
      if (stats.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const child of fs.readdirSync(src)) {
          copyRecursive(path.join(src, child), path.join(dest, child));
        }
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    copyRecursive(repoPluginDir, userPluginDir);
  }
}

function computeAsarIntegrity(buf) {
  const blockSize = 4 * 1024 * 1024;
  const fullHash = crypto.createHash('sha256').update(buf).digest('hex');
  const blocks = [];
  for (let offset = 0; offset < buf.length; offset += blockSize) {
    const slice = buf.subarray(offset, Math.min(offset + blockSize, buf.length));
    blocks.push(crypto.createHash('sha256').update(slice).digest('hex'));
  }
  if (blocks.length === 0) {
    blocks.push(fullHash);
  }
  return {
    algorithm: 'SHA256',
    hash: fullHash,
    blockSize,
    blocks
  };
}

function readAsar(asarFile) {
  const buf = fs.readFileSync(asarFile);
  const u0 = buf.readUInt32LE(0);
  const u1 = buf.readUInt32LE(4);
  const u2 = buf.readUInt32LE(8);
  const u3 = buf.readUInt32LE(12);
  const dataBase = 8 + u1;
  const jsonStr = buf.toString('utf8', 16, 16 + u3);
  const header = JSON.parse(jsonStr);
  const dataSection = buf.subarray(dataBase);
  return { buf, u0, u1, u2, u3, dataBase, header, dataSection };
}

function getUtilsContent(asar) {
  const entry = asar.header?.files?.dist?.files?.['utils.js'];
  if (!entry) {
    throw new Error('Could not find dist/utils.js inside app.asar');
  }
  const offset = Number(entry.offset);
  return asar.dataSection.subarray(offset, offset + entry.size).toString('utf8');
}

function isAsarPatched(asar) {
  const content = getUtilsContent(asar);
  return content.includes(PATCH_MARKER_START);
}

function buildUpdatedAsar(asar, newUtilsContent) {
  const entry = asar.header.files.dist.files['utils.js'];
  const newUtilsBuf = Buffer.from(newUtilsContent, 'utf8');
  const newOffsetStr = String(asar.dataSection.length);

  entry.size = newUtilsBuf.length;
  entry.offset = newOffsetStr;
  entry.integrity = computeAsarIntegrity(newUtilsBuf);

  let newJsonStr = JSON.stringify(asar.header);
  let newJsonBuf = Buffer.from(newJsonStr, 'utf8');

  if (newJsonBuf.length <= asar.u3) {
    const padSpaces = ' '.repeat(asar.u3 - newJsonBuf.length);
    newJsonStr += padSpaces;
    newJsonBuf = Buffer.from(newJsonStr, 'utf8');
  }

  const u3 = newJsonBuf.length;
  const alignedJsonLen = Math.ceil(u3 / 4) * 4;
  const u2 = 4 + alignedJsonLen;
  const u1 = 8 + alignedJsonLen;
  const u0 = 4;

  const preamble = Buffer.alloc(16 + alignedJsonLen, 0);
  preamble.writeUInt32LE(u0, 0);
  preamble.writeUInt32LE(u1, 4);
  preamble.writeUInt32LE(u2, 8);
  preamble.writeUInt32LE(u3, 12);
  newJsonBuf.copy(preamble, 16);

  return Buffer.concat([preamble, asar.dataSection, newUtilsBuf]);
}

async function evaluateInLiveWindows(jsExpression) {
  if (!fs.existsSync(DEVTOOLS_PORT_FILE)) {
    return { injectedCount: 0, reason: 'DevToolsActivePort file not found (app not running)' };
  }
  const raw = fs.readFileSync(DEVTOOLS_PORT_FILE, 'utf8').trim().split(/\r?\n/);
  const port = Number(raw[0]);
  if (!port || isNaN(port)) {
    return { injectedCount: 0, reason: 'Invalid port in DevToolsActivePort' };
  }

  let targets;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(2500) });
    targets = await res.json();
  } catch (err) {
    return { injectedCount: 0, reason: `CDP port ${port} not reachable (${err.message})` };
  }

  const pageTargets = targets.filter(
    (t) => t.type === 'page' && t.webSocketDebuggerUrl && t.url && t.url.startsWith('https://127.0.0.1:')
  );

  let injectedCount = 0;
  for (const target of pageTargets) {
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        const timer = setTimeout(() => {
          try { ws.close(); } catch {}
          reject(new Error('WebSocket timeout'));
        }, 3000);

        ws.addEventListener('open', () => {
          ws.send(
            JSON.stringify({
              id: 1,
              method: 'Runtime.evaluate',
              params: {
                expression: jsExpression,
                returnByValue: true
              }
            })
          );
        });

        ws.addEventListener('message', (event) => {
          const data = JSON.parse(String(event.data));
          if (data.id === 1) {
            clearTimeout(timer);
            try { ws.close(); } catch {}
            resolve(data);
          }
        });

        ws.addEventListener('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
      injectedCount++;
    } catch (err) {
      console.warn(`  [Warning] Could not inject into target ${target.id}:`, err.message);
    }
  }

  return { injectedCount, port };
}

async function applyPatch() {
  console.log('====================================================');
  console.log('  Antigravity 2.0 - Smart Auto-Bidi RTL Patcher');
  console.log('====================================================');

  ensureUserRtlFiles();

  if (!fs.existsSync(ASAR_PATH)) {
    console.error(`[ERROR] Antigravity app.asar not found at: ${ASAR_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(USER_RTL_INJECT_PATH)) {
    console.error(`[ERROR] RTL script not found at: ${USER_RTL_INJECT_PATH}`);
    process.exit(1);
  }

  const asar = readAsar(ASAR_PATH);
  if (isAsarPatched(asar)) {
    console.log('[OK] app.asar is already patched with Auto-Bidi RTL support.');
  } else {
    fs.copyFileSync(ASAR_PATH, ASAR_BAK_PATH);
    console.log(`[BACKUP] Clean backup saved to: ${ASAR_BAK_PATH}`);

    const utilsContent = getUtilsContent(asar);
    const targetAnchor = '    void win.loadURL(url);';
    if (!utilsContent.includes(targetAnchor)) {
      throw new Error('Could not locate "void win.loadURL(url);" anchor inside dist/utils.js');
    }

    const patchedUtils = utilsContent.replace(
      targetAnchor,
      `${HOOK_CODE.trim()}\n${targetAnchor}`
    );

    const newAsarBuf = buildUpdatedAsar(asar, patchedUtils);
    fs.writeFileSync(ASAR_PATH, newAsarBuf);
    console.log('[SUCCESS] Patched resources/app.asar (dist/utils.js) cleanly.');
  }

  const rtlCode = fs.readFileSync(USER_RTL_INJECT_PATH, 'utf8');
  const liveResult = await evaluateInLiveWindows(rtlCode);
  if (liveResult.injectedCount > 0) {
    console.log(`[LIVE] Activated RTL support immediately in ${liveResult.injectedCount} open Antigravity window(s) (CDP port ${liveResult.port}).`);
  } else {
    console.log(`[INFO] Live injection skipped: ${liveResult.reason}. RTL will activate automatically on next launch.`);
  }
  console.log('====================================================');
}

async function revertPatch() {
  console.log('====================================================');
  console.log('  Antigravity 2.0 - Revert RTL Support');
  console.log('====================================================');

  if (fs.existsSync(ASAR_BAK_PATH)) {
    fs.copyFileSync(ASAR_BAK_PATH, ASAR_PATH);
    console.log(`[RESTORED] Original app.asar restored from backup (${ASAR_BAK_PATH}).`);
  } else if (fs.existsSync(ASAR_PATH)) {
    const asar = readAsar(ASAR_PATH);
    if (isAsarPatched(asar)) {
      const utilsContent = getUtilsContent(asar);
      const startIdx = utilsContent.indexOf(PATCH_MARKER_START);
      const endIdx = utilsContent.indexOf(PATCH_MARKER_END);
      if (startIdx !== -1 && endIdx !== -1) {
        const cleanedUtils =
          utilsContent.slice(0, startIdx).replace(/\s*$/, '\n') +
          utilsContent.slice(endIdx + PATCH_MARKER_END.length);
        const newAsarBuf = buildUpdatedAsar(asar, cleanedUtils);
        fs.writeFileSync(ASAR_PATH, newAsarBuf);
        console.log('[RESTORED] Removed RTL hook from app.asar.');
      }
    } else {
      console.log('[OK] app.asar is already in its original unpatched state.');
    }
  }

  const cleanupJs = `
    (function() {
      if (window.__AG_RTL_OBSERVER__) {
        window.__AG_RTL_OBSERVER__.disconnect();
        delete window.__AG_RTL_OBSERVER__;
      }
      delete window.__AG_RTL_SUPPORT_VERSION__;
      delete window.__AG_RTL_SCAN_ALL__;
      const styleEl = document.getElementById('ag-rtl-support-style');
      if (styleEl) styleEl.remove();
      document.querySelectorAll('.md-divider-spacing [dir], div[data-lexical-editor="true"] > p[dir]').forEach(el => {
        el.removeAttribute('dir');
      });
      return 'CLEANED';
    })();
  `;
  const liveResult = await evaluateInLiveWindows(cleanupJs);
  if (liveResult.injectedCount > 0) {
    console.log(`[LIVE] Reverted RTL styles immediately in ${liveResult.injectedCount} open Antigravity window(s).`);
  }
  console.log('====================================================');
}

async function checkStatus() {
  if (!fs.existsSync(ASAR_PATH)) {
    console.log('Status: Antigravity app.asar not found.');
    return;
  }
  const asar = readAsar(ASAR_PATH);
  const patched = isAsarPatched(asar);
  console.log(`ASAR Patch Status: ${patched ? 'PATCHED (Active)' : 'UNPATCHED'}`);
  console.log(`Backup Exists:     ${fs.existsSync(ASAR_BAK_PATH) ? 'YES (' + ASAR_BAK_PATH + ')' : 'NO'}`);
}

const action = (process.argv[2] || 'apply').toLowerCase();
if (action === 'apply') {
  await applyPatch();
} else if (action === 'revert') {
  await revertPatch();
} else if (action === 'status') {
  await checkStatus();
} else {
  console.error(`Unknown command: ${action}. Use: apply | revert | status`);
  process.exit(1);
}
