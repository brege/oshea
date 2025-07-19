// index.js - Project Path Registry
// Generated: 2025-07-19T05:28:37.056Z
// Architecture: Feature-based with dependency ranking
// Regenerate: npm run paths
// Auto-generated - do not edit manually

const path = require('path');
const scriptsPaths = require('./scripts.js');
const lintersPaths = require('./linters.js');

// ==========================================
// ARCHITECTURE
// ==========================================

// --- Project Foundation ---
const projectRoot = path.resolve(__dirname, '..');
const pathsPath = path.join(__dirname, 'index.js');
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
const testRoot = path.join(projectRoot, 'test');
const cliCommandsPath = path.join(srcRoot, 'cli', 'commands');
const collectionsCommandsRoot = path.join(srcRoot, 'collections', 'commands');
const scriptsSharedRoot = path.join(scriptsRoot, 'shared');
const testSharedRoot = path.join(testRoot, 'shared');

// --- Development & Build Tools ---
const eslintPath = path.join(nodeModulesPath, '.bin', 'eslint');
const mochaPath = path.join(nodeModulesPath, '.bin', 'mocha');
const mocharcPath = path.join(projectRoot, '.mocharc.js');
const fileHelpersPath = path.join(scriptsSharedRoot, 'file-helpers.js');
const testFileHelpersPath = path.join(testSharedRoot, 'test-helpers.js');
const dynamicCompletionScriptPath = path.join(scriptsRoot, 'completion', 'generate-completion-dynamic-cache.js');

// --- Key Static File Paths ---
const katexPath = path.join(assetsRoot, 'katex.min.css');
const basePluginSchemaPath = path.join(srcRoot, 'validators', 'base-plugin.schema.json');
const findLitterRulesPath = path.join(assetsRoot, 'litter-list.txt');
const lintingConfigPath = path.join(scriptsRoot, 'linting', 'linting-config.yaml');

// ==========================================
// FEATURES (by dependency rank)
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
const collectionsUpdateCommandPath = path.join(projectRoot, 'src/cli/commands/collection/update.command.js');
const validateCommandPath = path.join(projectRoot, 'src/cli/commands/plugin/validate.command.js');

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
const constantsPath = path.join(projectRoot, 'src/collections/constants.js');
const indexPath = path.join(projectRoot, 'src/collections/index.js');
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

// --- Rank 3: enhancements & utilities ---

// CLI Completion Engine
const completionRoot = path.join(projectRoot, 'src/completion/');
const cliTreeBuilderPath = path.join(projectRoot, 'src/completion/cli-tree-builder.js');
const enginePath = path.join(projectRoot, 'src/completion/engine.js');
const trackerPath = path.join(projectRoot, 'src/completion/tracker.js');

// Utilities & Helpers
const utilsRoot = path.join(projectRoot, 'src/utils/');
const assetResolverPath = path.join(projectRoot, 'src/utils/asset-resolver.js');
const loggerPath = path.join(projectRoot, 'src/utils/logger.js');

// ==========================================
// EXPORTS
// ==========================================

module.exports = {

  // --- Architecture ---
  projectRoot,
  pathsPath,
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
  fileHelpersPath,
  testFileHelpersPath,
  dynamicCompletionScriptPath,
  katexPath,
  basePluginSchemaPath,
  findLitterRulesPath,
  lintingConfigPath,

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
  collectionsUpdateCommandPath,
  validateCommandPath,

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

  // --- supportive operations ---
  pluginsRoot,
  pluginArchetyperPath,
  pluginDeterminerPath,
  pluginManagerPath,
  pluginRegistryBuilderPath,
  validatorPath,
  collectionsRoot,
  cmUtilsPath,
  constantsPath,
  indexPath,
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

  // --- enhancements & utilities ---
  completionRoot,
  cliTreeBuilderPath,
  enginePath,
  trackerPath,
  utilsRoot,
  assetResolverPath,
  loggerPath,

  // --- Imported Registries ---
  ...scriptsPaths,
  ...lintersPaths,

};