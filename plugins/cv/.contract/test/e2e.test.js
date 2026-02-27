// plugins/cv/.contract/test/e2e.test.js
require('module-alias/register');
const path = require('node:path');
const os = require('node:os');
const glob = require('glob');
const fs = require('node:fs');
const {
  projectRoot,
  cliPath,
  testFileHelpersPath,
  loggerPath,
} = require('@paths');

const logger = require(loggerPath);

const { runCliCommand, setupTestDirectory, cleanupTestDirectory } = require(
  testFileHelpersPath,
);

const PLUGIN_ROOT = path.resolve(__dirname, '../../'); // lint-skip-line no-relative-paths
const TEST_OUTPUT_DIR = path.join(
  os.tmpdir(),
  'oshea-test-output',
  'cv-plugin-e2e',
);
const EXAMPLE_MD_PATH = path.join(PLUGIN_ROOT, 'example.md');
const MIN_PDF_SIZE = 1000;

describe('plugins/cv (in-situ Self-Activation Test) .contract/test/e2e.test.js', function () {
  this.timeout(20000);

  before(async () => {
    logger.debug('Setting up test directory...', { context: 'cv-e2e' });
    await setupTestDirectory(TEST_OUTPUT_DIR);
  });

  after(async () => {
    const keepOutput = process.env.KEEP_OUTPUT === 'true';
    logger.debug('Cleaning up test directory', {
      context: 'cv-e2e',
      keepOutput,
    });
    await cleanupTestDirectory(TEST_OUTPUT_DIR, keepOutput);
  });

  it('in-situ: should convert the example resume using self-activation', async () => {
    const commandArgs = [
      'convert',
      `"${EXAMPLE_MD_PATH}"`,
      '--plugin',
      PLUGIN_ROOT,
      '--outdir',
      TEST_OUTPUT_DIR,
      '--no-open',
    ];

    logger.debug('Running CLI command', {
      context: 'cv-e2e',
      command: `node ${cliPath} ${commandArgs.join(' ')}`,
    });
    const result = await runCliCommand(commandArgs, cliPath, projectRoot);

    if (!result.success) {
      const errorMessage =
        result.stderr || result.error?.message || 'Unknown error';
      logger.error('CLI command failed', {
        context: 'cv-e2e',
        error: errorMessage,
      });
      throw new Error(`CLI command failed: ${errorMessage}`);
    }

    // Use glob to find the generated PDF file(s)
    const pattern = path.join(
      TEST_OUTPUT_DIR,
      'jane-doe-curriculum-vitae*.pdf',
    );
    const matchingFiles = glob.sync(pattern);

    if (matchingFiles.length === 0) {
      throw new Error(`No PDF output matching pattern: ${pattern}`);
    }

    const stat = fs.statSync(matchingFiles[0]);
    if (stat.size < MIN_PDF_SIZE) {
      throw new Error(
        `Generated PDF is too small: ${matchingFiles[0]} (${stat.size} bytes)`,
      );
    }
  });
});
