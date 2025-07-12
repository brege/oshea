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
