// src/completion/generate-completion-cache.js
// This script generates a completion cache for the oshea CLI. This script is for development use only.
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const os = require('os');

const { loggerPath, cliTreeBuilderPath, cliRoot } = require('@paths');
const logger = require(loggerPath);
const { discoverCommandTree } = require(cliTreeBuilderPath);

const COMMANDS_DIR = cliRoot;

function getCachePath() {
  const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  const cacheDir = path.join(xdgCacheHome, 'oshea');
  return path.join(cacheDir, 'cli-tree.json');
}

function main() {
  try {
    logger.info('Generating CLI completion cache...\n', { format: 'inline' });
    const commandTree = discoverCommandTree(COMMANDS_DIR);
    const cachePath = getCachePath();

    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(commandTree, null, 2));

    logger.success(`Completion cache successfully written to: ${cachePath}\n`, { format: 'inline' });
  } catch (error) {
    logger.error(`ERROR: Failed to generate completion cache: ${error.message}\n`, { format: 'inline' });
    if (error.stack) {
      logger.error(`${error.stack}\n`, { format: 'inline' });
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

