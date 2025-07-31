#!/usr/bin/env node
// test/runners/smoke/yaml-test-runner.js
// Universal YAML test runner with dynamic capability detection

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  cliPath,
  loggerPath,
  smokeTestDir,
  fileHelpersPath,
  yamlTestHelpersPath
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
  createDisplayCommand,
  validateResult,
  parseArgs,
  matchesGrep,
  listTestSuites
} = require(yamlTestHelpersPath);

class YamlTestRunner {
  constructor(yamlFilePath = null, options = {}) {
    this.yamlFilePath = yamlFilePath;
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
          if (scenario.args && (
            scenario.args.includes('{{tmpdir}}') ||
            scenario.args.includes('{{paths.')
          )) {
            this.needsWorkspace = true;
          }
          // Also check for complex validation (expect_failure, expect_not)
          if (scenario.expect_failure || scenario.expect_not) {
            this.needsWorkspace = true; // Complex validation typically needs workspace
          }
        }
      }
    }

    // Set session title based on path context
    this.sessionTitle = this.getSessionTitleFromPath();
  }

  // Get appropriate session title based on file path using registry
  getSessionTitleFromPath() {
    const { pathsConfigPath } = require('@paths');
    const yaml = require('js-yaml');
    const fs = require('fs');
    const { minimatch } = require('minimatch');

    // Load paths config and get test features
    const pathsConfig = yaml.load(fs.readFileSync(pathsConfigPath, 'utf8'));
    const testFeatures = pathsConfig.registries.tests.features;

    // Find matching pattern and return its comment
    // eslint-disable-next-line no-unused-vars
    for (const [featureName, featureConfig] of Object.entries(testFeatures)) {
      if (featureConfig.pattern && featureConfig.comment) {
        if (minimatch(this.yamlFilePath, featureConfig.pattern)) {
          return featureConfig.comment;
        }
      }
    }

    // Default fallback
    return 'YAML Test Runner';
  }

  async runTestSuite(testSuite, showMode = false) {
    // Skip entire test suite if marked with skip: true
    if (testSuite.skip) {
      if (showMode) {
        logger.info({ suiteName: `${testSuite.name} (SKIPPED)` }, { format: 'yaml-show-suite' });
      } else {
        logger.info({ suiteName: testSuite.name }, { format: 'workflow-suite' });
        logger.info({ description: testSuite.name, status: 'skipped' }, { format: 'workflow-step' });
      }
      return {
        failedCount: 0,
        passedCount: 0,
        skippedCount: 1,
        failedScenarios: []
      };
    }

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

      // Skip debug scenarios unless debug mode is enabled
      if (scenario.debug && !this.options.debug) {
        continue;
      }

      // Skip scenarios marked with skip: true
      if (scenario.skip) {
        if (!showMode) {
          const skipCommandDisplay = createDisplayCommand(
            testSuite.base_command || 'md-to-pdf',
            scenario.args,
            workspace,
            this.needsWorkspace
          );
          // Resolve test_id with inheritance: scenario.test_id || testSuite.test_id
          const resolvedTestId = scenario.test_id || testSuite.test_id;
          logger.info({
            description: scenario.description,
            command: skipCommandDisplay,
            status: 'skipped',
            test_id: resolvedTestId
          }, { format: 'workflow-step' });
        }
        continue;
      }

      // Handle breakage setup if specified in scenario
      if (scenario.breakage && this.needsWorkspace && workspace) {
        await this.handleBreakage(scenario.breakage, workspace);
      }

      // Process command arguments (with workspace isolation if needed)
      const args = this.needsWorkspace && workspace ?
        processCommandArgs(scenario.args, workspace, true) :
        scenario.args;

      const fullCommand = `node "${cliPath}" ${args}`;
      const commandDisplay = createDisplayCommand(
        testSuite.base_command || 'md-to-pdf',
        scenario.args,
        workspace,
        this.needsWorkspace
      );

      // Resolve test_id with inheritance: scenario.test_id || testSuite.test_id
      const resolvedTestId = scenario.test_id || testSuite.test_id;

      if (showMode) {
        logger.info({
          description: scenario.description,
          command: commandDisplay,
          test_id: resolvedTestId
        }, { format: 'yaml-show-scenario' });
      } else {
        // Use workflow-step format for all non-show mode output
        logger.info({
          description: scenario.description,
          command: commandDisplay,
          status: 'testing',
          test_id: resolvedTestId
        }, { format: 'workflow-step' });
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
            const validation = validateResult(result, scenario.expect, scenario.expect_not, workspace);
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
            logger.info({
              description: scenario.description,
              command: commandDisplay,
              status: 'passed',
              test_id: resolvedTestId
            }, { format: 'workflow-step' });
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
            logger.info({
              description: scenario.description,
              command: commandDisplay,
              status: 'failed',
              test_id: resolvedTestId
            }, { format: 'workflow-step' });
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
            logger.info({
              description: scenario.description,
              command: commandDisplay,
              status: 'passed',
              test_id: resolvedTestId
            }, { format: 'workflow-step' });
          } else {
            logger.info({
              description: scenario.description,
              command: commandDisplay,
              status: 'failed',
              test_id: resolvedTestId
            }, { format: 'workflow-step' });
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
            logger.info({
              description: scenario.description,
              command: commandDisplay,
              status: 'failed',
              test_id: resolvedTestId
            }, { format: 'workflow-step' });
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

    const passedCount = results.filter(r => r.success).length;
    const skippedCount = scenarios.length - results.length; // Scenarios that were skipped at step level

    return {
      suiteName: testSuite.name,
      success: failedScenarios.length === 0,
      results,
      failedCount: failedScenarios.length,
      passedCount,
      skippedCount: skippedCount,
      failedScenarios
    };
  }

  // Handle breakage setup for scenarios that need broken plugins
  async handleBreakage(breakageConfig, workspace) {
    const { createDummyPluginPath } = require('@paths');
    const { createDummyPlugin } = require(createDummyPluginPath);

    const plugin = breakageConfig.plugin;
    const type = breakageConfig.type;
    const collection = breakageConfig.collection;

    if (!plugin || !type) {
      throw new Error('Breakage config requires both plugin and type properties');
    }

    // Determine destination directory - for collection creation we put it in tmpdir (outdir)
    const destinationDir = collection ?
      path.join(workspace.outdir, collection) :
      workspace.outdir;

    await createDummyPlugin(plugin, {
      destinationDir,
      baseFixture: 'valid-plugin',
      breakage: [type]
    });

    logger.debug(`Created broken plugin '${plugin}' with breakage '${type}' in ${destinationDir}`, { format: 'workflow-debug' });
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
        // During multi-file processing, quietly skip files with no grep matches
        // Only show error if processing a single file
        if (this.options.isMultiFile) {
          logger.debug(`No test suites match grep pattern "${grepPattern}" in ${path.basename(this.yamlFilePath)}, skipping.`);
          return true; // Success, but no work to do
        } else {
          logger.error({ message: `No test suites match grep pattern "${grepPattern}". Use --list to see available test suites, or try a different pattern.` }, { format: 'workflow-warning' });
          return false;
        }
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
          logger.error(
            `Block "${targetBlock}" not found in ${availableOptions}. Use --list to see available blocks.`,
            { format: 'workflow-warning' }
          );
          return false;
        }
      }
    }

    if (showMode) {
      logger.info({ title: this.sessionTitle }, { format: 'yaml-show-session' });
    } else {
      logger.info({ title: this.sessionTitle }, { format: 'workflow-header' });
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
    } else if (arg === '--debug') {
      options.debug = true;
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
    // Default to all manifest files in smoke directory if no YAML files specified
    yamlFiles = findFilesArray([path.join(smokeTestDir, '*.manifest.yaml')], {
      filter: (name) => name.endsWith('.yaml')
    });
  }

  if (yamlFiles.length === 0) {
    logger.error({ message: 'No YAML files found. Specify YAML files or glob patterns.' }, { format: 'workflow-warning' });
    process.exit(1);
  }

  const { showMode, listMode, grepPattern, targetBlock } = parseArgs(filteredArgs);

  if (listMode) {
    // List mode: show all test suites from all YAML files
    logger.info({ message: `Found ${yamlFiles.length} YAML file(s):` }, { format: 'workflow-list' });
    for (const yamlFile of yamlFiles) {
      logger.info({ message: `=== ${path.basename(yamlFile)} ===` }, { format: 'workflow-list' });
      const runner = new YamlTestRunner(yamlFile, options);
      runner.listTests();
      logger.info({ message: '' }, { format: 'workflow-list' });
    }
  } else {
    // Run mode: execute tests from all YAML files sequentially
    (async () => {
      let allSuccess = true;

      for (const yamlFile of yamlFiles) {
        const runnerOptions = { ...options, isMultiFile: yamlFiles.length > 1 };
        const runner = new YamlTestRunner(yamlFile, runnerOptions);
        try {
          const success = await runner.runAllTests(showMode, targetBlock, grepPattern);
          if (!success) allSuccess = false;
        } catch (error) {
          logger.error({ message: `YAML test runner crashed on ${yamlFile}: ${error.message}`, stack: error.stack }, { format: 'workflow-warning' });
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

