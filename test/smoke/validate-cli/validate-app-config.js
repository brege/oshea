#!/usr/bin/env node
// test/smoke/validate-cli/validate-app-config.js

require('module-alias/register');

const { exec } = require('child_process');
const yaml = require('js-yaml');
const { cliPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

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
  logger.info('Smoke Test: Validating `config` command...\n', { format: 'inline' });

  let failedScenarios = [];

  for (const scenario of scenarios) {
    const fullCommand = `node "${cliPath}" ${scenario.commandArgs}`;
    const commandDisplay = `md-to-pdf ${scenario.commandArgs}`;

    // This prints '  Testing: ... ' (gray, no newline)
    logger.detail(`  Testing: ${commandDisplay} ... `, { format: 'inline' });

    try {
      const stdout = await new Promise((resolve, reject) => {
        exec(fullCommand, (error, stdout, stderr) => {
          if (error) {
            return reject({ error, stdout, stderr });
          }
          if (stderr) {
            logger.warn(`    Warning (stderr): ${stderr.trim()}`, { format: 'inline' });
          }
          resolve(stdout);
        });
      });

      if (scenario.validate(stdout)) {
        logger.success('✓ OK\n', { format: 'inline' });
      } else {
        failedScenarios.push({ command: commandDisplay, reason: 'Validation function returned false.' });
        logger.error('✗ FAIL\n', { format: 'inline' });
      }

    } catch (result) {
      failedScenarios.push({ command: commandDisplay, reason: result.error.message.split('\n')[0] });
      logger.error('✗ FAIL\n', { format: 'inline' });
    }
  }

  if (failedScenarios.length > 0) {
    logger.error('\n--- Smoke Test Failed ---', { format: 'inline' });
    logger.error(`${failedScenarios.length} config scenario(s) failed:`, { format: 'inline' });
    failedScenarios.forEach(({ command, reason }) => {
      logger.detail(`  - ${command}`, { format: 'inline' });
      logger.detail(`    Reason: ${reason}`, { format: 'inline' });
    });
    process.exit(1);
  } else {
    logger.success('\n✓ Smoke Test Passed: All `config` commands executed successfully.\n', { format: 'inline' });
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}

