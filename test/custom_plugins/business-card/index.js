// test/custom_plugins/business-card/index.js
const path = require('path');
const DefaultHandler = require(path.resolve(__dirname, '../../../src/default_handler.js'));

class PluginBusinessCardHandler {
    constructor() {
        this.handler = new DefaultHandler();
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
        // For a business card, we might want to ensure no H1 is injected from front matter title
        // if the 'title' field is just for PDF metadata.
        // We can override or set specific flags here before calling the default handler,
        // or ensure the plugin's .config.yaml has `inject_fm_title_as_h1: false`.
        // For simplicity, assuming the .config.yaml handles it or direct HTML construction is preferred.

        // If the default handler is sufficient for simple front matter substitution into a basic template:
        // Ensure that the pluginSpecificConfig for this run has appropriate settings if needed.
        // For example, if `inject_fm_title_as_h1` should be false for business cards:
        const customPluginSpecificConfig = {
            ...pluginSpecificConfig,
            inject_fm_title_as_h1: pluginSpecificConfig.inject_fm_title_as_h1 === undefined ? false : pluginSpecificConfig.inject_fm_title_as_h1,
            // ensure aggressiveHeadingCleanup is false unless specifically desired
            aggressiveHeadingCleanup: pluginSpecificConfig.aggressiveHeadingCleanup === undefined ? false : pluginSpecificConfig.aggressiveHeadingCleanup,
        };
        
        // The DefaultHandler expects markdownFilePath.
        // If example-business-card.md contains the layout directly in markdown + placeholders,
        // then DefaultHandler can process it.
        return this.handler.generate(data, customPluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
    }
}

module.exports = PluginBusinessCardHandler;
