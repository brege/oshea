#!/usr/bin/env node
// test/smoke/validate-plugin-list.js

require('module-alias/register');

const { exec } = require('child_process');
const chalk = require('chalk');
const { cliPath } = require('@paths');

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
  console.log(chalk.blue('Smoke Test: Validating `plugin list` command...'));

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
    console.error(chalk.red(`${failedScenarios.length} 'plugin list' scenario(s) failed:`));
    failedScenarios.forEach(({ command, reason }) => {
      console.error(`\n  - ${chalk.cyan(command)}`);
      console.error(chalk.gray(`    Reason: ${reason}`));
    });
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n✓ Smoke Test Passed: All `plugin list` commands executed successfully.'));
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}
