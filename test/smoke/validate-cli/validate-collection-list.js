#!/usr/bin/env node
// test/smoke/validate-cli/validate-collection-list.js

require('module-alias/register');

const { exec } = require('child_process');
const chalk = require('chalk');
const { cliPath } = require('@paths');

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
  console.log(chalk.blue('Smoke Test: Validating `collection list` command...'));

  let failedScenarios = [];

  for (const scenario of scenarios) {
    const fullCommand = `node "${cliPath}" ${scenario.commandArgs}`;
    const commandDisplay = `md-to-pdf ${scenario.commandArgs}`;

    process.stdout.write(`  Testing: ${chalk.cyan(commandDisplay)} ... `);

    try {
      const stdout = await new Promise((resolve, reject) => {
        exec(fullCommand, (error, stdout, stderr) => {
          if (error) {
            return reject({ error, stdout, stderr });
          }
          if (stderr) {
            console.warn(chalk.yellow(`\n    Warning (stderr): ${stderr.trim()}`));
          }
          resolve(stdout);
        });
      });

      if (scenario.validate(stdout)) {
        console.log(chalk.green('✓ OK'));
      } else {
        failedScenarios.push({ command: commandDisplay, reason: 'Validation function returned false. Output did not contain expected text.' });
        console.log(chalk.red('✗ FAIL'));
      }

    } catch (result) {
      failedScenarios.push({ command: commandDisplay, reason: result.error.message.split('\n')[0] });
      console.log(chalk.red('✗ FAIL'));
    }
  }

  if (failedScenarios.length > 0) {
    console.error(chalk.red.bold('\n--- Smoke Test Failed ---'));
    console.error(chalk.red(`${failedScenarios.length} 'collection list' scenario(s) failed:`));
    failedScenarios.forEach(({ command, reason }) => {
      console.error(`\n  - ${chalk.cyan(command)}`);
      console.error(chalk.gray(`    Reason: ${reason}`));
    });
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n✓ Smoke Test Passed: All `collection list` commands executed successfully.'));
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}
