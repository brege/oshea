// index.js
// Main module entry point for md-to-pdf

const {
  defaultHandlerPath,
  markdownUtilsPath,
  pdfGeneratorPath,
  configResolverPath,
  pluginManagerPath,
  pluginRegistryBuilderPath,
} = require('@paths');

const DefaultHandler = require(defaultHandlerPath);
const markdownUtils = require(markdownUtilsPath);
const pdfGenerator = require(pdfGeneratorPath);
const ConfigResolver = require(configResolverPath);
const PluginManager = require(pluginManagerPath);
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Functions/Classes intended for use by plugins or potentially external tools
module.exports = {
  // Core handlers and utilities
  DefaultHandler,
  markdownUtils,
  pdfGenerator,

  // Core system components (less likely for direct plugin use, but good for extensibility)
  ConfigResolver,
  PluginManager,
  PluginRegistryBuilder,

  // If cli.js's main function were refactored to be callable, it could be exported too.
  // mainCli: require('./cli') // Example if cli.js exported a main function
};
