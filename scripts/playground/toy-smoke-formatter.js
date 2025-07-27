#!/usr/bin/env node
// scripts/playground/toy-smoke-formatter.js
// Toy smoke test formatter demonstration
// Companion to formatter-playground.js for testing smoke test formatters
// lint-skip-file no-console
require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demonstrateSmokeFormatters() {
  // Display smoke test header
  logger.info('', { format: 'smoke-header' });

  // Simulate test suite 1
  logger.info({ suiteName: 'Basic Commands' }, { format: 'smoke-suite' });

  // Simulate scenarios with 1 second delays
  for (let i = 1; i <= 3; i++) {
    const command = `md-to-pdf test-${i}`;
    
    // Start test
    logger.info({ command, status: 'testing' }, { format: 'smoke-scenario' });
    
    // Wait 1 second
    await sleep(1000);
    
    // Random pass/fail for testing
    const passed = Math.random() > 0.3;
    const status = passed ? 'passed' : 'failed';
    
    logger.info({ command, status }, { format: 'smoke-scenario' });
  }

  // Simulate test suite 2
  logger.info({ suiteName: 'Plugin Commands' }, { format: 'smoke-suite' });

  for (let i = 4; i <= 5; i++) {
    const command = `md-to-pdf plugin test-${i}`;
    
    logger.info({ command, status: 'testing' }, { format: 'smoke-scenario' });
    await sleep(1000);
    
    const passed = Math.random() > 0.5;
    const status = passed ? 'passed' : 'failed';
    
    logger.info({ command, status }, { format: 'smoke-scenario' });
  }

  // Simulate warning
  logger.warn({ stderr: 'Some deprecation warning output' }, { format: 'smoke-warning' });

  // Simulate final results
  const mockResults = [
    { 
      suiteName: 'Basic Commands', 
      failedCount: 1, 
      results: [
        { scenario: 'test-1', passed: true },
        { scenario: 'test-2', passed: false },
        { scenario: 'test-3', passed: true }
      ],
      failedScenarios: [
        {
          scenario: 'Test command 2 validation',
          command: 'md-to-pdf test-2',
          reason: 'Expected output not found',
          stderr: 'command not recognized'
        }
      ]
    },
    { 
      suiteName: 'Plugin Commands', 
      failedCount: 0, 
      results: [
        { scenario: 'test-4', passed: true },
        { scenario: 'test-5', passed: true }
      ],
      failedScenarios: []
    }
  ];

  const totalFailed = mockResults.reduce((sum, r) => sum + r.failedCount, 0);

  logger.info({ 
    allResults: mockResults, 
    totalFailed 
  }, { format: 'smoke-results' });

  return totalFailed === 0;
}

// CLI execution
if (require.main === module) {
  demonstrateSmokeFormatters().then(success => {
    console.log(`\nSmoke formatter demo ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Smoke formatter demo crashed:', error.message);
    process.exit(1);
  });
}

module.exports = { demonstrateSmokeFormatters };
