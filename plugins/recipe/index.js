// plugins/recipe/index.js

class PluginRecipeHandler {
  constructor(coreUtils) {
    this.handler = new coreUtils.DefaultHandler();
  }


  async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
    return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
  }
}

module.exports = PluginRecipeHandler;
