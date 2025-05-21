// test/custom_plugins/business-card/index.js
// const path = require('path'); // No longer needed
// const { DefaultHandler } = require('../../../index.js'); // No longer needed

class PluginBusinessCardHandler {
    constructor(coreUtils) { // coreUtils injected by PluginManager
        this.handler = new coreUtils.DefaultHandler();
    }

    /**
     * The method called by PluginManager.
     * @param {Object} data - Expected to contain `markdownFilePath`.
     * @param {Object} pluginSpecificConfig - Configuration from the plugin's .config.yaml.
     * @param {Object} globalConfig - The main global configuration object.
     * @param {string} outputDir - Absolute path to the output directory.
     * @param {string} [outputFilenameOpt] - Optional. Desired filename for the PDF.
     * @param {string} pluginBasePath - The base path of this plugin.
     * @returns {Promise<string>} The absolute path to the generated PDF file.
     */
    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        const customPluginSpecificConfig = {
            ...pluginSpecificConfig,
            inject_fm_title_as_h1: pluginSpecificConfig.inject_fm_title_as_h1 === undefined ? false : pluginSpecificConfig.inject_fm_title_as_h1,
            aggressiveHeadingCleanup: pluginSpecificConfig.aggressiveHeadingCleanup === undefined ? false : pluginSpecificConfig.aggressiveHeadingCleanup,
        };
        
        return this.handler.generate(data, customPluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
    }
}

module.exports = PluginBusinessCardHandler;
