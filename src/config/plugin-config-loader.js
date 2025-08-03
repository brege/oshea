// src/config/plugin-config-loader.js
const { configUtilsPath, assetResolverPath } = require('@paths');

const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

class PluginConfigLoader {
  constructor(
    xdgBaseDir,
    xdgMainConfig,
    xdgMainConfigPath,
    projectBaseDir,
    projectMainConfig,
    projectMainConfigPath,
    useFactoryDefaultsOnly,
    dependencies = {} // Dependency Injection container
  ) {
    this.xdgBaseDir = xdgBaseDir;
    this.xdgMainConfig = xdgMainConfig || {};
    this.xdgMainConfigPath = xdgMainConfigPath; // Actual path of XDG config file
    this.projectBaseDir = projectBaseDir;
    this.projectMainConfig = projectMainConfig || {};
    this.projectMainConfigPath = projectMainConfigPath; // Actual path of Project config file
    this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;
    this._rawPluginYamlCache = {};

    // Injected dependencies
    this.fs = dependencies.fs || require('fs');
    this.path = dependencies.path || require('path');
    this.os = dependencies.os || require('os');
    this.configUtils = dependencies.configUtils || require(configUtilsPath);
    this.AssetResolver = dependencies.AssetResolver || require(assetResolverPath);
    this.logger = dependencies.logger;
  }

  async _loadSingleConfigLayer(configFilePath, assetsBasePath, pluginName) {
    const cacheKey = `${configFilePath}-${assetsBasePath}`;
    if (this._rawPluginYamlCache[cacheKey]) {
      return this._rawPluginYamlCache[cacheKey];
    }

    if (!configFilePath || !this.fs.existsSync(configFilePath)) {
      this.logger.warn('Config file path not provided or does not exist', {
        context: 'PluginConfigLoader',
        file: configFilePath,
        plugin: pluginName
      });
      return null;
    }
    try {
      const rawConfig = await this.configUtils.loadYamlConfig(configFilePath);
      const initialCssPaths = this.AssetResolver.resolveAndMergeCss(
        rawConfig.css_files,
        assetsBasePath,
        [],
        false,
        pluginName,
        configFilePath
      );
      const inheritCss = rawConfig.inherit_css === true;

      const result = { rawConfig, resolvedCssPaths: initialCssPaths, inheritCss, actualPath: configFilePath };
      this._rawPluginYamlCache[cacheKey] = result;
      return result;
    } catch (error) {
      this.logger.error('Failed to load plugin configuration layer', {
        context: 'PluginConfigLoader',
        file: configFilePath,
        plugin: pluginName,
        error: error.message
      });
      return { rawConfig: {}, resolvedCssPaths: [], inheritCss: false, actualPath: null };
    }
  }

  async applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths) {
    let currentMergedConfig = layer0ConfigData.rawConfig;
    let currentCssPaths = layer0ConfigData.resolvedCssPaths;

    if (this.useFactoryDefaultsOnly) {
      return { mergedConfig: currentMergedConfig, mergedCssPaths: currentCssPaths, contributingPaths };
    }

    // Layer 1: XDG Overrides
    const xdgPluginOverrideDir = this.path.join(this.xdgBaseDir, pluginName);
    const xdgPluginOverrideFilePath = this.path.join(xdgPluginOverrideDir, `${pluginName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);

    if (this.fs.existsSync(xdgPluginOverrideFilePath)) {
      const layer1Data = await this._loadSingleConfigLayer(xdgPluginOverrideFilePath, xdgPluginOverrideDir, pluginName);
      if (layer1Data && layer1Data.rawConfig) {
        currentMergedConfig = this.configUtils.deepMerge(currentMergedConfig, layer1Data.rawConfig);
        contributingPaths.push(xdgPluginOverrideFilePath);
        currentCssPaths = this.AssetResolver.resolveAndMergeCss(
          layer1Data.rawConfig.css_files,
          xdgPluginOverrideDir,
          currentCssPaths,
          layer1Data.inheritCss,
          pluginName,
          xdgPluginOverrideFilePath
        );
      }
    }

    if (this.xdgMainConfig[pluginName] && this.configUtils.isObject(this.xdgMainConfig[pluginName])) {
      const inlineXdgOverrideBlock = this.xdgMainConfig[pluginName];
      currentMergedConfig = this.configUtils.deepMerge(currentMergedConfig, inlineXdgOverrideBlock);
      // Use the stored xdgMainConfigPath for accurate reporting
      const xdgConfigReportPath = this.xdgMainConfigPath ? this.xdgMainConfigPath : this.path.join(this.xdgBaseDir || '~/.config/oshea', 'config.yaml (path not found)');
      contributingPaths.push(`Inline override from XDG main config: ${xdgConfigReportPath}`);
      currentCssPaths = this.AssetResolver.resolveAndMergeCss(
        inlineXdgOverrideBlock.css_files,
        this.xdgBaseDir,
        currentCssPaths,
        inlineXdgOverrideBlock.inherit_css === true,
        pluginName,
        `${xdgConfigReportPath} (inline block)`
      );
    }

    // Layer 2: Project Overrides
    // Note: this.projectMainConfig is the *content* of the --config file.
    // this.projectMainConfigPath is the *path* to that --config file.
    if (this.projectMainConfig && this.projectBaseDir) { // projectBaseDir is dirname of projectMainConfigPath
      // Project File-based Override (via plugins: key in the --config file)
      if (this.projectMainConfig.plugins && typeof this.projectMainConfig.plugins[pluginName] === 'string') {
        const projectOverrideRelPath = this.projectMainConfig.plugins[pluginName];
        let projectOverrideAbsPath = projectOverrideRelPath;
        if (projectOverrideRelPath.startsWith('~/') || projectOverrideRelPath.startsWith('~\\')) {
          projectOverrideAbsPath = this.path.join(this.os.homedir(), projectOverrideRelPath.substring(2));
        } else if (!this.path.isAbsolute(projectOverrideRelPath)) {
          // Resolve relative to the directory of the --config file (this.projectBaseDir)
          projectOverrideAbsPath = this.path.resolve(this.projectBaseDir, projectOverrideRelPath);
        }

        if (this.fs.existsSync(projectOverrideAbsPath) && projectOverrideAbsPath !== layer0ConfigData.actualPath) {
          const projectOverrideAssetBase = this.path.dirname(projectOverrideAbsPath);
          const layer2Data = await this._loadSingleConfigLayer(projectOverrideAbsPath, projectOverrideAssetBase, pluginName);
          if (layer2Data && layer2Data.rawConfig && Object.keys(layer2Data.rawConfig).length > 0) {
            currentMergedConfig = this.configUtils.deepMerge(currentMergedConfig, layer2Data.rawConfig);
            contributingPaths.push(projectOverrideAbsPath);
            currentCssPaths = this.AssetResolver.resolveAndMergeCss(
              layer2Data.rawConfig.css_files,
              projectOverrideAssetBase,
              currentCssPaths,
              layer2Data.inheritCss,
              pluginName,
              projectOverrideAbsPath
            );
          } else if (layer2Data && Object.keys(layer2Data.rawConfig || {}).length === 0) {
            contributingPaths.push(`${projectOverrideAbsPath} (empty or no effective overrides)`);
          }
        } else if (projectOverrideRelPath && projectOverrideAbsPath !== layer0ConfigData.actualPath) {
          this.logger.warn('Project-specific override path not found', {
            context: 'PluginConfigLoader',
            plugin: pluginName,
            path: projectOverrideRelPath,
            resolvedPath: projectOverrideAbsPath || projectOverrideRelPath
          });
        }
      }

      // Project Inline Override (top-level key in the --config file)
      if (this.projectMainConfig[pluginName] && this.configUtils.isObject(this.projectMainConfig[pluginName])) {
        const inlineProjectOverrideBlock = this.projectMainConfig[pluginName];
        currentMergedConfig = this.configUtils.deepMerge(currentMergedConfig, inlineProjectOverrideBlock);
        // Use the stored projectMainConfigPath for accurate reporting
        const projectConfigReportPath = this.projectMainConfigPath ? this.projectMainConfigPath : this.path.join(this.projectBaseDir || '.', 'config.yaml (path not found)');
        contributingPaths.push(`Inline override from project main config: ${projectConfigReportPath}`);
        currentCssPaths = this.AssetResolver.resolveAndMergeCss(
          inlineProjectOverrideBlock.css_files,
          this.projectBaseDir, // Base for paths in inline project override is dir of --config file
          currentCssPaths,
          inlineProjectOverrideBlock.inherit_css === true,
          pluginName,
          `${projectConfigReportPath} (inline block)`
        );
      }
    }
    return { mergedConfig: currentMergedConfig, mergedCssPaths: currentCssPaths, contributingPaths };
  }
}

module.exports = PluginConfigLoader;
