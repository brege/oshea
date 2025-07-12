// plugins/default/.contract/test/default-e2e.test.js

require('module-alias/register');
const path = require('path');
const os = require('os');
const glob = require('glob');
const fs = require('fs');

const PROJECT_ROOT = process.cwd();
const HELPERS_PATH = path.join(PROJECT_ROOT, 'test', 'shared', 'test-helpers.js');
const {
  runCliCommand,
  setupTestDirectory,
  cleanupTestDirectory,
} = require(HELPERS_PATH);

const { loggerPath } = require('@paths');
const logger = require(loggerPath);

const PLUGIN_ROOT = path.resolve(__dirname, '../../');
const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', 'default-plugin-e2e');
const CLI_PATH = path.join(PROJECT_ROOT, 'cli.js');
const EXAMPLE_MD_PATH = path.join(PLUGIN_ROOT, 'default-example.md');
const EXPECTED_PDF_BASENAME = 'default-example-output.pdf';
const MIN_PDF_SIZE = 1000;

describe('Default Plugin E2E Test', function() {
  this.timeout(15000); // Give a bit more time for E2E

  before(async () => {
    logger.debug('[default-e2e] Setting up test directory...');
    await setupTestDirectory(TEST_OUTPUT_DIR);
  });

  after(async () => {
    const keepOutput = process.env.KEEP_OUTPUT === 'true';
    logger.debug(`[default-e2e] Cleaning up test directory. KEEP_OUTPUT: ${keepOutput}`);
    await cleanupTestDirectory(TEST_OUTPUT_DIR, keepOutput);
  });

  it('should convert default-example.md to PDF using the default plugin and generate a non-empty PDF', async () => {

    const commandArgs = [
      'convert',
      EXAMPLE_MD_PATH,
      '--plugin', PLUGIN_ROOT,
      '--outdir', TEST_OUTPUT_DIR,
      '--filename', EXPECTED_PDF_BASENAME,
      '--no-open',
    ];

    logger.debug(`[default-e2e] Running CLI command: node ${CLI_PATH} ${commandArgs.join(' ')}`);
    const result = await runCliCommand(commandArgs, CLI_PATH, PROJECT_ROOT);

    if (!result.success) {
      logger.error(`[default-e2e] CLI command failed: ${result.stderr || result.error?.message || 'Unknown error'}`);
      throw new Error(`CLI command failed: ${result.stderr || result.error?.message || 'Unknown error'}`);
    }

    // Use glob in case the filename is ever dynamic in the future
    const pattern = path.join(TEST_OUTPUT_DIR, 'default-example-output*.pdf');
    const matchingFiles = glob.sync(pattern);

    if (matchingFiles.length === 0) {
      throw new Error(`No PDF output matching pattern: ${pattern}`);
    }

    const stat = fs.statSync(matchingFiles[0]);
    if (stat.size < MIN_PDF_SIZE) {
      throw new Error(`Generated PDF is too small: ${matchingFiles[0]} (${stat.size} bytes)`);
    }

    logger.success(`[default-e2e] Successfully created and verified: ${matchingFiles[0]}`);
  });
});

