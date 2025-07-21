// scripts/completion/generate-completion-cache.js
// This script generates a completion cache for the md-to-pdf CLI. This script is for development use only.
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const os = require('os');

const { loggerPath, cliTreeBuilderPath, cliCommandsPath } = require('@paths');
const logger = require(loggerPath);
const { discoverCommandTree } = require(cliTreeBuilderPath);

const COMMANDS_DIR = cliCommandsPath;

function getCachePath() {
  const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  const cacheDir = path.join(xdgCacheHome, 'md-to-pdf');
  return path.join(cacheDir, 'cli-tree.json');
}

function main() {
  try {
    logger.writeInfo('Generating CLI completion cache...\n');
    const commandTree = discoverCommandTree(COMMANDS_DIR);
    const cachePath = getCachePath();

    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(commandTree, null, 2));

    logger.writeSuccess(`Completion cache successfully written to: ${cachePath}\n`);
  } catch (error) {
    logger.writeError(`ERROR: Failed to generate completion cache: ${error.message}\n`);
    if (error.stack) {
      logger.writeError(`${error.stack}\n`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

