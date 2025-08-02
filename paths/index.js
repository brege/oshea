// paths/index.js
// index.js - Project Path Registry (Flattened)
// Generated: 2025-08-02T02:15:57.163Z
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
const configExamplePath = path.join(projectRoot, 'config.example.yaml');
const defaultConfigPath = path.join(projectRoot, 'config.yaml');
const factoryDefaultConfigPath = path.join(projectRoot, 'config.example.yaml');

// --- CLI & External Interfaces ---
const cliPath = path.join(projectRoot, 'cli.js');
const templateBasicPlugin = path.join(projectRoot, 'plugins', 'template-basic');

// --- Architectural Boundaries ---
const srcRoot = path.join(projectRoot, 'src');
const assetsRoot = path.join(projectRoot, 'assets');
const scriptsRoot = path.join(projectRoot, 'scripts');
const testRoot = path.join(projectRoot, 'test', 'runners');
const cliCommandsPath = path.join(srcRoot, 'cli', 'commands');
const collectionsCommandsRoot = path.join(srcRoot, 'collections', 'commands');
const scriptsSharedRoot = path.join(scriptsRoot, 'shared');
const testSharedRoot = path.join(testRoot, 'shared');

// --- Development & Build Tools ---
const eslintPath = path.join(nodeModulesPath, '.bin', 'eslint');
const mochaPath = path.join(nodeModulesPath, '.bin', 'mocha');
const mocharcPath = path.join(projectRoot, '.mocharc.js');
const testFileHelpersPath = path.join(testSharedRoot, 'test-helpers.js');

// --- Key Static File Paths ---
const pathsConfigPath = path.join(projectRoot, 'paths', 'paths-config.yaml');
const katexPath = path.join(assetsRoot, 'katex.min.css');
const basePluginSchemaPath = path.join(srcRoot, 'validators', 'base-plugin.schema.json');
const findLitterRulesPath = path.join(assetsRoot, 'litter-list.txt');
const lintingConfigPath = path.join(scriptsRoot, 'linting', 'linting-config.yaml');
const testConfigPath = path.join(testRoot, 'shared', 'config.test.yaml');

// --- Collections System Constants ---
const collectionsMetadataFilename = '.collection-metadata.yaml';
const collectionsEnabledManifestFilename = 'enabled.yaml';
const collectionsUserPluginsDirname = '_user_added_plugins';
const collectionsDefaultArchetypeDirname = 'user-plugins';

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
const setupFile = path.join(testRoot, 'setup.js');

// --- Test Fixtures ---
const simpleMdFixture = path.join(fixturesDir, 'markdown/simple.md');
const simpleMdFixtureWithFm = path.join(fixturesDir, 'markdown/with-front-matter.md');
const hugoExampleFixturePath = path.join(fixturesDir, 'hugo-example');
const refreshFixturesPath = path.join(fixturesDir, 'refresh-fixtures.js');
const createDummyPluginPath = path.join(fixturesDir, 'create-dummy-plugin.js');

// --- Linting Infrastructure Foundation ---
const lintingRoot = path.join(scriptsRoot, 'linting');

// ==========================================
// Features (by dependency rank)
// ==========================================

// --- Rank 0: user-facing interfaces ---

// Command Line Interface
const cliRoot = path.join(projectRoot, 'src/cli/');
const configDisplayPath = path.join(projectRoot, 'src/cli/config-display.js');
const getHelpPath = path.join(projectRoot, 'src/cli/get-help.js');
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
const removeCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/remove.command.js');
const collectionsUpdateCommandPath = path.join(projectRoot, 'src/cli/commands/collection/update.command.js');
const validateCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/validate.command.js');

// AI Tooling
const aiRoot = path.join(projectRoot, 'scripts/ai/');
const aiContextGeneratorPath = path.join(projectRoot, 'scripts/ai/ai-context-generator.js');

// Core Linting Infrastructure
const lintingCoreRoot = path.join(projectRoot, 'scripts/linting/lint*.js');
const lintHarnessPath = path.join(projectRoot, 'scripts/linting/lint-harness.js');
const lintPath = path.join(projectRoot, 'scripts/linting/lint.js');

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

// YAML-driven Workflow Tests
const yamlWorkflowTestsRoot = path.join(projectRoot, 'test/runners/smoke/workflows/*.yaml');
const demoHugoBatchConvertManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/workflows/demo-hugo-batch-convert.manifest.yaml');
const workflowsManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/workflows/workflows.manifest.yaml');

// YAML-driven Bundled Plugin Tests
const yamlValidatorTestsRoot = path.join(projectRoot, 'test/runners/smoke/validators/*.yaml');
const bundledPluginsManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/validators/bundled-plugins.manifest.yaml');

// YAML-driven End-to-End Tests
const yamlTestsRoot = path.join(projectRoot, 'test/runners/smoke/*.manifest.yaml');
const collectionAddManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/collection-add.manifest.yaml');
const collectionListManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/collection-list.manifest.yaml');
const collectionRemoveManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/collection-remove.manifest.yaml');
const collectionUpdateManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/collection-update.manifest.yaml');
const configManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/config.manifest.yaml');
const convertManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/convert.manifest.yaml');
const generateManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/generate.manifest.yaml');
const globalFlagsManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/global-flags.manifest.yaml');
const pluginAddManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/plugin-add.manifest.yaml');
const pluginCreateManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/plugin-create.manifest.yaml');
const pluginDisableManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/plugin-disable.manifest.yaml');
const pluginEnableManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/plugin-enable.manifest.yaml');
const pluginListManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/plugin-list.manifest.yaml');
const pluginRemoveManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/plugin-remove.manifest.yaml');
const pluginValidateManifestYamlPath = path.join(projectRoot, 'test/runners/smoke/plugin-validate.manifest.yaml');

// YAML-driven Test Runner
const yamlRunnersRoot = path.join(projectRoot, 'test/runners/smoke/*.js');
const yamlMochaTestPath = path.join(projectRoot, 'test/runners/smoke/yaml-mocha.test.js');
const yamlTestHelpersPath = path.join(projectRoot, 'test/runners/smoke/yaml-test-helpers.js');
const yamlTestRunnerPath = path.join(projectRoot, 'test/runners/smoke/yaml-test-runner.js');

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
const codeRoot = path.join(projectRoot, 'scripts/linting/code/');
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

// Plugin System
const pluginsRoot = path.join(projectRoot, 'src/plugins/');
const pluginArchetyperPath = path.join(projectRoot, 'src/plugins/plugin-archetyper.js');
const pluginDeterminerPath = path.join(projectRoot, 'src/plugins/plugin-determiner.js');
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
const libRoot = path.join(projectRoot, 'scripts/linting/lib/');
const dataAdaptersPath = path.join(projectRoot, 'scripts/linting/lib/data-adapters.js');
const fileDiscoveryPath = path.join(projectRoot, 'scripts/linting/lib/file-discovery.js');
const findLintSkipsPath = path.join(projectRoot, 'scripts/linting/lib/find-lint-skips.js');
const lintHelpersPath = path.join(projectRoot, 'scripts/linting/lib/lint-helpers.js');
const skipSystemPath = path.join(projectRoot, 'scripts/linting/lib/skip-system.js');
const visualRenderersPath = path.join(projectRoot, 'scripts/linting/lib/visual-renderers.js');

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
  pathsPath,
  packageJsonPath,
  nodeModulesPath,
  configExamplePath,
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
  testSharedRoot,
  eslintPath,
  mochaPath,
  mocharcPath,
  testFileHelpersPath,
  pathsConfigPath,
  katexPath,
  basePluginSchemaPath,
  findLitterRulesPath,
  lintingConfigPath,
  testConfigPath,
  collectionsMetadataFilename,
  collectionsEnabledManifestFilename,
  collectionsUserPluginsDirname,
  collectionsDefaultArchetypeDirname,
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
  setupFile,
  simpleMdFixture,
  simpleMdFixtureWithFm,
  hugoExampleFixturePath,
  refreshFixturesPath,
  createDummyPluginPath,
  lintingRoot,

  // --- user-facing interfaces ---
  cliRoot,
  configDisplayPath,
  getHelpPath,
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
  removeCommandPath,
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
  defaultHandlerIntegrationTestPath,
  mathIntegrationFactoryPath,
  mathIntegrationManifestPath,
  mathIntegrationTestPath,
  pdfGeneratorFactoryPath,
  pdfGeneratorManifestPath,
  pdfGeneratorIntegrationTestPath,
  yamlWorkflowTestsRoot,
  demoHugoBatchConvertManifestYamlPath,
  workflowsManifestYamlPath,
  yamlValidatorTestsRoot,
  bundledPluginsManifestYamlPath,
  yamlTestsRoot,
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
  yamlRunnersRoot,
  yamlMochaTestPath,
  yamlTestHelpersPath,
  yamlTestRunnerPath,

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
  codeRoot,
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
  pluginsRoot,
  pluginArchetyperPath,
  pluginDeterminerPath,
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
  formattersIndexPath,
  inlineFormatterPath,
  lintFormatterPath,
  pathsFormatterPath,
  pluginListFormatterPath,
  rawFormatterPath,
  tableFormatterPath,
  validationFormatterPath,
  yamlTestFormatterPath,
  libRoot,
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