// plugins/cover-letter/index.js

class PluginCoverLetterHandler {
  constructor(coreUtils) { // coreUtils will be injected by PluginManager
    this.handler = new coreUtils.DefaultHandler();
  }


  async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
    return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
  }
}

module.exports = PluginCoverLetterHandler;
