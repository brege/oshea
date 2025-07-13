#!/usr/bin/env node
// scripts/linting/lint.js

require('module-alias/register');

const { spawnSync } = require('child_process');
const path = require('path');
const chalk = require('chalk');
const {
  projectRoot,
  loggingLintPath,
  removeAutoDocPath,
  stripTrailingWhitespacePath,
  standardizeJsLineOneAllPath,
  postmanPath,
  updateProjectIndicesPath,
  mochaPathValidatorPath,
  pathsJsValidatorPath,
  nodeModulesPath,
} = require('@paths');

// Parse CLI args
const cliArgs = process.argv.slice(2);
// Separate out --fix and paths/globs
const extraArgs = cliArgs.filter(arg => arg === '--fix');
const userPaths = cliArgs.filter(arg => arg !== '--fix');

// Default globs for custom scripts
const defaultGlobs = ['*.js', 'src/**/*.js', 'scripts/**/*.js', 'plugins/**/*.js', 'test/**/*.js'];

const lintSteps = [
  // code formatting
  {
    label: 'Custom: strip-trailing-whitespace.js',
    command: 'node',
    args: [stripTrailingWhitespacePath],
  },
  {
    label: 'Custom: logging-lint.js',
    command: 'node',
    args: [loggingLintPath],
  },
  {
    label: 'Custom: auto-doc-lint.js',
    command: 'node',
    args: [removeAutoDocPath],
  },
  // docs
  {
    label: 'Docs: postman.js',
    command: 'node',
    args: [postmanPath, '--quiet', ...extraArgs],
    ignoreFailure: true,
  },
  {
    label: 'Docs: update-project-indices.js',
    command: 'node',
    args: [updateProjectIndicesPath, '--quiet'],
  },
  // validators
  {
    label: 'Validator: mocha-path-validator.js',
    command: 'node',
    args: [mochaPathValidatorPath, '--quiet'],
  },
  {
    label: 'Validator: paths-js-validator.js',
    command: 'node',
    args: [pathsJsValidatorPath, '--quiet'],
    ignoreFailure: true,
  },
  {
    label: 'Custom: standardize-js-line-one-all.js',
    command: 'node',
    args: [standardizeJsLineOneAllPath],
  },
  // code
  {
    label: 'ESLint',
    command: path.join(nodeModulesPath, '.bin', 'eslint'),
    args: [], // placeholder
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

  // Use user-supplied globs/paths for custom scripts if provided
  const globs = userPaths.length ? userPaths : defaultGlobs;

  // Update custom steps to accept globs
  for (const step of lintSteps) {
    if (
      step.label.startsWith('Custom:') &&
      step.args.length === 1 // Only script path, no globs yet
    ) {
      step.args = [step.args[0], ...globs, ...extraArgs];
    }
  }

  // Set ESLint args: user-supplied paths or '.', plus --fix if present
  const eslintStep = lintSteps.find(s => s.label === 'ESLint');
  eslintStep.args = [
    ...(userPaths.length ? userPaths : ['.']),
    ...extraArgs,
  ];

  // Run each lint step in order
  for (const step of lintSteps) {
    if (!runStep(step)) {
      process.exit(1);
    }
  }

  console.log(chalk.bold.green('\nUnified linting process completed successfully.'));
}

main();

