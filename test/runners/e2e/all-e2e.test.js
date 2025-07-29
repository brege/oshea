// test/runners/e2e/all-e2e.test.js
require('module-alias/register');
const {
  collectionAddManifestPath,
  collectionListManifestPath,
  collectionRemoveManifestPath,
  collectionUpdateManifestPath,
  configManifestPath,
  convertManifestPath,
  generateManifestPath,
  globalFlagsManifestPath,
  pluginAddManifestPath,
  pluginCreateManifestPath,
  pluginDisableManifestPath,
  pluginEnableManifestPath,
  pluginListManifestPath,
  pluginValidateManifestPath,
  testRunnerFactoryE2e
} = require('@paths');
const { createE2eTestRunner } = require(testRunnerFactoryE2e);

const testSuites = [
  { name: 'collection add', manifest: collectionAddManifestPath },
  { name: 'collection list', manifest: collectionListManifestPath },
  { name: 'collection remove', manifest: collectionRemoveManifestPath },
  { name: 'collection update', manifest: collectionUpdateManifestPath },
  { name: 'config', manifest: configManifestPath },
  { name: 'convert', manifest: convertManifestPath },
  { name: 'generate', manifest: generateManifestPath, options: { timeout: 10000 } },
  { name: 'global flags', manifest: globalFlagsManifestPath },
  { name: 'plugin add', manifest: pluginAddManifestPath },
  { name: 'plugin create', manifest: pluginCreateManifestPath, options: { timeout: 30000 } },
  { name: 'plugin disable', manifest: pluginDisableManifestPath },
  { name: 'plugin enable', manifest: pluginEnableManifestPath },
  { name: 'plugin list', manifest: pluginListManifestPath },
  { name: 'plugin validate', manifest: pluginValidateManifestPath }
];

for (const { name, manifest, options } of testSuites) {
  createE2eTestRunner(name, manifest, options);
}

