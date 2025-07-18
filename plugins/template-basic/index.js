// plugins/template-basic/index.js
require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

// This is the handler script for the 'template-basic' plugin.
// When a new plugin is created using 'md-to-pdf plugin create <new-plugin-name>',
// 'TemplateBasicHandler' will be renamed to '<NewPluginName>Handler',
// and the string 'template-basic' in the logger will be replaced
// with '<new-plugin-name>'.

class TemplateBasicHandler {
  constructor(coreUtils) {
    // coreUtils contains { DefaultHandler, markdownUtils, pdfGenerator }
    // For most simple plugins, DefaultHandler is sufficient.
    this.handler = new coreUtils.DefaultHandler();
  }

  async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
    // Example of logging specific to this plugin.
    logger.info(`(TemplateBasicHandler): Processing for plugin '${pluginSpecificConfig.description || 'template-basic'}'`);

    // Most simple plugins will delegate directly to the DefaultHandler.
    return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
  }
}

module.exports = TemplateBasicHandler;
