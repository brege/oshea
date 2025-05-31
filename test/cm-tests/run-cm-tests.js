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

async function runCmModuleTests(parentTestRunStats) {
    console.log(chalk.bold.cyanBright("\n===== Starting CollectionsManager Module Tests ====="));

    const baseTestRunDirForCmModule = path.join(os.tmpdir(), `cm_module_test_base_${Date.now()}`);
    await fs.mkdir(baseTestRunDirForCmModule, { recursive: true });
    if (process.env.DEBUG_CM_TESTS === 'true') {
        console.log(chalk.gray(`  [CM Runner] Created base directory for CM module tests: ${baseTestRunDirForCmModule}`));
    }

    const testSuites = [
        { name: "CM Add Command Logic Tests", runner: runAddTests },
        { name: "CM List Command Logic Tests", runner: runListTests },
        { name: "CM Enable Command Logic Tests", runner: runEnableTests },
        { name: "CM Disable Command Logic Tests", runner: runDisableTests },
        { name: "CM Remove Command Logic Tests", runner: runRemoveTests },
        { name: "CM Update Command Logic Tests", runner: runUpdateTests },
        { name: "CM Archetype Command Logic Tests", runner: runArchetypeTests },
        // Add other suites here as they are integrated
    ];

    let cmModuleOverallSuccess = true;

    for (const suite of testSuites) {
        try {
            console.log(chalk.cyanBright.bold(`\n--- Running CM Suite: ${suite.name} ---`));
            await suite.runner(parentTestRunStats, baseTestRunDirForCmModule);
        } catch (error) {
            console.error(chalk.red.bold(`  FATAL ERROR during CM suite ${suite.name}:`), error);
            cmModuleOverallSuccess = false;
            parentTestRunStats.attempted++; 
        }
    }

    if (fss.existsSync(baseTestRunDirForCmModule)) {
        if (process.env.DEBUG_CM_TESTS === 'true') {
            console.log(chalk.gray(`  [CM Runner] Cleaning up base CM module test directory: ${baseTestRunDirForCmModule}`));
        }
        try {
            await fs.rm(baseTestRunDirForCmModule, { recursive: true, force: true });
        } catch (cleanupError) {
            if (process.env.DEBUG_CM_TESTS === 'true') {
                 console.warn(chalk.yellow(`  [CM Runner] WARN: Could not cleanup base CM module test directory ${baseTestRunDirForCmModule}: ${cleanupError.message}`));
            }
        }
    }
    console.log(chalk.bold.cyanBright("===== Finished CollectionsManager Module Tests ====="));
    return cmModuleOverallSuccess;
}

module.exports = { runCmModuleTests };
