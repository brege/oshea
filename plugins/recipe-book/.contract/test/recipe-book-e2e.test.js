// plugins/recipe-book/.contract/test/recipe-book-e2e.test.js
require('module-alias/register');
const path = require('path');
const os = require('os');
const { expect } = require('chai');
const {
  projectRoot,
  cliPath,
  testFileHelpersPath,
  fixturesDir,
  loggerPath,
} = require('@paths');

const logger = require(loggerPath);

const {
  runCliCommand,
  setupTestDirectory,
  cleanupTestDirectory,
  checkFile,
} = require(testFileHelpersPath);

const TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'md-to-pdf-test-output', 'recipe-book-e2e');
const HUGO_EXAMPLE_PATH = path.join(fixturesDir, 'hugo-example');

describe('plugins/recipe-book (in-situ Self-Activation Test) .contract/test/recipe-book-e2e.test.js', function () {
  this.timeout(20000);

  before(async () => {
    await setupTestDirectory(TEST_OUTPUT_DIR);
  });

  after(async () => {
    await cleanupTestDirectory(TEST_OUTPUT_DIR);
  });

  it('in-situ: should generate a recipe book from a directory of recipes', async () => {
    const commandArgs = [
      'generate',
      'recipe-book',
      '--recipes-base-dir',
      HUGO_EXAMPLE_PATH,
      '--outdir',
      TEST_OUTPUT_DIR,
      '--filename',
      'MyBook.pdf',
      '--no-open',
    ];

    const { success, stdout, stderr } = await runCliCommand(commandArgs, cliPath, projectRoot);

    if (!success) {
      logger.error('CLI command failed. STDOUT:', stdout);
      logger.error('STDERR:', stderr);
    }

    expect(success, 'CLI command should succeed').to.be.true;
    await checkFile(TEST_OUTPUT_DIR, 'MyBook.pdf', 10000);
  });
});
