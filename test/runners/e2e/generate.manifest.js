// test/runners/e2e/generate.manifest.js
require('module-alias/register');
const { fixturesDir } = require('@paths');
const fs = require('fs-extra');
const path = require('path');

const hugoExampleDir = path.join(fixturesDir, 'hugo-example');

// Reusable helper from convert.manifest.js
async function checkPdf(outputDir, expectedFilename, minSize = 1000) {
  const pdfPath = path.join(outputDir, expectedFilename);
  if (!await fs.pathExists(pdfPath)) {
    throw new Error(`Expected PDF file was not created: ${pdfPath}`);
  }
  const stats = await fs.stat(pdfPath);
  if (stats.size < minSize) {
    throw new Error(`Generated PDF file is too small (${stats.size} bytes): ${pdfPath}`);
  }
}

module.exports = [
  {
    describe: '3.2.1: (Happy Path) Successfully generates an artifact using a known generator plugin (recipe-book)',
    setup: async (sandboxDir) => {
      // Copy the entire hugo-example directory into the sandbox to act as the source
      const fixtureDest = path.join(sandboxDir, 'hugo-example-src');
      await fs.copy(hugoExampleDir, fixtureDest);
    },
    args: (sandboxDir) => [
      'generate',
      'recipe-book',
      '--recipes-base-dir',
      path.join(sandboxDir, 'hugo-example-src'),
      '--outdir',
      sandboxDir,
      '--filename',
      'my-recipe-book.pdf',
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      // The recipe book should be a substantial file, so we expect a larger size.
      await checkPdf(sandboxDir, 'my-recipe-book.pdf', 20000);
    },
  },
  {
    describe: '3.2.2: (Sad Path) Fails with a non-zero exit code if required plugin-specific options are missing',
    setup: async (sandboxDir) => { },
    args: (sandboxDir) => [
      'generate',
      'recipe-book',
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.not.equal(0);
      expect((stderr + stdout).toLowerCase()).to.include('recipesbasedir');
    },
  },

];
