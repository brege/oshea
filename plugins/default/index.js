// plugins/default/index.js
// No direct require for DefaultHandler or other core utilities needed here

class PluginDefaultHandler {
  constructor(coreUtils) { // coreUtils will be injected by PluginManager
    // This class acts as the standardized entry point for this specific plugin type.
    // The actual reusable Markdown processing logic resides in DefaultHandler.
    this.handler = new coreUtils.DefaultHandler();
  }


  async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
    // Simply delegate to the common DefaultHandler's generate method
    return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
  }
}

// Export the class for PluginManager to instantiate
module.exports = PluginDefaultHandler;
