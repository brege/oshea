#!/usr/bin/env node
// scripts/make-screenshots.js

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function usage() {
  log(
    'Usage: node scripts/make-screenshots.js [-h|--help] [-t|--type bundled,external]',
  );
  log('');
  log('Options:');
  log('  -h, --help               show help');
  log('  -t, --type <types>       comma-separated: bundled, external');
  log('                           default: bundled,external');
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')}\n${result.stderr || result.stdout}`,
    );
  }
}

function parseEnv(dotEnvPath) {
  const env = { ...process.env };
  const lines = fs.readFileSync(dotEnvPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const [key, ...rest] = trimmed.split('=');
    let value = rest.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    value = value.replace(
      /\$([A-Za-z_][A-Za-z0-9_]*)/g,
      (_m, name) => env[name] || '',
    );
    env[key] = value;
    process.env[key] = value;
  }
}

function removeScreenshots(pluginDir) {
  for (const name of fs.readdirSync(pluginDir)) {
    if (/^screenshot(?:-\d+)?\.png$/.test(name)) {
      fs.rmSync(path.join(pluginDir, name), { force: true });
    }
  }
}

function collectPages(tmpDir, prefix) {
  return fs
    .readdirSync(tmpDir)
    .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith('.png'))
    .map((name) => path.join(tmpDir, name))
    .sort((a, b) => {
      const ai = Number(path.basename(a).match(/-(\d+)\.png$/)[1]);
      const bi = Number(path.basename(b).match(/-(\d+)\.png$/)[1]);
      return ai - bi;
    });
}

function renderPlugin({
  repoRoot,
  pluginDir,
  label,
  tmpDir,
  pdfDpi,
  counters,
}) {
  const pluginName = path.basename(pluginDir);
  const configPath = path.join(pluginDir, 'default.yaml');
  const examplePath = path.join(pluginDir, 'example.md');
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

  if (config.screenshot === false) {
    log(`SKIP [${label}/${pluginName}] screenshot: false`);
    counters.skipped += 1;
    return;
  }

  log(`RUN  [${label}/${pluginName}]`);
  const prefix = `${label}-${pluginName}`;
  const pdfPath = path.join(tmpDir, `${prefix}.pdf`);
  run(
    'node',
    [
      path.join(repoRoot, 'cli.js'),
      'convert',
      examplePath,
      '--plugin',
      configPath,
      '--filename',
      pdfPath,
      '--no-open',
    ],
    { cwd: repoRoot },
  );

  removeScreenshots(pluginDir);
  run('pdftoppm', [
    '-png',
    '-r',
    String(pdfDpi),
    pdfPath,
    path.join(tmpDir, prefix),
  ]);
  const pages = collectPages(tmpDir, prefix);

  if (pages.length === 1) {
    run('magick', [
      pages[0],
      '-background',
      'white',
      '-alpha',
      'remove',
      '-alpha',
      'off',
      '-quality',
      '92',
      path.join(pluginDir, 'screenshot.png'),
    ]);
  } else {
    for (const page of pages) {
      const number = path.basename(page).match(/-(\d+)\.png$/)[1];
      run('magick', [
        page,
        '-background',
        'white',
        '-alpha',
        'remove',
        '-alpha',
        'off',
        '-quality',
        '92',
        path.join(pluginDir, `screenshot-${number}.png`),
      ]);
    }
  }

  counters.generated += 1;
}

function renderRoot({ repoRoot, root, label, tmpDir, pdfDpi, counters }) {
  log(`=== ${label}: ${root} ===`);
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    renderPlugin({
      repoRoot,
      pluginDir: path.join(root, entry.name),
      label,
      tmpDir,
      pdfDpi,
      counters,
    });
  }
}

function main() {
  const args = process.argv.slice(2);
  let typeValue = 'bundled,external';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      usage();
      process.exit(0);
    }
    if (arg === '-t' || arg === '--type') {
      typeValue = args[i + 1];
      if (!typeValue) {
        throw new Error('Missing value for --type');
      }
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  const types = new Set(
    typeValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  for (const type of types) {
    if (type !== 'bundled' && type !== 'external') {
      throw new Error(`Invalid type '${type}'. Use bundled, external, or both`);
    }
  }

  const repoRoot = path.resolve(__dirname, '..');
  parseEnv(path.join(repoRoot, '.env'));

  const bundledRoot = path.join(repoRoot, 'plugins');
  const externalRoot = process.env.EXTERNAL_PLUGINS_ROOT;
  const pdfDpi = Number.parseInt(process.env.PDF_DPI || '600', 10);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oshea-screenshots-'));
  const counters = { generated: 0, skipped: 0 };

  try {
    if (types.has('bundled')) {
      renderRoot({
        repoRoot,
        root: bundledRoot,
        label: 'bundled',
        tmpDir,
        pdfDpi,
        counters,
      });
    }
    if (types.has('external')) {
      renderRoot({
        repoRoot,
        root: externalRoot,
        label: 'external',
        tmpDir,
        pdfDpi,
        counters,
      });
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  log('');
  log('=== Screenshot generation complete ===');
  log(`generated: ${counters.generated}`);
  log(`skipped:   ${counters.skipped}`);
}

main();
