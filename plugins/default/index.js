// plugins/default/index.js
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

class PluginDefaultHandler {
  constructor(coreUtils) {
    // coreUtils will be injected by PluginManager
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
    logger.info(
      `(PluginDefaultHandler): Processing for plugin '${pluginSpecificConfig.description || 'default'}'`,
    );
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

module.exports = PluginDefaultHandler;
