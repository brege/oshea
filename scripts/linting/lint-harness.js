#!/usr/bin/env node
// scripts/linting/lint-harness.js

require('module-alias/register');

const { spawnSync } = require('child_process');
const chalk = require('chalk');
const { projectRoot, eslintPath } = require('@paths');

function runStep({ label, command, args, ignoreFailure = false, dryRun = false }) {
  console.log(chalk.blue(`\n--- Running: ${label} ---`));
  console.log(chalk.gray(`> ${command} ${args.join(' ')}`));

  if (dryRun) {
    console.log(chalk.gray('[dry-run] Executing with dry-run flag (writes disabled)'));
  }

  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf-8',
    cwd: projectRoot,
    env: { ...process.env, FORCE_COLOR: '1' }, // Force color output
  });

  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  if (stdout) console.log(stdout);
  if (stderr) console.error(chalk.red(stderr));


  if (result.error) {
    console.error(chalk.red(`\n--- ERROR: Failed to spawn ${command}: ${result.error.message}`));
    return false;
  }

  if (result.status !== 0) {
    if (ignoreFailure) {
      console.warn(chalk.yellow(`--- Step finished with non-zero exit code ${result.status} (ignored) ---`));
      return true;
    }
    console.error(chalk.red(`\n--- ERROR: ${label} failed with exit code ${result.status} ---`));
    return false;
  }

  if (stdout.includes('problems') || stdout.includes('warnings')) {
    console.log(chalk.yellow(`--- COMPLETED (with warnings): ${label} ---`));
  } else {
    console.log(chalk.green(`--- SUCCESS: ${label} ---`));
  }

  return true;
}

function runHarness(config, globalFlags, targets, only) {
  console.log(chalk.bold.yellow('Starting unified linting process via harness...'));

  const harnessDefaults = config;
  const lintSteps = config.steps || [];
  let allPassed = true;

  const flagList = ['fix', 'quiet', 'json', 'debug', 'force', 'dryRun'];

  for (const step of lintSteps) {
    const stepLabel = step.label || '';
    const stepKey = step.key || '';

    let labelMatch = false;
    let keyMatch = false;

    if (only) {
      const onlyLower = only.toLowerCase();
      labelMatch = stepLabel.toLowerCase().includes(onlyLower);
      keyMatch = stepKey.toLowerCase() === onlyLower;
    }

    const skipByFlag = globalFlags.skip &&
        (stepKey.toLowerCase() === globalFlags.skip.toLowerCase() ||
         stepLabel.toLowerCase().includes(globalFlags.skip.toLowerCase()));

    const shouldSkip = only ? !(labelMatch || keyMatch) : skipByFlag;

    if (shouldSkip) {
      console.log(chalk.yellow(`\n--- SKIPPED: ${step.label} ---`));
      continue;
    }

    let command, commandArgs;

    const resolvedFlags = {};
    for (const flag of flagList) {
      if (flag === 'dryRun') {
        resolvedFlags.dryRun = globalFlags.dryRun === true;
      } else {
        resolvedFlags[flag] = globalFlags[flag] === true || step[flag] === true || harnessDefaults[flag] === true;
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
      if (resolvedFlags.dryRun) commandArgs.push('--dry-run');
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
      dryRun: globalFlags.dryRun,
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
