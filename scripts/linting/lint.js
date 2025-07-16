#!/usr/bin/env node
// scripts/linting/lint.js

require('module-alias/register');

const chalk = require('chalk');
const { lintingConfigPath, lintHelpersPath, lintingHarnessPath } = require('@paths');
const { loadLintConfig, parseCliArgs } = require(lintHelpersPath);
const { runHarness } = require(lintingHarnessPath);

function printHelp() {
  console.log(`md-to-pdf Linter

Usage:
  node scripts/linting/lint.js [options] [targets...]
  node scripts/linting/lint.js --only <step_key>
  node scripts/linting/lint.js --list

Description:
  The main orchestrator for running code quality and documentation linters.
  Reads steps from 'scripts/linting/config.yaml' and executes them in order.

Options:
      --only <key>         run only the step matching the specified key
      --skip <key>         skip the step matching the specified key

      --fix                attempt to automatically fix any fixable issues
      --dry-run            preview fixes without writing to disk
      --force              run even if 'excludes' apply in configuration

      --quiet              suppress all output except for errors
      --debug              display detailed debug output (if supported)
      --json               output linter results in JSON format

      --list               list available linter steps and their keys
  -h, --help               display this help message

Examples:
  # Run all configured linters
  $ node scripts/linting/lint.js
  # or
  $ npm run lint

  # Run only the ESLint step
  $ node scripts/linting/lint.js --only eslint

  # Try fixing everything
  $ node scripts/linting/lint.js --fix

  # Run postman-link validator in dry-run mode with debug logging
  $ node scripts/linting/lint.js --only doc-links --fix --dry-run --debug
`);
}


function main() {
  const { flags, targets, only } = parseCliArgs(process.argv.slice(2));

  // Handle --help or -h
  if (flags.help || flags.h) {
    printHelp();
    process.exit(0);
  }

  try {
    const fullConfig = loadLintConfig(lintingConfigPath);
    const harnessSteps = fullConfig.harness?.steps || [];

    // Handle --list
    if (flags.list) {
      console.log(chalk.bold.underline('Available Linter Steps:'));

      const filtered = only
        ? harnessSteps.filter(step =>
          (step.key || '').toLowerCase().includes(only.toLowerCase()) ||
            (step.label || '').toLowerCase().includes(only.toLowerCase()))
        : harnessSteps;

      if (filtered.length > 0) {
        filtered.forEach(step => {
          console.log(`  ${chalk.cyan((step.key || '').padEnd(20))} ${step.label}`);
        });
      } else {
        console.log('No matching steps found.');
      }

      console.log('\nUsage: node scripts/linting/lint.js --only <key>');
      console.log(chalk.gray('Tip: Use \'node scripts/linting/lint.js --help\' for all options.'));
      process.exit(0);
    }

    // Run harness
    const config = fullConfig.harness;
    runHarness(config, flags, targets, only);

  } catch (error) {
    console.error('Error running lint harness:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

