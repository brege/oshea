// index.js
// Main module entry point for md-to-pdf

const DefaultHandler = require('./src/default_handler');
const markdownUtils = require('./src/markdown_utils');
const pdfGenerator = require('./src/pdf_generator');
const ConfigResolver = require('./src/ConfigResolver');
const PluginManager = require('./src/PluginManager');
const PluginRegistryBuilder = require('./src/PluginRegistryBuilder');

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
