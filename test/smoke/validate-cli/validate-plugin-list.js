#!/usr/bin/env node
// test/smoke/validate-cli/validate-plugin-list.js

require('module-alias/register');

const { exec } = require('child_process');
const { cliPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

// --- Test Scenarios ---
const scenarios = [
  {
    description: 'List plugins (default)',
    commandArgs: 'plugin list',
    validate: (stdout) => stdout.includes('usable by md-to-pdf')
  },
  {
    description: 'List enabled plugins',
    commandArgs: 'plugin list --enabled',
    validate: (stdout) => stdout.includes('Enabled plugins')
  },
  {
    description: 'List available plugins',
    commandArgs: 'plugin list --available',
    validate: (stdout) => stdout.includes('Available CM-managed plugins')
  },
  {
    description: 'List disabled plugins',
    commandArgs: 'plugin list --disabled',
    validate: (stdout) => stdout.includes('Disabled (but available) CM-managed plugins')
  },
  {
    description: 'List plugins (--short)',
    commandArgs: 'plugin list --short',
    validate: (stdout) => stdout.includes('NAME/INVOKE KEY') && stdout.includes('CM ORIGIN')
  }
];

// --- Main Execution Logic ---
async function runSmokeTest() {
  logger.info('Smoke Test: Validating `plugin list` command...');

  let failedScenarios = [];

  for (const scenario of scenarios) {
    const fullCommand = `node "${cliPath}" ${scenario.commandArgs}`;
    const commandDisplay = `md-to-pdf ${scenario.commandArgs}`;

    logger.writeDetail(`  Testing: ${commandDisplay} ... `);

    try {
      const stdout = await new Promise((resolve, reject) => {
        exec(fullCommand, (error, stdout, stderr) => {
          if (error) {
            return reject({ error, stdout, stderr });
          }
          if (stderr) {
            logger.warn(`\n    Warning (stderr): ${stderr.trim()}`);
          }
          resolve(stdout);
        });
      });

      if (scenario.validate(stdout)) {
        logger.writeSuccess('✓ OK\n');
      } else {
        failedScenarios.push({ command: commandDisplay, reason: 'Validation function returned false. Output did not contain expected text.' });
        logger.writeError('✗ FAIL\n');
      }

    } catch (result) {
      failedScenarios.push({ command: commandDisplay, reason: result.error.message.split('\n')[0] });
      logger.writeError('✗ FAIL\n');
    }
  }

  if (failedScenarios.length > 0) {
    logger.error('\n--- Smoke Test Failed ---');
    logger.error(`${failedScenarios.length} 'plugin list' scenario(s) failed:`);
    failedScenarios.forEach(({ command, reason }) => {
      logger.detail(`\n  - ${command}`);
      logger.detail(`    Reason: ${reason}`);
    });
    process.exit(1);
  } else {
    logger.success('\n✓ Smoke Test Passed: All `plugin list` commands executed successfully.');
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}

