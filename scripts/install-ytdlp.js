#!/usr/bin/env node
// Downloads the standalone yt-dlp binary (no Python required).
// Runs automatically after `npm install` via the postinstall hook.
// On Windows the Python .pyz script is fine; this only replaces it on Linux/macOS.

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEST = path.join(__dirname, '..', 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');

// Skip on Windows — the .pyz script works there
if (process.platform === 'win32') {
  console.log('[yt-dlp] Windows detected, skipping standalone binary install.');
  process.exit(0);
}

// Skip if the existing binary is already a standalone ELF/Mach-O executable
if (fs.existsSync(DEST)) {
  try {
    const result = execSync(`file "${DEST}" 2>/dev/null`, { encoding: 'utf8' });
    if (result.includes('ELF') || result.includes('Mach-O')) {
      console.log('[yt-dlp] Standalone binary already present, skipping download.');
      process.exit(0);
    }
  } catch {
    // `file` not available — continue with download
  }
}

const ASSET =
  process.platform === 'darwin'
    ? 'yt-dlp_macos'
    : 'yt-dlp_linux';

const API_URL = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest';

function get(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects === 0) return reject(new Error('Too many redirects'));
    https
      .get(url, { headers: { 'User-Agent': 'linkzip-postinstall' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return resolve(get(res.headers.location, redirects - 1));
        }
        resolve(res);
      })
      .on('error', reject);
  });
}

async function main() {
  console.log(`[yt-dlp] Fetching latest release info from GitHub…`);
  const apiRes = await get(API_URL);
  const chunks = [];
  for await (const chunk of apiRes) chunks.push(chunk);
  const release = JSON.parse(Buffer.concat(chunks).toString());

  const asset = release.assets.find((a) => a.name === ASSET);
  if (!asset) throw new Error(`Asset "${ASSET}" not found in latest release`);

  const downloadUrl = asset.browser_download_url;
  console.log(`[yt-dlp] Downloading ${ASSET} (${(asset.size / 1024 / 1024).toFixed(1)} MB)…`);

  const fileRes = await get(downloadUrl);
  const dest = fs.createWriteStream(DEST);

  await new Promise((resolve, reject) => {
    fileRes.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
  });

  fs.chmodSync(DEST, '755');
  const version = execSync(`"${DEST}" --version`, { encoding: 'utf8' }).trim();
  console.log(`[yt-dlp] Installed standalone binary v${version}`);
}

main().catch((err) => {
  // Non-fatal: if download fails, the Python fallback is still there
  console.warn('[yt-dlp] Could not install standalone binary:', err.message);
  console.warn('[yt-dlp] Falling back to Python-based yt-dlp (requires python3).');
});
