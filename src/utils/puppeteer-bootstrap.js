#!/usr/bin/env node
// src/utils/puppeteer-bootstrap.js

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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
