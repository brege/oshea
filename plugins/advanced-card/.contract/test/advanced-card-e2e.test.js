// plugins/advanced-card/.contract/test/advanced-card-e2e.test.js

require('module-alias/register');
const path = require('path');
const os = require('os');
const glob = require('glob');
const fs = require('fs');

const {
  cliPath,
  testFileHelpersPath,
  loggerPath,
  projectRoot,
} = require('@paths');

const logger = require(loggerPath);

const PLUGIN_ROOT = path.resolve(__dirname, '../../');
const PLUGIN_NAME = path.basename(PLUGIN_ROOT);

const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', `${PLUGIN_NAME}-plugin-e2e`);
const EXAMPLE_MD = path.join(PLUGIN_ROOT, `${PLUGIN_NAME}-example.md`);
const EXPECTED_PDF_BASENAME = `${PLUGIN_NAME}-example.pdf`;
const MIN_PDF_SIZE = 1000;

const {
  runCliCommand,
  setupTestDirectory,
  cleanupTestDirectory,
} = require(testFileHelpersPath);

describe(`E2E Test for ${PLUGIN_NAME} Plugin`, function() {
  this.timeout(15000);

  before(async () => {
    logger.debug(`[${PLUGIN_NAME}-e2e] Setting up test directory...`);
    await setupTestDirectory(TEST_OUTPUT_DIR);
  });

  after(async () => {
    const keepOutput = process.env.KEEP_OUTPUT === 'true';
    logger.debug(`[${PLUGIN_NAME}-e2e] Cleaning up test directory. KEEP_OUTPUT: ${keepOutput}`);
    await cleanupTestDirectory(TEST_OUTPUT_DIR, keepOutput);
  });

  it('should successfully convert its own example markdown file', async () => {
    const commandArgs = [
      'convert',
      EXAMPLE_MD,
      '--plugin', PLUGIN_ROOT,
      '--outdir', TEST_OUTPUT_DIR,
      '--filename', EXPECTED_PDF_BASENAME,
      '--no-open',
    ];

    logger.debug(`[${PLUGIN_NAME}-e2e] Running CLI command: node ${cliPath} ${commandArgs.join(' ')}`);
    const result = await runCliCommand(commandArgs, cliPath, projectRoot);

    if (!result.success) {
      logger.error(`[${PLUGIN_NAME}-e2e] CLI command failed: ${result.stderr || (result.error ? result.error.message : 'Unknown error')}`);
      throw new Error(`CLI command failed for ${PLUGIN_NAME}:\n${result.stderr || (result.error ? result.error.message : 'Unknown error')}`);
    }

    // Use glob in case the filename is ever dynamic in the future
    const pattern = path.join(TEST_OUTPUT_DIR, `${PLUGIN_NAME}-example*.pdf`);
    const matchingFiles = glob.sync(pattern);

    if (matchingFiles.length === 0) {
      throw new Error(`No PDF output matching pattern: ${pattern}`);
    }

    const stat = fs.statSync(matchingFiles[0]);
    if (stat.size < MIN_PDF_SIZE) {
      throw new Error(`Generated PDF is too small: ${matchingFiles[0]} (${stat.size} bytes)`);
    }

    logger.success(`[${PLUGIN_NAME}-e2e] Successfully created and verified: ${matchingFiles[0]}`);
  });
});

