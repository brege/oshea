// test/linting/unit/all-linting-unit.test.js
const { createSmokeTestRunner } = require('./test-runner-factory');

const testSuites = [
  { name: 'Code Linters', manifest: './code-linting.manifest.js' },
  { name: 'Doc Linters', manifest: './docs-linting.manifest.js' },
];

for (const { name, manifest, options } of testSuites) {
  createSmokeTestRunner(name, manifest, options);
}
