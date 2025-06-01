// plugins/template-basic/index.js
// This is the handler script for the 'template-basic' plugin.
// When a new plugin is created using 'md-to-pdf plugin create <new-plugin-name>',
// 'TemplateBasicHandler' will be renamed to '<NewPluginName>Handler',
// and the string 'template-basic' in the console.log will be replaced
// with '<new-plugin-name>'.

class TemplateBasicHandler {
    constructor(coreUtils) {
        // coreUtils contains { DefaultHandler, markdownUtils, pdfGenerator }
        // For most simple plugins, DefaultHandler is sufficient.
        this.handler = new coreUtils.DefaultHandler();
        // You can store other coreUtils if your plugin needs them directly:
        // this.markdownUtils = coreUtils.markdownUtils;
        // this.pdfGenerator = coreUtils.pdfGenerator;
    }

    /**
     * The main generation method called by md-to-pdf.
     * @param {Object} data - Input data for the plugin (e.g., { markdownFilePath: 'path/to/file.md' }).
     * @param {Object} pluginSpecificConfig - Configuration from this plugin's .config.yaml.
     * @param {Object} globalConfig - The main global configuration object.
     * @param {string} outputDir - Absolute path to the output directory.
     * @param {string} [outputFilenameOpt] - Optional. Desired filename for the PDF.
     * @param {string} pluginBasePath - The base path of this plugin.
     * @returns {Promise<string>} The absolute path to the generated PDF file.
     */
    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        // Example of logging specific to this plugin.
        // The 'template-basic' string here will be replaced with the new plugin's name during creation.
        console.log(`INFO (TemplateBasicHandler): Processing for plugin '${pluginSpecificConfig.description || 'template-basic'}'`);

        // Most simple plugins will delegate directly to the DefaultHandler.
        // You can add custom logic before or after this call if needed,
        // or implement entirely custom HTML generation and PDF rendering.
        return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
    }
}

module.exports = TemplateBasicHandler;
