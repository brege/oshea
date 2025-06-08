// dev/test/run-tests.js
const path = require('path');
const os = require('os'); // Added
const fs = require('fs').promises; // Added to use await fs.mkdir
const fss = require('fs'); // For synchronous existsSync if needed elsewhere or by helpers
const yaml = require('js-yaml'); // Keep if used by this file or its direct logic
const chalk = require('chalk');

const {
    readFileContent,
    checkFile,
    runCliCommand,
    setupTestDirectory,
    cleanupTestDirectory,
} = require('./test-helpers');

const {
    TEST_DIR,
    PROJECT_ROOT,
    TEST_CONFIG_PATH,
    EXAMPLES_DIR,
    CLI_SCRIPT_PATH,
    TEST_OUTPUT_BASE_DIR,
    HUGO_EXAMPLE_SOURCE_IN_EXAMPLES,
    CREATED_PLUGINS_DIR,
    FM_CV_SPEC_MD_PATH,
    LOCAL_CONFIG_DOC_MD_PATH,
} = require('./test-constants');

const { runCmModuleTests } = require('./cm-tests/run-cm-tests.js');

const allTestGroups = {
  'config': require('./test-cases/config-command.test-cases.js').testCases,
  'convert': require('./test-cases/convert-command.test-cases.js').testCases,
  'generate': require('./test-cases/generate-command.test-cases.js').testCases,
  'plugin-create': require('./test-cases/plugin-create-command.test-cases.js').testCases,
  'advanced-features': require('./test-cases/advanced-features.test-cases.js').testCases,
  'cm-module': 'cm-module', 
};

function printTestHelp() {
    console.log(chalk.bold("\nUsage for selective test execution:"));
    console.log(chalk.gray("  node test/run-tests.js [category1] [category2] ..."));
    console.log(chalk.gray("  (or via npm: npm test -- [category1] [category2] ...)"));
    console.log(chalk.bold("\nIf no categories are specified, all tests will run."));
    console.log(chalk.bold("\nAvailable categories:"));
    Object.keys(allTestGroups).forEach(key => {
        console.log(chalk.greenBright(`  - ${key}`));
    });
    console.log(chalk.bold("\nExample:"));
    console.log(chalk.gray("  node test/run-tests.js config convert"));
    console.log(chalk.gray("  npm test -- convert plugin-create cm-module\n"));
}

async function runTests() {
    const testRunStats = {
        attempted: 0,
        passed: 0,
    };
    let allTestsPassedOverall = true; 

    const keepOutput = process.argv.includes('--keep-output');
    const cliArgsForCategories = process.argv.slice(2).filter(
        arg => !arg.startsWith('--') && arg !== 'test/run-tests.js' && arg !== 'run-tests.js'
    );

    if (cliArgsForCategories.length === 1 && (cliArgsForCategories[0].toLowerCase() === 'help' || cliArgsForCategories[0].toLowerCase() === 'list-categories')) {
        printTestHelp();
        process.exit(0);
    }

    let testCasesToExecute = [];
    let runCmTestsFlag = false;

    if (cliArgsForCategories.length > 0) {
        console.log(chalk.blue(`INFO: Selective test execution for categories: ${cliArgsForCategories.join(', ')}`));
        let validCategorySelected = false;
        cliArgsForCategories.forEach(categoryKey => {
            const normalizedKey = categoryKey.toLowerCase().replace(/-/g, '');
            const matchedKey = Object.keys(allTestGroups).find(k => k.toLowerCase().replace(/-/g, '') === normalizedKey);

            if (matchedKey) {
                if (matchedKey === 'cm-module') {
                    runCmTestsFlag = true;
                    validCategorySelected = true;
                } else if (allTestGroups[matchedKey] && Array.isArray(allTestGroups[matchedKey])) {
                    testCasesToExecute.push(...allTestGroups[matchedKey]);
                    validCategorySelected = true;
                }
            } else {
                console.warn(chalk.yellow(`WARN: Unknown test category '${categoryKey}'. Skipping.`));
            }
        });

        if (!validCategorySelected && cliArgsForCategories.length > 0) {
            console.error(chalk.red(`ERROR: No valid test categories specified among: ${cliArgsForCategories.join(', ')}.`));
            printTestHelp();
            process.exit(1);
        }
        if (testCasesToExecute.length === 0 && !runCmTestsFlag && validCategorySelected) {
            console.log(chalk.blue("INFO: Specified category/categories contain no standard tests. Nothing to run from main suite."));
        }

    } else {
        console.log(chalk.blue("INFO: No specific test categories provided. Running all tests, including CM module tests."));
        testCasesToExecute = Object.values(allTestGroups)
            .filter(group => Array.isArray(group))
            .flat();
        runCmTestsFlag = true;
    }

    if (testCasesToExecute.length === 0 && !runCmTestsFlag) {
        console.log(chalk.blue("No standard test cases found to run based on selection or availability."));
        if (cliArgsForCategories.length === 0) printTestHelp();
        process.exit(0);
    }

    try {
        await setupTestDirectory(TEST_OUTPUT_BASE_DIR, CREATED_PLUGINS_DIR);
        
        const baseTestRunDirForCmModule = path.join(os.tmpdir(), `cm_module_test_base_${Date.now()}`);
        await fs.mkdir(baseTestRunDirForCmModule, { recursive: true });
        
        if (process.env.DEBUG_CM_TESTS === 'true') {
            console.log(chalk.gray(`  [CM Runner Main] Created base directory for CM module tests: ${baseTestRunDirForCmModule}`));
        }

        for (const testCase of testCasesToExecute) {
            testRunStats.attempted++;
            console.log(chalk.blue(`\nRunning test: ${testCase.description}`));
            let testCasePassed = true;

            if (testCase.preTestSetup) {
                try {
                    console.log(chalk.gray("  Running pre-test setup..."));
                    await testCase.preTestSetup(testCase);
                } catch (setupError) {
                    console.error(chalk.red(`  ERROR during pre-test setup: ${setupError.message}`));
                    if (setupError.stack) console.error(setupError.stack);
                    testCasePassed = false;
                }
            }

            let result = { success: false, stdout: '', stderr: '', error: null };
            if (testCasePassed) {
                result = await runCliCommand(testCase.commandArgs, CLI_SCRIPT_PATH, PROJECT_ROOT, TEST_CONFIG_PATH);
                if (!result.success && !testCase.postTestChecks) {
                    testCasePassed = false;
                    console.error(chalk.red(`  RESULT: Command execution failed for: ${testCase.description}`));
                } else if (testCase.expectedOutputs && testCase.expectedOutputs.length > 0) {
                    if (!result.success) {
                        testCasePassed = false;
                        console.error(chalk.red(`  RESULT: Command failed, cannot check expected PDF outputs for: ${testCase.description}`));
                    } else {
                        for (const expected of testCase.expectedOutputs) {
                            try {
                                await checkFile(TEST_OUTPUT_BASE_DIR, expected.filePath, expected.minSize);
                            } catch (checkError) {
                                console.error(chalk.red(`  RESULT: FAILED PDF check for ${expected.filePath}: ${checkError.message}`));
                                testCasePassed = false;
                            }
                        }
                    }
                }
            }

            if (testCase.postTestChecks) {
                if (testCasePassed || (!testCasePassed && result.error && result.error.message)) {
                    try {
                        console.log(chalk.gray("  Running post-test checks..."));
                        await testCase.postTestChecks(TEST_OUTPUT_BASE_DIR, result, testCase);
                    } catch (postCheckError) {
                        console.error(chalk.red(`  RESULT: FAILED post-test check: ${postCheckError.message}`));
                        if (postCheckError.stack) console.error(postCheckError.stack);
                        testCasePassed = false;
                    }
                } else if (!testCasePassed && !(result.error && result.error.message)) {
                    console.error(chalk.yellow(`  SKIPPING post-test checks as pre-command steps likely failed without a clear error message for: ${testCase.description}`));
                }
            }

            if (testCase.postTestCleanup) {
                try {
                    console.log(chalk.gray("  Running post-test cleanup..."));
                    await testCase.postTestCleanup(testCase);
                } catch (cleanupError) {
                    console.warn(chalk.yellow(`  WARN: Error during post-test cleanup for "${testCase.description}": ${cleanupError.message}`));
                }
            }

            if (testCasePassed) {
                console.log(chalk.green(`  PASSED: ${testCase.description}`));
                testRunStats.passed++;
            } else {
                console.error(chalk.red(`  FAILED: ${testCase.description}`));
                allTestsPassedOverall = false;
            }
        }

        if (runCmTestsFlag) {
            console.log(`[DEBUG run-tests.js] About to call runCmModuleTests. baseTestRunDirForCmModule is: ${baseTestRunDirForCmModule}`);
            if (typeof baseTestRunDirForCmModule === 'undefined') {
                console.error(chalk.redBright.bold("[CRITICAL DEBUG run-tests.js] baseTestRunDirForCmModule IS UNDEFINED before calling runCmModuleTests!"));
            }
            // ** THE FIX IS HERE **
            const cmModuleSuccessOverall = await runCmModuleTests(testRunStats, baseTestRunDirForCmModule); 
            if (!cmModuleSuccessOverall) {
                allTestsPassedOverall = false;
            }
        }

    } catch (error) {
        console.error(chalk.red(`\nFATAL ERROR during test execution: ${error.message}`));
        if (error.stack) console.error(error.stack);
        allTestsPassedOverall = false;
    } finally {
        const finalKeepOutput = process.env.KEEP_OUTPUT === 'true' || process.argv.includes('--keep-output');
        await cleanupTestDirectory(TEST_OUTPUT_BASE_DIR, finalKeepOutput);

        console.log(chalk.bold.inverse("\n--- Test Summary ---"));
        console.log(chalk.blue(`Total tests attempted (incl. CM module suites as groups): ${testRunStats.attempted}`));
        console.log(chalk.green(`Total tests passed: ${testRunStats.passed}`));
        const failedCount = testRunStats.attempted - testRunStats.passed;
        if (failedCount > 0) {
            console.log(chalk.red(`Total tests failed: ${failedCount}`));
        }

        if (allTestsPassedOverall && testRunStats.attempted > 0) {
            console.log(chalk.green.bold("All tests passed successfully! 🎉"));
            process.exit(0);
        } else if (testRunStats.attempted === 0 && allTestsPassedOverall) {
            console.log(chalk.blue("No tests were executed (or matched the filter), but no errors occurred."));
            process.exit(0);
        } else {
            console.error(chalk.red.bold("Some tests failed. ❌"));
            process.exit(1);
        }
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests }; // Ensure it's exported if other scripts might require it.
