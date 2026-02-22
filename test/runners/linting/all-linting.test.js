// test/runners/linting/all-linting.test.js
require('module-alias/register');

const {
  lintingTestRunnerFactory,
  docsLintingManifestPath
} = require('@paths');
const {
  createUnitTestRunner
} = require(lintingTestRunnerFactory);

const testSuites = [
  { name: 'Docs Linters', manifest: docsLintingManifestPath },
];


for (const { name, manifest, options } of testSuites) {
  createUnitTestRunner(name, manifest, options);
}
