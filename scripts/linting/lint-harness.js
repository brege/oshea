#!/usr/bin/env node
// scripts/linting/lint-harness.js

require('module-alias/register');

const { spawnSync } = require('child_process');
const chalk = require('chalk');
const { resolve } = require('path');
const { projectRoot, eslintPath, formattersPath } = require('@paths');
const { formatLintResults, adaptRawIssuesToEslintFormat } = require(formattersPath);

// Accept userArgs (for display only) and the usingJson flag
function runStep({ label, command, args, userArgs, ignoreFailure = false, dryRun = false, usingJson = false }) {
  // Only print step info if not in JSON mode
  if (!usingJson) {
    console.log(chalk.blue(`\n--- Running: ${label} ---`));
    const printableArgs = Array.isArray(userArgs) ? userArgs : args;
    console.log(chalk.gray(`> ${command} ${printableArgs.join(' ')}`));

    if (dryRun) {
      console.log(chalk.gray('[dry-run] Executing with dry-run flag (writes disabled)'));
    }
  }

  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf-8',
    cwd: projectRoot,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  let stepSummary = null;
  let issues = [];

  if (stdout) {
    try {
      // ESLint returns an array, our scripts return an object.
      const jsonStart = stdout.startsWith('[') ? stdout.indexOf('[') : stdout.indexOf('{');
      if (jsonStart !== -1) {
        const jsonString = stdout.substring(jsonStart);
        const parsed = JSON.parse(jsonString);

        if (command === eslintPath && Array.isArray(parsed)) {
          let errorCount = 0;
          let warningCount = 0;
          parsed.forEach(fileResult => {
            errorCount += fileResult.errorCount;
            warningCount += fileResult.warningCount;
            if(fileResult.messages.length > 0) issues.push(fileResult);
          });
          stepSummary = { errorCount, warningCount, fixedCount: 0 }; // ESLint JSON format doesn't summarize fixes well.
        } else if (parsed && parsed.summary) {
          stepSummary = parsed.summary;
          issues = parsed.issues || [];
        }
      }
    } catch {
      // Not JSON, just print it.
    }
  }

  // Only print formatted output if not in JSON mode
  if (!usingJson) {
    if (issues.length > 0) {
      const isEslintResult = command === eslintPath;
      const adaptedIssues = isEslintResult ? issues : adaptRawIssuesToEslintFormat(issues);
      const formattedIssues = formatLintResults(adaptedIssues);
      console.log(formattedIssues);
    } else if (stdout && !stepSummary) {
      console.log(stdout);
    } else if (issues.length === 0 && stepSummary && stepSummary.fixedCount === 0) {
      console.log(chalk.green('✔ No problems found.'));
    }

    if (stderr) console.error(chalk.red(stderr));
  }


  if (result.error) {
    // Always report catastrophic errors
    console.error(chalk.red(`\n--- ERROR: Failed to spawn ${command}: ${result.error.message}`));
    return { stepPassed: false };
  }

  const failed = result.status !== 0;
  const stepPassed = !failed || ignoreFailure;
  return { stepPassed, stepSummary };
}

function runHarness(config, globalFlags, targets = [], only = '') {
  const usingJson = globalFlags.json === true;

  if (!usingJson) {
    console.log(chalk.bold.yellow('Starting unified linting process via harness...'));
  }

  const steps = config.steps || [];
  const stepSummaries = [];
  const flagList = ['fix', 'quiet', 'json', 'debug', 'force', 'dryRun'];
  let allPassed = true;

  for (const step of steps) {
    const label = step.label || '(unnamed step)';
    const key = step.key || '';
    const group = step.group || '';
    const alias = step.alias || '';

    const shouldRun = !only ||
                      label.toLowerCase().includes(only.toLowerCase()) ||
                      key.toLowerCase() === only.toLowerCase() ||
                      group.toLowerCase() === only.toLowerCase() ||
                      alias.toLowerCase() === only.toLowerCase();

    const shouldSkip = globalFlags.skip &&
                       (key === globalFlags.skip ||
                        label.toLowerCase().includes(globalFlags.skip.toLowerCase()) ||
                        group.toLowerCase() === globalFlags.skip.toLowerCase() ||
                        alias.toLowerCase() === globalFlags.skip.toLowerCase());

    if (!shouldRun || shouldSkip) {
      if (!usingJson && shouldSkip) console.log(chalk.yellow(`\n--- SKIPPED: ${label} ---`));
      continue;
    }

    const resolvedFlags = {};
    for (const flag of flagList) {
      resolvedFlags[flag] =
        globalFlags[flag] === true || step[flag] === true || config[flag] === true;
    }

    let command, commandArgs, userDisplayArgs;

    if (step.scriptPath) {
      command = 'node';
      // For backend: always add --json for parsing to get the summary
      commandArgs = [resolve(step.scriptPath), '--json'];

      if (targets.length > 0) commandArgs.push(...targets);
      for (const flag of flagList) {
        if (flag === 'json') continue; // Already handled
        const cliFlag = flag === 'dryRun' ? '--dry-run' : `--${flag}`;
        if (resolvedFlags[flag]) commandArgs.push(cliFlag);
      }

      // For user display: omit --json
      userDisplayArgs = [resolve(step.scriptPath)];
      if (targets.length > 0) userDisplayArgs.push(...targets);
      for (const flag of flagList) {
        if (flag === 'json') continue;
        const cliFlag = flag === 'dryRun' ? '--dry-run' : `--${flag}`;
        if (resolvedFlags[flag]) userDisplayArgs.push(cliFlag);
      }
    } else if (step.command) {
      command = step.command === 'eslint' ? eslintPath : step.command;
      commandArgs = [...(targets.length > 0 ? targets : step.defaultTargets || [])];

      if (command === eslintPath) {
        commandArgs.push('--format=json');
        if (resolvedFlags.fix) commandArgs.push('--fix');
        if (resolvedFlags.quiet) commandArgs.push('--quiet');
        // Add other simple flags here if needed
      }

      // User-display args -- omit --format=json
      userDisplayArgs = [...(targets.length > 0 ? targets : step.defaultTargets || [])];
      if (command === eslintPath) {
        if (resolvedFlags.fix) userDisplayArgs.push('--fix');
        if (resolvedFlags.quiet) userDisplayArgs.push('--quiet');
      }
    } else {
      if (!usingJson) {
        console.error(chalk.red(`\n--- ERROR: Step '${label}' missing both 'command' and 'scriptPath'.`));
      }
      allPassed = false;
      continue;
    }

    const { stepPassed, stepSummary } = runStep({
      label,
      command,
      args: commandArgs,
      userArgs: userDisplayArgs,
      ignoreFailure: step.ignoreFailure || false,
      dryRun: resolvedFlags.dryRun,
      usingJson: usingJson, // Pass the JSON flag down to the step runner
    });

    if (!stepPassed) {
      allPassed = false;
      if (!config.continueOnError) {
        if (usingJson) {
          // Output partial JSON, abort
          process.stdout.write(JSON.stringify({
            ok: false,
            aborted: true,
            steps: stepSummaries,
            totalErrors: stepSummaries.reduce((t, s) => t + (s.errorCount || 0), 0),
            totalWarnings: stepSummaries.reduce((t, s) => t + (s.warningCount || 0), 0),
            totalFixed: stepSummaries.reduce((t, s) => t + (s.fixedCount || 0), 0),
            message: 'Unified linting harness aborted due to step failure.'
          }, null, 2) + '\n');
          process.exit(1);
        } else {
          console.error(chalk.red.bold('\nHarness exiting early due to failure.'));
          process.exit(1);
        }
      }
    }

    if (stepSummary) {
      stepSummaries.push({ label, ...stepSummary });
    }
  }

  // JSON output mode: emit single summary block, exit
  if (usingJson) {
    const totalErrors = stepSummaries.reduce((t, s) => t + (s.errorCount || 0), 0);
    const totalWarnings = stepSummaries.reduce((t, s) => t + (s.warningCount || 0), 0);
    const totalFixed = stepSummaries.reduce((t, s) => t + (s.fixedCount || 0), 0);
    process.stdout.write(JSON.stringify({
      ok: totalErrors === 0,
      steps: stepSummaries,
      totalErrors,
      totalWarnings,
      totalFixed,
      result: totalErrors > 0 ? 'errors'
        : totalWarnings > 0 ? 'warnings'
          : 'ok'
    }, null, 2) + '\n');
    process.exit(totalErrors === 0 ? 0 : 1);
  }

  // Pretty/CLI output mode:
  console.log('\n' + chalk.bold.underline('Lint Summary') + '\n');
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFixed = 0;

  for (const step of stepSummaries) {
    const errorCount = step.errorCount || 0;
    const warningCount = step.warningCount || 0;
    const fixedCount = step.fixedCount || 0;
    totalErrors += errorCount;
    totalWarnings += warningCount;
    totalFixed += fixedCount;

    const symbol = errorCount > 0 ? chalk.red('✖')
      : warningCount > 0 ? chalk.yellow('!')
        : chalk.green('✔');

    const fixText = fixedCount > 0
      ? chalk.gray(` (${fixedCount} fixed)`)
      : '';

    console.log(`${symbol} ${step.label}${fixText}`);
  }

  const totalProblems = totalErrors + totalWarnings;
  if (totalProblems > 0) {
    let problemColor;
    if (totalErrors > 0) {
      problemColor = chalk.bold.red;
    } else if (totalWarnings > 0) {
      problemColor = chalk.bold.yellow;
    } else {
      problemColor = chalk.bold.green;
    }

    const summaryText =
      `✖ ${totalProblems} problem${totalProblems === 1 ? '' : 's'} `
      + `(${totalErrors} error${totalErrors === 1 ? '' : 's'}, `
      + `${totalWarnings} warning${totalWarnings === 1 ? '' : 's'})`;

    console.log('\n' + problemColor(summaryText));
  }

  if (totalFixed > 0 && totalProblems === 0) {
    console.log(chalk.bold.green('\nAll fixable issues have been addressed.'));
  }

  if (allPassed && totalErrors === 0 && totalWarnings === 0) {
    console.log(chalk.bold.green('\nUnified linting process completed successfully.\n'));
    process.exit(0);
  } else if (totalErrors === 0 && totalWarnings > 0) {
    console.log(chalk.bold.yellow('\nUnified linting process completed with warnings.\n'));
    process.exit(1);
  } else {
    console.log(chalk.bold.red('\nUnified linting process completed with errors.\n'));
    process.exit(1);
  }
}

module.exports = { runHarness };
