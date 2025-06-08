// dev/test/cm-tests/run-cm-tests.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const chalk = require('chalk');

// Import test suites
const { runAddTests } = require('./add.test.js');
const { runListTests } = require('./list.test.js');
const { runEnableTests } = require('./enable.test.js');
const { runDisableTests } = require('./disable.test.js');
const { runRemoveTests } = require('./remove.test.js');
const { runUpdateTests } = require('./update.test.js'); 
const { runArchetypeTests } = require('./archetype.test.js');

async function runCmModuleTests(parentTestRunStats, baseTestRunDirForCmModule) {
    console.log(chalk.bold.cyanBright("\n===== Starting CollectionsManager Module Tests ====="));

    // Base directory for this specific CM module test run is already created by the main runner
    // and passed as baseTestRunDirForCmModule. No need to create another one here.
    if (process.env.DEBUG_CM_TESTS === 'true') {
        console.log(chalk.gray(`  [CM Runner] Using base directory for CM module tests: ${baseTestRunDirForCmModule}`));
    }

    const testSuites = [
        { name: "CM Add Command Logic Tests", runner: runAddTests },
        { name: "CM List Command Logic Tests", runner: runListTests },
        { name: "CM Enable Command Logic Tests", runner: runEnableTests },
        { name: "CM Disable Command Logic Tests", runner: runDisableTests },
        { name: "CM Remove Command Logic Tests", runner: runRemoveTests },
        { name: "CM Update Command Logic Tests", runner: runUpdateTests },
        { name: "CM Archetype Command Logic Tests", runner: runArchetypeTests },
    ];

    let cmModuleOverallSuccess = true;

    for (const suite of testSuites) {
        try {
            console.log(chalk.cyanBright.bold(`\n--- Running CM Suite: ${suite.name} ---`));
            // Pass baseTestRunDirForCmModule to each suite runner
            await suite.runner(parentTestRunStats, baseTestRunDirForCmModule);
        } catch (error) {
            console.error(chalk.red.bold(`  FATAL ERROR during CM suite ${suite.name}:`), error);
            cmModuleOverallSuccess = false;
            // FIX 2: Removed parentTestRunStats.attempted++;
            // The individual test function inside the suite runner already increments this.
        }
    }

    // Cleanup of baseTestRunDirForCmModule is handled by the main test runner (dev/test/run-tests.js)
    console.log(chalk.bold.cyanBright("===== Finished CollectionsManager Module Tests ====="));
    return cmModuleOverallSuccess;
}

module.exports = { runCmModuleTests };
