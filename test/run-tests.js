// test/run-tests.js
const path = require('path');
const yaml = require('js-yaml'); 

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

// Define a mapping for CLI arguments to imported test cases
const allTestGroups = {
  'config': require('./test-cases/config-command.test-cases.js').testCases,
  'convert': require('./test-cases/convert-command.test-cases.js').testCases,
  'generate': require('./test-cases/generate-command.test-cases.js').testCases,
  'plugin-create': require('./test-cases/plugin-create-command.test-cases.js').testCases,
  'advanced-features': require('./test-cases/advanced-features.test-cases.js').testCases,
};

function printTestHelp() {
    console.log("\nUsage for selective test execution:");
    console.log("  node test/run-tests.js [category1] [category2] ...");
    console.log("  (or via npm: npm test -- [category1] [category2] ...)");
    console.log("\nIf no categories are specified, all tests will run.");
    console.log("\nAvailable categories:");
    Object.keys(allTestGroups).forEach(key => {
        console.log(`  - ${key}`);
    });
    console.log("\nExample:");
    console.log("  node test/run-tests.js config convert");
    console.log("  npm test -- convert plugin-create\n");
}

// --- Main Test Runner ---
async function runTests() {
    let allTestsPassed = true;
    let testsRun = 0;
    let testsPassed = 0;

    const keepOutput = process.argv.includes('--keep-output'); // Check for --keep-output
    
    // Parse CLI arguments for categories, excluding options like --keep-output
    const cliArgsForCategories = process.argv.slice(2).filter(
        arg => !arg.startsWith('--') && arg !== 'test/run-tests.js' && arg !== 'run-tests.js'
    ); 
    
    if (cliArgsForCategories.length === 1 && (cliArgsForCategories[0].toLowerCase() === 'help' || cliArgsForCategories[0].toLowerCase() === 'list-categories')) {
        printTestHelp();
        process.exit(0);
    }
    
    let testCasesToExecute = [];

    if (cliArgsForCategories.length > 0) {
        console.log(`INFO: Selective test execution for categories: ${cliArgsForCategories.join(', ')}`);
        let validCategorySelected = false;
        cliArgsForCategories.forEach(categoryKey => {
            const normalizedKey = categoryKey.toLowerCase().replace(/-/g, '');
            const matchedKey = Object.keys(allTestGroups).find(k => k.toLowerCase().replace(/-/g, '') === normalizedKey);

            if (matchedKey && allTestGroups[matchedKey]) {
                testCasesToExecute.push(...allTestGroups[matchedKey]);
                validCategorySelected = true;
            } else {
                console.warn(`WARN: Unknown test category '${categoryKey}'. Skipping.`);
            }
        });

        if (!validCategorySelected && cliArgsForCategories.length > 0) { // Check if any valid category was found among args
            console.error(`ERROR: No valid test categories specified among: ${cliArgsForCategories.join(', ')}.`);
            printTestHelp();
            process.exit(1);
        }
         if (testCasesToExecute.length === 0 && validCategorySelected) { // Valid category name but group is empty
            console.log("INFO: Specified category/categories contain no tests. Nothing to run.");
            process.exit(0);
        }

    } else {
        console.log("INFO: No specific test categories provided. Running all tests.");
        testCasesToExecute = Object.values(allTestGroups).flat();
    }

    if (testCasesToExecute.length === 0) {
        console.log("No test cases found to run based on selection or availability. Ensure *.test-cases.js files are populated.");
        // Display help if no categories were specified and no tests were found overall
        if (cliArgsForCategories.length === 0) printTestHelp();
        process.exit(0);
    }

    try {
        await setupTestDirectory(TEST_OUTPUT_BASE_DIR, CREATED_PLUGINS_DIR);

        for (const testCase of testCasesToExecute) {
            testsRun++;
            console.log(`\nRunning test: ${testCase.description}`);
            let testCasePassed = true;

            if (testCase.preTestSetup) {
                try {
                    console.log("  Running pre-test setup...");
                    await testCase.preTestSetup(); 
                } catch (setupError) {
                    console.error(`  ERROR during pre-test setup: ${setupError.message}`);
                    if (setupError.stack) console.error(setupError.stack); 
                    testCasePassed = false;
                }
            }
            
            let result = { success: false, stdout: '', stderr: '', error: null };
            if(testCasePassed) { 
                result = await runCliCommand(testCase.commandArgs, CLI_SCRIPT_PATH, PROJECT_ROOT, TEST_CONFIG_PATH);
                if (!result.success && !testCase.postTestChecks) { 
                    testCasePassed = false;
                    console.error(`  RESULT: Command execution failed for: ${testCase.description}`);
                } else if (testCase.expectedOutputs && testCase.expectedOutputs.length > 0) {
                    if (!result.success) { 
                        testCasePassed = false;
                         console.error(`  RESULT: Command failed, cannot check expected PDF outputs for: ${testCase.description}`);
                    } else {
                        for (const expected of testCase.expectedOutputs) {
                            try {
                                await checkFile(TEST_OUTPUT_BASE_DIR, expected.filePath, expected.minSize);
                            } catch (checkError) {
                                console.error(`  RESULT: FAILED PDF check for ${expected.filePath}: ${checkError.message}`);
                                testCasePassed = false;
                            }
                        }
                    }
                }
            }

            if (testCase.postTestChecks) {
                if (testCasePassed || (!testCasePassed && result.error && result.error.message)) { 
                    try {
                        console.log("  Running post-test checks...");
                        await testCase.postTestChecks(TEST_OUTPUT_BASE_DIR, result);
                    } catch (postCheckError) {
                        console.error(`  RESULT: FAILED post-test check: ${postCheckError.message}`);
                        if(postCheckError.stack) console.error(postCheckError.stack);
                        testCasePassed = false;
                    }
                } else if (!testCasePassed && !(result.error && result.error.message)){ 
                     console.error(`  SKIPPING post-test checks as pre-command steps likely failed without a clear error message for: ${testCase.description}`);
                }
            }

            if (testCasePassed) {
                console.log(`  PASSED: ${testCase.description}`);
                testsPassed++;
            } else {
                console.error(`  FAILED: ${testCase.description}`);
                allTestsPassed = false;
            }
        }
    } catch (error) {
        console.error(`\nFATAL ERROR during test execution: ${error.message}`);
        if (error.stack) console.error(error.stack); 
        allTestsPassed = false;
    } finally {
        // Check for keepOutput before running cleanup. Note: process.argv check is basic.
        const finalKeepOutput = process.env.KEEP_OUTPUT === 'true' || process.argv.includes('--keep-output');
        await cleanupTestDirectory(TEST_OUTPUT_BASE_DIR, finalKeepOutput);
        
        console.log(`\n--- Test Summary ---`);
        console.log(`Total tests run: ${testsRun}`);
        console.log(`Tests passed: ${testsPassed}`);
        console.log(`Tests failed: ${testsRun - testsPassed}`);
        if (allTestsPassed && testsRun > 0) {
            console.log("All tests passed successfully! 🎉");
            process.exit(0);
        } else if (testsRun === 0 && allTestsPassed) { // allTestsPassed is true if no tests ran and no FATAL error
            console.log("No tests were executed (or matched the filter), but no errors occurred during setup/teardown.");
            process.exit(0); 
        }
        else {
            console.error("Some tests failed. ❌");
            process.exit(1);
        }
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests };
