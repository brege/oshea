#!/usr/bin/env node
// test/smoke/validate-cli/validate-app-config.js

require('module-alias/register');

const { exec } = require('child_process');
const chalk = require('chalk');
const { cliPath } = require('@paths');
const yaml = require('js-yaml');

// --- Test Scenarios ---
const scenarios = [
  {
    description: 'Global config (default)',
    commandArgs: 'config',
    validate: (stdout) => stdout.includes('pdf_viewer:')
  },
  {
    description: 'Global config (--pure)',
    commandArgs: 'config --pure',
    validate: (stdout) => {
      try {
        const doc = yaml.load(stdout);
        return typeof doc === 'object' && doc !== null && 'pdf_viewer' in doc;
      } catch (e) {
        return false;
      }
    }
  },
  {
    description: 'Plugin config (default)',
    commandArgs: 'config --plugin cv',
    validate: (stdout) => stdout.includes('handler_script:') && stdout.includes('Plugin Base Path:')
  },
  {
    description: 'Plugin config (--pure)',
    commandArgs: 'config --plugin cv --pure',
    validate: (stdout) => {
      try {
        const doc = yaml.load(stdout);
        return typeof doc === 'object' && doc !== null && 'handler_script' in doc;
      } catch (e) {
        return false;
      }
    }
  }
];

// --- Main Execution Logic ---
async function runSmokeTest() {
  console.log(chalk.blue('Smoke Test: Validating `config` command...'));

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
        failedScenarios.push({ command: commandDisplay, reason: 'Validation function returned false.' });
        console.log(chalk.red('✗ FAIL'));
      }

    } catch (result) {
      failedScenarios.push({ command: commandDisplay, reason: result.error.message.split('\n')[0] });
      console.log(chalk.red('✗ FAIL'));
    }
  }

  if (failedScenarios.length > 0) {
    console.error(chalk.red.bold('\n--- Smoke Test Failed ---'));
    console.error(chalk.red(`${failedScenarios.length} config scenario(s) failed:`));
    failedScenarios.forEach(({ command, reason }) => {
      console.error(`\n  - ${chalk.cyan(command)}`);
      console.error(chalk.gray(`    Reason: ${reason}`));
    });
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n✓ Smoke Test Passed: All `config` commands executed successfully.'));
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}
