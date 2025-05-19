// plugins/cover-letter/index.js
const path = require('path');

// Resolve the path to src/default_handler.js relative to the current file
const DefaultHandler = require(path.resolve(__dirname, '../../src/default_handler.js'));

class PluginCoverLetterHandler {
    constructor() {
        // This class acts as the standardized entry point for the Cover Letter plugin type.
        // The actual reusable Markdown processing logic resides in src/default_handler.js
        this.handler = new DefaultHandler();
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
        // Simply delegate to the common DefaultHandler's generate method
        return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
    }
}

// Export the class for PluginManager to instantiate
module.exports = PluginCoverLetterHandler;
