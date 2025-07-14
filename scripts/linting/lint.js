#!/usr/bin/env node
// scripts/linting/lint.js

require('module-alias/register');

const { lintingConfigPath, lintHelpersPath, lintingHarnessPath } = require('@paths');
const { loadLintSection, parseCliArgs } = require(lintHelpersPath);
const { runHarness } = require(lintingHarnessPath);

function main() {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));

  try {
    const config = loadLintSection('harness', lintingConfigPath);
    runHarness(config, flags, targets);
  } catch (error) {
    console.error('Error running lint harness:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

