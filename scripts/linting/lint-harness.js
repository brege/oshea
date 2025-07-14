#!/usr/bin/env node
// scripts/linting/lint-harness.js

require('module-alias/register');

const { spawnSync } = require('child_process');
const chalk = require('chalk');
const { projectRoot, eslintPath } = require('@paths');

function runStep({ label, command, args, ignoreFailure = false }) {
  console.log(chalk.blue(`\n--- Running: ${label} ---`));
  console.log(chalk.gray(`> ${command} ${args.join(' ')}`));

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: projectRoot,
  });

  if (result.error) {
    console.error(chalk.red(`\n--- ERROR: Failed to spawn ${command}: ${result.error.message}`));
    return false;
  }

  if (result.status !== 0) {
    if (ignoreFailure) {
      console.warn(chalk.yellow(`\n--- WARNING: ${label} completed with non-zero exit code ${result.status} (ignored) ---`));
      return true;
    }
    console.error(chalk.red(`\n--- ERROR: ${label} failed with exit code ${result.status} ---`));
    return false;
  }

  console.log(chalk.green(`--- SUCCESS: Finished ${label} ---`));
  return true;
}

function runHarness(config, globalFlags, targets) {
  console.log(chalk.bold.yellow('Starting unified linting process via harness...'));

  const harnessDefaults = config;
  const lintSteps = config.steps || [];
  let allPassed = true;

  const flagList = ['fix', 'quiet', 'json', 'debug', 'force'];

  for (const step of lintSteps) {
    const shouldSkip = step.skip !== undefined
      ? step.skip
      : (harnessDefaults.skip !== undefined ? harnessDefaults.skip : false);

    if (shouldSkip) {
      console.log(chalk.yellow(`\n--- SKIPPED: ${step.label} ---`));
      continue;
    }

    let command, commandArgs;

    const resolvedFlags = {};
    for (const flag of flagList) {
      if (flag === 'json' && step.command === 'eslint') {
        resolvedFlags.json = step.json === true;
      } else {
        resolvedFlags[flag] =
          globalFlags[flag] !== undefined
            ? globalFlags[flag]
            : (step[flag] !== undefined
              ? step[flag]
              : (harnessDefaults[flag] !== undefined ? harnessDefaults[flag] : false));
      }
    }

    if (step.command) {
      command = (step.command === 'eslint') ? eslintPath : step.command;
      const stepTargets = targets.length > 0 ? targets : (step.defaultTargets || []);
      commandArgs = [...stepTargets];

      if (resolvedFlags.fix) commandArgs.push('--fix');
      if (resolvedFlags.quiet) commandArgs.push('--quiet');
      if (resolvedFlags.debug) commandArgs.push('--debug');
      if (resolvedFlags.force) commandArgs.push('--force');

      if (step.command === 'eslint' && resolvedFlags.json) {
        commandArgs.push('--format=json');
      } else if (resolvedFlags.json && step.command !== 'eslint') {
        commandArgs.push('--json');
      }

    } else if (step.scriptPath) {
      command = 'node';
      commandArgs = [step.scriptPath];
      if (targets.length > 0) commandArgs.push(...targets);

      if (resolvedFlags.fix) commandArgs.push('--fix');
      if (resolvedFlags.quiet) commandArgs.push('--quiet');
      if (resolvedFlags.json) commandArgs.push('--json');
      if (resolvedFlags.debug) commandArgs.push('--debug');
      if (resolvedFlags.force) commandArgs.push('--force');
    } else {
      console.error(chalk.red(`\n--- ERROR: Step '${step.label}' missing both command and scriptPath ---`));
      allPassed = false;
      continue;
    }

    const success = runStep({
      label: step.label,
      command,
      args: commandArgs,
      ignoreFailure: step.ignoreFailure || false,
    });

    if (!success) {
      allPassed = false;
      if (!harnessDefaults.continueOnError) {
        console.error(chalk.red.bold('\nHarness exiting early due to failure.'));
        process.exit(1);
      }
    }
  }

  if (allPassed) {
    console.log(chalk.bold.green('\nUnified linting process completed successfully.'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('\nUnified linting process completed with one or more failures.'));
    process.exit(1);
  }
}

module.exports = { runHarness };

