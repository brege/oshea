// paths.js
const path = require('path');

// Project root [paths.js lives here] 
const projectRoot = __dirname;

// Top-level source directory
const srcRoot = path.join(projectRoot, 'src');

// CLI entry points and directories
const cliPath = path.join(projectRoot, 'cli.js');
const cliRoot = path.join(srcRoot, 'cli');

const getHelpPath = path.join(cliRoot, 'get_help.js');
const configDisplayPath = path.join(cliRoot, 'config_display.js');

// Collections
const collectionsRoot = path.join(srcRoot, 'collections');
const cmUtilsPath = path.join(collectionsRoot, 'cm-utils.js');
const collectionsCommandsRoot = path.join(collectionsRoot, 'commands');

// Plugins
const pluginsRoot = path.join(srcRoot, 'plugins');
const pluginManagerPath = path.join(pluginsRoot, 'PluginManager.js');
const pluginRegistryBuilderPath = path.join(pluginsRoot, 'PluginRegistryBuilder.js');
const pluginArchetyperPath = path.join(pluginsRoot, 'plugin_archetyper.js');
const pluginDeterminerPath = path.join(pluginsRoot, 'plugin_determiner.js');
const validatorPath = path.join(pluginsRoot, 'validator.js');

// Completion
const completionRoot = path.join(srcRoot, 'completion');
const cliTreeBuilderPath = path.join(completionRoot, 'cli-tree-builder.js');
const completionEnginePath = path.join(completionRoot, 'engine.js');
const completionTrackerPath = path.join(completionRoot, 'tracker.js');

// Config
const configRoot = path.join(srcRoot, 'config');
const configResolverPath = path.join(configRoot, 'ConfigResolver.js');
const configUtilsPath = path.join(configRoot, 'config_utils.js');
const mainConfigLoaderPath = path.join(configRoot, 'main_config_loader.js');
const pluginConfigLoaderPath = path.join(configRoot, 'plugin_config_loader.js');

// Core
const coreRoot = path.join(srcRoot, 'core');
const defaultHandlerPath = path.join(coreRoot, 'default_handler.js');
const markdownUtilsPath = path.join(coreRoot, 'markdown_utils.js');
const mathIntegrationPath = path.join(coreRoot, 'math_integration.js');
const pdfGeneratorPath = path.join(coreRoot, 'pdf_generator.js');
const watchHandlerPath = path.join(coreRoot, 'watch_handler.js');

// Validators
const validatorsRoot = path.join(srcRoot, 'validators');
const basePluginSchemaPath = path.join(validatorsRoot, 'base-plugin.schema.json');
const v1ValidatorPath = path.join(validatorsRoot, 'v1.js');

// Utils
const utilsRoot = path.join(srcRoot, 'utils');
const assetResolverPath = path.join(utilsRoot, 'asset_resolver.js');

// Export all anchors
module.exports = {
  projectRoot,
  srcRoot,

  // CLI
  cliRoot,
  cliPath,
  getHelpPath,
  configDisplayPath,

  // Collections
  collectionsRoot,
  cmUtilsPath,
  collectionsCommandsRoot,

  // Plugins
  pluginsRoot,
  pluginManagerPath,
  pluginRegistryBuilderPath,
  pluginArchetyperPath,
  pluginDeterminerPath,
  validatorPath,

  // Completion
  completionRoot,
  cliTreeBuilderPath,
  completionEnginePath,
  completionTrackerPath,

  // Config
  configRoot,
  configResolverPath,
  configUtilsPath,
  mainConfigLoaderPath,
  pluginConfigLoaderPath,

  // Core
  coreRoot,
  defaultHandlerPath,
  markdownUtilsPath,
  mathIntegrationPath,
  pdfGeneratorPath,
  watchHandlerPath,

  // Validators
  validatorsRoot,
  basePluginSchemaPath,
  v1ValidatorPath,

  // Utils
  utilsRoot,
  assetResolverPath,
};

