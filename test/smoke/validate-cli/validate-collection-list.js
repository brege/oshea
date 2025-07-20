#!/usr/bin/env node
// test/smoke/validate-cli/validate-collection-list.js

require('module-alias/register');

const { exec } = require('child_process');
const { cliPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

// --- Test Scenarios ---
const scenarios = [
  {
    description: 'List collection names (short)',
    commandArgs: 'collection list names --short',
    validate: (stdout) => stdout.includes('NAME') && stdout.includes('TYPE') && stdout.includes('SOURCE')
  },
  {
    description: 'List downloaded collections (default)',
    commandArgs: 'collection list names',
    validate: (stdout) => stdout.includes('Downloaded plugin collections:') || stdout.includes('No downloaded collections found.')
  },
  {
    description: 'List available plugins from collections',
    commandArgs: 'collection list available',
    validate: (stdout) => stdout.includes('Available plugins') || stdout.includes('No available plugins found')
  },
  {
    description: 'List enabled plugins from collections',
    commandArgs: 'collection list enabled',
    validate: (stdout) => stdout.includes('Enabled plugins') || stdout.includes('No enabled plugins found')
  },
  {
    description: 'List all plugins (alias for available)',
    commandArgs: 'collection list all',
    validate: (stdout) => stdout.includes('Available plugins') || stdout.includes('No available plugins found')
  }
];

// --- Main Execution Logic ---
async function runSmokeTest() {
  logger.info('Smoke Test: Validating `collection list` command...');

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
    logger.error(`${failedScenarios.length} 'collection list' scenario(s) failed:`);
    failedScenarios.forEach(({ command, reason }) => {
      logger.detail(`\n  - ${command}`);
      logger.detail(`    Reason: ${reason}`);
    });
    process.exit(1);
  } else {
    logger.success('\n✓ Smoke Test Passed: All `collection list` commands executed successfully.');
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}

