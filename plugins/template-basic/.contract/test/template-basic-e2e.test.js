// plugins/template-basic/.contract/test/template-basic-e2e.test.js

const { expect } = require('chai');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = process.cwd();
const HELPERS_PATH = path.join(PROJECT_ROOT, 'test', 'shared', 'test-helpers.js');

const {
    runCliCommand,
    setupTestDirectory,
    cleanupTestDirectory,
    checkFile,
} = require(HELPERS_PATH);

// Corrected: The plugin root is two levels up from .contract/test/
const PLUGIN_ROOT = path.resolve(__dirname, '../../');
const PLUGIN_NAME = path.basename(PLUGIN_ROOT);

const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', `${PLUGIN_NAME}-plugin-e2e`);
const CLI_PATH = path.join(PROJECT_ROOT, 'cli.js');
const EXAMPLE_MD = path.join(PLUGIN_ROOT, `${PLUGIN_NAME}-example.md`);
const EXPECTED_PDF_FILENAME = `${PLUGIN_NAME}-example.pdf`;
const MIN_PDF_SIZE = 1000; // Minimum size in bytes for a valid PDF

describe(`E2E Test for ${PLUGIN_NAME} Plugin`, function() {
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

    it('should successfully convert its own example markdown file', async () => {
        const commandArgs = [
            'convert',
            EXAMPLE_MD,
            '--plugin', PLUGIN_ROOT, // Use the correct, absolute path to the plugin directory
            '--outdir', TEST_OUTPUT_DIR,
            '--filename', EXPECTED_PDF_FILENAME,
            '--no-open', // Prevent opening the PDF viewer during test
        ];

        // console.log(`\n  Running command: md-to-pdf ${commandArgs.join(' ')}`);
        const result = await runCliCommand(commandArgs, CLI_PATH, PROJECT_ROOT);

        if (!result.success) {
            const errorDetails = result.stderr || (result.error ? result.error.message : 'Unknown error');
            throw new Error(`CLI command failed for ${PLUGIN_NAME}:\n${errorDetails}`);
        }

        // Verify the PDF was created and is not empty
        await checkFile(TEST_OUTPUT_DIR, EXPECTED_PDF_FILENAME, MIN_PDF_SIZE);

        // Optional: More specific checks can be added here if needed,
        // but for a basic E2E, existence and size are often sufficient.
        // console.log(`  Successfully created and verified: ${EXPECTED_PDF_FILENAME}`);
    });
});

