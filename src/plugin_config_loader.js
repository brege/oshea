// src/plugin_config_loader.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadYamlConfig, deepMerge, isObject } = require('./config_utils');
const AssetResolver = require('./asset_resolver');

const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

class PluginConfigLoader {
    constructor(xdgBaseDir, xdgMainConfig, xdgMainConfigPath, projectBaseDir, projectMainConfig, projectMainConfigPath, useFactoryDefaultsOnly) {
        this.xdgBaseDir = xdgBaseDir;
        this.xdgMainConfig = xdgMainConfig || {};
        this.xdgMainConfigPath = xdgMainConfigPath; // Actual path of XDG config file
        this.projectBaseDir = projectBaseDir;
        this.projectMainConfig = projectMainConfig || {};
        this.projectMainConfigPath = projectMainConfigPath; // Actual path of Project config file
        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;
        this._rawPluginYamlCache = {};
    }

    async _loadSingleConfigLayer(configFilePath, assetsBasePath, pluginName) {
        const cacheKey = `${configFilePath}-${assetsBasePath}`;
        if (this._rawPluginYamlCache[cacheKey]) {
            return this._rawPluginYamlCache[cacheKey];
        }

        if (!configFilePath || !fs.existsSync(configFilePath)) {
            console.warn(`WARN (PluginConfigLoader): Config file path not provided or does not exist: ${configFilePath} for plugin ${pluginName}.`);
            return null;
        }
        try {
            const rawConfig = await loadYamlConfig(configFilePath);
            const initialCssPaths = AssetResolver.resolveAndMergeCss(
                rawConfig.css_files,
                assetsBasePath,
                [],
                false,
                pluginName,
                configFilePath
            );
            const inherit_css = rawConfig.inherit_css === true;

            const result = { rawConfig, resolvedCssPaths: initialCssPaths, inherit_css, actualPath: configFilePath };
            this._rawPluginYamlCache[cacheKey] = result;
            return result;
        } catch (error) {
            console.error(`ERROR (PluginConfigLoader): loading plugin configuration layer from '${configFilePath}' for ${pluginName}: ${error.message}`);
            return { rawConfig: {}, resolvedCssPaths: [], inherit_css: false, actualPath: null };
        }
    }

    async applyOverrideLayers(pluginName, layer0ConfigData, contributingPaths) {
        let currentMergedConfig = layer0ConfigData.rawConfig;
        let currentCssPaths = layer0ConfigData.resolvedCssPaths;

        if (this.useFactoryDefaultsOnly) {
            return { mergedConfig: currentMergedConfig, mergedCssPaths: currentCssPaths, contributingPaths };
        }

        // Layer 1: XDG Overrides
        const xdgPluginOverrideDir = path.join(this.xdgBaseDir, pluginName);
        const xdgPluginOverrideFilePath = path.join(xdgPluginOverrideDir, `${pluginName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);

        if (fs.existsSync(xdgPluginOverrideFilePath)) {
            const layer1Data = await this._loadSingleConfigLayer(xdgPluginOverrideFilePath, xdgPluginOverrideDir, pluginName);
            if (layer1Data && layer1Data.rawConfig) {
                currentMergedConfig = deepMerge(currentMergedConfig, layer1Data.rawConfig);
                contributingPaths.push(xdgPluginOverrideFilePath);
                currentCssPaths = AssetResolver.resolveAndMergeCss(
                    layer1Data.rawConfig.css_files,
                    xdgPluginOverrideDir,
                    currentCssPaths,
                    layer1Data.inherit_css,
                    pluginName,
                    xdgPluginOverrideFilePath
                );
            }
        }

        if (this.xdgMainConfig[pluginName] && isObject(this.xdgMainConfig[pluginName])) {
            const inlineXdgOverrideBlock = this.xdgMainConfig[pluginName];
            currentMergedConfig = deepMerge(currentMergedConfig, inlineXdgOverrideBlock);
            // Use the stored xdgMainConfigPath for accurate reporting
            const xdgConfigReportPath = this.xdgMainConfigPath ? this.xdgMainConfigPath : path.join(this.xdgBaseDir || '~/.config/md-to-pdf', 'config.yaml (path not found)');
            contributingPaths.push(`Inline override from XDG main config: ${xdgConfigReportPath}`);
            currentCssPaths = AssetResolver.resolveAndMergeCss(
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
                     projectOverrideAbsPath = path.join(os.homedir(), projectOverrideRelPath.substring(2));
                } else if (!path.isAbsolute(projectOverrideRelPath)) {
                    // Resolve relative to the directory of the --config file (this.projectBaseDir)
                    projectOverrideAbsPath = path.resolve(this.projectBaseDir, projectOverrideRelPath);
                }

                if (fs.existsSync(projectOverrideAbsPath) && projectOverrideAbsPath !== layer0ConfigData.actualPath) {
                    const projectOverrideAssetBase = path.dirname(projectOverrideAbsPath);
                    const layer2Data = await this._loadSingleConfigLayer(projectOverrideAbsPath, projectOverrideAssetBase, pluginName);
                    if (layer2Data && layer2Data.rawConfig && Object.keys(layer2Data.rawConfig).length > 0) {
                        currentMergedConfig = deepMerge(currentMergedConfig, layer2Data.rawConfig);
                        contributingPaths.push(projectOverrideAbsPath);
                        currentCssPaths = AssetResolver.resolveAndMergeCss(
                            layer2Data.rawConfig.css_files,
                            projectOverrideAssetBase,
                            currentCssPaths,
                            layer2Data.inherit_css,
                            pluginName,
                            projectOverrideAbsPath
                        );
                    } else if (layer2Data && Object.keys(layer2Data.rawConfig || {}).length === 0) {
                        contributingPaths.push(`${projectOverrideAbsPath} (empty or no effective overrides)`);
                    }
                } else if (projectOverrideRelPath && projectOverrideAbsPath !== layer0ConfigData.actualPath) {
                     console.warn(`WARN (PluginConfigLoader): Project-specific settings override for plugin '${pluginName}' in project main config points to non-existent file: '${projectOverrideRelPath}' (resolved to '${projectOverrideAbsPath || projectOverrideRelPath}')`);
                }
            }

            // Project Inline Override (top-level key in the --config file)
            if (this.projectMainConfig[pluginName] && isObject(this.projectMainConfig[pluginName])) {
                const inlineProjectOverrideBlock = this.projectMainConfig[pluginName];
                currentMergedConfig = deepMerge(currentMergedConfig, inlineProjectOverrideBlock);
                // Use the stored projectMainConfigPath for accurate reporting
                const projectConfigReportPath = this.projectMainConfigPath ? this.projectMainConfigPath : path.join(this.projectBaseDir || '.', 'config.yaml (path not found)');
                contributingPaths.push(`Inline override from project main config: ${projectConfigReportPath}`);
                currentCssPaths = AssetResolver.resolveAndMergeCss(
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
