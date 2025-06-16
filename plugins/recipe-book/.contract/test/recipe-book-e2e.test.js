// plugins/recipe-book/.contract/test/recipe-book-e2e.test.js

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
    runCliCommand,
    setupTestDirectory,
    cleanupTestDirectory,
    checkFile,
} = require('../../../../test/shared/test-helpers');

const {
    HUGO_EXAMPLE_SOURCE_IN_EXAMPLES,
} = require('../../../../test/shared/test-constants');

const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', 'recipe-book-plugin-e2e');
const CLI_PATH = path.join(PROJECT_ROOT, 'cli.js');

// --- START MODIFICATION ---
// Instead of creating an absolute path here, we'll pass the relative path directly
// as it's expected by the CLI and the plugin's internal resolution.
const RECIPES_BASE_DIR_CLI_ARG = HUGO_EXAMPLE_SOURCE_IN_EXAMPLES;
// --- END MODIFICATION ---

const EXPECTED_PDF_FILENAME = 'test-recipe-book.pdf';
const MIN_PDF_SIZE = 50000;

describe('Recipe Book Plugin E2E Test (Generate Command)', function() {
    this.timeout(15000);

    before(async () => {
        await setupTestDirectory(TEST_OUTPUT_DIR);
    });

    after(async () => {
        const keepOutput = process.env.KEEP_OUTPUT === 'true';
        await cleanupTestDirectory(TEST_OUTPUT_DIR, keepOutput);
    });

    it('should generate a PDF book from Hugo examples using the recipe-book plugin and produce a non-empty PDF', async () => {
        const outputPdfPath = path.join(TEST_OUTPUT_DIR, EXPECTED_PDF_FILENAME);

        const commandArgs = [
            'generate',
            'recipe-book',
            '--recipes-base-dir', RECIPES_BASE_DIR_CLI_ARG, // Use the relative path here
            '--outdir', TEST_OUTPUT_DIR,
            '--filename', EXPECTED_PDF_FILENAME,
            '--no-open',
        ];

        console.log(`\n  Running command: md-to-pdf ${commandArgs.join(' ')}`);
        const result = await runCliCommand(commandArgs, CLI_PATH, PROJECT_ROOT);

        if (!result.success) {
            throw new Error(`CLI command failed: ${result.stderr || result.error.message}`);
        }

        await checkFile(TEST_OUTPUT_DIR, EXPECTED_PDF_FILENAME, MIN_PDF_SIZE);

        console.log(`  Successfully created and verified: ${outputPdfPath}`);
    });
});
