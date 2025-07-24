#!/usr/bin/env node
// scripts/ai/ai-context-generator.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { loggerPath, fileHelpersPath } = require('@paths');
const logger = require(loggerPath);
const { findFiles } = require(fileHelpersPath);

const DOCS_DIR = 'docs';
const PLUGINS_DIR = 'plugins';

const REQUIRED_DOCS = [
  path.join(DOCS_DIR, 'ai', 'interaction-spec.md'),
  path.join(DOCS_DIR, 'refs', 'plugin-contract.md')
];

const REQUIRED_PLUGIN_FILES = [
  '{plugin}.config.yaml',
  '{plugin}.css',
  '{plugin}-example.md',
  'index.js',
  'README.md'
];

// --- Parse CLI args ---
const args = process.argv.slice(2);
let pluginArg = null;
let outFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--plugin' && args[i + 1]) {
    pluginArg = args[i + 1];
    i++;
  } else if (args[i] === '--filename' && args[i + 1]) {
    outFile = args[i + 1];
    i++;
  } else if (args[i] === '-h' || args[i] === '--help') {
    logger.info(`
Usage: node scripts/ai/ai-context-generator.js [--plugin <name-or-path>] [--filename <outputfile>]

--plugin <name-or-path>  Specify plugin name (e.g. "cv") or path (e.g. "plugins/cv" or "../other/myplugin")
--filename <file>        Write output to a file instead of stdout
-h, --help               Show this help message

To copy output to clipboard, pipe to xclip or pbcopy, e.g.:
  node scripts/ai/ai-context-generator.js --plugin cv | xclip -selection clipboard
  node scripts/ai/ai-context-generator.js --plugin cv | pbcopy
`);
    process.exit(0);
  }
}

// --- Consistent-length doc break ---
function docBreak(filePath, width = 65) {
  const label = `[ ${filePath} ]`;
  const padLen = Math.max(0, Math.floor((width - label.length) / 2));
  const pad = '='.repeat(padLen);
  const line = `${pad} ${label} ${pad}${(label.length + padLen * 2 + 2 < width ? '=' : '')}`;
  return `${line}\n`;
}

function readFileOrWarn(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  } else {
    logger.warn(`Missing file: ${filePath}`, { context: 'AIContext' });
    return '';
  }
}

(function main() {
  let output = '';

  for (const doc of REQUIRED_DOCS) {
    for (const found of findFiles(doc)) {
      output += docBreak(found);
      output += readFileOrWarn(found) + '\n';
    }
  }

  let pluginDir, pluginName;

  if (!pluginArg) {
    pluginDir = path.join(PLUGINS_DIR, 'default');
    pluginName = 'default';
  } else {
    let possiblePath = path.resolve(pluginArg);
    if (fs.existsSync(possiblePath) && fs.lstatSync(possiblePath).isDirectory()) {
      pluginDir = possiblePath;
      pluginName = path.basename(pluginDir);
    } else {
      pluginDir = path.join(PLUGINS_DIR, pluginArg);
      pluginName = pluginArg;
    }
  }

  if (!fs.existsSync(pluginDir) || !fs.lstatSync(pluginDir).isDirectory()) {
    logger.error(`Plugin directory not found: ${pluginDir}`, { context: 'AIContext' });
    process.exit(1);
  }

  for (const template of REQUIRED_PLUGIN_FILES) {
    const pluginFile = template.replace(/{plugin}/g, pluginName);
    for (const found of findFiles(path.join(pluginDir, pluginFile))) {
      output += docBreak(found);
      output += readFileOrWarn(found) + '\n';
    }
  }

  // Output to file or stdout
  if (outFile) {
    fs.writeFileSync(outFile, output, 'utf8');
    logger.info(`Context package written to: ${outFile}`);
  } else {
    process.stdout.write(output);
  }

  // --- Estimate token count ---
  const estTokens = Math.ceil(output.length / 4);
  logger.detail(`Estimated tokens in output: ${estTokens}`);
})();

