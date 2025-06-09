// plugins/cover-letter/test/cover-letter-e2e.test.js

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
    runCliCommand,
    setupTestDirectory,
    cleanupTestDirectory,
    checkFile,
} = require('../../../test/shared/test-helpers'); // Using the new shared helpers

const PROJECT_ROOT = path.resolve(__dirname, '../../..'); // Navigates from plugins/cover-letter/test/ up to project root
const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', 'cover-letter-plugin-e2e');
const CLI_PATH = path.join(PROJECT_ROOT, 'cli.js');
const COVER_LETTER_EXAMPLE_MD = path.join(PROJECT_ROOT, 'plugins', 'cover-letter', 'cover-letter-example.md');
const EXPECTED_PDF_FILENAME = 'example-cover-letter.pdf'; // Default filename for cover-letter-example.md
const MIN_PDF_SIZE = 1000; // Minimum size in bytes for a valid PDF

describe('Cover Letter Plugin E2E Test', function() {
    this.timeout(10000); // Set a higher timeout for E2E tests

    before(async () => {
        // Ensure the test output directory exists and is clean
        await setupTestDirectory(TEST_OUTPUT_DIR);
    });

    after(async () => {
        // Clean up the test output directory unless KEEP_OUTPUT is set
        const keepOutput = process.env.KEEP_OUTPUT === 'true';
        await cleanupTestDirectory(TEST_OUTPUT_DIR, keepOutput);
    });

    it('should convert cover-letter-example.md to PDF using the cover-letter plugin and generate a non-empty PDF', async () => {
        const outputPdfPath = path.join(TEST_OUTPUT_DIR, EXPECTED_PDF_FILENAME);

        const commandArgs = [
            'convert',
            COVER_LETTER_EXAMPLE_MD,
            '--plugin', 'cover-letter',
            '--outdir', TEST_OUTPUT_DIR,
            '--filename', EXPECTED_PDF_FILENAME,
            '--no-open', // Prevent opening the PDF viewer during test
        ];

        console.log(`\n  Running command: md-to-pdf ${commandArgs.join(' ')}`);
        const result = await runCliCommand(commandArgs, CLI_PATH, PROJECT_ROOT);

        if (!result.success) {
            throw new Error(`CLI command failed: ${result.stderr || result.error.message}`);
        }

        // Verify the PDF was created and is not empty
        await checkFile(TEST_OUTPUT_DIR, EXPECTED_PDF_FILENAME, MIN_PDF_SIZE);

        console.log(`  Successfully created and verified: ${outputPdfPath}`);
    });
});
