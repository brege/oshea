// plugins/default/index.js
// No direct require for DefaultHandler or other core utilities needed here

class PluginDefaultHandler {
  constructor(coreUtils) { // coreUtils will be injected by PluginManager
    // This class acts as the standardized entry point for this specific plugin type.
    // The actual reusable Markdown processing logic resides in DefaultHandler.
    this.handler = new coreUtils.DefaultHandler();
  }

  /**
     * The method called by PluginManager.
     * @param {Object} data - Expected to contain `markdownFilePath`.
     * @param {Object} pluginSpecificConfig - Configuration from plugins/default/default.config.yaml.
     * @param {Object} globalConfig - The main global configuration object.
     * @param {string} outputDir - Absolute path to the output directory.
     * @param {string} [outputFilenameOpt] - Optional. Desired filename for the PDF.
     * @param {string} pluginBasePath - The base path of this plugin (plugins/default/).
     * @returns {Promise<string>} The absolute path to the generated PDF file.
     */
  async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
    // Simply delegate to the common DefaultHandler's generate method
    return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
  }
}

// Export the class for PluginManager to instantiate
module.exports = PluginDefaultHandler;
