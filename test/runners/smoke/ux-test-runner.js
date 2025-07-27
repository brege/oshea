#!/usr/bin/env node
// test/runners/smoke/ux-test-runner.js
// UX/Visual validation test runner - captures and displays CLI output for visual inspection

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const yaml = require('js-yaml');
const { cliPath, projectRoot, loggerPath } = require('@paths');
const logger = require(loggerPath);

// Enhanced command execution that preserves colors and captures all output
function executeCommandWithColors(command) {
  return new Promise((resolve, reject) => {
    exec(command, {
      env: { ...process.env, FORCE_COLOR: '1' }, // Ensure colors are preserved
      maxBuffer: 1024 * 1024 // 1MB buffer for large outputs
    }, (error, stdout, stderr) => {
      // Don't reject on non-zero exit codes for UX testing - we want to see the output
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: error ? error.code : 0,
        error: error ? error.message : null
      });
    });
  });
}

// Discovery functions (reuse from smoke-test-runner.js)
const discoverers = {
  directory_scan: (config) => {
    const scanPath = path.resolve(projectRoot, config.source);
    return fs.readdirSync(scanPath, { withFileTypes: true })
      .filter(dirent => {
        if (config.filter === 'directories') return dirent.isDirectory();
        if (config.filter === 'files') return dirent.isFile();
        return true;
      })
      .map(dirent => dirent.name)
      .sort();
  }
};

// Expand scenarios with discovery
function expandScenarios(testSuite) {
  if (!testSuite.discovery) {
    return testSuite.scenarios;
  }

  const discoverer = discoverers[testSuite.discovery.type];
  if (!discoverer) {
    throw new Error(`Unknown discovery type: ${testSuite.discovery.type}`);
  }

  const items = discoverer(testSuite.discovery);
  const expandedScenarios = [];

  for (const item of items) {
    for (const scenarioTemplate of testSuite.scenarios) {
      const scenario = {
        description: scenarioTemplate.description.replace('{item}', item),
        args: scenarioTemplate.args.replace('{item}', item),
        expect: scenarioTemplate.expect,
        visual_check: scenarioTemplate.visual_check
      };
      expandedScenarios.push(scenario);
    }
  }

  return expandedScenarios;
}

// Visual test suite runner - captures and displays output
async function runVisualTestSuite(testSuite) {
  const scenarios = expandScenarios(testSuite);
  const results = [];

  // Display test suite header
  logger.info('\n' + '='.repeat(80));
  logger.info(`${testSuite.name}`);
  if (testSuite.visual_focus) {
    logger.info(`Focus: ${testSuite.visual_focus}`);
  }
  logger.info('='.repeat(80));

  for (const scenario of scenarios) {
    const fullCommand = `node "${cliPath}" ${scenario.args}`;
    const commandDisplay = `${testSuite.base_command || 'md-to-pdf'} ${scenario.args}`.trim();

    // Display scenario header
    logger.info('\n' + '-'.repeat(60));
    logger.info(`${scenario.description}`);
    logger.info(`Command: ${commandDisplay}`);
    if (scenario.visual_check) {
      logger.info(`Expected: ${scenario.visual_check}`);
    }
    logger.info('-'.repeat(60));

    try {
      const result = await executeCommandWithColors(fullCommand);

      // Display the actual output with preserved colors
      logger.info('\nOUTPUT:');
      if (result.stdout) {
        // Use raw console.log to preserve ANSI colors
        console.log(result.stdout); // lint-skip-line no-console
      }

      if (result.stderr) {
        logger.warn('\nSTDERR:');
        console.log(result.stderr); // lint-skip-line no-console
      }

      if (result.error && result.exitCode !== 0) {
        logger.warn(`\nExit Code: ${result.exitCode}`);
        logger.warn(`Error: ${result.error}`);
      }

      results.push({
        scenario: scenario.description,
        command: commandDisplay,
        success: result.exitCode === 0,
        hasOutput: result.stdout.length > 0,
        hasStderr: result.stderr.length > 0
      });

    } catch (error) {
      logger.error(`\nFailed to execute: ${error.message}`);
      results.push({
        scenario: scenario.description,
        command: commandDisplay,
        success: false,
        error: error.message
      });
    }
  }

  return {
    suiteName: testSuite.name,
    results,
    totalScenarios: results.length
  };
}

// Main UX test runner
async function runUXTests(yamlFile = null) {
  const yamlPath = yamlFile || path.join(__dirname, 'ux-tests.yaml');

  if (!fs.existsSync(yamlPath)) {
    logger.error(`UX test file not found: ${yamlPath}`);
    process.exit(1);
  }

  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  const testSuites = yaml.loadAll(yamlContent);

  // Display header
  logger.info('\n' + '='.repeat(60));
  logger.info('MD-to-PDF UX/Visual Validation Tests');
  logger.info('='.repeat(60));
  logger.info('\nPurpose: Visual inspection of CLI theming, formatting, and user experience');
  logger.info('Review each section for: colors, alignment, readability, error handling');
  logger.info('');

  const allResults = [];

  // Run test suites sequentially for organized visual output
  for (const testSuite of testSuites) {
    const result = await runVisualTestSuite(testSuite);
    allResults.push(result);
  }

  // Display summary
  const totalScenarios = allResults.reduce((sum, r) => sum + r.totalScenarios, 0);
  const totalSuites = allResults.length;

  logger.info('\n' + '='.repeat(60));
  logger.info('UX Test Run Complete');
  logger.info('='.repeat(60));
  logger.info(`\nSummary: ${totalScenarios} scenarios across ${totalSuites} test suites executed`);
  logger.info('\nVisual Review Checklist:');
  logger.info('  - Colors are consistent with gruvbox theme');
  logger.info('  - Tables have aligned headers and content');
  logger.info('  - Empty states are handled gracefully');
  logger.info('  - Error messages are clear and well-formatted');
  logger.info('  - Help output is structured and readable');
  logger.info('  - YAML syntax highlighting works correctly');
  logger.info('\nTo fix issues: Update formatters in src/utils/formatters/');
  logger.info('To test changes: Re-run this script');
  logger.info('');

  return allResults;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const yamlFile = args[0] || null;

  runUXTests(yamlFile).then(results => {
    process.exit(0);
  }).catch(error => {
    logger.error('UX test runner crashed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runUXTests,
  runVisualTestSuite,
  executeCommandWithColors
};
