#!/usr/bin/env node
// src/utils/puppeteer-bootstrap.js

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

process.env.PUPPETEER_CACHE_DIR ??= path.join(
  __dirname,
  '..',
  '..',
  'node_modules',
  '.puppeteer_cache',
);

const expectedBrowserPath = require('puppeteer').executablePath();

if (!fs.existsSync(expectedBrowserPath)) {
  const packageJsonPath = require.resolve('puppeteer/package.json');
  const installScriptPath = path.join(
    path.dirname(packageJsonPath),
    'install.mjs',
  );
  const result = spawnSync(process.execPath, [installScriptPath], {
    stdio: 'inherit',
  });
  process.exit(result.status || 1);
}
