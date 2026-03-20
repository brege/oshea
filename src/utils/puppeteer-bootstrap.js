#!/usr/bin/env node
// src/utils/puppeteer-bootstrap.js

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = process.cwd();
const puppeteerPackageJsonPath = path.join(
  projectRoot,
  'node_modules',
  'puppeteer',
  'package.json',
);

if (!fs.existsSync(puppeteerPackageJsonPath)) {
  process.exit(0);
}

process.env.PUPPETEER_CACHE_DIR ??= path.join(
  projectRoot,
  'node_modules',
  '.puppeteer_cache',
);

const expectedBrowserPath = require('puppeteer').executablePath();

if (!fs.existsSync(expectedBrowserPath)) {
  const installScriptPath = path.join(
    path.dirname(puppeteerPackageJsonPath),
    'install.mjs',
  );
  const result = spawnSync(process.execPath, [installScriptPath], {
    stdio: 'inherit',
  });
  process.exit(result.status || 1);
}
