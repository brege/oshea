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

const CREATED_PLUGINS_SUBDIR = 'created_plugins_test'; // To avoid conflict if user has 'created_plugins'
const CREATED_PLUGINS_DIR = path.join(TEST_OUTPUT_BASE_DIR, CREATED_PLUGINS_SUBDIR);


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
    { 
        description: "Custom Plugin: Convert business card example using 'business-card' plugin",
        commandArgs: [
            'convert',
            path.join(TEST_DIR, 'assets', 'example-business-card.md'), // Path to the new example markdown
            '--plugin', 'business-card',
            // Uses the default TEST_CONFIG_PATH (test/config.test.yaml) which now registers 'business-card'
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-business-card.pdf',
            '--no-open',
        ],
        expectedOutputs: [
            // Business cards are small, so minSize can be lower. Adjust if needed.
            { filePath: 'test-business-card.pdf', minSize: 500 },
        ],
        // No preTestSetup needed as files are part of the source tree
    },
    {
        description: "Math Rendering: Convert example math document",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-math.md'),
            '--plugin', 'default',
            '--outdir', TEST_OUTPUT_BASE_DIR,
            // Filename will be 'math-test-document.pdf' based on title in front matter
            '--no-open',
        ],
        expectedOutputs: [
            { filePath: 'math-test-document.pdf', minSize: 1000 }, // Adjust minSize if needed
        ],
    },
    // --- md-to-pdf plugin create Test Cases ---
    {
        description: "CLI: plugin create - Basic plugin scaffolding",
        commandArgs: ['plugin', 'create', 'scaffold-test1', '--dir', CREATED_PLUGINS_DIR],
        expectedOutputs: [], 
        postTestChecks: async (testCaseOutputDir, result) => { 
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message || 'Unknown error'}`);
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'scaffold-test1');
            if (!fss.existsSync(pluginDir)) throw new Error(`Plugin directory not created: ${pluginDir}`);

            const expectedFiles = [
                { name: 'scaffold-test1.config.yaml', contains: ["description: \"A new scaffold-test1 plugin for [purpose].\"", "handler_script: \"index.js\"", "css_files:", "- \"scaffold-test1.css\""] },
                { name: 'index.js', contains: ["class ScaffoldTest1Handler", "constructor(coreUtils)", "new coreUtils.DefaultHandler()"] },
                { name: 'scaffold-test1.css', contains: ["/* scaffold-test1/scaffold-test1.css */"] }
            ];
            for (const file of expectedFiles) {
                const filePath = path.join(pluginDir, file.name);
                await checkFile(pluginDir, file.name, 10); 
                const content = await readFileContent(filePath);
                for (const str of file.contains) {
                    if (!content.includes(str)) throw new Error(`File ${file.name} does not contain expected string: "${str}"`);
                }
            }
            if (!result.stdout || !result.stdout.includes("Plugin 'scaffold-test1' created successfully")) {
                 throw new Error(`Success message not found in stdout. Stdout: ${result.stdout}`);
            }
        }
    },
    {
        description: "CLI: plugin create - Error on existing directory without --force",
        commandArgs: ['plugin', 'create', 'scaffold-test1', '--dir', CREATED_PLUGINS_DIR], 
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (result.success) throw new Error("Command succeeded but should have failed (directory exists).");
            const stderr = result.stderr || result.error?.stderr || "";
            if (!stderr.includes("ERROR: Plugin directory") || !stderr.includes("already exists. Use --force to overwrite.")) {
                throw new Error(`Expected error message about existing directory not found in stderr. Stderr: ${stderr}`);
            }
        }
    },
    {
        description: "CLI: plugin create - Overwrite existing directory with --force",
        commandArgs: ['plugin', 'create', 'scaffold-test1', '--dir', CREATED_PLUGINS_DIR, '--force'],
        expectedOutputs: [],
        preTestSetup: async () => {
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'scaffold-test1');
            if (!fss.existsSync(pluginDir)) { 
                await fs.mkdir(pluginDir, { recursive: true });
            }
            await fs.writeFile(path.join(pluginDir, 'dummy.txt'), 'this should ideally be gone or ignored');
        },
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed unexpectedly with --force: ${result.error?.message}`);
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'scaffold-test1');
            const configFilePath = path.join(pluginDir, 'scaffold-test1.config.yaml');
            await checkFile(pluginDir, 'scaffold-test1.config.yaml', 10);
            const content = await readFileContent(configFilePath);
            if (!content.includes("description: \"A new scaffold-test1 plugin for [purpose].\"")) {
                throw new Error("Config file content incorrect after --force overwrite.");
            }
            if (!result.stdout || !result.stdout.includes("Plugin 'scaffold-test1' created successfully")) {
                 throw new Error(`Success message not found in stdout for --force. Stdout: ${result.stdout}`);
            }
             if (fss.existsSync(path.join(pluginDir, 'dummy.txt'))) {
                // This is acceptable based on current scaffolder logic (overwrite files, not dir)
                console.log("  INFO: --force did not remove extraneous 'dummy.txt' file, files were overwritten.");
            }
        }
    },
    {
        description: "CLI: plugin create - Invalid plugin name (custom validation)",
        commandArgs: ['plugin', 'create', 'bad!name', '--dir', CREATED_PLUGINS_DIR], // Using 'bad!name'
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (result.success) throw new Error("Command succeeded but should have failed (invalid name).");
            const stderr = result.stderr || result.error?.stderr || "";
            // Check for the error message from plugin_scaffolder.js, matching "bad!name"
            if (!stderr.includes("ERROR: Invalid plugin name: \"bad!name\". Name must be alphanumeric and can contain hyphens, but not start/end with them.")) {
                throw new Error(`Expected custom error message about invalid plugin name "bad!name" not found in stderr. Stderr: ${stderr}`);
            }
        }
    },
    {
        description: "CLI: plugin create - With a hyphenated name",
        commandArgs: ['plugin', 'create', 'my-hyphen-plugin', '--dir', CREATED_PLUGINS_DIR],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message}`);
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'my-hyphen-plugin');
            if (!fss.existsSync(pluginDir)) throw new Error(`Plugin directory not created: ${pluginDir}`);
            await checkFile(pluginDir, 'my-hyphen-plugin.config.yaml', 10);
            await checkFile(pluginDir, 'index.js', 10);
            await checkFile(pluginDir, 'my-hyphen-plugin.css', 10);
            const indexContent = await readFileContent(path.join(pluginDir, 'index.js'));
            if (!indexContent.includes("class MyHyphenPluginHandler")) {
                throw new Error("Generated index.js does not have correctly cased className 'MyHyphenPluginHandler'");
            }
        }
    },
];

// --- Helper Functions ---
async function readFileContent(filePath) {
    if (!fss.existsSync(filePath)) {
        throw new Error(`File not found for content check: ${filePath}`);
    }
    return fs.readFile(filePath, 'utf8');
}

async function setupTestDirectory() {
    try {
        if (fss.existsSync(TEST_OUTPUT_BASE_DIR)) {
            console.log(`Removing existing test output directory: ${TEST_OUTPUT_BASE_DIR}`);
            await fs.rm(TEST_OUTPUT_BASE_DIR, { recursive: true, force: true });
        }
        console.log(`Creating test output directory: ${TEST_OUTPUT_BASE_DIR}`);
        await fs.mkdir(TEST_OUTPUT_BASE_DIR, { recursive: true });
        // Also ensure the dedicated dir for created plugins is made if tests rely on it existing.
        // However, plugin_scaffolder.js uses recursive:true, so it can create its base if needed.
        // For clarity, we can create it here too.
        if (!fss.existsSync(CREATED_PLUGINS_DIR)) {
            await fs.mkdir(CREATED_PLUGINS_DIR, {recursive: true});
        }

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
    const hasCustomConfig = argsArray.some(arg => arg === '--config' || arg.startsWith('--config='));
    const isPluginCommand = argsArray[0] === 'plugin'; // 'plugin create' should not get default --config
    
    let command = `node "${CLI_SCRIPT_PATH}" ${argsArray.join(' ')}`;
    
    if (!hasCustomConfig && !isPluginCommand) {
        command += ` --config "${TEST_CONFIG_PATH}"`;
    }

    console.log(`  Executing: ${command}`);
    try {
        const { stdout, stderr } = await execAsync(command, { cwd: PROJECT_ROOT });
        if (stdout) console.log('  stdout:\n', stdout);
        const stderrContent = stderr && stderr.trim();
        if (stderrContent) {
            // Log stderr as warning, but don't fail the command *solely* on stderr content
            // unless execAsync itself throws (which it does for non-zero exit codes).
            console.warn('  stderr:\n', stderr);
        }
        return { success: true, stdout, stderr };
    } catch (error) { 
        // error object from execAsync contains stdout and stderr properties
        console.error(`  Error executing command (cli.js likely exited with error): ${error.message}`);
        if (error.stdout && error.stdout.trim()) console.error('  stdout (on error):\n', error.stdout);
        if (error.stderr && error.stderr.trim()) console.error('  stderr (on error):\n', error.stderr);
        return { success: false, error, stdout: error.stdout, stderr: error.stderr }; // Pass along stdout/stderr from error
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
                    console.log("  Running pre-test setup...");
                    await testCase.preTestSetup();
                } catch (setupError) {
                    console.error(`  ERROR during pre-test setup: ${setupError.message}`);
                    testCasePassed = false;
                }
            }
            
            let result = { success: false, stdout: '', stderr: '', error: null };
            if(testCasePassed) { // Only run command if pre-test setup passed
                result = await runCliCommand(testCase.commandArgs);
                if (!result.success && !testCase.postTestChecks) { 
                    // If command failed AND there's no postTestCheck to validate the failure,
                    // then it's an unexpected failure.
                    // If postTestChecks exists, it's responsible for deciding if failure was expected.
                    testCasePassed = false;
                    console.error(`  RESULT: Command execution failed for: ${testCase.description}`);
                } else if (testCase.expectedOutputs && testCase.expectedOutputs.length > 0) {
                    // This block is for PDF generation tests
                    if (!result.success) { // If command failed but was expected to produce PDFs
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
                if (testCasePassed || (!testCasePassed && result.error) ) { // Allow postTestChecks to validate expected failures
                    try {
                        console.log("  Running post-test checks...");
                        await testCase.postTestChecks(TEST_OUTPUT_BASE_DIR, result);
                         if (result.success && testCase.description.includes("Error on existing") || testCase.description.includes("Invalid plugin name")){
                            // If an error test somehow passed the command, mark test as failed.
                            // This happens if result.success was true but postTestChecks expected it to be false
                            // and didn't throw an error itself. This logic might need refinement based on how
                            // postTestChecks signals "expected failure verified".
                            // A simpler way: postTestChecks should throw if an expected failure isn't seen.
                        }
                    } catch (postCheckError) {
                        console.error(`  RESULT: FAILED post-test check: ${postCheckError.message}`);
                        if(postCheckError.stack) console.error(postCheckError.stack);
                        testCasePassed = false;
                    }
                } else if (!testCasePassed && !result.error){
                     console.error(`  SKIPPING post-test checks as pre-command steps failed for: ${testCase.description}`);
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
