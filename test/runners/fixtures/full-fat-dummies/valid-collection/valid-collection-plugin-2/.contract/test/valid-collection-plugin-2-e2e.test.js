// test/runners/fixtures/full-fat-dummies/valid-collection/valid-collection-plugin-2/.contract/test/valid-collection-plugin-2-e2e.test.js
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
} = require(testFileHelpersPath);

const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', 'valid-collection-plugin-2-e2e');
const PLUGIN_ROOT = path.resolve(__dirname, '../../'); // lint-skip-line no-relative-paths
const EXAMPLE_MD = path.join(PLUGIN_ROOT, 'valid-collection-plugin-2-example.md');

describe('plugins/valid-collection-plugin-2 (in-situ Self-Activation Test) .contract/test/valid-collection-plugin-2-e2e.test.js', function() {
  this.timeout(15000);

  before(async () => {
    await setupTestDirectory(TEST_OUTPUT_DIR);
  });

  after(async () => {
    await cleanupTestDirectory(TEST_OUTPUT_DIR);
  });

  it('in-situ: should convert the example markdown using self-activation', async () => {
    const { success, stdout, stderr } = await runCliCommand(
      ['convert', EXAMPLE_MD, '--outdir', TEST_OUTPUT_DIR, '--no-open'],
      cliPath,
      projectRoot
    );

    if (!success) {
      logger.error('CLI command failed. STDOUT:', stdout);
      logger.error('STDERR:', stderr);
    }
    expect(success, 'CLI command should succeed').to.be.true;
  });
});
