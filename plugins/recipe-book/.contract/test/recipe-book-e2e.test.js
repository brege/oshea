// plugins/recipe-book/.contract/test/recipe-book-e2e.test.js

require('module-alias/register');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');

const {
  loggerPath,
  projectRoot,
  testSharedRoot,
} = require('@paths');

const logger = require(loggerPath);

// Only the plugin root is relative to the test file
const PLUGIN_ROOT = path.resolve(__dirname, '../../');
const PLUGIN_NAME = path.basename(PLUGIN_ROOT);

// Use the fixture path from the registry if available, else fall back to relative
const HUGO_EXAMPLE_PATH = path.join(testSharedRoot, '..', 'fixtures', 'hugo-example'); // Update if you add to registry

const { TestHarness } = require(path.join(projectRoot, 'test', 'e2e', 'harness'));

const PDF_BASENAME = 'hugo-recipe-book.pdf';
const MIN_PDF_SIZE = 20000;

describe('Recipe Book Plugin E2E Test (Generate Command)', function () {
  this.timeout(20000);

  let harness;

  beforeEach(async () => {
    harness = new TestHarness();
    await harness.createSandbox();
    // Copy the hugo-example fixture into the sandbox for the test run
    const fixtureDest = path.join(harness.sandboxDir, 'hugo-example-src');
    logger.debug(`[${PLUGIN_NAME}-e2e] Copying fixture from ${HUGO_EXAMPLE_PATH} to ${fixtureDest}`);
    await fs.copy(HUGO_EXAMPLE_PATH, fixtureDest);
  });

  afterEach(async () => {
    logger.debug(`[${PLUGIN_NAME}-e2e] Cleaning up test sandbox...`);
    await harness.cleanup();
  });

  it('should generate a PDF book from Hugo examples using the recipe-book plugin and produce a non-empty PDF', async () => {
    const sandboxDir = harness.sandboxDir;
    const cliArgs = [
      'generate',
      'recipe-book',
      '--recipes-base-dir',
      path.join(sandboxDir, 'hugo-example-src'),
      '--outdir',
      sandboxDir,
      '--filename',
      PDF_BASENAME,
      '--no-open',
    ];

    logger.debug(`[${PLUGIN_NAME}-e2e] Running CLI with args: ${cliArgs.join(' ')}`);
    const result = await harness.runCli(cliArgs, { useFactoryDefaults: false });

    if (result.exitCode !== 0) {
      logger.error(`[${PLUGIN_NAME}-e2e] CLI command failed: ${result.stderr || result.stdout}`);
      throw new Error(`CLI command failed: ${result.stderr || result.stdout}`);
    }

    expect(result.exitCode).to.equal(0);

    // Use glob in case the filename is ever dynamic in the future
    const pattern = path.join(sandboxDir, 'hugo-recipe-book*.pdf');
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

