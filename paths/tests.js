// paths/tests.js
// tests.js - Test Suite Registry
// Generated: 2025-07-29T08:49:53.738Z
// Architecture: Multi-layered testing infrastructure with dependency ranking
// Regenerate: npm run paths
// Auto-generated - do not edit manually

const path = require('path');

// ==========================================
// Architecture
// ==========================================

// --- Test Infrastructure Foundation ---
const projectRoot = path.resolve(__dirname, '..');
const testRoot = path.join(projectRoot, 'test/runners');
const setupFile = path.join(testRoot, 'setup.js');

// --- Test Organization Directories ---
const docsTestDir = path.join(testRoot, 'docs');
const e2eTestDir = path.join(testRoot, 'e2e');
const fixturesDir = path.join(testRoot, 'fixtures');
const integrationTestDir = path.join(testRoot, 'integration');
const lintingTestDir = path.join(testRoot, 'linting');
const scriptsTestDir = path.join(testRoot, 'scripts');
const sharedTestDir = path.join(testRoot, 'shared');
const smokeTestDir = path.join(testRoot, 'smoke');

// --- Test Harnesses & Factories ---
const e2eHarness = path.join(testRoot, 'e2e/e2e-harness.js');
const testRunnerFactoryE2e = path.join(testRoot, 'e2e/test-runner-factory.js');
const lintingUnitHarness = path.join(testRoot, 'linting/unit/linting-unit-harness.js');
const testRunnerFactoryLinting = path.join(testRoot, 'linting/unit/test-runner-factory.js');

// --- Test Fixtures ---
const simpleMdFixture = path.join(fixturesDir, 'markdown/simple.md');
const simpleMdFixtureWithFm = path.join(fixturesDir, 'markdown/with-front-matter.md');
const hugoExampleFixturePath = path.join(fixturesDir, 'hugo-example');
const refreshFixturesPath = path.join(fixturesDir, 'refresh-fixtures.js');
const createDummyPluginPath = path.join(fixturesDir, 'create-dummy-plugin.js');

// ==========================================
// Features (by dependency rank)
// ==========================================

// --- Rank 0: user-facing interfaces ---

// Smoke Tests - Basic Application Validation
const smokeRoot = path.join(projectRoot, 'test/runners/smoke/');
const smokeTestRunnerPath = path.join(projectRoot, 'test/runners/smoke/smoke-test-runner.js');
const smokeTestsManifestPath = path.join(projectRoot, 'test/runners/smoke/smoke-tests.yaml');
const testHarnessPath = path.join(projectRoot, 'test/runners/smoke/test-harness.js');
const workflowTestRunnerPath = path.join(projectRoot, 'test/runners/smoke/workflow-test-runner.js');
const workflowTestsYamlPath = path.join(projectRoot, 'test/runners/smoke/workflow-tests.yaml');

// Core Module Integration Tests
const coreIntegrationRoot = path.join(projectRoot, 'test/runners/integration/core/');
const defaultHandlerFactoryPath = path.join(projectRoot, 'test/runners/integration/core/default-handler.factory.js');
const defaultHandlerManifestPath = path.join(projectRoot, 'test/runners/integration/core/default-handler.manifest.js');
const defaultHandlerIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/core/default-handler.test.js');
const mathIntegrationFactoryPath = path.join(projectRoot, 'test/runners/integration/core/math-integration.factory.js');
const mathIntegrationManifestPath = path.join(projectRoot, 'test/runners/integration/core/math-integration.manifest.js');
const mathIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/core/math-integration.test.js');
const pdfGeneratorFactoryPath = path.join(projectRoot, 'test/runners/integration/core/pdf-generator.factory.js');
const pdfGeneratorManifestPath = path.join(projectRoot, 'test/runners/integration/core/pdf-generator.manifest.js');
const pdfGeneratorIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/core/pdf-generator.test.js');

// --- Rank 1: essential operations ---

// Configuration System Integration Tests
const configIntegrationRoot = path.join(projectRoot, 'test/runners/integration/config/');
const configResolverConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.constructor.manifest.js');
const configResolverFactoryPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.factory.js');
const configResolverGetEffectiveConfigManifestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.get-effective-config.manifest.js');
const configResolverInitializeManifestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.initialize.manifest.js');
const configResolverLoadPluginBaseConfigManifestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.load-plugin-base-config.manifest.js');
const configResolverIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.test.js');
const mainConfigLoaderConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.constructor.manifest.js');
const mainConfigLoaderFactoryPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.factory.js');
const mainConfigLoaderGettersManifestPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.getters.manifest.js');
const mainConfigLoaderInitializeManifestPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.initialize.manifest.js');
const mainConfigLoaderIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.test.js');
const pluginConfigLoaderApplyOverridesManifestPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.apply-overrides.manifest.js');
const pluginConfigLoaderConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.constructor.manifest.js');
const pluginConfigLoaderFactoryPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.factory.js');
const pluginConfigLoaderLoadSingleLayerManifestPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.load-single-layer.manifest.js');
const pluginConfigLoaderIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.test.js');

// Plugin System Integration Tests
const pluginsIntegrationRoot = path.join(projectRoot, 'test/runners/integration/plugins/');
const pluginDeterminerFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-determiner.factory.js');
const pluginDeterminerManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-determiner.manifest.js');
const pluginDeterminerIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-determiner.test.js');
const pluginManagerFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-manager.factory.js');
const pluginManagerManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-manager.manifest.js');
const pluginManagerIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-manager.test.js');
const pluginRegistryBuilderBuildRegistryManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.build-registry.manifest.js');
const pluginRegistryBuilderCmManifestsManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.cm-manifests.manifest.js');
const pluginRegistryBuilderConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.constructor.manifest.js');
const pluginRegistryBuilderFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.factory.js');
const pluginRegistryBuilderGetAllPluginDetailsManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.get-all-plugin-details.manifest.js');
const pluginRegistryBuilderGetPluginRegistrationsFromFileManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.get-plugin-registrations-from-file.manifest.js');
const pluginRegistryBuilderResolveAliasManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.resolve-alias.manifest.js');
const pluginRegistryBuilderResolvePluginConfigPathManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.resolve-plugin-config-path.manifest.js');
const pluginRegistryBuilderIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.test.js');
const pluginValidatorFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.factory.js');
const pluginValidatorManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.manifest.js');
const pluginValidatorIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.test.js');

// Collections System Integration Tests
const collectionsIntegrationRoot = path.join(projectRoot, 'test/runners/integration/collections/');
const cmUtilsFactoryPath = path.join(projectRoot, 'test/runners/integration/collections/cm-utils.factory.js');
const cmUtilsManifestPath = path.join(projectRoot, 'test/runners/integration/collections/cm-utils.manifest.js');
const cmUtilsIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/collections/cm-utils.test.js');
const collectionsManagerAddManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.add.manifest.js');
const collectionsManagerConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.constructor.manifest.js');
const collectionsManagerDisableManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.disable.manifest.js');
const collectionsManagerEnableDisableManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.enable-disable.manifest.js');
const collectionsManagerFactoryPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.factory.js');
const collectionsManagerListManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.list.manifest.js');
const collectionsManagerRemoveManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.remove.manifest.js');
const collectionsManagerIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.test.js');
const collectionsManagerUpdateManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.update.manifest.js');

// End-to-End Core Workflow Tests
const e2eCoreRoot = path.join(projectRoot, 'test/runners/e2e/all-e2e.test.js');
const allE2eTestPath = path.join(projectRoot, 'test/runners/e2e/all-e2e.test.js');

// --- Rank 2: supportive operations ---

// E2E Manifest Tests
const e2eManifestsRoot = path.join(projectRoot, 'test/runners/e2e/*.manifest.js');
const collectionAddManifestPath = path.join(projectRoot, 'test/runners/e2e/collection-add.manifest.js');
const collectionListManifestPath = path.join(projectRoot, 'test/runners/e2e/collection-list.manifest.js');
const collectionRemoveManifestPath = path.join(projectRoot, 'test/runners/e2e/collection-remove.manifest.js');
const collectionUpdateManifestPath = path.join(projectRoot, 'test/runners/e2e/collection-update.manifest.js');
const configManifestPath = path.join(projectRoot, 'test/runners/e2e/config.manifest.js');
const convertManifestPath = path.join(projectRoot, 'test/runners/e2e/convert.manifest.js');
const generateManifestPath = path.join(projectRoot, 'test/runners/e2e/generate.manifest.js');
const globalFlagsManifestPath = path.join(projectRoot, 'test/runners/e2e/global-flags.manifest.js');
const pluginAddManifestPath = path.join(projectRoot, 'test/runners/e2e/plugin-add.manifest.js');
const pluginCreateManifestPath = path.join(projectRoot, 'test/runners/e2e/plugin-create.manifest.js');
const pluginDisableManifestPath = path.join(projectRoot, 'test/runners/e2e/plugin-disable.manifest.js');
const pluginEnableManifestPath = path.join(projectRoot, 'test/runners/e2e/plugin-enable.manifest.js');
const pluginListManifestPath = path.join(projectRoot, 'test/runners/e2e/plugin-list.manifest.js');
const pluginValidateManifestPath = path.join(projectRoot, 'test/runners/e2e/plugin-validate.manifest.js');

// Linting Unit Tests
const lintingTestsRoot = path.join(projectRoot, 'test/runners/linting/unit/');
const allLintingUnitTestPath = path.join(projectRoot, 'test/runners/linting/unit/all-linting-unit.test.js');
const codeLintingManifestPath = path.join(projectRoot, 'test/runners/linting/unit/code-linting.manifest.js');
const docsLintingManifestPath = path.join(projectRoot, 'test/runners/linting/unit/docs-linting.manifest.js');
const lintingUnitHarnessPath = path.join(projectRoot, 'test/runners/linting/unit/linting-unit-harness.js');
const testRunnerFactoryPath = path.join(projectRoot, 'test/runners/linting/unit/test-runner-factory.js');

// --- Rank 3: enhancements & utilities ---

// Shared Test Utilities & Helpers
const sharedUtilitiesRoot = path.join(projectRoot, 'test/runners/shared/');
const captureLogsPath = path.join(projectRoot, 'test/runners/shared/capture-logs.js');
const testHelpersPath = path.join(projectRoot, 'test/runners/shared/test-helpers.js');
const testLoggerPath = path.join(projectRoot, 'test/runners/shared/test-logger.js');

// ==========================================
// Exports
// ==========================================

module.exports = {

  // --- Architecture ---
  projectRoot,
  testRoot,
  setupFile,
  docsTestDir,
  e2eTestDir,
  fixturesDir,
  integrationTestDir,
  lintingTestDir,
  scriptsTestDir,
  sharedTestDir,
  smokeTestDir,
  e2eHarness,
  testRunnerFactoryE2e,
  lintingUnitHarness,
  testRunnerFactoryLinting,
  simpleMdFixture,
  simpleMdFixtureWithFm,
  hugoExampleFixturePath,
  refreshFixturesPath,
  createDummyPluginPath,

  // --- user-facing interfaces ---
  smokeRoot,
  smokeTestRunnerPath,
  smokeTestsManifestPath,
  testHarnessPath,
  workflowTestRunnerPath,
  workflowTestsYamlPath,
  coreIntegrationRoot,
  defaultHandlerFactoryPath,
  defaultHandlerManifestPath,
  defaultHandlerIntegrationTestPath,
  mathIntegrationFactoryPath,
  mathIntegrationManifestPath,
  mathIntegrationTestPath,
  pdfGeneratorFactoryPath,
  pdfGeneratorManifestPath,
  pdfGeneratorIntegrationTestPath,

  // --- essential operations ---
  configIntegrationRoot,
  configResolverConstructorManifestPath,
  configResolverFactoryPath,
  configResolverGetEffectiveConfigManifestPath,
  configResolverInitializeManifestPath,
  configResolverLoadPluginBaseConfigManifestPath,
  configResolverIntegrationTestPath,
  mainConfigLoaderConstructorManifestPath,
  mainConfigLoaderFactoryPath,
  mainConfigLoaderGettersManifestPath,
  mainConfigLoaderInitializeManifestPath,
  mainConfigLoaderIntegrationTestPath,
  pluginConfigLoaderApplyOverridesManifestPath,
  pluginConfigLoaderConstructorManifestPath,
  pluginConfigLoaderFactoryPath,
  pluginConfigLoaderLoadSingleLayerManifestPath,
  pluginConfigLoaderIntegrationTestPath,
  pluginsIntegrationRoot,
  pluginDeterminerFactoryPath,
  pluginDeterminerManifestPath,
  pluginDeterminerIntegrationTestPath,
  pluginManagerFactoryPath,
  pluginManagerManifestPath,
  pluginManagerIntegrationTestPath,
  pluginRegistryBuilderBuildRegistryManifestPath,
  pluginRegistryBuilderCmManifestsManifestPath,
  pluginRegistryBuilderConstructorManifestPath,
  pluginRegistryBuilderFactoryPath,
  pluginRegistryBuilderGetAllPluginDetailsManifestPath,
  pluginRegistryBuilderGetPluginRegistrationsFromFileManifestPath,
  pluginRegistryBuilderResolveAliasManifestPath,
  pluginRegistryBuilderResolvePluginConfigPathManifestPath,
  pluginRegistryBuilderIntegrationTestPath,
  pluginValidatorFactoryPath,
  pluginValidatorManifestPath,
  pluginValidatorIntegrationTestPath,
  collectionsIntegrationRoot,
  cmUtilsFactoryPath,
  cmUtilsManifestPath,
  cmUtilsIntegrationTestPath,
  collectionsManagerAddManifestPath,
  collectionsManagerConstructorManifestPath,
  collectionsManagerDisableManifestPath,
  collectionsManagerEnableDisableManifestPath,
  collectionsManagerFactoryPath,
  collectionsManagerListManifestPath,
  collectionsManagerRemoveManifestPath,
  collectionsManagerIntegrationTestPath,
  collectionsManagerUpdateManifestPath,
  e2eCoreRoot,
  allE2eTestPath,

  // --- supportive operations ---
  e2eManifestsRoot,
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
  lintingTestsRoot,
  allLintingUnitTestPath,
  codeLintingManifestPath,
  docsLintingManifestPath,
  lintingUnitHarnessPath,
  testRunnerFactoryPath,

  // --- enhancements & utilities ---
  sharedUtilitiesRoot,
  captureLogsPath,
  testHelpersPath,
  testLoggerPath,

};