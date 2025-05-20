// test/run-tests.js
const fs = require('fs').promises;
const fss = require('fs'); // Sync operations
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// --- Constants ---
const TEST_DIR = __dirname;
const PROJECT_ROOT = path.join(TEST_DIR, '..');
const TEST_CONFIG_PATH = path.join(TEST_DIR, 'config.test.yaml');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');
const CLI_SCRIPT_PATH = path.join(PROJECT_ROOT, 'cli.js');

const TEST_OUTPUT_DIR_NAME = 'test_output';
const TEST_OUTPUT_BASE_DIR = path.join(TEST_DIR, TEST_OUTPUT_DIR_NAME);

const HUGO_EXAMPLE_SOURCE_IN_EXAMPLES = path.join(EXAMPLES_DIR, 'hugo-example');
const HUGO_EXAMPLE_SOURCE_IN_TEST_OUTPUT = path.join(TEST_OUTPUT_BASE_DIR, 'hugo-example-source');


// --- Test Cases ---
const testCases = [
    {
        description: "CV: Convert example CV with explicit filename",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'),
            '--plugin', 'cv', // Updated from --type
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cv.pdf',
        ],
        expectedOutputs: [
            { filePath: 'test-cv.pdf', minSize: 1000 },
        ],
    },
    {
        description: "CV: Convert example CV",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'),
            '--plugin', 'cv', // Updated from --type
            '--outdir', TEST_OUTPUT_BASE_DIR,
        ],
        expectedOutputs: [
            { filePath: 'example-curriculum-vitae.pdf', minSize: 1000 },
        ],
    },
    {
        description: "Cover Letter: Convert example cover letter with explicit filename",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cover-letter.md'),
            '--plugin', 'cover-letter', // Updated from --type
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cover-letter.pdf',
        ],
        expectedOutputs: [
            { filePath: 'test-cover-letter.pdf', minSize: 1000 },
        ],
    },
    {
        description: "Single Recipe: Convert example recipe",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-recipe.md'),
            '--plugin', 'recipe', // Updated from --type
            '--outdir', TEST_OUTPUT_BASE_DIR,
        ],
        expectedOutputs: [
            { filePath: 'example-recipe-title.pdf', minSize: 1000 },
        ],
    },
    {
        description: "Recipe Book: Create recipe book from Hugo examples",
        commandArgs: [
            'generate', // Updated from 'book'
            'recipe-book', // Plugin name
            '--recipes-base-dir', HUGO_EXAMPLE_SOURCE_IN_EXAMPLES, // Specific option for recipe-book plugin
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-recipe-book.pdf',
        ],
        expectedOutputs: [
            { filePath: 'test-recipe-book.pdf', minSize: 50000 },
        ],
    },
    {
        description: "Batch Hugo PDF Export: Export each recipe from copied Hugo source",
        commandArgs: [
            'hugo-export-each',
            HUGO_EXAMPLE_SOURCE_IN_TEST_OUTPUT,
            '--base-plugin', 'recipe', // Updated from --base-type
            '--hugo-ruleset', 'default_rules',
        ],
        expectedOutputs: [
            { filePath: path.join('hugo-example-source', 'recipe-one', 'recipe-one-culinary-enthusiast-2023-10-27.pdf'), minSize: 5000 }, 
            { filePath: path.join('hugo-example-source', 'recipe-two', 'recipe-two-artisan-baker-inspired-by-ken-forkish-2024-03-15.pdf'), minSize: 5000 }, 
            { filePath: path.join('hugo-example-source', 'recipe-three', 'recipe-three-culinary-explorer-2024-01-20.pdf'), minSize: 5000 }, 
        ],
        preTestSetup: async () => {
            await fs.mkdir(path.dirname(HUGO_EXAMPLE_SOURCE_IN_TEST_OUTPUT), { recursive: true });
            await fs.cp(HUGO_EXAMPLE_SOURCE_IN_EXAMPLES, HUGO_EXAMPLE_SOURCE_IN_TEST_OUTPUT, { recursive: true });
            console.log(`  Copied ${HUGO_EXAMPLE_SOURCE_IN_EXAMPLES} to ${HUGO_EXAMPLE_SOURCE_IN_TEST_OUTPUT} for hugo-export-each test.`);
        }
    },
    {
        description: "Project Config: Convert CV with project-specific config override (A5 format, custom CSS)",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'), // Use a standard example CV markdown
            '--plugin', 'cv',
            '--config', path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'), // **** UPDATED PATH ****
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cv-project-override.pdf',
            '--no-open', // Important for automated tests
        ],
        expectedOutputs: [
            // The A5 format and different margins might result in a different file size
            // compared to the default Letter/A4 CVs. Min size is a basic check.
            { filePath: 'test-cv-project-override.pdf', minSize: 1000 }, // Adjust minSize if needed
        ],
        preTestSetup: async () => {
            // Ensure the test asset directory and files exist.
            const testAssetConfigPath = path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'); // **** UPDATED PATH ****
            if (!fss.existsSync(testAssetConfigPath)) {
                // This is more of a sanity check; these files should be part of the repo.
                console.error(`ERROR: Test asset config file not found: ${testAssetConfigPath}`);
                throw new Error(`Test asset config file not found: ${testAssetConfigPath}. Make sure test assets are in place.`);
            }
            // Log that we are using specific assets for this test.
            console.log(`  Using project override config: ${testAssetConfigPath}`);
        }
    },
];

// --- Helper Functions ---
async function setupTestDirectory() {
    try {
        if (fss.existsSync(TEST_OUTPUT_BASE_DIR)) {
            console.log(`Removing existing test output directory: ${TEST_OUTPUT_BASE_DIR}`);
            await fs.rm(TEST_OUTPUT_BASE_DIR, { recursive: true, force: true });
        }
        console.log(`Creating test output directory: ${TEST_OUTPUT_BASE_DIR}`);
        await fs.mkdir(TEST_OUTPUT_BASE_DIR, { recursive: true });
    } catch (error) {
        console.error(`Error setting up test directory: ${error.message}`);
        throw error;
    }
}

async function cleanupTestDirectory(keepOutput = false) {
    if (keepOutput) {
        console.log(`KEEP_OUTPUT is true. Skipping cleanup of ${TEST_OUTPUT_BASE_DIR}.`);
        return;
    }
    try {
        if (fss.existsSync(TEST_OUTPUT_BASE_DIR)) {
            console.log(`Cleaning up test output directory: ${TEST_OUTPUT_BASE_DIR}`);
            await fs.rm(TEST_OUTPUT_BASE_DIR, { recursive: true, force: true });
        }
    } catch (error) {
        console.warn(`Warning: Could not clean up test directory ${TEST_OUTPUT_BASE_DIR}: ${error.message}`);
    }
}

async function runCliCommand(argsArray) {
    // Check if the test case's arguments already include a --config option
    const hasCustomConfig = argsArray.some(arg => arg === '--config' || arg.startsWith('--config='));
    
    let command = `node "${CLI_SCRIPT_PATH}" ${argsArray.join(' ')}`;
    
    if (!hasCustomConfig) {
        // If no --config is in argsArray, append the default test config
        command += ` --config "${TEST_CONFIG_PATH}"`;
    }
    // If argsArray already has --config, we don't append the default one.

    console.log(`  Executing: ${command}`);
    try {
        const { stdout, stderr } = await execAsync(command, { cwd: PROJECT_ROOT });
        if (stdout) console.log('  stdout:\n', stdout);
        const stderrContent = stderr && stderr.trim();
        if (stderrContent) {
            console.warn('  stderr:\n', stderr);
        }
        return { success: true, stdout, stderr };
    } catch (error) { 
        console.error(`  Error executing command (cli.js likely exited with error): ${error.message}`);
        if (error.stdout && error.stdout.trim()) console.error('  stdout (on error):\n', error.stdout);
        if (error.stderr && error.stderr.trim()) console.error('  stderr (on error):\n', error.stderr);
        return { success: false, error };
    }
}

async function checkFile(baseDir, relativeFilePath, minSize) {
    const fullPath = path.join(baseDir, relativeFilePath);
    if (!fss.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
    }
    const stats = await fs.stat(fullPath);
    if (stats.size < minSize) {
        throw new Error(`File ${fullPath} is too small (${stats.size} bytes, expected >= ${minSize} bytes).`);
    }
    console.log(`  OK: File ${relativeFilePath} (at ${fullPath}) exists and size (${stats.size} bytes) is sufficient.`);
    return true;
}


// --- Main Test Runner ---
async function runTests() {
    let allTestsPassed = true;
    let testsRun = 0;
    let testsPassed = 0;

    const keepOutput = process.env.KEEP_OUTPUT === 'true' || process.argv.includes('--keep-output');

    try {
        await setupTestDirectory();

        for (const testCase of testCases) {
            testsRun++;
            console.log(`\nRunning test: ${testCase.description}`);
            let testCasePassed = true;

            if (testCase.preTestSetup) {
                try {
                    await testCase.preTestSetup();
                } catch (setupError) {
                    console.error(`  ERROR during pre-test setup: ${setupError.message}`);
                    testCasePassed = false;
                }
            }
            
            if(testCasePassed) {
                const result = await runCliCommand(testCase.commandArgs);
                if (!result.success) { 
                    testCasePassed = false;
                    // Error details already logged by runCliCommand if execAsync caught an error.
                    // If stderr had content but success was true (e.g. help text), that's not a failure here.
                    // A failure is specifically when execAsync throws.
                    console.error(`  RESULT: Command execution failed for: ${testCase.description}`);
                } else {
                    for (const expected of testCase.expectedOutputs) {
                        try {
                            await checkFile(TEST_OUTPUT_BASE_DIR, expected.filePath, expected.minSize);
                        } catch (checkError) {
                            console.error(`  RESULT: FAILED check for ${expected.filePath}: ${checkError.message}`);
                            testCasePassed = false;
                        }
                    }
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
        allTestsPassed = false;
    } finally {
        await cleanupTestDirectory(keepOutput);
        console.log(`\n--- Test Summary ---`);
        console.log(`Total tests run: ${testsRun}`);
        console.log(`Tests passed: ${testsPassed}`);
        console.log(`Tests failed: ${testsRun - testsPassed}`);
        if (allTestsPassed && testsRun > 0) {
            console.log("All tests passed successfully! 🎉");
            process.exit(0);
        } else {
            console.error("Some tests failed. ❌");
            process.exit(1);
        }
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests };
