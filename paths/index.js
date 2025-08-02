// paths/index.js
// index.js - Project Path Registry
// Generated: 2025-08-02T22:56:40.946Z
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
const cliCommandsPath = path.join(srcRoot, 'cli', 'commands');
const collectionsCommandsRoot = path.join(srcRoot, 'collections', 'commands');

// --- Development & Build Tools ---
const scriptsSharedRoot = path.join(scriptsRoot, 'shared');
const eslintPath = path.join(nodeModulesPath, '.bin', 'eslint');
const mochaPath = path.join(nodeModulesPath, '.bin', 'mocha');
const mocharcPath = path.join(projectRoot, '.mocharc.js');

// --- Key Static File Paths ---
const pathsConfigPath = path.join(projectRoot, 'paths', 'paths-config.yaml');
const katexPath = path.join(assetsRoot, 'katex.min.css');
const findLitterRulesPath = path.join(assetsRoot, 'litter-list.txt');
const basePluginSchemaPath = path.join(srcRoot, 'validators', 'base-plugin.schema.json');
const lintingConfigPath = path.join(scriptsRoot, 'linting', 'linting-config.yaml');

// --- Collections System Constants ---
const collectionsMetadataFilename = '.collection-metadata.yaml';
const collectionsEnabledManifestFilename = 'enabled.yaml';
const collectionsDefaultArchetypeDirname = 'user-plugins';
const collectionsUserPluginsDirname = 'user-plugins';

// --- Test Organization ---
const testRunnersDir = path.join(testRoot, 'runners');
const e2eTestDir = path.join(testRunnersDir, 'end-to-end');
const integrationTestDir = path.join(testRunnersDir, 'integration');
const lintingTestDir = path.join(testRunnersDir, 'linting');

// --- Test Fixtures ---
const fixturesDir = path.join(testRunnersDir, 'fixtures');
const simpleMdFixture = path.join(fixturesDir, 'markdown/simple.md');
const simpleMdFixtureWithFm = path.join(fixturesDir, 'markdown/with-front-matter.md');
const hugoExampleFixturePath = path.join(fixturesDir, 'hugo-example');
const refreshFixturesPath = path.join(fixturesDir, 'refresh-fixtures.js');
const createDummyPluginPath = path.join(fixturesDir, 'create-dummy-plugin.js');

// --- Integration Testing Foundation ---
const setupFile = path.join(integrationTestDir, 'setup.js');
const testSharedRoot = path.join(integrationTestDir, 'shared');
const testConfigPath = path.join(testSharedRoot, 'config.test.yaml');
const testFileHelpersPath = path.join(testSharedRoot, 'test-helpers.js');

// --- Linting Infrastructure Foundation ---
const lintingDir = path.join(testRunnersDir, 'linting');
const lintingUnitHarness = path.join(lintingDir, 'linting-unit-harness.js');
const lintingTestRunnerFactory = path.join(lintingDir, 'test-runner-factory.js');

// ==========================================
// Features (by dependency rank)
// ==========================================

// --- Rank 0: user-facing interfaces ---

// Command Line Interface
const cliRoot = path.join(projectRoot, 'src/cli/');
const collectionCommandPath = path.join(projectRoot, 'src/cli/commands/collection.command.js');
const configCommandPath = path.join(projectRoot, 'src/cli/commands/config.command.js');
const convertCommandPath = path.join(projectRoot, 'src/cli/commands/convert.command.js');
const generateCommandPath = path.join(projectRoot, 'src/cli/commands/generate.command.js');
const pluginCommandPath = path.join(projectRoot, 'src/cli/commands/plugin.command.js');
const updateCommandPath = path.join(projectRoot, 'src/cli/commands/update.command.js');
const collectionsAddCommandPath = path.join(projectRoot, 'src/cli/commands/collection/add.command.js');
const pluginAddCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/add.command.js');
const createCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/create.command.js');
const disableCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/disable.command.js');
const enableCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/enable.command.js');
const helpCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/help.command.js');
const collectionsListCommandPath = path.join(projectRoot, 'src/cli/commands/collection/list.command.js');
const pluginListCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/list.command.js');
const collectionsRemoveCommandPath = path.join(projectRoot, 'src/cli/commands/collection/remove.command.js');
const pluginRemoveCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/remove.command.js');
const collectionsUpdateCommandPath = path.join(projectRoot, 'src/cli/commands/collection/update.command.js');
const validateCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/validate.command.js');

// AI Tooling
const aiRoot = path.join(projectRoot, 'scripts/ai/');
const aiContextGeneratorPath = path.join(projectRoot, 'scripts/ai/ai-context-generator.js');

// Core Linting Infrastructure
const lintingCoreRoot = path.join(projectRoot, 'scripts/linting/');
const lintHarnessPath = path.join(projectRoot, 'scripts/linting/lint-harness.js');
const lintPath = path.join(projectRoot, 'scripts/linting/lint.js');

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

// Batch Processing Scripts
const batchRoot = path.join(projectRoot, 'scripts/batch/');
const batchConvertHugoRecipesShPath = path.join(projectRoot, 'scripts/batch/batch_convert_hugo_recipes.sh');
const batchConvertHugoRecipesPath = path.join(projectRoot, 'scripts/batch/batch-convert-hugo-recipes.js');
const makeScreenshotsShPath = path.join(projectRoot, 'scripts/batch/make-screenshots.sh');

// Documentation Helpers
const docsRoot = path.join(projectRoot, 'scripts/docs/');
const generateTocPath = path.join(projectRoot, 'scripts/docs/generate-toc.js');

// Code Quality Linters
const lintingCodeRoot = path.join(projectRoot, 'scripts/linting/code/');
const noBadHeadersPath = path.join(projectRoot, 'scripts/linting/code/no-bad-headers.js');
const noConsolePath = path.join(projectRoot, 'scripts/linting/code/no-console.js');
const noJsdocPath = path.join(projectRoot, 'scripts/linting/code/no-jsdoc.js');
const noRelativePathsPath = path.join(projectRoot, 'scripts/linting/code/no-relative-paths.js');
const noTrailingWhitespacePath = path.join(projectRoot, 'scripts/linting/code/no-trailing-whitespace.js');

// Documentation Linters
const lintingDocsRoot = path.join(projectRoot, 'scripts/linting/docs/');
const janitorPath = path.join(projectRoot, 'scripts/linting/docs/janitor.js');
const librarianPath = path.join(projectRoot, 'scripts/linting/docs/librarian.js');
const postmanPath = path.join(projectRoot, 'scripts/linting/docs/postman.js');
const yamlPath = path.join(projectRoot, 'scripts/linting/docs/yaml.js');

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
const pluginRegistryBuilderBuildRegistryManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.build-registry.manifest.js');
const pluginRegistryBuilderCmManifestsManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.cm-manifests.manifest.js');
const pluginRegistryBuilderConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.constructor.manifest.js');
const pluginRegistryBuilderFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.factory.js');
const pluginRegistryBuilderGetAllPluginDetailsManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.get-all-plugin-details.manifest.js');
const pluginRegistryBuilderGetPluginRegistrationsFromFileManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.get-plugin-registrations-from-file.manifest.js');
const pluginRegistryBuilderResolveAliasManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.resolve-alias.manifest.js');
const pluginRegistryBuilderResolvePluginConfigPathManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.resolve-plugin-config-path.manifest.js');
const pluginRegistryBuilderTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-registry-builder.test.js');
const pluginValidatorFactoryPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.factory.js');
const pluginValidatorManifestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.manifest.js');
const pluginValidatorTestPath = path.join(projectRoot, 'test/runners/integration/plugins/plugin-validator.test.js');

// Collections System Integration Tests
const collectionsIntegrationRoot = path.join(projectRoot, 'test/runners/integration/collections/');
const cmUtilsFactoryPath = path.join(projectRoot, 'test/runners/integration/collections/cm-utils.factory.js');
const cmUtilsManifestPath = path.join(projectRoot, 'test/runners/integration/collections/cm-utils.manifest.js');
const cmUtilsTestPath = path.join(projectRoot, 'test/runners/integration/collections/cm-utils.test.js');
const collectionsManagerAddManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.add.manifest.js');
const collectionsManagerConstructorManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.constructor.manifest.js');
const collectionsManagerDisableManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.disable.manifest.js');
const collectionsManagerEnableDisableManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.enable-disable.manifest.js');
const collectionsManagerFactoryPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.factory.js');
const collectionsManagerListManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.list.manifest.js');
const collectionsManagerRemoveManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.remove.manifest.js');
const collectionsManagerTestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.test.js');
const collectionsManagerUpdateManifestPath = path.join(projectRoot, 'test/runners/integration/collections/collections-manager.update.manifest.js');

// End-to-End CLI Tests
const e2eCliTestsRoot = path.join(projectRoot, 'test/runners/end-to-end/cli/');
const collectionAddManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/collection-add.manifest.yaml');
const collectionListManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/collection-list.manifest.yaml');
const collectionRemoveManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/collection-remove.manifest.yaml');
const collectionUpdateManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/cli/collection-update.manifest.yaml');
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
const pluginArchetyperPath = path.join(projectRoot, 'src/plugins/plugin-archetyper.js');
const pluginDeterminerPath = path.join(projectRoot, 'src/plugins/plugin-determiner.js');
const pluginHelpPath = path.join(projectRoot, 'src/plugins/plugin-help.js');
const pluginManagerPath = path.join(projectRoot, 'src/plugins/plugin-manager.js');
const pluginRegistryBuilderPath = path.join(projectRoot, 'src/plugins/plugin-registry-builder.js');
const validatorPath = path.join(projectRoot, 'src/plugins/validator.js');

// Collections Management
const collectionsRoot = path.join(projectRoot, 'src/collections/');
const cmUtilsPath = path.join(projectRoot, 'src/collections/cm-utils.js');
const collectionsIndexPath = path.join(projectRoot, 'src/collections/index.js');
const addSingletonPath = path.join(projectRoot, 'src/collections/commands/add-singleton.js');
const addPath = path.join(projectRoot, 'src/collections/commands/add.js');
const disablePath = path.join(projectRoot, 'src/collections/commands/disable.js');
const enableAllPath = path.join(projectRoot, 'src/collections/commands/enable-all.js');
const enablePath = path.join(projectRoot, 'src/collections/commands/enable.js');
const listAvailablePath = path.join(projectRoot, 'src/collections/commands/list-available.js');
const listPath = path.join(projectRoot, 'src/collections/commands/list.js');
const removePath = path.join(projectRoot, 'src/collections/commands/remove.js');
const updateAllPath = path.join(projectRoot, 'src/collections/commands/update-all.js');
const updatePath = path.join(projectRoot, 'src/collections/commands/update.js');

// Validation Framework
const validatorsRoot = path.join(projectRoot, 'src/validators/');
const v1Path = path.join(projectRoot, 'src/validators/v1.js');

// Shared Script Utilities
const scriptSharedRoot = path.join(projectRoot, 'scripts/shared/');
const fileHelpersPath = path.join(projectRoot, 'scripts/shared/file-helpers.js');
const loggerSurfacerPath = path.join(projectRoot, 'scripts/shared/logger-surfacer.js');
const pathFinderPath = path.join(projectRoot, 'scripts/shared/path-finder.js');

// Validation Linters
const lintingValidatorsRoot = path.join(projectRoot, 'scripts/linting/validators/');
const mochaPathValidatorPath = path.join(projectRoot, 'scripts/linting/validators/mocha-path-validator.js');

// End-to-End Workflow Tests
const e2eWorkflowTestsRoot = path.join(projectRoot, 'test/runners/end-to-end/workflows/');
const demoHugoBatchConvertManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/workflows/demo-hugo-batch-convert.manifest.yaml');
const workflowsManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/workflows/workflows.manifest.yaml');

// End-to-End Bundled Plugin Tests
const e2eValidatorTestsRoot = path.join(projectRoot, 'test/runners/end-to-end/validators/');
const bundledPluginsManifestYamlPath = path.join(projectRoot, 'test/runners/end-to-end/validators/bundled-plugins.manifest.yaml');

// End-to-End Test Runners
const e2eRunnersRoot = path.join(projectRoot, 'test/runners/end-to-end/');
const e2eHelpersPath = path.join(projectRoot, 'test/runners/end-to-end/e2e-helpers.js');
const e2eMochaTestPath = path.join(projectRoot, 'test/runners/end-to-end/e2e-mocha.test.js');
const e2eRunnerPath = path.join(projectRoot, 'test/runners/end-to-end/e2e-runner.js');

// Linting Tests
const lintingTestsRoot = path.join(projectRoot, 'test/runners/linting/');
const allLintingTestPath = path.join(projectRoot, 'test/runners/linting/all-linting.test.js');
const codeLintingManifestPath = path.join(projectRoot, 'test/runners/linting/code-linting.manifest.js');
const docsLintingManifestPath = path.join(projectRoot, 'test/runners/linting/docs-linting.manifest.js');
const lintingUnitHarnessPath = path.join(projectRoot, 'test/runners/linting/linting-unit-harness.js');
const testRunnerFactoryPath = path.join(projectRoot, 'test/runners/linting/test-runner-factory.js');

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
const loggerEnhancerPath = path.join(projectRoot, 'src/utils/logger-enhancer.js');
const loggerPath = path.join(projectRoot, 'src/utils/logger.js');
const appFormatterPath = path.join(projectRoot, 'src/utils/formatters/app-formatter.js');
const collectionListFormatterPath = path.join(projectRoot, 'src/utils/formatters/collection-list-formatter.js');
const colorThemePath = path.join(projectRoot, 'src/utils/formatters/color-theme.js');
const configFormatterPath = path.join(projectRoot, 'src/utils/formatters/config-formatter.js');
const formattersIndexPath = path.join(projectRoot, 'src/utils/formatters/index.js');
const inlineFormatterPath = path.join(projectRoot, 'src/utils/formatters/inline-formatter.js');
const lintFormatterPath = path.join(projectRoot, 'src/utils/formatters/lint-formatter.js');
const pathsFormatterPath = path.join(projectRoot, 'src/utils/formatters/paths-formatter.js');
const pluginListFormatterPath = path.join(projectRoot, 'src/utils/formatters/plugin-list-formatter.js');
const rawFormatterPath = path.join(projectRoot, 'src/utils/formatters/raw-formatter.js');
const tableFormatterPath = path.join(projectRoot, 'src/utils/formatters/table-formatter.js');
const validationFormatterPath = path.join(projectRoot, 'src/utils/formatters/validation-formatter.js');
const yamlTestFormatterPath = path.join(projectRoot, 'src/utils/formatters/yaml-test-formatter.js');

// Linting Utilities & Helpers
const lintingLibRoot = path.join(projectRoot, 'scripts/linting/lib/');
const dataAdaptersPath = path.join(projectRoot, 'scripts/linting/lib/data-adapters.js');
const fileDiscoveryPath = path.join(projectRoot, 'scripts/linting/lib/file-discovery.js');
const findLintSkipsPath = path.join(projectRoot, 'scripts/linting/lib/find-lint-skips.js');
const lintHelpersPath = path.join(projectRoot, 'scripts/linting/lib/lint-helpers.js');
const skipSystemPath = path.join(projectRoot, 'scripts/linting/lib/skip-system.js');
const visualRenderersPath = path.join(projectRoot, 'scripts/linting/lib/visual-renderers.js');

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
  cliCommandsPath,
  collectionsCommandsRoot,
  scriptsSharedRoot,
  eslintPath,
  mochaPath,
  mocharcPath,
  pathsConfigPath,
  katexPath,
  findLitterRulesPath,
  basePluginSchemaPath,
  lintingConfigPath,
  collectionsMetadataFilename,
  collectionsEnabledManifestFilename,
  collectionsDefaultArchetypeDirname,
  collectionsUserPluginsDirname,
  testRunnersDir,
  e2eTestDir,
  integrationTestDir,
  lintingTestDir,
  fixturesDir,
  simpleMdFixture,
  simpleMdFixtureWithFm,
  hugoExampleFixturePath,
  refreshFixturesPath,
  createDummyPluginPath,
  setupFile,
  testSharedRoot,
  testConfigPath,
  testFileHelpersPath,
  lintingDir,
  lintingUnitHarness,
  lintingTestRunnerFactory,

  // --- user-facing interfaces ---
  cliRoot,
  collectionCommandPath,
  configCommandPath,
  convertCommandPath,
  generateCommandPath,
  pluginCommandPath,
  updateCommandPath,
  collectionsAddCommandPath,
  pluginAddCommandPath,
  createCommandPath,
  disableCommandPath,
  enableCommandPath,
  helpCommandPath,
  collectionsListCommandPath,
  pluginListCommandPath,
  collectionsRemoveCommandPath,
  pluginRemoveCommandPath,
  collectionsUpdateCommandPath,
  validateCommandPath,
  aiRoot,
  aiContextGeneratorPath,
  lintingCoreRoot,
  lintHarnessPath,
  lintPath,
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
  batchRoot,
  batchConvertHugoRecipesShPath,
  batchConvertHugoRecipesPath,
  makeScreenshotsShPath,
  docsRoot,
  generateTocPath,
  lintingCodeRoot,
  noBadHeadersPath,
  noConsolePath,
  noJsdocPath,
  noRelativePathsPath,
  noTrailingWhitespacePath,
  lintingDocsRoot,
  janitorPath,
  librarianPath,
  postmanPath,
  yamlPath,
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
  pluginRegistryBuilderBuildRegistryManifestPath,
  pluginRegistryBuilderCmManifestsManifestPath,
  pluginRegistryBuilderConstructorManifestPath,
  pluginRegistryBuilderFactoryPath,
  pluginRegistryBuilderGetAllPluginDetailsManifestPath,
  pluginRegistryBuilderGetPluginRegistrationsFromFileManifestPath,
  pluginRegistryBuilderResolveAliasManifestPath,
  pluginRegistryBuilderResolvePluginConfigPathManifestPath,
  pluginRegistryBuilderTestPath,
  pluginValidatorFactoryPath,
  pluginValidatorManifestPath,
  pluginValidatorTestPath,
  collectionsIntegrationRoot,
  cmUtilsFactoryPath,
  cmUtilsManifestPath,
  cmUtilsTestPath,
  collectionsManagerAddManifestPath,
  collectionsManagerConstructorManifestPath,
  collectionsManagerDisableManifestPath,
  collectionsManagerEnableDisableManifestPath,
  collectionsManagerFactoryPath,
  collectionsManagerListManifestPath,
  collectionsManagerRemoveManifestPath,
  collectionsManagerTestPath,
  collectionsManagerUpdateManifestPath,
  e2eCliTestsRoot,
  collectionAddManifestYamlPath,
  collectionListManifestYamlPath,
  collectionRemoveManifestYamlPath,
  collectionUpdateManifestYamlPath,
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
  pluginArchetyperPath,
  pluginDeterminerPath,
  pluginHelpPath,
  pluginManagerPath,
  pluginRegistryBuilderPath,
  validatorPath,
  collectionsRoot,
  cmUtilsPath,
  collectionsIndexPath,
  addSingletonPath,
  addPath,
  disablePath,
  enableAllPath,
  enablePath,
  listAvailablePath,
  listPath,
  removePath,
  updateAllPath,
  updatePath,
  validatorsRoot,
  v1Path,
  scriptSharedRoot,
  fileHelpersPath,
  loggerSurfacerPath,
  pathFinderPath,
  lintingValidatorsRoot,
  mochaPathValidatorPath,
  e2eWorkflowTestsRoot,
  demoHugoBatchConvertManifestYamlPath,
  workflowsManifestYamlPath,
  e2eValidatorTestsRoot,
  bundledPluginsManifestYamlPath,
  e2eRunnersRoot,
  e2eHelpersPath,
  e2eMochaTestPath,
  e2eRunnerPath,
  lintingTestsRoot,
  allLintingTestPath,
  codeLintingManifestPath,
  docsLintingManifestPath,
  lintingUnitHarnessPath,
  testRunnerFactoryPath,

  // --- enhancements & utilities ---
  completionRoot,
  cliTreeBuilderPath,
  enginePath,
  generateCompletionCachePath,
  generateCompletionDynamicCachePath,
  trackerPath,
  utilsRoot,
  assetResolverPath,
  loggerEnhancerPath,
  loggerPath,
  appFormatterPath,
  collectionListFormatterPath,
  colorThemePath,
  configFormatterPath,
  formattersIndexPath,
  inlineFormatterPath,
  lintFormatterPath,
  pathsFormatterPath,
  pluginListFormatterPath,
  rawFormatterPath,
  tableFormatterPath,
  validationFormatterPath,
  yamlTestFormatterPath,
  lintingLibRoot,
  dataAdaptersPath,
  fileDiscoveryPath,
  findLintSkipsPath,
  lintHelpersPath,
  skipSystemPath,
  visualRenderersPath,
  sharedUtilitiesRoot,
  captureLogsPath,
  testHelpersPath,
  testLoggerPath,

};