#!/usr/bin/env node
// scripts/linting/lint.js

const { spawnSync } = require('child_process');
const path = require('path');
const chalk = require('chalk');

const projectRoot = path.resolve(__dirname, '..', '..');
const scriptsDir = path.join(projectRoot, 'scripts', 'linting');

const lintSteps = [
  // code formatting
  {
    label: 'Custom: strip-trailing-whitespace.js',
    command: 'node',
    args: [path.join(scriptsDir, 'strip-trailing-whitespace.js')],
  },
  {
    label: 'Custom: standardize-js-line-one-all.js',
    command: 'node',
    args: [path.join(scriptsDir, 'standardize-js-line-one-all.js')],
  },
  // docs
  {
    label: 'Docs: docs-link-checker.mjs',
    command: 'node',
    args: [path.join(projectRoot, 'scripts', 'docs', 'docs-link-checker.mjs')],
    ignoreFailure: true,
  },
  { // skip this for now
    skip: true,
    label: 'Docs: detect-js-reference-contexts.mjs',
    command: 'node',
    args: [path.join(projectRoot, 'scripts', 'docs', 'detect-js-reference-contexts.mjs'), '--rewrite'],
  },
  {
    label: 'Docs: update-project-indices.js',
    command: 'node',
    args: [path.join(projectRoot, 'scripts', 'docs', 'update-project-indices.js')],
  },
  // validators
  {
    label: 'Validator: mocha-path-validator.js',
    command: 'node',
    args: [path.join(scriptsDir, 'mocha-path-validator.js'), '--quiet'],
  },
  {
    label: 'Validator: paths-js-validator.js',
    command: 'node',
    args: [path.join(scriptsDir, 'paths-js-validator.js'), '--quiet'],
    ignoreFailure: true, // it might be better if this breaks linting
  },
  // code
  {
    label: 'ESLint',
    command: path.join(projectRoot, 'node_modules', '.bin', 'eslint'),
    args: ['.'],
  },
];

function runStep({ label, command, args, ignoreFailure = false, skip = false }) {
  if (skip) {
    console.log(chalk.yellow(`\n--- SKIPPED: ${label} ---`));
    return true;
  }
  console.log(chalk.blue(`\n--- Running: ${label} ---`));
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: projectRoot,
  });

  if (result.status !== 0) {
    if (ignoreFailure) {
      console.warn(chalk.yellow(`\n--- WARNING: ${label} failed with exit code ${result.status} ---`));
      return true;
    }
    console.error(chalk.red(`\n--- ERROR: ${label} failed with exit code ${result.status} ---`));
    return false;
  }
  console.log(chalk.green(`--- SUCCESS: Finished ${label} ---`));
  return true;
}

function main() {
  console.log(chalk.bold.yellow('Starting unified linting process...'));

  // Optionally, define globs for custom scripts
  const globs = ['*.js', 'src/**/*.js', 'scripts/**/*.js', 'plugins/**/*.js', 'test/**/*.js'];

  // Run each lint step in order
  for (const step of lintSteps) {
    // If it's a custom script, pass globs as args
    if (
      step.label.startsWith('Custom:') &&
      step.args.length === 1 // Only script path, no globs yet
    ) {
      step.args = [step.args[0], ...globs];
    }
    if (!runStep(step)) {
      process.exit(1);
    }
  }

  console.log(chalk.bold.green('\nUnified linting process completed successfully.'));
}

main();

