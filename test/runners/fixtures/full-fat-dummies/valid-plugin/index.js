// test/runners/fixtures/full-fat-dummies/valid-plugin/index.js
require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

// This is the handler script for the 'valid-plugin' plugin.
// When a new plugin is created using 'oshea plugin create <new-plugin-name>',
// 'ValidPluginHandler' will be renamed to '<NewPluginName>Handler',
// and the string 'valid-plugin' in the logger will be replaced
// with '<new-plugin-name>'.

class ValidPluginHandler {
  constructor(coreUtils) {
    // coreUtils contains { DefaultHandler, markdownUtils, pdfGenerator }
    // For most simple plugins, DefaultHandler is sufficient.
    this.handler = new coreUtils.DefaultHandler();
  }

  async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
    // Example of logging specific to this plugin.
    logger.info(`(ValidPluginHandler): Processing for plugin '${pluginSpecificConfig.description || 'valid-plugin'}'`);

    // Most simple plugins will delegate directly to the DefaultHandler.
    return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
  }
}

module.exports = ValidPluginHandler;
