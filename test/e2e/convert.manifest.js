// test/e2e/convert.manifest.js
const fs = require('fs-extra');
const path = require('path');

// Helper function to check for file existence and minimum size,
// which will be common in 'convert' command tests.
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
    describe: '3.1.1: (Happy Path) Successfully converts a basic markdown file to PDF using the default plugin',
    setup: async (sandboxDir) => {
      // Copy the simple.md fixture into the sandbox
      const fixtureSrc = path.resolve(__dirname, '../fixtures/markdown/simple.md');
      const fixtureDest = path.join(sandboxDir, 'simple.md');
      await fs.copy(fixtureSrc, fixtureDest);
    },
    args: (sandboxDir) => [
      'convert',
      path.join(sandboxDir, 'simple.md'),
      '--outdir',
      sandboxDir, // Output the PDF inside the sandbox for easy checking and cleanup
      '--filename',
      'happy-path.pdf',
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      await checkPdf(sandboxDir, 'happy-path.pdf');
    },
  },
  {
    describe: '3.1.2: (Key Option) Successfully converts using a specified plugin via --plugin',
    setup: async (sandboxDir) => {
      const fixtureSrc = path.resolve(__dirname, '../fixtures/markdown/simple.md');
      const fixtureDest = path.join(sandboxDir, 'simple.md');
      await fs.copy(fixtureSrc, fixtureDest);
    },
    args: (sandboxDir) => [
      'convert',
      path.join(sandboxDir, 'simple.md'),
      '--plugin',
      'recipe', // Use a non-default plugin to verify the option works
      '--outdir',
      sandboxDir,
      '--filename',
      'key-option-plugin.pdf',
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/using plugin 'recipe'/i);
      expect(stdout).to.match(/determined via cli option/i);
      await checkPdf(sandboxDir, 'key-option-plugin.pdf');
    },
  },
  {
    describe: '3.1.3: (Key Option) Successfully creates a PDF with a custom directory and filename',
    setup: async (sandboxDir) => {
      const fixtureSrc = path.resolve(__dirname, '../fixtures/markdown/simple.md');
      const fixtureDest = path.join(sandboxDir, 'simple.md');
      await fs.copy(fixtureSrc, fixtureDest);
    },
    args: (sandboxDir) => [
      'convert',
      path.join(sandboxDir, 'simple.md'),
      '--outdir',
      path.join(sandboxDir, 'custom-output'),
      '--filename',
      'my-custom-name.pdf',
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      const customOutputDir = path.join(sandboxDir, 'custom-output');
      await checkPdf(customOutputDir, 'my-custom-name.pdf');
    },
  },
  {
    describe: "3.1.4: (Config Precedence) A 'md_to_pdf_plugin' key in front matter is correctly used for conversion",
    setup: async (sandboxDir) => {
      const fixtureSrc = path.resolve(__dirname, '../fixtures/markdown/with-front-matter.md');
      const fixtureDest = path.join(sandboxDir, 'with-front-matter.md');
      await fs.copy(fixtureSrc, fixtureDest);
    },
    args: (sandboxDir) => [
      'convert',
      path.join(sandboxDir, 'with-front-matter.md'),
      '--outdir',
      sandboxDir,
      '--filename',
      'fm-precedence.pdf',
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/using plugin 'recipe'/i);
      expect(stdout).to.match(/determined via front matter/i);
      await checkPdf(sandboxDir, 'fm-precedence.pdf');
    },
  },
  {
    describe: "3.1.5: (Config Precedence) A '--plugin' CLI flag correctly overrides a plugin specified in front matter",
    setup: async (sandboxDir) => {
      const fixtureSrc = path.resolve(__dirname, '../fixtures/markdown/with-front-matter.md');
      const fixtureDest = path.join(sandboxDir, 'with-front-matter.md');
      await fs.copy(fixtureSrc, fixtureDest);
    },
    args: (sandboxDir) => [
      'convert',
      path.join(sandboxDir, 'with-front-matter.md'),
      '--plugin',
      'cv', // Override the 'recipe' plugin from the front matter
      '--outdir',
      sandboxDir,
      '--filename',
      'cli-override.pdf',
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/plugin 'cv' specified via cli, overriding front matter plugin 'recipe'/i);
      await checkPdf(sandboxDir, 'cli-override.pdf');
    },
  },
    {
    describe: '3.1.6: (Sad Path) Fails with a non-zero exit code when the input file does not exist',
    setup: async (sandboxDir) => {
      // No setup needed as the file should not exist
    },
    args: (sandboxDir) => [
      'convert',
      path.join(sandboxDir, 'non-existent-file.md'),
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(1);
      expect(stderr).to.match(/input markdown file not found/i);
    },
  },
  {
    describe: '3.1.7: (Sad Path) Fails with a non-zero exit code when a non-existent plugin is specified',
    setup: async (sandboxDir) => {
      const fixtureSrc = path.resolve(__dirname, '../fixtures/markdown/simple.md');
      const fixtureDest = path.join(sandboxDir, 'simple.md');
      await fs.copy(fixtureSrc, fixtureDest);
    },
    args: (sandboxDir) => [
      'convert',
      path.join(sandboxDir, 'simple.md'),
      '--plugin',
      'i-do-not-exist-as-a-plugin',
      '--no-open',
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(1);
      expect(stderr).to.match(/plugin 'i-do-not-exist-as-a-plugin' is not registered/i);
    },
  },
];
