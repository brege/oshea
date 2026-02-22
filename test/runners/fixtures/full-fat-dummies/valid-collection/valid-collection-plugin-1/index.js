// test/runners/fixtures/full-fat-dummies/valid-collection/valid-collection-plugin-1/index.js
require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

// This is the handler script for the 'valid-collection-plugin-1' plugin.
// When a new plugin is created using 'oshea plugin create <new-plugin-name>',
// 'ValidCollectionPlugin1Handler' will be renamed to '<NewPluginName>Handler',
// and the string 'valid-collection-plugin-1' in the logger will be replaced
// with '<new-plugin-name>'.

class ValidCollectionPlugin1Handler {
  constructor(coreUtils) {
    // coreUtils contains { DefaultHandler, markdownUtils, pdfGenerator }
    // For most simple plugins, DefaultHandler is sufficient.
    this.handler = new coreUtils.DefaultHandler();
  }

  async generate(
    data,
    pluginSpecificConfig,
    globalConfig,
    outputDir,
    outputFilenameOpt,
    pluginBasePath,
  ) {
    // Example of logging specific to this plugin.
    logger.info(
      `(ValidCollectionPlugin1Handler): Processing for plugin '${pluginSpecificConfig.description || 'valid-collection-plugin-1'}'`,
    );

    // Most simple plugins will delegate directly to the DefaultHandler.
    return this.handler.generate(
      data,
      pluginSpecificConfig,
      globalConfig,
      outputDir,
      outputFilenameOpt,
      pluginBasePath,
    );
  }
}

module.exports = ValidCollectionPlugin1Handler;
