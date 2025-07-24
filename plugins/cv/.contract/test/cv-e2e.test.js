// plugins/cv/.contract/test/cv-e2e.test.js
require('module-alias/register');
const path = require('path');
const os = require('os');
const glob = require('glob');
const fs = require('fs');
const {
  projectRoot,
  cliPath,
  testFileHelpersPath,
  loggerPath,
} = require('@paths');

const logger = require(loggerPath);

const {
  runCliCommand,
  setupTestDirectory,
  cleanupTestDirectory,
} = require(testFileHelpersPath);

const PLUGIN_ROOT = path.resolve(__dirname, '../../'); // lint-skip-line no-relative-paths
const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', 'cv-plugin-e2e');
const EXAMPLE_MD_PATH = path.join(PLUGIN_ROOT, 'cv-example.md');
const MIN_PDF_SIZE = 1000;

describe('CV Plugin E2E Test', function () {
  this.timeout(20000);

  before(async () => {
    logger.debug('[cv-e2e] Setting up test directory...');
    await setupTestDirectory(TEST_OUTPUT_DIR);
  });

  after(async () => {
    const keepOutput = process.env.KEEP_OUTPUT === 'true';
    logger.debug(`[cv-e2e] Cleaning up test directory. KEEP_OUTPUT: ${keepOutput}`);
    await cleanupTestDirectory(TEST_OUTPUT_DIR, keepOutput);
  });

  it('should convert cv-example.md to PDF using the cv plugin and generate a non-empty PDF', async () => {
    const commandArgs = [
      'convert',
      `"${EXAMPLE_MD_PATH}"`,
      '--plugin', PLUGIN_ROOT,
      '--outdir', TEST_OUTPUT_DIR,
      '--no-open',
    ];

    logger.debug(`[cv-e2e] Running CLI command: node ${cliPath} ${commandArgs.join(' ')}`);
    const result = await runCliCommand(commandArgs, cliPath, projectRoot);

    if (!result.success) {
      const errorMessage = result.stderr || result.error?.message || 'Unknown error';
      logger.error(`[cv-e2e] CLI command failed: ${errorMessage}`);
      throw new Error(`CLI command failed: ${errorMessage}`);
    }

    // Use glob to find the generated PDF file(s)
    const pattern = path.join(TEST_OUTPUT_DIR, 'jane-doe-curriculum-vitae*.pdf');
    const matchingFiles = glob.sync(pattern);

    if (matchingFiles.length === 0) {
      throw new Error(`No PDF output matching pattern: ${pattern}`);
    }

    const stat = fs.statSync(matchingFiles[0]);
    if (stat.size < MIN_PDF_SIZE) {
      throw new Error(`Generated PDF is too small: ${matchingFiles[0]} (${stat.size} bytes)`);
    }

    logger.success(`[cv-e2e] Successfully created and verified: ${matchingFiles[0]}`);
  });
});

