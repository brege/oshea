// src/utils/puppeteer-bootstrap.js

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { projectRoot } = require('@paths');

let ensured = false;

// Provision the Puppeteer browser on first use when it is missing, so no npm
// install lifecycle script is needed. Honors .puppeteerrc.cjs via install.mjs.
function ensureBrowser() {
  if (ensured) {
    return;
  }

  const puppeteerPackageJsonPath = path.join(
    projectRoot,
    'node_modules',
    'puppeteer',
    'package.json',
  );
  if (!fs.existsSync(puppeteerPackageJsonPath)) {
    ensured = true;
    return;
  }

  process.env.PUPPETEER_CACHE_DIR ??= path.join(
    projectRoot,
    'node_modules',
    '.puppeteer_cache',
  );

  if (fs.existsSync(require('puppeteer').executablePath())) {
    ensured = true;
    return;
  }

  const installScriptPath = path.join(
    path.dirname(puppeteerPackageJsonPath),
    'install.mjs',
  );
  const result = spawnSync(process.execPath, [installScriptPath], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('Puppeteer browser bootstrap failed');
  }
  ensured = true;
}

module.exports = { ensureBrowser };
