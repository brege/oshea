// plugins/recipe/index.js
const path = require('path');

// Resolve the path to src/default_handler.js relative to the current file
const DefaultHandler = require(path.resolve(__dirname, '../../src/default_handler.js'));

class PluginRecipeHandler {
    constructor() {
        // This class acts as the standardized entry point for the Recipe plugin type.
        this.handler = new DefaultHandler();
    }

    /**
     * The method called by PluginManager.
     * @param {Object} data - Expected to contain `markdownFilePath`.
     * @param {Object} pluginSpecificConfig - Configuration from plugins/recipe/recipe.config.yaml.
     * @param {Object} globalConfig - The main global configuration object.
     * @param {string} outputDir - Absolute path to the output directory.
     * @param {string} [outputFilenameOpt] - Optional. Desired filename for the PDF.
     * @param {string} pluginBasePath - The base path of this plugin (plugins/recipe/).
     * @returns {Promise<string>} The absolute path to the generated PDF file.
     */
    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        // Simply delegate to the common DefaultHandler's generate method
        return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
    }
}

// Export the class for PluginManager to instantiate
module.exports = PluginRecipeHandler;
