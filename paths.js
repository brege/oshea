// paths.js - Project Path Registry
// Generated: 2025-07-17T06:20:30.812Z
// Architecture: Feature-based with dependency ranking
// Regenerate: npm run generate:paths

const path = require('path');
const scriptsPaths = require('./scripts/scriptsPaths');

// ==========================================
// ARCHITECTURE
// ==========================================

// --- Project Foundation ---
const projectRoot = __dirname;
const pathsPath = path.join(__dirname, 'paths.js');
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

// ==========================================
// FEATURES (by dependency rank)
// ==========================================

// --- Rank 0: user-facing interfaces ---

// Command Line Interface
const cliRoot = path.join(srcRoot, 'cli');
const collectionCmdPath = path.join(projectRoot, 'src/cli/commands/collectionCmd.js');
const configDisplayPath = path.join(projectRoot, 'src/cli/config_display.js');
const configCmdPath = path.join(projectRoot, 'src/cli/commands/configCmd.js');
const convertCmdPath = path.join(projectRoot, 'src/cli/commands/convertCmd.js');
const generateCmdPath = path.join(projectRoot, 'src/cli/commands/generateCmd.js');
const getHelpPath = path.join(projectRoot, 'src/cli/get_help.js');
const pluginCmdPath = path.join(projectRoot, 'src/cli/commands/pluginCmd.js');
const updateCmdPath = path.join(projectRoot, 'src/cli/commands/updateCmd.js');
const collectionsAddCmdPath = path.join(projectRoot, 'src/cli/commands/collection/addCmd.js');
const pluginAddCmdPath = path.join(projectRoot, 'src/cli/commands/plugin/addCmd.js');
const createCmdPath = path.join(projectRoot, 'src/cli/commands/plugin/createCmd.js');
const disableCmdPath = path.join(projectRoot, 'src/cli/commands/plugin/disableCmd.js');
const enableCmdPath = path.join(projectRoot, 'src/cli/commands/plugin/enableCmd.js');
const helpCmdPath = path.join(projectRoot, 'src/cli/commands/plugin/helpCmd.js');
const collectionsListCmdPath = path.join(projectRoot, 'src/cli/commands/collection/listCmd.js');
const pluginListCmdPath = path.join(projectRoot, 'src/cli/commands/plugin/listCmd.js');
const collectionsRemoveCmdPath = path.join(projectRoot, 'src/cli/commands/collection/removeCmd.js');
const collectionsUpdateCmdPath = path.join(projectRoot, 'src/cli/commands/collection/updateCmd.js');
const validateCmdPath = path.join(projectRoot, 'src/cli/commands/plugin/validateCmd.js');

// --- Rank 1: essential operations ---

// Core Processing Engine
const coreRoot = path.join(srcRoot, 'core');
const defaultHandlerPath = path.join(projectRoot, 'src/core/default_handler.js');
const markdownUtilsPath = path.join(projectRoot, 'src/core/markdown_utils.js');
const mathIntegrationPath = path.join(projectRoot, 'src/core/math_integration.js');
const pdfGeneratorPath = path.join(projectRoot, 'src/core/pdf_generator.js');
const watchHandlerPath = path.join(projectRoot, 'src/core/watch_handler.js');

// Configuration System
const configRoot = path.join(srcRoot, 'config');
const configUtilsPath = path.join(projectRoot, 'src/config/config_utils.js');
const configResolverPath = path.join(projectRoot, 'src/config/ConfigResolver.js');
const mainConfigLoaderPath = path.join(projectRoot, 'src/config/main_config_loader.js');
const pluginConfigLoaderPath = path.join(projectRoot, 'src/config/plugin_config_loader.js');

// --- Rank 2: supportive operations ---

// Plugin System
const pluginsRoot = path.join(srcRoot, 'plugins');
const pluginArchetyperPath = path.join(projectRoot, 'src/plugins/plugin_archetyper.js');
const pluginDeterminerPath = path.join(projectRoot, 'src/plugins/plugin_determiner.js');
const pluginManagerPath = path.join(projectRoot, 'src/plugins/PluginManager.js');
const pluginRegistryBuilderPath = path.join(projectRoot, 'src/plugins/PluginRegistryBuilder.js');
const validatorPath = path.join(projectRoot, 'src/plugins/validator.js');

// Collections Management
const collectionsRoot = path.join(srcRoot, 'collections');
const addPath = path.join(projectRoot, 'src/collections/commands/add.js');
const addSingletonPath = path.join(projectRoot, 'src/collections/commands/addSingleton.js');
const cmUtilsPath = path.join(projectRoot, 'src/collections/cm-utils.js');
const constantsPath = path.join(projectRoot, 'src/collections/constants.js');
const disablePath = path.join(projectRoot, 'src/collections/commands/disable.js');
const enablePath = path.join(projectRoot, 'src/collections/commands/enable.js');
const enableAllPath = path.join(projectRoot, 'src/collections/commands/enableAll.js');
const indexPath = path.join(projectRoot, 'src/collections/index.js');
const listPath = path.join(projectRoot, 'src/collections/commands/list.js');
const listAvailablePath = path.join(projectRoot, 'src/collections/commands/listAvailable.js');
const removePath = path.join(projectRoot, 'src/collections/commands/remove.js');
const updatePath = path.join(projectRoot, 'src/collections/commands/update.js');
const updateAllPath = path.join(projectRoot, 'src/collections/commands/updateAll.js');

// Validation Framework
const validatorsRoot = path.join(srcRoot, 'validators');
const v1Path = path.join(projectRoot, 'src/validators/v1.js');

// --- Rank 3: enhancements & utilities ---

// CLI Completion Engine
const completionRoot = path.join(srcRoot, 'completion');
const cliTreeBuilderPath = path.join(projectRoot, 'src/completion/cli-tree-builder.js');
const enginePath = path.join(projectRoot, 'src/completion/engine.js');
const trackerPath = path.join(projectRoot, 'src/completion/tracker.js');

// Utilities & Helpers
const utilsRoot = path.join(srcRoot, 'utils');
const assetResolverPath = path.join(projectRoot, 'src/utils/asset_resolver.js');
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

  // --- Rank 0: User Interfaces ---
  cliRoot,
  collectionCmdPath,
  configDisplayPath,
  configCmdPath,
  convertCmdPath,
  generateCmdPath,
  getHelpPath,
  pluginCmdPath,
  updateCmdPath,
  collectionsAddCmdPath,
  pluginAddCmdPath,
  createCmdPath,
  disableCmdPath,
  enableCmdPath,
  helpCmdPath,
  collectionsListCmdPath,
  pluginListCmdPath,
  collectionsRemoveCmdPath,
  collectionsUpdateCmdPath,
  validateCmdPath,

  // --- Rank 1: Essential Operations ---
  coreRoot,
  defaultHandlerPath,
  markdownUtilsPath,
  mathIntegrationPath,
  pdfGeneratorPath,
  watchHandlerPath,
  configRoot,
  configUtilsPath,
  configResolverPath,
  mainConfigLoaderPath,
  pluginConfigLoaderPath,

  // --- Rank 2: Supportive Operations ---
  pluginsRoot,
  pluginArchetyperPath,
  pluginDeterminerPath,
  pluginManagerPath,
  pluginRegistryBuilderPath,
  validatorPath,
  collectionsRoot,
  addPath,
  addSingletonPath,
  cmUtilsPath,
  constantsPath,
  disablePath,
  enablePath,
  enableAllPath,
  indexPath,
  listPath,
  listAvailablePath,
  removePath,
  updatePath,
  updateAllPath,
  validatorsRoot,
  v1Path,

  // --- Rank 3: Enhancements ---
  completionRoot,
  cliTreeBuilderPath,
  enginePath,
  trackerPath,
  utilsRoot,
  assetResolverPath,
  loggerPath,

  // --- Scripts Registry ---
  ...scriptsPaths,

};