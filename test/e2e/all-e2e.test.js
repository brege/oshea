// test/e2e/all-e2e.test.js
const { createE2eTestRunner } = require('./test-runner-factory');

const testSuites = [
  { name: 'collection add', manifest: './collection-add.manifest.js' },
  { name: 'collection list', manifest: './collection-list.manifest.js' },
  { name: 'collection remove', manifest: './collection-remove.manifest.js' },
  { name: 'collection update', manifest: './collection-update.manifest.js' },
  { name: 'config', manifest: './config.manifest.js' },
  { name: 'convert', manifest: './convert.manifest.js' },
  { name: 'generate', manifest: './generate.manifest.js', options: { timeout: 10000 } },
  { name: 'global flags', manifest: './global-flags.manifest.js' },
  { name: 'plugin add', manifest: './plugin-add.manifest.js' },
  { name: 'plugin create', manifest: './plugin-create.manifest.js' },
  { name: 'plugin disable', manifest: './plugin-disable.manifest.js' },
  { name: 'plugin enable', manifest: './plugin-enable.manifest.js' },
  { name: 'plugin list', manifest: './plugin-list.manifest.js' },
  { name: 'plugin validate', manifest: './plugin-validate.manifest.js' },
  { name: 'sad paths', manifest: './sad-paths.manifest.js' }
];

// Dynamically create all test suites
for (const { name, manifest, options } of testSuites) {
  createE2eTestRunner(name, manifest, options);
}

