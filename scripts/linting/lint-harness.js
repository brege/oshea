#!/usr/bin/env node
// scripts/linting/lint-harness.js
require('module-alias/register');

const { spawnSync } = require('child_process');
const { resolve } = require('path');
const { projectRoot, eslintPath, dataAdaptersPath, loggerPath } = require('@paths');
const { adaptRawIssuesToEslintFormat } = require(dataAdaptersPath);
const logger = require(loggerPath);

// Accept userArgs (for display only) and the usingJson flag
function runStep({ label, command, args, userArgs, ignoreFailure = false, dryRun = false, usingJson = false }) {
  // Only print step info if not in JSON mode
  if (!usingJson) {
    logger.info(`--- Running: ${label} ---`);
    const printableArgs = Array.isArray(userArgs) ? userArgs : args;
    logger.detail(`> ${command} ${printableArgs.join(' ')}`);

    if (dryRun) {
      logger.detail('[dry-run] Executing with dry-run flag (writes disabled)');
    }
  }

  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf-8',
    cwd: projectRoot,
    env: { ...process.env, FORCE_COLOR: '1', CALLED_BY_HARNESS: '1' },
  });

  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  let stepSummary = null;
  let issues = [];

  if (stdout) {
    try {
      // ESLint returns an array, our scripts return an object.
      // Look for JSON object start, but skip ANSI color codes by looking for {"issues"
      const jsonStart = stdout.startsWith('[') ? stdout.indexOf('[') : stdout.indexOf('{"issues"');
      if (jsonStart !== -1) {
        // Extract debug output that comes before JSON (when in debug mode)
        const preJsonOutput = stdout.substring(0, jsonStart).trim();
        if (preJsonOutput && !usingJson) {
          logger.info(preJsonOutput);
        }

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
      const { transformToStructuredData } = require(dataAdaptersPath);
      const structuredData = transformToStructuredData(adaptedIssues);
      logger.info(structuredData, { format: 'lint' });
    } else if (stdout && !stepSummary) {
      logger.info(stdout);
    } else if (issues.length === 0 && stepSummary && stepSummary.fixedCount === 0) {
      logger.success('✔ No problems found.');
    }

    if (stderr) logger.error(stderr);
  }


  if (result.error) {
    // Always report catastrophic errors
    logger.error(`--- ERROR: Failed to spawn ${command}: ${result.error.message}`);
    return { stepPassed: false };
  }

  const failed = result.status !== 0;
  const stepPassed = !failed || ignoreFailure;
  return { stepPassed, stepSummary };
}

function runHarness(config, globalFlags, targets = [], only = '') {
  const usingJson = globalFlags.json === true;

  if (!usingJson) {
    logger.info('Starting unified linting process via harness...');
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
      if (!usingJson && shouldSkip) logger.warn(`--- SKIPPED: ${label} ---`);
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
      // Individual linters should always return structured data to harness
      commandArgs = [resolve(step.scriptPath)];

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
        logger.error(`--- ERROR: Step '${label}' missing both 'command' and 'scriptPath'.`);
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
          logger.info(JSON.stringify({
            ok: false,
            aborted: true,
            steps: stepSummaries,
            totalErrors: stepSummaries.reduce((t, s) => t + (s.errorCount || 0), 0),
            totalWarnings: stepSummaries.reduce((t, s) => t + (s.warningCount || 0), 0),
            totalFixed: stepSummaries.reduce((t, s) => t + (s.fixedCount || 0), 0),
            message: 'Unified linting harness aborted due to step failure.'
          }, null, 2) + '\n', { format: 'inline' });
          process.exit(1);
        } else {
          logger.fatal('Harness exiting early due to failure.');
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
    logger.info(JSON.stringify({
      ok: totalErrors === 0,
      steps: stepSummaries,
      totalErrors,
      totalWarnings,
      totalFixed,
      result: totalErrors > 0 ? 'errors'
        : totalWarnings > 0 ? 'warnings'
          : 'ok'
    }, null, 2) + '\n', { format: 'inline' });
    process.exit(totalErrors === 0 ? 0 : 1);
  }

  // Pretty/CLI output mode:
  logger.info('Lint Summary');
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

    const symbol = errorCount > 0 ? '✖' : warningCount > 0 ? '!' : '✔';
    const fixText = fixedCount > 0 ? ` (${fixedCount} fixed)` : '';
    const logLevel = errorCount > 0 ? 'error' : warningCount > 0 ? 'warn' : 'success';

    logger[logLevel](`${symbol} ${step.label}${fixText}`);
  }

  // Simple summary - future: move to formatters/lint-summary.js for proper CI integration
  const totalProblems = totalErrors + totalWarnings;
  if (totalProblems > 0) {
    const summaryText = `✖ ${totalProblems} problem${totalProblems === 1 ? '' : 's'} (${totalErrors} error${totalErrors === 1 ? '' : 's'}, ${totalWarnings} warning${totalWarnings === 1 ? '' : 's'})`;
    const summaryLevel = totalErrors > 0 ? 'error' : 'warn';
    logger[summaryLevel](summaryText);
  }

  if (totalFixed > 0 && totalProblems === 0) {
    logger.success('All fixable issues have been addressed.');
  }

  if (allPassed && totalErrors === 0) {
    if (totalWarnings === 0) {
      logger.success('Unified linting process completed successfully.');
    } else {
      logger.warn('Unified linting process completed with warnings.');
    }
    process.exit(0);
  } else {
    logger.error('Unified linting process completed with errors.');
    process.exit(1);
  }
}

module.exports = { runHarness };
