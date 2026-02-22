// test/runners/fixtures/full-fat-dummies/valid-collection/valid-collection-plugin-2/index.js
require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

// This is the handler script for the 'valid-collection-plugin-2' plugin.
// When a new plugin is created using 'oshea plugin create <new-plugin-name>',
// 'ValidCollectionPlugin2Handler' will be renamed to '<NewPluginName>Handler',
// and the string 'valid-collection-plugin-2' in the logger will be replaced
// with '<new-plugin-name>'.

class ValidCollectionPlugin2Handler {
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
      `(ValidCollectionPlugin2Handler): Processing for plugin '${pluginSpecificConfig.description || 'valid-collection-plugin-2'}'`,
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

module.exports = ValidCollectionPlugin2Handler;
