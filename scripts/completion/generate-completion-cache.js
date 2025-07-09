// scripts/completion/generate-completion-cache.js
// This script generates a completion cache for the md-to-pdf CLI. This script is for development use only.
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

// Use your path registry for all internal modules
const { cliTreeBuilderPath, cliCommandsPath } = require('@paths');
const { discoverCommandTree } = require(cliTreeBuilderPath);

const COMMANDS_DIR = cliCommandsPath;

function getCachePath() {
  const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  const cacheDir = path.join(xdgCacheHome, 'md-to-pdf');
  return path.join(cacheDir, 'cli-tree.json');
}

function main() {
  try {
    console.log(chalk.blue('Generating CLI completion cache...'));
    const commandTree = discoverCommandTree(COMMANDS_DIR);
    const cachePath = getCachePath();

    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(commandTree, null, 2));

    console.log(chalk.green(`Completion cache successfully written to: ${cachePath}`));
  } catch (error) {
    console.error(chalk.red(`ERROR: Failed to generate completion cache: ${error.message}`));
    if (error.stack) {
      console.error(chalk.red(error.stack));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

