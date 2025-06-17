// plugins/recipe-book/.contract/test/recipe-book-e2e.test.js

const path = require('path');
const os = require('os');
const fs = require('fs');

const PROJECT_ROOT = process.cwd();
const HELPERS_PATH = path.join(PROJECT_ROOT, 'test', 'shared', 'test-helpers.js');
const CONSTANTS_PATH = path.join(PROJECT_ROOT, 'test', 'shared', 'test-constants.js');

const {
    runCliCommand,
    setupTestDirectory,
    cleanupTestDirectory,
    checkFile,
} = require(HELPERS_PATH);

const {
    HUGO_EXAMPLE_SOURCE_IN_EXAMPLES,
} = require(CONSTANTS_PATH);

// Corrected: The plugin root is two levels up from .contract/test/
const PLUGIN_ROOT = path.resolve(__dirname, '../../');
const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', 'recipe-book-plugin-e2e');
const CLI_PATH = path.join(PROJECT_ROOT, 'cli.js');

// Use the relative path as expected by the CLI and the plugin's internal resolution.
const RECIPES_BASE_DIR_CLI_ARG = HUGO_EXAMPLE_SOURCE_IN_EXAMPLES;

const EXPECTED_PDF_FILENAME = 'test-recipe-book.pdf';
const MIN_PDF_SIZE = 50000; // Minimum size in bytes for a valid recipe book PDF

describe('Recipe Book Plugin E2E Test (Generate Command)', function() {
    this.timeout(15000); // Set a higher timeout for E2E tests

    before(async () => {
        // Ensure the test output directory exists and is clean
        await setupTestDirectory(TEST_OUTPUT_DIR);
    });

    after(async () => {
        // Clean up the test output directory unless KEEP_OUTPUT is set
        const keepOutput = process.env.KEEP_OUTPUT === 'true';
        await cleanupTestDirectory(TEST_OUTPUT_DIR, keepOutput);
    });

    it('should generate a PDF book from Hugo examples using the recipe-book plugin and produce a non-empty PDF', async () => {
        const outputPdfPath = path.join(TEST_OUTPUT_DIR, EXPECTED_PDF_FILENAME);

        const commandArgs = [
            'generate',
            PLUGIN_ROOT, // Use the correct, absolute path to the plugin directory
            '--recipes-base-dir', RECIPES_BASE_DIR_CLI_ARG, // Use the relative path here
            '--outdir', TEST_OUTPUT_DIR,
            '--filename', EXPECTED_PDF_FILENAME,
            '--no-open', // Prevent opening the PDF viewer during test
        ];

        // console.log(`\n  Running command: md-to-pdf ${commandArgs.join(' ')}`);
        const result = await runCliCommand(commandArgs, CLI_PATH, PROJECT_ROOT);

        if (!result.success) {
            throw new Error(`CLI command failed: ${result.stderr || result.error.message}`);
        }

        // Verify the PDF was created and is not empty
        await checkFile(TEST_OUTPUT_DIR, EXPECTED_PDF_FILENAME, MIN_PDF_SIZE);

        // Optional: More specific checks can be added here if needed,
        // but for a basic E2E, existence and size are often sufficient.
        console.log(`  Successfully created and verified: ${outputPdfPath}`);
    });
});

