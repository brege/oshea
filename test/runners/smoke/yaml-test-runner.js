#!/usr/bin/env node
// test/runners/smoke/yaml-test-runner.js
// Universal YAML test runner for both Level 3 (smoke) and Level 4 (workflow) tests

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  cliPath,
  loggerPath,
  yamlTestHelpersPath,
  smokeTestsManifestPath,
  fileHelpersPath
} = require('@paths');
const { findFilesArray, isGlobPattern } = require(fileHelpersPath);
const logger = require(loggerPath);
const {
  executeCommand,
  executeCommandWithColors,
  validators,
  discoverers,
  TestWorkspace,
  expandScenarios,
  processCommandArgs,
  validateResult,
  parseArgs,
  matchesGrep,
  listTestSuites
} = require(yamlTestHelpersPath);

const WORKFLOW_TESTS_FILE = path.join(__dirname, 'workflow-tests.yaml');

class YamlTestRunner {
  constructor(yamlFilePath = null, options = {}) {
    this.yamlFilePath = yamlFilePath || smokeTestsManifestPath; // Default to smoke tests for backward compatibility
    this.options = options;

    // Auto-detect capabilities from YAML content (will be set in runAllTests)
    this.needsWorkspace = false;
    this.hasDiscovery = false;
    this.sessionTitle = 'YAML Test Runner';
  }

  // Auto-detect YAML capabilities to determine required features
  detectCapabilities(testSuites) {
    for (const suite of testSuites) {
      // Check if any suite uses discovery
      if (suite.discovery) {
        this.hasDiscovery = true;
      }

      // Check if any scenario uses workspace variables
      if (suite.scenarios) {
        for (const scenario of suite.scenarios) {
          if (scenario.args && (scenario.args.includes('${OUTDIR}') || scenario.args.includes('${COLL_ROOT}'))) {
            this.needsWorkspace = true;
          }
          // Also check for complex validation (expect_failure, expect_not)
          if (scenario.expect_failure || scenario.expect_not) {
            this.needsWorkspace = true; // Complex validation typically needs workspace
          }
        }
      }
    }

    // Set appropriate session title based on detected level
    if (this.needsWorkspace) {
      this.sessionTitle = 'Level 4 Workflow Tests';
    } else if (this.hasDiscovery) {
      this.sessionTitle = 'Level 3 CLI Smoke Tests';
    } else {
      this.sessionTitle = path.basename(this.yamlFilePath, '.yaml') + ' Tests';
    }
  }

  async runTestSuite(testSuite, showMode = false) {
    if (showMode) {
      logger.info({ suiteName: testSuite.name }, { format: 'yaml-show-suite' });
    } else {
      logger.info({ suiteName: testSuite.name }, { format: 'workflow-suite' });
    }

    // Setup workspace isolation if needed (auto-detected)
    let workspace = null;
    if (this.needsWorkspace) {
      workspace = new TestWorkspace(
        this.options.basePath,
        this.options.outdir,
        this.options.collRoot
      );
      workspace.setup();
    }

    // Use appropriate scenario processing (auto-detected)
    const scenarios = this.hasDiscovery ? expandScenarios(testSuite) : testSuite.scenarios;
    const results = [];
    let failedScenarios = [];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];

      // Process command arguments (with workspace isolation if needed)
      const args = this.needsWorkspace && workspace ?
        processCommandArgs(scenario.args, workspace, true) :
        scenario.args;

      const fullCommand = `node "${cliPath}" ${args}`;
      const commandDisplay = `${testSuite.base_command || 'md-to-pdf'} ${scenario.args}`.trim();

      if (showMode) {
        logger.info({ description: scenario.description, command: commandDisplay }, { format: 'yaml-show-scenario' });
      } else {
        // Use workflow-step format for all non-show mode output
        logger.info({ command: commandDisplay, status: 'testing' }, { format: 'workflow-step' });
      }

      // Debug instrumentation for complex tests
      if (this.needsWorkspace) {
        logger.debug(`Executing command: ${fullCommand}`, { format: 'workflow-debug' });
      }

      try {
        const result = await (showMode ? executeCommandWithColors(fullCommand) : executeCommand(fullCommand));
        let testPassed = true;
        let failureReason = null;

        // Use appropriate validation based on scenario complexity
        if (scenario.expect_failure || scenario.expect_not || (scenario.expect && scenario.expect.executes === false)) {
          // Complex validation (workflow-style)
          if (scenario.expect && scenario.expect.executes === false) {
            testPassed = false;
            failureReason = 'Expected command to fail but it succeeded';
          } else if (scenario.expect_failure) {
            testPassed = false;
            failureReason = 'Expected command to fail but it succeeded';
          } else {
            const validation = validateResult(result, scenario.expect, scenario.expect_not);
            testPassed = validation.testPassed;
            failureReason = validation.failureReason;
          }
        } else {
          // Simple validation (smoke-style)
          const expectType = Object.keys(scenario.expect)[0];
          const expectValue = scenario.expect[expectType];
          const validator = validators[expectType];

          if (!validator) {
            throw new Error(`Unknown expect type: ${expectType}`);
          }

          if (!validator(expectValue)(result.stdout)) {
            testPassed = false;
            failureReason = `Validation failed for expect.${expectType}`;
          }
        }

        if (showMode) {
          logger.info({ result }, { format: 'yaml-show-output' });
        }

        if (testPassed) {
          if (!showMode) {
            logger.info({ command: commandDisplay, status: 'passed' }, { format: 'workflow-step' });
          }
          results.push({ scenario: scenario.description, passed: true });
        } else {
          const failure = {
            command: commandDisplay,
            scenario: scenario.description,
            reason: failureReason,
            suite: testSuite.name
          };
          failedScenarios.push(failure);
          results.push({ scenario: scenario.description, passed: false, failure });

          if (!showMode) {
            logger.info({ command: commandDisplay, status: 'failed' }, { format: 'workflow-step' });
          }
        }

      } catch (error) {
        // Handle expected failures for complex tests
        if ((scenario.expect && scenario.expect.executes === false) || scenario.expect_failure) {
          let testPassed = true;
          let failureReason = null;

          if (scenario.expect_failure) {
            const outputToCheck = error.stdout || error.stderr || error.message;
            const mockResult = { stdout: outputToCheck };
            const validation = validateResult(mockResult, scenario.expect_failure);
            testPassed = validation.testPassed;
            failureReason = validation.failureReason;
          }

          if (testPassed) {
            logger.info({ command: commandDisplay, status: 'passed' }, { format: 'workflow-step' });
          } else {
            logger.info({ command: commandDisplay, status: 'failed' }, { format: 'workflow-step' });
            failedScenarios.push({
              suite: testSuite.name,
              scenario: scenario.description,
              command: commandDisplay,
              reason: failureReason
            });
          }

          results.push({ scenario, success: testPassed, reason: failureReason });
        } else {
          // Unexpected failure
          if (showMode) {
            logger.info({ error }, { format: 'yaml-show-error' });
          } else {
            logger.info({ command: commandDisplay, status: 'failed' }, { format: 'workflow-step' });
          }

          const failure = {
            command: commandDisplay,
            scenario: scenario.description,
            reason: error.message.split('\n')[0],
            stderr: error.stderr,
            suite: testSuite.name
          };
          failedScenarios.push(failure);
          results.push({ scenario: scenario.description, passed: false, failure });
        }
      }

      // Add separator between scenarios in showMode (but not after the last one)
      if (showMode && i < scenarios.length - 1) {
        logger.info({}, { format: 'yaml-show-separator' });
      }
    }

    // Clean up workspace after test suite completion (workflow tests only)
    if (workspace) {
      workspace.teardown();
    }

    return {
      suiteName: testSuite.name,
      success: failedScenarios.length === 0,
      results,
      failedCount: failedScenarios.length,
      failedScenarios
    };
  }

  async runAllTests(showMode = false, targetBlock = null, grepPattern = null) {
    // Use the yamlFilePath set in constructor
    const yamlContent = fs.readFileSync(this.yamlFilePath, 'utf8');
    const testSuites = yaml.loadAll(yamlContent).filter(doc => doc && doc.name);

    // Auto-detect YAML capabilities
    this.detectCapabilities(testSuites);

    let suitesToRun = testSuites;

    // Apply grep filtering first
    if (grepPattern) {
      suitesToRun = testSuites.filter(suite => matchesGrep(grepPattern, suite));
      if (suitesToRun.length === 0) {
        logger.error(`No test suites match grep pattern "${grepPattern}".`);
        logger.error('Use --list to see available test suites, or try a different pattern.');
        return false;
      }
    }

    // Then apply target block filtering
    if (targetBlock) {
      const blockNum = parseInt(targetBlock);
      if (!isNaN(blockNum) && blockNum > 0 && blockNum <= suitesToRun.length) {
        suitesToRun = [suitesToRun[blockNum - 1]];
      } else {
        const foundSuite = suitesToRun.find(suite =>
          suite.name.toLowerCase().includes(targetBlock.toLowerCase())
        );
        if (foundSuite) {
          suitesToRun = [foundSuite];
        } else {
          const availableOptions = grepPattern ?
            `grep-filtered results (${suitesToRun.length} suites)` :
            'available blocks';
          console.error(`Block "${targetBlock}" not found in ${availableOptions}. Use --list to see available blocks.`);
          return false;
        }
      }
    }

    if (showMode) {
      logger.info({ title: this.sessionTitle }, { format: 'yaml-show-session' });
    } else {
      logger.info('', { format: 'workflow-header' });
    }

    // Run test suites sequentially for clean output
    const allResults = [];
    let allFailedScenarios = [];

    for (const testSuite of suitesToRun) {
      const result = await this.runTestSuite(testSuite, showMode);
      allResults.push(result);
      allFailedScenarios.push(...result.failedScenarios);
    }

    const totalFailed = allResults.reduce((sum, result) => sum + result.failedCount, 0);

    // Display final results using structured data
    if (this.needsWorkspace) {
      logger.info({
        suiteCount: suitesToRun.length,
        failedScenarios: allFailedScenarios
      }, { format: 'workflow-results' });
    } else {
      logger.info({
        allResults,
        totalFailed
      }, { format: 'workflow-results' });
    }

    return totalFailed === 0;
  }

  listTests() {
    listTestSuites(this.yamlFilePath);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse arguments for the new generalized approach
  let yamlInputs = [];
  let options = {};
  const filteredArgs = [];

  // Extract YAML files/globs and CLI options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--coll-root' && i + 1 < args.length) {
      options.collRoot = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--outdir' && i + 1 < args.length) {
      options.outdir = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--base-path' && i + 1 < args.length) {
      options.basePath = args[i + 1];
      i++; // Skip next arg
    } else if (!arg.startsWith('--') && (arg.endsWith('.yaml') || isGlobPattern(arg))) {
      // Collect all YAML files and glob patterns
      yamlInputs.push(arg);
    } else {
      // Pass through other arguments
      filteredArgs.push(arg);
    }
  }

  // Expand YAML inputs using file-helpers
  let yamlFiles = [];
  if (yamlInputs.length > 0) {
    yamlFiles = findFilesArray(yamlInputs, {
      filter: (name) => name.endsWith('.yaml')
    });
  } else {
    // Backward compatibility: determine default YAML file from script name
    const scriptName = path.basename(process.argv[1]);
    if (scriptName.includes('workflow')) {
      yamlFiles = [WORKFLOW_TESTS_FILE];
    } else {
      yamlFiles = [smokeTestsManifestPath];
    }
  }

  if (yamlFiles.length === 0) {
    console.error('No YAML files found. Specify YAML files or glob patterns.');
    process.exit(1);
  }

  const { showMode, listMode, grepPattern, targetBlock } = parseArgs(filteredArgs, {
    supportsYamlFile: false // No longer needed - YAML files are extracted above
  });

  if (listMode) {
    // List mode: show all test suites from all YAML files
    console.log(`\nFound ${yamlFiles.length} YAML file(s):\n`);
    for (const yamlFile of yamlFiles) {
      console.log(`=== ${path.basename(yamlFile)} ===`);
      const runner = new YamlTestRunner(yamlFile, options);
      runner.listTests();
      console.log('');
    }
  } else {
    // Run mode: execute tests from all YAML files sequentially
    (async () => {
      let allSuccess = true;

      for (const yamlFile of yamlFiles) {
        const runner = new YamlTestRunner(yamlFile, options);
        try {
          const success = await runner.runAllTests(showMode, targetBlock, grepPattern);
          if (!success) allSuccess = false;
        } catch (error) {
          console.error(`YAML test runner crashed on ${yamlFile}:`, error.message);
          console.error('Stack trace:', error.stack);
          allSuccess = false;
        }
      }

      process.exit(allSuccess ? 0 : 1);
    })();
  }
}

module.exports = {
  YamlTestRunner,
  validators,
  discoverers
};
