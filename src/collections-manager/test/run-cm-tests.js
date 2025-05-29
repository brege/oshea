// dev/src/collections-manager/test/run-cm-tests.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const chalk = require('chalk');

// Import test suites
const { runAddTests } = require('./add.test.js');
const { runListTests } = require('./list.test.js');
const { runEnableTests } = require('./enable.test.js');
const { runDisableTests } = require('./disable.test.js');
const { runRemoveTests } = require('./remove.test.js');
const { runUpdateTests } = require('./update.test.js');
const { runArchetypeTests } = require('./archetype.test.js'); // Added

// Import global setup/cleanup from helpers if needed, or manage here
const { TEST_COLL_ROOT_BASE } = require('./test-helpers.js');

// Global test statistics
const testRunStats = {
    attempted: 0,
    passed: 0,
};

async function runAllTests() {
    console.log(chalk.bold.inverse(" Starting Collections Manager Tests... "));

    // Global setup: Ensure a clean base directory for all test runs
    if (fss.existsSync(TEST_COLL_ROOT_BASE)) {
        console.log(chalk.gray(`  Cleaning up base test directory: ${TEST_COLL_ROOT_BASE}`));
        await fs.rm(TEST_COLL_ROOT_BASE, { recursive: true, force: true });
    }
    await fs.mkdir(TEST_COLL_ROOT_BASE, { recursive: true });
    console.log(chalk.gray(`  Created base test directory: ${TEST_COLL_ROOT_BASE}`));

    // Define the order of test suite execution
    const testSuites = [
        { name: "Add Command Tests", runner: runAddTests },
        { name: "List Command Tests", runner: runListTests },
        { name: "Enable Command Tests", runner: runEnableTests },
        { name: "Disable Command Tests", runner: runDisableTests },
        { name: "Remove Command Tests", runner: runRemoveTests },
        { name: "Update Command Tests", runner: runUpdateTests },
        { name: "Archetype Command Tests", runner: runArchetypeTests }, // Added
    ];

    for (const suite of testSuites) {
        try {
            console.log(chalk.cyanBright.bold(`\n--- Running Suite: ${suite.name} ---`));
            await suite.runner(testRunStats);
        } catch (error) {
            console.error(chalk.red.bold(`  FATAL ERROR during suite ${suite.name}:`), error);
        }
    }

    console.log(chalk.bold.inverse("\n--- Test Summary ---"));
    console.log(chalk.blue(`Tests attempted: ${testRunStats.attempted}`));
    console.log(chalk.green(`Tests passed: ${testRunStats.passed}`));
    const failedCount = testRunStats.attempted - testRunStats.passed;
    if (failedCount > 0) {
        console.log(chalk.red(`Tests failed: ${failedCount}`));
        console.error(chalk.red.bold("\nSome Collections Manager tests failed. ❌"));
        process.exit(1);
    } else {
        console.log(chalk.green.bold("\nAll Collections Manager tests passed! ✅"));
        process.exit(0);
    }
}

if (require.main === module) {
    runAllTests().catch(err => {
        console.error(chalk.red.bold("Unhandled error in test runner:"), err);
        process.exit(1);
    });
}

module.exports = { runAllTests };
