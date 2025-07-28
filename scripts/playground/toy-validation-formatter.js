#!/usr/bin/env node
// scripts/playground/toy-validation-formatter.js
// Toy validation formatter demonstration
// Companion to formatter-playground.js for testing validation formatters
// lint-skip-file no-console

require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demonstrateValidationFormatters() {
  // Display validation header
  logger.info({ protocol: 'V1', pluginName: 'test-plugin' }, { format: 'validation-header' });

  // Simulate validation steps
  const steps = [
    {
      stepName: 'plugin file structure',
      shouldPass: true,
      details: [
        { type: 'success', message: 'Found required file: \'index.js\'' },
        { type: 'success', message: 'Found required file: \'test-plugin.config.yaml\'' },
        { type: 'success', message: 'Found required file: \'README.md\'' }
      ]
    },
    {
      stepName: 'for optional files',
      shouldPass: true,
      details: [
        { type: 'success', message: 'Found optional \'.contract/test/\' directory' },
        { type: 'success', message: 'Plugin has a schema file (\'test-plugin.schema.json\')' }
      ]
    },
    {
      stepName: 'plugin test setup',
      shouldPass: false,
      details: [
        { type: 'error', message: 'Test script not found' },
        { type: 'warn', message: 'Consider adding integration tests' }
      ]
    },
    {
      stepName: 'README.md front matter',
      shouldPass: 'warning',
      details: [
        { type: 'warn', message: 'README.md does not have a valid YAML front matter block' }
      ]
    },
    {
      stepName: 'self-activation sanity check',
      shouldPass: 'skip',
      details: [
        { type: 'info', message: 'Self-activation test skipped due to missing config' }
      ]
    }
  ];

  for (const step of steps) {
    // Start step
    logger.info({ stepName: step.stepName, status: 'testing' }, { format: 'validation-step' });

    // Wait to simulate processing
    await sleep(500);

    // Complete step based on result
    let status;
    if (step.shouldPass === true) {
      status = 'passed';
    } else if (step.shouldPass === false) {
      status = 'failed';
    } else if (step.shouldPass === 'warning') {
      status = 'warning';
    } else if (step.shouldPass === 'skip') {
      status = 'skipped';
    }

    logger.info({
      stepName: step.stepName,
      status,
      details: step.details
    }, { format: 'validation-step' });
  }

  // Simulate test output
  logger.info({
    testOutput: `    ✓ in-situ: should convert the example using self-activation
  1 passing (2s)`
  }, { format: 'validation-test' });

  // Simulate validation summary
  const mockSummary = {
    pluginName: 'test-plugin',
    isValid: false,
    errorCount: 1,
    warningCount: 2,
    errors: [
      'Test script not found in plugin directory'
    ],
    warnings: [
      'Consider adding integration tests',
      'README.md does not have a valid YAML front matter block'
    ]
  };

  logger.validation(mockSummary, { format: 'validation-summary' });

  return mockSummary.isValid;
}

// CLI execution
if (require.main === module) {
  demonstrateValidationFormatters().then(success => {
    console.log(`\nValidation formatter demo ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation formatter demo crashed:', error.message);
    process.exit(1);
  });
}

module.exports = { demonstrateValidationFormatters };