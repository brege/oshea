// plugins/cv/test/cv-e2e.test.js

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
    runCliCommand,
    setupTestDirectory,
    cleanupTestDirectory,
    checkFile,
} = require('../../../test/shared/test-helpers'); 

const PROJECT_ROOT = path.resolve(__dirname, '../../..'); // Navigates from plugins/cv/test/ up to project root
const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', 'cv-plugin-e2e');
const CLI_PATH = path.join(PROJECT_ROOT, 'cli.js');
const CV_EXAMPLE_MD = path.join(PROJECT_ROOT, 'plugins', 'cv', 'cv-example.md');
const EXPECTED_PDF_FILENAME = 'example-curriculum-vitae.pdf'; // Default filename for cv-example.md
const MIN_PDF_SIZE = 1000; // Minimum size in bytes for a valid PDF

describe('CV Plugin E2E Test', function() {
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

    it('should convert cv-example.md to PDF using the cv plugin and generate a non-empty PDF', async () => {
        const outputPdfPath = path.join(TEST_OUTPUT_DIR, EXPECTED_PDF_FILENAME);

        const commandArgs = [
            'convert',
            CV_EXAMPLE_MD,
            '--plugin', 'cv',
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

        // Optional: More specific checks can be added here if needed,
        // but for a basic E2E, existence and size are often sufficient.
        console.log(`  Successfully created and verified: ${outputPdfPath}`);
    });
});
