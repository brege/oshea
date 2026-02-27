// paths/index.js
// index.js - Project Path Registry
// Generated: 2026-02-27T07:01:27.359Z
// Architecture: Feature-based with dependency ranking
// Regenerate: npm run paths
// Auto-generated - do not edit manually

const path = require('path');

// ==========================================
// Architecture
// ==========================================

// --- Project Foundation ---
const projectRoot = path.resolve(__dirname, '..');
const pathsPath = path.join(__dirname, 'index.js');
const packageJsonPath = path.join(projectRoot, 'package.json');
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const defaultConfigPath = path.join(projectRoot, 'config.yaml');
const factoryDefaultConfigPath = path.join(projectRoot, 'config.example.yaml');

// --- CLI & External Interfaces ---
const cliPath = path.join(projectRoot, 'cli.js');
const templateBasicPlugin = path.join(projectRoot, 'plugins', 'template-basic');

// --- Architectural Boundaries ---
const srcRoot = path.join(projectRoot, 'src');
const assetsRoot = path.join(projectRoot, 'assets');
const scriptsRoot = path.join(projectRoot, 'scripts');
const testRoot = path.join(projectRoot, 'test');

// --- Development & Build Tools ---
const mochaPath = path.join(nodeModulesPath, '.bin', 'mocha');
const mocharcPath = path.join(projectRoot, '.mocharc.js');

// --- Key Static File Paths ---
const pathsConfigPath = path.join(projectRoot, 'paths', 'paths-config.yaml');
const katexPath = path.join(nodeModulesPath, 'katex', 'dist', 'katex.min.css');
const basePluginSchemaPath = path.join(srcRoot, 'validators', 'base-plugin.schema.json');
const pluginInstallerPath = path.join(srcRoot, 'plugins', 'installer.js');

// --- Test Organization ---
const testRunnersDir = path.join(testRoot, 'runners');
const e2eTestDir = path.join(testRunnersDir, 'end-to-end');
const integrationTestDir = path.join(testRunnersDir, 'integration');

// --- Test Fixtures ---
const fixturesDir = path.join(testRunnersDir, 'fixtures');
const simpleMdFixture = path.join(fixturesDir, 'markdown/simple.md');
const simpleMdFixtureWithFm = path.join(fixturesDir, 'markdown/with-front-matter.md');
const hugoExampleFixturePath = path.join(fixturesDir, 'hugo-example');
const fixtureBootstrapPath = path.join(e2eTestDir, 'create-fixtures.js');

// --- Integration Testing Foundation ---
const setupFile = path.join(integrationTestDir, 'setup.js');
const testSharedRoot = path.join(integrationTestDir, 'shared');
const testConfigPath = path.join(testSharedRoot, 'config.test.yaml');
const testFileHelpersPath = path.join(testSharedRoot, 'test-helpers.js');

// ==========================================
// Features (by dependency rank)
// ==========================================

// --- Rank 0: user-facing interfaces ---

// Command Line Interface
const cliRoot = path.join(projectRoot, 'src/cli/');
const configCommandPath = path.join(projectRoot, 'src/cli/config.command.js');
const convertCommandPath = path.join(projectRoot, 'src/cli/convert.command.js');
const generateCommandPath = path.join(projectRoot, 'src/cli/generate.command.js');
const pluginCommandPath = path.join(projectRoot, 'src/cli/plugin.command.js');
const pluginAddCommandPath = path.join(projectRoot, 'src/cli/plugin/add.command.js');
const createCommandPath = path.join(projectRoot, 'src/cli/plugin/create.command.js');
const disableCommandPath = path.join(projectRoot, 'src/cli/plugin/disable.command.js');
const enableCommandPath = path.join(projectRoot, 'src/cli/plugin/enable.command.js');
const helpCommandPath = path.join(projectRoot, 'src/cli/plugin/help.command.js');
const pluginListCommandPath = path.join(projectRoot, 'src/cli/plugin/list.command.js');
const pluginRemoveCommandPath = path.join(projectRoot, 'src/cli/plugin/remove.command.js');
const validateCommandPath = path.join(projectRoot, 'src/cli/plugin/validate.command.js');

// Core Module Integration Tests
const coreIntegrationRoot = path.join(projectRoot, 'test/runners/integration/core/');
const defaultHandlerFactoryPath = path.join(projectRoot, 'test/runners/integration/core/default-handler.factory.js');
const defaultHandlerManifestPath = path.join(projectRoot, 'test/runners/integration/core/default-handler.manifest.js');
const defaultHandlerTestPath = path.join(projectRoot, 'test/runners/integration/core/default-handler.test.js');
const mathIntegrationFactoryPath = path.join(projectRoot, 'test/runners/integration/core/math-integration.factory.js');
const mathIntegrationManifestPath = path.join(projectRoot, 'test/runners/integration/core/math-integration.manifest.js');
const mathIntegrationTestPath = path.join(projectRoot, 'test/runners/integration/core/math-integration.test.js');
const pdfGeneratorFactoryPath = path.join(projectRoot, 'test/runners/integration/core/pdf-generator.factory.js');
const pdfGeneratorManifestPath = path.join(projectRoot, 'test/runners/integration/core/pdf-generator.manifest.js');
const pdfGeneratorTestPath = path.join(projectRoot, 'test/runners/integration/core/pdf-generator.test.js');

// --- Rank 1: essential operations ---

// Core Processing Engine
const coreRoot = path.join(projectRoot, 'src/core/');
const defaultHandlerPath = path.join(projectRoot, 'src/core/default-handler.js');
const markdownUtilsPath = path.join(projectRoot, 'src/core/markdown-utils.js');
const mathIntegrationPath = path.join(projectRoot, 'src/core/math-integration.js');
const pdfGeneratorPath = path.join(projectRoot, 'src/core/pdf-generator.js');
const watchHandlerPath = path.join(projectRoot, 'src/core/watch-handler.js');

// Configuration System
const configRoot = path.join(projectRoot, 'src/config/');
const configResolverPath = path.join(projectRoot, 'src/config/config-resolver.js');
const configUtilsPath = path.join(projectRoot, 'src/config/config-utils.js');
const mainConfigLoaderPath = path.join(projectRoot, 'src/config/main-config-loader.js');
const pluginConfigLoaderPath = path.join(projectRoot, 'src/config/plugin-config-loader.js');

// Configuration System Integration Tests
const configIntegrationRoot = path.join(projectRoot, 'test/runners/integration/config/');
const configResolverConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.constructor.manifest.js');
const configResolverFactoryPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.factory.js');
const configResolverGetEffectiveConfigManifestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.get-effective-config.manifest.js');
const configResolverInitializeManifestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.initialize.manifest.js');
const configResolverLoadPluginBaseConfigManifestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.load-plugin-base-config.manifest.js');
const configResolverTestPath = path.join(projectRoot, 'test/runners/integration/config/config-resolver.test.js');
const mainConfigLoaderConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.constructor.manifest.js');
const mainConfigLoaderFactoryPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.factory.js');
const mainConfigLoaderGettersManifestPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.getters.manifest.js');
const mainConfigLoaderInitializeManifestPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.initialize.manifest.js');
const mainConfigLoaderTestPath = path.join(projectRoot, 'test/runners/integration/config/main-config-loader.test.js');
const pluginConfigLoaderApplyOverridesManifestPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.apply-overrides.manifest.js');
const pluginConfigLoaderConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.constructor.manifest.js');
const pluginConfigLoaderFactoryPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.factory.js');
const pluginConfigLoaderLoadSingleLayerManifestPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.load-single-layer.manifest.js');
const pluginConfigLoaderTestPath = path.join(projectRoot, 'test/runners/integration/config/plugin-config-loader.test.js');

// Plugin System Integration Tests
const pluginsIntegrationRoot = path.join(projectRoot, 'test/runners/integration/plugins/');
const pluginDeterminerFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-determiner.factory.js');
const pluginDeterminerManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-determiner.manifest.js');
const pluginDeterminerTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-determiner.test.js');
const pluginManagerFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-manager.factory.js');
const pluginManagerManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-manager.manifest.js');
const pluginManagerTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-manager.test.js');
const pluginValidatorFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.factory.js');
const pluginValidatorManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.manifest.js');
const pluginValidatorTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.test.js');

// End-to-End CLI Tests
const e2eCliTestsRoot = path.join(projectRoot, 'test/runners/end-to-end/cli/');
const configManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/config.manifest.yaml');
const convertManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/convert.manifest.yaml');
const generateManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/generate.manifest.yaml');
const globalFlagsManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/global-flags.manifest.yaml');
const pluginAddManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/plugin-add.manifest.yaml');
const pluginCreateManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/plugin-create.manifest.yaml');
const pluginDisableManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/plugin-disable.manifest.yaml');
const pluginEnableManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/plugin-enable.manifest.yaml');
const pluginListManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/plugin-list.manifest.yaml');
const pluginRemoveManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/plugin-remove.manifest.yaml');
const pluginValidateManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/plugin-validate.manifest.yaml');

// --- Rank 2: supportive operations ---

// Plugin System
const pluginsRoot = path.join(projectRoot, 'src/plugins/');
const installerPath = path.join(projectRoot, 'src/plugins/installer.js');
const pluginArchetyperPath = path.join(projectRoot, 'src/plugins/plugin-archetyper.js');
const pluginDeterminerPath = path.join(projectRoot, 'src/plugins/plugin-determiner.js');
const pluginHelpPath = path.join(projectRoot, 'src/plugins/plugin-help.js');
const pluginManagerPath = path.join(projectRoot, 'src/plugins/plugin-manager.js');
const pluginRegistryBuilderPath = path.join(projectRoot, 'src/plugins/plugin-registry-builder.js');
const pluginValidatorPath = path.join(projectRoot, 'src/plugins/plugin-validator.js');

// Validation Framework
const validatorsRoot = path.join(projectRoot, 'src/validators/');
const v1Path = path.join(projectRoot, 'src/validators/v1.js');

// End-to-End Workflow Tests
const e2eWorkflowTestsRoot = path.join(projectRoot, 'test/runners/end-to-end/workflows/');
const demoHugoBatchConvertManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/workflows/demo-hugo-batch-convert.manifest.yaml');
const workflowsManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/workflows/workflows.manifest.yaml');

// End-to-End Bundled Plugin Tests
const e2eValidatorTestsRoot = path.join(projectRoot, 'test/runners/end-to-end/validators/');
const bundledPluginsManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/validators/bundled-plugins.manifest.yaml');

// End-to-End Test Runners
const e2eRunnersRoot = path.join(projectRoot, 'test/runners/end-to-end/');
const createFixturesPath = path.join(projectRoot, 'test/runners/end-to-end/create-fixtures.js');
const e2eHelpersPath = path.join(projectRoot, 'test/runners/end-to-end/e2e-helpers.js');
const e2eMochaTestPath = path.join(projectRoot, 'test/runners/end-to-end/e2e-mocha.test.js');
const e2eRunnerPath = path.join(projectRoot, 'test/runners/end-to-end/e2e-runner.js');

// --- Rank 3: enhancements & utilities ---

// CLI Completion Engine
const completionRoot = path.join(projectRoot, 'src/completion/');
const cliTreeBuilderPath = path.join(projectRoot, 'src/completion/cli-tree-builder.js');
const enginePath = path.join(projectRoot, 'src/completion/engine.js');
const generateCompletionCachePath = path.join(projectRoot, 'src/completion/generate-completion-cache.js');
const generateCompletionDynamicCachePath = path.join(projectRoot, 'src/completion/generate-completion-dynamic-cache.js');
const trackerPath = path.join(projectRoot, 'src/completion/tracker.js');

// Utilities & Helpers
const utilsRoot = path.join(projectRoot, 'src/utils/');
const assetResolverPath = path.join(projectRoot, 'src/utils/asset-resolver.js');
const fileHelpersPath = path.join(projectRoot, 'src/utils/file-helpers.js');
const loggerEnhancerPath = path.join(projectRoot, 'src/utils/logger-enhancer.js');
const loggerSurfacerPath = path.join(projectRoot, 'src/utils/logger-surfacer.js');
const loggerPath = path.join(projectRoot, 'src/utils/logger.js');
const appFormatterPath = path.join(projectRoot, 'src/utils/formatters/app.formatter.js');
const colorThemePath = path.join(projectRoot, 'src/utils/formatters/color-theme.js');
const configFormatterPath = path.join(projectRoot, 'src/utils/formatters/config.formatter.js');
const formattersIndexPath = path.join(projectRoot, 'src/utils/formatters/index.js');
const inlineFormatterPath = path.join(projectRoot, 'src/utils/formatters/inline.formatter.js');
const jsFormatterPath = path.join(projectRoot, 'src/utils/formatters/js.formatter.js');
const pathsFormatterPath = path.join(projectRoot, 'src/utils/formatters/paths.formatter.js');
const pluginListFormatterPath = path.join(projectRoot, 'src/utils/formatters/plugin-list.formatter.js');
const rawFormatterPath = path.join(projectRoot, 'src/utils/formatters/raw.formatter.js');
const tableFormatterPath = path.join(projectRoot, 'src/utils/formatters/table.formatter.js');
const validationFormatterPath = path.join(projectRoot, 'src/utils/formatters/validation.formatter.js');
const yamlTestFormatterPath = path.join(projectRoot, 'src/utils/formatters/yaml-test.formatter.js');

// Shared Test Utilities & Helpers
const sharedUtilitiesRoot = path.join(projectRoot, 'test/runners/integration/shared/');
const captureLogsPath = path.join(projectRoot, 'test/runners/integration/shared/capture-logs.js');
const testHelpersPath = path.join(projectRoot, 'test/runners/integration/shared/test-helpers.js');
const testLoggerPath = path.join(projectRoot, 'test/runners/integration/shared/test-logger.js');

// ==========================================
// Exports
// ==========================================

module.exports = {

  // --- Architecture ---
  projectRoot,
  pathsPath,
  packageJsonPath,
  nodeModulesPath,
  defaultConfigPath,
  factoryDefaultConfigPath,
  cliPath,
  templateBasicPlugin,
  srcRoot,
  assetsRoot,
  scriptsRoot,
  testRoot,
  mochaPath,
  mocharcPath,
  pathsConfigPath,
  katexPath,
  basePluginSchemaPath,
  pluginInstallerPath,
  testRunnersDir,
  e2eTestDir,
  integrationTestDir,
  fixturesDir,
  simpleMdFixture,
  simpleMdFixtureWithFm,
  hugoExampleFixturePath,
  fixtureBootstrapPath,
  setupFile,
  testSharedRoot,
  testConfigPath,
  testFileHelpersPath,

  // --- user-facing interfaces ---
  cliRoot,
  configCommandPath,
  convertCommandPath,
  generateCommandPath,
  pluginCommandPath,
  pluginAddCommandPath,
  createCommandPath,
  disableCommandPath,
  enableCommandPath,
  helpCommandPath,
  pluginListCommandPath,
  pluginRemoveCommandPath,
  validateCommandPath,
  coreIntegrationRoot,
  defaultHandlerFactoryPath,
  defaultHandlerManifestPath,
  defaultHandlerTestPath,
  mathIntegrationFactoryPath,
  mathIntegrationManifestPath,
  mathIntegrationTestPath,
  pdfGeneratorFactoryPath,
  pdfGeneratorManifestPath,
  pdfGeneratorTestPath,

  // --- essential operations ---
  coreRoot,
  defaultHandlerPath,
  markdownUtilsPath,
  mathIntegrationPath,
  pdfGeneratorPath,
  watchHandlerPath,
  configRoot,
  configResolverPath,
  configUtilsPath,
  mainConfigLoaderPath,
  pluginConfigLoaderPath,
  configIntegrationRoot,
  configResolverConstructorManifestPath,
  configResolverFactoryPath,
  configResolverGetEffectiveConfigManifestPath,
  configResolverInitializeManifestPath,
  configResolverLoadPluginBaseConfigManifestPath,
  configResolverTestPath,
  mainConfigLoaderConstructorManifestPath,
  mainConfigLoaderFactoryPath,
  mainConfigLoaderGettersManifestPath,
  mainConfigLoaderInitializeManifestPath,
  mainConfigLoaderTestPath,
  pluginConfigLoaderApplyOverridesManifestPath,
  pluginConfigLoaderConstructorManifestPath,
  pluginConfigLoaderFactoryPath,
  pluginConfigLoaderLoadSingleLayerManifestPath,
  pluginConfigLoaderTestPath,
  pluginsIntegrationRoot,
  pluginDeterminerFactoryPath,
  pluginDeterminerManifestPath,
  pluginDeterminerTestPath,
  pluginManagerFactoryPath,
  pluginManagerManifestPath,
  pluginManagerTestPath,
  pluginValidatorFactoryPath,
  pluginValidatorManifestPath,
  pluginValidatorTestPath,
  e2eCliTestsRoot,
  configManifestYamlPath,
  convertManifestYamlPath,
  generateManifestYamlPath,
  globalFlagsManifestYamlPath,
  pluginAddManifestYamlPath,
  pluginCreateManifestYamlPath,
  pluginDisableManifestYamlPath,
  pluginEnableManifestYamlPath,
  pluginListManifestYamlPath,
  pluginRemoveManifestYamlPath,
  pluginValidateManifestYamlPath,

  // --- supportive operations ---
  pluginsRoot,
  installerPath,
  pluginArchetyperPath,
  pluginDeterminerPath,
  pluginHelpPath,
  pluginManagerPath,
  pluginRegistryBuilderPath,
  pluginValidatorPath,
  validatorsRoot,
  v1Path,
  e2eWorkflowTestsRoot,
  demoHugoBatchConvertManifestYamlPath,
  workflowsManifestYamlPath,
  e2eValidatorTestsRoot,
  bundledPluginsManifestYamlPath,
  e2eRunnersRoot,
  createFixturesPath,
  e2eHelpersPath,
  e2eMochaTestPath,
  e2eRunnerPath,

  // --- enhancements & utilities ---
  completionRoot,
  cliTreeBuilderPath,
  enginePath,
  generateCompletionCachePath,
  generateCompletionDynamicCachePath,
  trackerPath,
  utilsRoot,
  assetResolverPath,
  fileHelpersPath,
  loggerEnhancerPath,
  loggerSurfacerPath,
  loggerPath,
  appFormatterPath,
  colorThemePath,
  configFormatterPath,
  formattersIndexPath,
  inlineFormatterPath,
  jsFormatterPath,
  pathsFormatterPath,
  pluginListFormatterPath,
  rawFormatterPath,
  tableFormatterPath,
  validationFormatterPath,
  yamlTestFormatterPath,
  sharedUtilitiesRoot,
  captureLogsPath,
  testHelpersPath,
  testLoggerPath,

};