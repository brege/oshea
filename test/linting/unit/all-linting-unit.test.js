// test/linting/unit/all-linting-unit.test.js
require('module-alias/register');

const {
  testRunnerFactoryLinting,
  codeLintingManifestPath,
  docsLintingManifestPath
} = require('@paths');
const {
  createSmokeTestRunner
} = require(testRunnerFactoryLinting);

const testSuites = [
  { name: 'Code Linters', manifest: codeLintingManifestPath },
  { name: 'Doc Linters', manifest: docsLintingManifestPath },
];


for (const { name, manifest, options } of testSuites) {
  createSmokeTestRunner(name, manifest, options);
}
