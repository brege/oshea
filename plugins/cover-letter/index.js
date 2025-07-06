// plugins/cover-letter/index.js

class PluginCoverLetterHandler {
  constructor(coreUtils) { // coreUtils will be injected by PluginManager
    this.handler = new coreUtils.DefaultHandler();
  }

  /**
     * The method called by PluginManager.
     * @param {Object} data - Expected to contain `markdownFilePath`.
     * @param {Object} pluginSpecificConfig - Configuration from plugins/cover-letter/cover-letter.config.yaml.
     * @param {Object} globalConfig - The main global configuration object.
     * @param {string} outputDir - Absolute path to the output directory.
     * @param {string} [outputFilenameOpt] - Optional. Desired filename for the PDF.
     * @param {string} pluginBasePath - The base path of this plugin (plugins/cover-letter/).
     * @returns {Promise<string>} The absolute path to the generated PDF file.
     */
  async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
    return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
  }
}

module.exports = PluginCoverLetterHandler;
