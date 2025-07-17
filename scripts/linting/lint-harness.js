#!/usr/bin/env node
// scripts/linting/lint-harness.js

require('module-alias/register');

const { spawnSync } = require('child_process');
const chalk = require('chalk');
const { resolve } = require('path');
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
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  if (stdout) console.log(stdout);
  if (stderr) console.error(chalk.red(stderr));

  if (result.error) {
    console.error(chalk.red(`\n--- ERROR: Failed to spawn ${command}: ${result.error.message}`));
    return { stepPassed: false };
  }

  // Try to extract lint summary if stdout is JSON
  let stepSummary = null;
  if (args.includes('--json')) {
    try {
      const parsed = JSON.parse(stdout);
      if ('summary' in parsed) {
        stepSummary = { ...parsed.summary, clean: (parsed.summary.errorCount + parsed.summary.warningCount) === 0 };
      } else if ('issues' in parsed && Array.isArray(parsed.issues)) {
        const hasErrors = parsed.issues.some(issue => issue.severity === 2);
        const hasWarnings = parsed.issues.some(issue => issue.severity === 1);
        stepSummary = { errorCount: hasErrors ? 1 : 0, warningCount: hasWarnings ? 1 : 0, clean: !hasErrors && !hasWarnings };
      }
    } catch {
      // JSON parse failed; fallback to null
    }
  }

  const failed = result.status !== 0;
  const stepPassed = !failed || ignoreFailure;

  return { stepPassed, stepSummary };
}

function runHarness(config, globalFlags, targets = [], only = '') {
  console.log(chalk.bold.yellow('Starting unified linting process via harness...'));

  const steps = config.steps || [];
  const stepSummaries = [];
  const flagList = ['fix', 'quiet', 'json', 'debug', 'force', 'dryRun'];
  let allPassed = true;

  for (const step of steps) {
    const label = step.label || '(unnamed step)';
    const key = step.key || '';
    const shouldRun =
      !only || label.toLowerCase().includes(only.toLowerCase()) || key.toLowerCase() === only.toLowerCase();

    if (!shouldRun || (globalFlags.skip && (key === globalFlags.skip || label.toLowerCase().includes(globalFlags.skip)))) {
      console.log(chalk.yellow(`\n--- SKIPPED: ${label} ---`));
      continue;
    }

    const resolvedFlags = {};
    for (const flag of flagList) {
      resolvedFlags[flag] =
        globalFlags[flag] === true || step[flag] === true || config[flag] === true;
    }

    let command, commandArgs;

    if (step.scriptPath) {
      command = 'node';
      commandArgs = [resolve(step.scriptPath)];

      if (targets.length > 0) commandArgs.push(...targets);
      for (const flag of flagList) {
        const cliFlag = flag === 'dryRun' ? '--dry-run' : `--${flag}`;
        if (resolvedFlags[flag]) commandArgs.push(cliFlag);
      }
    } else if (step.command) {
      command = step.command === 'eslint' ? eslintPath : step.command;
      commandArgs = [...(targets.length > 0 ? targets : step.defaultTargets || [])];

      for (const flag of flagList) {
        const cliFlag = flag === 'dryRun' ? '--dry-run' : `--${flag}`;
        if (resolvedFlags[flag]) commandArgs.push(cliFlag);
      }

      // ESLint special format flag
      if (command === eslintPath && resolvedFlags.json) {
        commandArgs.push('--format=json');
      } else if (resolvedFlags.json) {
        commandArgs.push('--json');
      }
    } else {
      console.error(chalk.red(`\n--- ERROR: Step '${label}' missing both 'command' and 'scriptPath'.`));
      allPassed = false;
      continue;
    }

    const { stepPassed, stepSummary } = runStep({
      label,
      command,
      args: commandArgs,
      ignoreFailure: step.ignoreFailure || false,
      dryRun: resolvedFlags.dryRun,
    });

    if (!stepPassed) {
      allPassed = false;
      if (!config.continueOnError) {
        console.error(chalk.red.bold('\nHarness exiting early due to failure.'));
        process.exit(1);
      }
    }

    if (stepSummary) {
      stepSummaries.push({ label, ...stepSummary });

      // Output summary banner
      const { clean, errorCount, warningCount, fixedCount } = stepSummary;
      if (clean) {
        console.log(chalk.green(`--- SUCCESS: ${label} ---`));
      } else if (errorCount > 0 || warningCount > 0) {
        console.log(chalk.yellow(`--- COMPLETED (with warnings): ${label} ---`));
      }

      if (fixedCount > 0) {
        console.log(chalk.gray(`✔ ${fixedCount} issue${fixedCount > 1 ? 's' : ''} fixed.`));
      }
    }
  }

  // Final Summary Table
  console.log('\n' + chalk.bold.underline('Lint Summary') + '\n');

  for (const step of stepSummaries) {
    const symbol = step.clean
      ? chalk.green('✔')
      : step.errorCount > 0
        ? chalk.red('✖')
        : chalk.yellow('!');

    const fixText = step.fixedCount > 0
      ? chalk.gray(` (${step.fixedCount} fixed)`)
      : '';

    console.log(`${symbol} ${step.label}${fixText}`);
  }

  if (allPassed) {
    console.log(chalk.bold.green('\nUnified linting process completed successfully.\n'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('\nUnified linting process completed with errors.\n'));
    process.exit(1);
  }
}

module.exports = { runHarness };

