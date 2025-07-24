// plugins/advanced-card/.contract/test/advanced-card-e2e.test.js
require('module-alias/register');
const path = require('path');
const os = require('os');
const { expect } = require('chai');
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
  checkFile,
} = require(testFileHelpersPath);

const PLUGIN_ROOT = path.resolve(__dirname, '../../'); // lint-skip-line no-relative-paths
const PLUGIN_NAME = path.basename(PLUGIN_ROOT);
const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', `${PLUGIN_NAME}-plugin-e2e`);
const EXAMPLE_MD = path.join(PLUGIN_ROOT, `${PLUGIN_NAME}-example.md`);
const EXPECTED_PDF_BASENAME = 'dr-eleanor-vance.pdf';
const MIN_PDF_SIZE = 1000;

describe(`E2E Test for ${PLUGIN_NAME} Plugin`, function() {
  this.timeout(20000);

  before(async () => {
    await setupTestDirectory(TEST_OUTPUT_DIR);
  });

  after(async () => {
    await cleanupTestDirectory(TEST_OUTPUT_DIR);
  });

  it('should successfully convert its own example markdown file', async () => {
    const commandArgs = [
      'convert',
      EXAMPLE_MD,
      '--outdir',
      TEST_OUTPUT_DIR,
      '--filename',
      EXPECTED_PDF_BASENAME,
      '--no-open',
    ];

    const result = await runCliCommand(commandArgs, cliPath, projectRoot);

    if (!result.success) {
      const errorMessage = result.stderr || (result.error ? result.error.message : 'Unknown error');
      logger.error(`[${PLUGIN_NAME}-e2e] CLI command failed: ${errorMessage}`);
      throw new Error(`CLI command failed for ${PLUGIN_NAME}:\n${errorMessage}`);
    }

    expect(result.success, 'CLI command should succeed').to.be.true;
    await checkFile(TEST_OUTPUT_DIR, EXPECTED_PDF_BASENAME, MIN_PDF_SIZE);
  });
});
