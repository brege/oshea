// src/ConfigResolver.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig: loadYamlConfig } = require('./markdown_utils');
const PluginRegistryBuilder = require('./PluginRegistryBuilder'); 

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml'; 

class ConfigResolver {
    constructor(mainConfigPathFromCli, useFactoryDefaultsOnly = false) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml'); 
        this.factoryDefaultMainConfigPath = path.join(this.projectRoot, 'config.example.yaml'); 

        const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        this.xdgBaseDir = path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = mainConfigPathFromCli; // Path from --config
        this.projectManifestConfig = null; // Contents of the project manifest if loaded
        this.projectManifestBaseDir = this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath) ? path.dirname(this.projectManifestConfigPath) : null;

        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;

        this.primaryMainConfig = null; // Contents of the highest precedence main config (Project, XDG, or Bundled)
        this.primaryMainConfigPathActual = null; // Path to the primaryMainConfig
        this.xdgMainConfigContents = null; 
        
        this.mergedPluginRegistry = null; 
        this._lastProjectManifestPathForRegistry = null; // Track which project manifest was used for current registry

        this.loadedPluginConfigsCache = {};
        this._rawPluginYamlCache = {};
        this._lastEffectiveConfigSources = null;
    }

    async _loadXdgMainConfigIfNeeded() {
        if (this.useFactoryDefaultsOnly) { 
            this.xdgMainConfigContents = {};
            return this.xdgMainConfigContents;
        }
        if (this.xdgMainConfigContents) { 
            return this.xdgMainConfigContents;
        }
        if (this.primaryMainConfigPathActual === this.xdgGlobalConfigPath && this.primaryMainConfig) {
            this.xdgMainConfigContents = this.primaryMainConfig;
            return this.xdgMainConfigContents;
        }
        if (fs.existsSync(this.xdgGlobalConfigPath)) {
            try {
                if (process.env.DEBUG) {
                    console.log(`INFO (ConfigResolver): Loading XDG main configuration from: ${this.xdgGlobalConfigPath} for inline overrides.`);
                }
                this.xdgMainConfigContents = await loadYamlConfig(this.xdgGlobalConfigPath);
            } catch (error) {
                console.warn(`WARN (ConfigResolver): Could not load XDG main config from ${this.xdgGlobalConfigPath} for inline overrides: ${error.message}`);
                this.xdgMainConfigContents = {}; 
            }
        } else {
            this.xdgMainConfigContents = {}; 
        }
        return this.xdgMainConfigContents;
    }


    async _initializeResolverIfNeeded() {
        let needsRegistryBuild = this.mergedPluginRegistry === null || 
                                 (this.mergedPluginRegistry && this.mergedPluginRegistry._builtWithFactoryDefaults !== this.useFactoryDefaultsOnly) ||
                                 (this.mergedPluginRegistry && this._lastProjectManifestPathForRegistry !== this.projectManifestConfigPath);


        if (this.primaryMainConfig === null) {
            let configPathToLoad;
            let loadedFromReason = "";

            if (this.useFactoryDefaultsOnly) {
                configPathToLoad = this.factoryDefaultMainConfigPath;
                loadedFromReason = `factory default source (${path.basename(this.factoryDefaultMainConfigPath)})`;
                if (!fs.existsSync(configPathToLoad)) {
                    console.error(`CRITICAL: Factory default configuration file '${configPathToLoad}' not found. This file is essential for --factory-defaults mode.`);
                    this.primaryMainConfig = {}; 
                    this.primaryMainConfigPathActual = null;
                }
            } else if (this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath)) {
                configPathToLoad = this.projectManifestConfigPath;
                loadedFromReason = "project (from --config)";
            } else if (fs.existsSync(this.xdgGlobalConfigPath)) {
                configPathToLoad = this.xdgGlobalConfigPath;
                loadedFromReason = "XDG global";
            } else {
                if (fs.existsSync(this.defaultMainConfigPath)) {
                    configPathToLoad = this.defaultMainConfigPath;
                    loadedFromReason = `bundled main (${path.basename(this.defaultMainConfigPath)})`;
                } else {
                    console.warn(`WARN: Main config file '${this.defaultMainConfigPath}' not found. Using factory defaults '${this.factoryDefaultMainConfigPath}' as a last resort.`);
                    configPathToLoad = this.factoryDefaultMainConfigPath;
                    loadedFromReason = `factory default source (${path.basename(this.factoryDefaultMainConfigPath)}) (as fallback)`;
                    if (!fs.existsSync(configPathToLoad)) {
                        console.error(`CRITICAL: Fallback factory default configuration file '${configPathToLoad}' also not found.`);
                        this.primaryMainConfig = {};
                        this.primaryMainConfigPathActual = null;
                    }
                }
            }
            
            if (this.primaryMainConfig === null && configPathToLoad && fs.existsSync(configPathToLoad)) {
                try {
                    if (process.env.DEBUG) {
                        console.log(`INFO (ConfigResolver): Loading primary main configuration from: ${configPathToLoad} (${loadedFromReason})`);
                    }
                    this.primaryMainConfig = await loadYamlConfig(configPathToLoad);
                    this.primaryMainConfigPathActual = configPathToLoad;
                    if (configPathToLoad === this.projectManifestConfigPath) {
                        this.projectManifestConfig = this.primaryMainConfig; 
                    }
                } catch (error) {
                    console.error(`ERROR loading primary main configuration from '${configPathToLoad}': ${error.message}`);
                    this.primaryMainConfig = {};
                    this.primaryMainConfigPathActual = null;
                }
            } else if (this.primaryMainConfig === null) { 
                 this.primaryMainConfig = {};
                 this.primaryMainConfigPathActual = null;
                 if (configPathToLoad) { 
                    console.warn(`WARN: Primary main configuration file '${configPathToLoad}' could not be loaded or found. Using empty global settings.`);
                 } else {
                    console.warn(`WARN: No primary main configuration file could be identified. Using empty global settings.`);
                 }
            }
            this.primaryMainConfig = this.primaryMainConfig || {};
        }

        if (!this.useFactoryDefaultsOnly && this.projectManifestConfigPath && 
            this.projectManifestConfigPath !== this.primaryMainConfigPathActual &&
            !this.projectManifestConfig) { 
            if (fs.existsSync(this.projectManifestConfigPath)) {
                try {
                    if (process.env.DEBUG) {
                        console.log(`INFO (ConfigResolver): Loading project manifest configuration from: ${this.projectManifestConfigPath}`);
                    }
                    this.projectManifestConfig = await loadYamlConfig(this.projectManifestConfigPath);
                } catch (error) {
                     console.warn(`WARN (ConfigResolver): Could not load project manifest from ${this.projectManifestConfigPath} for project overrides: ${error.message}`);
                     this.projectManifestConfig = {};
                }
            } else {
                this.projectManifestConfig = {}; 
            }
        }
        this.projectManifestConfig = this.projectManifestConfig || null;

        await this._loadXdgMainConfigIfNeeded(); 

        if (needsRegistryBuild) {
            if (process.env.DEBUG) {
                console.log(`DEBUG (ConfigResolver): Rebuilding plugin registry. Current projectManifestConfigPath: ${this.projectManifestConfigPath}, useFactoryDefaultsOnly: ${this.useFactoryDefaultsOnly}`);
            }
            const registryBuilder = new PluginRegistryBuilder(
                this.projectRoot,
                this.xdgBaseDir,
                this.projectManifestConfigPath, 
                this.useFactoryDefaultsOnly
            );
            this.mergedPluginRegistry = await registryBuilder.buildRegistry(); 
            if(this.mergedPluginRegistry) {
                this.mergedPluginRegistry._builtWithFactoryDefaults = this.useFactoryDefaultsOnly;
            }
            this._lastProjectManifestPathForRegistry = this.projectManifestConfigPath; // Track for next call
        }
    }
    
    getConfigFileSources() {
        return this._lastEffectiveConfigSources
            ? { ...this._lastEffectiveConfigSources } 
            : { mainConfigPath: null, pluginConfigPaths: [], cssFiles: [] };
    }
    
    async _loadSingleConfigLayer(configFilePath, assetsBasePath) {
        const cacheKey = `${configFilePath}-${assetsBasePath}`; 
        if (this._rawPluginYamlCache[cacheKey]) {
            return this._rawPluginYamlCache[cacheKey];
        }

        if (!configFilePath || !fs.existsSync(configFilePath)) { 
            return null; 
        }
        try {
            const rawConfig = await loadYamlConfig(configFilePath);
            let resolvedCssPaths = [];
            if (rawConfig.css_files && Array.isArray(rawConfig.css_files)) {
                resolvedCssPaths = rawConfig.css_files.map(cssFile => {
                    if (typeof cssFile !== 'string') {
                        console.warn(`WARN (ConfigResolver): Non-string CSS file entry ignored in ${configFilePath}: ${cssFile}`);
                        return null;
                    }
                    const assetPath = path.isAbsolute(cssFile) ? cssFile : path.resolve(assetsBasePath, cssFile);
                    if (!fs.existsSync(assetPath)) {
                        console.warn(`WARN (ConfigResolver): CSS file not found: ${assetPath} (referenced in ${configFilePath})`);
                        return null;
                    }
                    return assetPath;
                }).filter(Boolean);
            }
            const inherit_css = rawConfig.inherit_css === true; 
            
            const result = { rawConfig, resolvedCssPaths, inherit_css, actualPath: configFilePath }; 
            this._rawPluginYamlCache[cacheKey] = result;
            return result;
        } catch (error) {
            console.error(`ERROR loading plugin configuration layer from '${configFilePath}': ${error.message}`);
            return { rawConfig: {}, resolvedCssPaths: [], inherit_css: false, actualPath: null };
        }
    }

    _isObject(item) { 
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    _deepMerge(target, source) { 
        const output = { ...target };
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (key === 'handler_script') { 
                    if (target[key] === undefined && source[key] !== undefined) {
                        output[key] = source[key];
                    }
                } else if (key === 'css_files' || key === 'inherit_css') {
                    if (source[key] !== undefined) {
                        output[key] = source[key];
                    }
                } else if (this._isObject(source[key]) && key in target && this._isObject(target[key])) {
                    output[key] = this._deepMerge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            });
        }
        return output;
    }

    async getEffectiveConfig(pluginName) {
        await this._initializeResolverIfNeeded(); 

        const cacheKey = `${pluginName}-${this.useFactoryDefaultsOnly}-${this.primaryMainConfigPathActual}`;
        if (this.loadedPluginConfigsCache[cacheKey]) {
            return this.loadedPluginConfigsCache[cacheKey];
        }

        const loadedConfigSourcePaths = {
            mainConfigPath: this.primaryMainConfigPathActual,
            pluginConfigPaths: [], 
            cssFiles: [] 
        };
        const primaryMainConfig = this.primaryMainConfig || {};

        const pluginRegistryEntry = this.mergedPluginRegistry ? this.mergedPluginRegistry[pluginName] : null;

        if (!pluginRegistryEntry || !pluginRegistryEntry.configPath) {
            throw new Error(`Plugin '${pluginName}' is not registered or its configuration path could not be resolved. Registry: ${JSON.stringify(this.mergedPluginRegistry)}. Check 'plugins' in your main config files.`);
        }
        
        const pluginOwnConfigPath = pluginRegistryEntry.configPath;

        if (!fs.existsSync(pluginOwnConfigPath)) {
            throw new Error(`Configuration file for plugin '${pluginName}' not found at registered path: '${pluginOwnConfigPath}'. This path was found in the merged plugin registry.`);
        }
        const actualPluginBasePath = path.dirname(pluginOwnConfigPath);
        
        const layer0Data = await this._loadSingleConfigLayer(pluginOwnConfigPath, actualPluginBasePath);
        let currentMergedConfig = {};
        let currentCssPaths = [];
        const originalHandlerScript = layer0Data && layer0Data.rawConfig ? layer0Data.rawConfig.handler_script : null;

        if (layer0Data && layer0Data.rawConfig) {
            currentMergedConfig = layer0Data.rawConfig;
            currentCssPaths = layer0Data.resolvedCssPaths || [];
            loadedConfigSourcePaths.pluginConfigPaths.push(pluginOwnConfigPath);
        } else {
            throw new Error(`Failed to load plugin's own configuration for '${pluginName}' from '${pluginOwnConfigPath}'.`);
        }
        
        if (!originalHandlerScript) {
            throw new Error(`'handler_script' not defined in plugin '${pluginName}'s own configuration file: ${pluginOwnConfigPath}`);
        }

        if (!this.useFactoryDefaultsOnly) {
            // Layer 1: XDG plugin-specific override file
            const xdgPluginSettingsOverrideFilename = pluginName + PLUGIN_CONFIG_FILENAME_SUFFIX; 
            const xdgPluginSettingsOverrideDir = path.join(this.xdgBaseDir, pluginName);
            const xdgPluginSettingsOverridePath = path.join(xdgPluginSettingsOverrideDir, xdgPluginSettingsOverrideFilename); 
            
            if (fs.existsSync(xdgPluginSettingsOverridePath)) {
                const layer1Data = await this._loadSingleConfigLayer(xdgPluginSettingsOverridePath, xdgPluginSettingsOverrideDir);
                if (layer1Data && layer1Data.rawConfig) {
                    currentMergedConfig = this._deepMerge(currentMergedConfig, layer1Data.rawConfig);
                    loadedConfigSourcePaths.pluginConfigPaths.push(xdgPluginSettingsOverridePath);
                    if (layer1Data.rawConfig.css_files !== undefined) {
                        if (layer1Data.inherit_css) {
                            currentCssPaths.push(...layer1Data.resolvedCssPaths);
                        } else {
                            currentCssPaths = layer1Data.resolvedCssPaths;
                        }
                    }
                }
            }

            // Layer 1.5: Inline override from XDG Main Config
            const xdgMainConfToUse = this.xdgMainConfigContents || {}; 
            if (xdgMainConfToUse[pluginName] && this._isObject(xdgMainConfToUse[pluginName])) {
                const inlineXdgOverrideBlock = xdgMainConfToUse[pluginName];
                currentMergedConfig = this._deepMerge(currentMergedConfig, inlineXdgOverrideBlock);
                loadedConfigSourcePaths.pluginConfigPaths.push(`Inline override from XDG main config: ${this.xdgGlobalConfigPath}`); // Use actual path
                if (inlineXdgOverrideBlock.css_files !== undefined) {
                    let resolvedInlineCss = [];
                    if (Array.isArray(inlineXdgOverrideBlock.css_files)) {
                        resolvedInlineCss = inlineXdgOverrideBlock.css_files.map(cssFile => {
                            if (typeof cssFile !== 'string') return null;
                            const assetPath = path.isAbsolute(cssFile) ? cssFile : path.resolve(this.xdgBaseDir, cssFile); 
                            if (!fs.existsSync(assetPath)) {
                                console.warn(`WARN (ConfigResolver): CSS file not found: ${assetPath} (referenced in inline XDG override for ${pluginName} in ${this.xdgGlobalConfigPath})`);
                                return null;
                            }
                            return assetPath;
                        }).filter(Boolean);
                    }
                    if (inlineXdgOverrideBlock.inherit_css === true) {
                        currentCssPaths.push(...resolvedInlineCss);
                    } else {
                        currentCssPaths = resolvedInlineCss;
                    }
                }
            }
            
            // Layer 2: Project plugin-specific override file
            const projectMainConfToUse = this.projectManifestConfig; 

            if (projectMainConfToUse && projectMainConfToUse.plugins) { 
                const projectPluginSpecificOverridePathRel = projectMainConfToUse.plugins[pluginName];

                if (typeof projectPluginSpecificOverridePathRel === 'string' && this.projectManifestBaseDir) {
                    let projectPluginSpecificOverridePathAbs = projectPluginSpecificOverridePathRel;
                    if (projectPluginSpecificOverridePathRel.startsWith('~/') || projectPluginSpecificOverridePathRel.startsWith('~\\')) {
                        projectPluginSpecificOverridePathAbs = path.join(os.homedir(), projectPluginSpecificOverridePathRel.substring(2));
                    }
                    if (!path.isAbsolute(projectPluginSpecificOverridePathAbs)) {
                        projectPluginSpecificOverridePathAbs = path.resolve(this.projectManifestBaseDir, projectPluginSpecificOverridePathRel);
                    }
                    
                    if (fs.existsSync(projectPluginSpecificOverridePathAbs)) {
                        if (projectPluginSpecificOverridePathAbs !== pluginOwnConfigPath) { 
                            const projectPluginSpecificAssetsBasePath = path.dirname(projectPluginSpecificOverridePathAbs);
                            const layer2Data = await this._loadSingleConfigLayer(projectPluginSpecificOverridePathAbs, projectPluginSpecificAssetsBasePath);
                            
                            if (layer2Data && layer2Data.rawConfig && Object.keys(layer2Data.rawConfig).length > 0) { // Check if rawConfig has keys
                                currentMergedConfig = this._deepMerge(currentMergedConfig, layer2Data.rawConfig);
                                loadedConfigSourcePaths.pluginConfigPaths.push(projectPluginSpecificOverridePathAbs);
                                if (layer2Data.rawConfig.css_files !== undefined) {
                                    if (layer2Data.inherit_css) {
                                        currentCssPaths.push(...layer2Data.resolvedCssPaths);
                                    } else {
                                        currentCssPaths = layer2Data.resolvedCssPaths;
                                    }
                                }
                            } else if (layer2Data && Object.keys(layer2Data.rawConfig || {}).length === 0) {
                                // If file exists but is empty or only comments, it might be loaded as {}.
                                // Still record it as a contributing file if it was specified.
                                loadedConfigSourcePaths.pluginConfigPaths.push(`${projectPluginSpecificOverridePathAbs} (empty or no effective overrides)`);
                            }
                        }
                    } else if (projectPluginSpecificOverridePathRel) {
                         console.warn(`WARN (ConfigResolver): Project-specific settings override for plugin '${pluginName}' in '${this.projectManifestConfigPath || 'project manifest'}' points to non-existent file: '${projectPluginSpecificOverridePathRel}' (resolved to '${projectPluginSpecificOverridePathAbs || projectPluginSpecificOverridePathRel}')`);
                    }
                } else if (projectPluginSpecificOverridePathRel !== undefined && typeof projectPluginSpecificOverridePathRel !== 'string' && !(this._isObject(projectPluginSpecificOverridePathRel))) {
                     console.warn(`WARN (ConfigResolver): Invalid path defined for plugin '${pluginName}' settings override in project manifest's 'plugins' section: ${JSON.stringify(projectPluginSpecificOverridePathRel)}`);
                }
            }

            // Layer 2.5: Inline override from Project Main Config
            if (projectMainConfToUse && projectMainConfToUse[pluginName] && this._isObject(projectMainConfToUse[pluginName])) {
                const inlineProjectOverrideBlock = projectMainConfToUse[pluginName];
                currentMergedConfig = this._deepMerge(currentMergedConfig, inlineProjectOverrideBlock);
                loadedConfigSourcePaths.pluginConfigPaths.push(`Inline override from project main config: ${this.projectManifestConfigPath}`);
                 if (inlineProjectOverrideBlock.css_files !== undefined) {
                    let resolvedInlineCss = [];
                     if (Array.isArray(inlineProjectOverrideBlock.css_files)) {
                        resolvedInlineCss = inlineProjectOverrideBlock.css_files.map(cssFile => {
                            if (typeof cssFile !== 'string') return null;
                            const assetBasePathForInline = this.projectManifestBaseDir; 
                            if (!assetBasePathForInline) {
                                console.warn(`WARN (ConfigResolver): Cannot resolve relative CSS path '${cssFile}' for inline project override of ${pluginName} because projectManifestBaseDir is not set.`);
                                return null;
                            }
                            const assetPath = path.isAbsolute(cssFile) ? cssFile : path.resolve(assetBasePathForInline, cssFile);
                            if (!fs.existsSync(assetPath)) {
                                console.warn(`WARN (ConfigResolver): CSS file not found: ${assetPath} (referenced in inline project override for ${pluginName} in ${this.projectManifestConfigPath})`);
                                return null;
                            }
                            return assetPath;
                        }).filter(Boolean);
                    }
                    if (inlineProjectOverrideBlock.inherit_css === true) {
                        currentCssPaths.push(...resolvedInlineCss);
                    } else {
                        currentCssPaths = resolvedInlineCss;
                    }
                }
            }
        }
        
        currentMergedConfig.handler_script = originalHandlerScript; 

        if (primaryMainConfig.global_pdf_options) {
            currentMergedConfig.pdf_options = this._deepMerge(
                 primaryMainConfig.global_pdf_options, 
                 currentMergedConfig.pdf_options || {}  
            );
            if (currentMergedConfig.pdf_options && currentMergedConfig.pdf_options.margin && primaryMainConfig.global_pdf_options.margin) {
                 currentMergedConfig.pdf_options.margin = this._deepMerge(
                    primaryMainConfig.global_pdf_options.margin,
                    currentMergedConfig.pdf_options.margin 
                );
            }
        }
        
        const pluginOwnMathConfig = currentMergedConfig.math || {}; 
        let effectiveMathConfig = primaryMainConfig.math || {};   

        effectiveMathConfig = this._deepMerge(effectiveMathConfig, pluginOwnMathConfig);
        
        if ((primaryMainConfig.math && primaryMainConfig.math.katex_options) || (pluginOwnMathConfig && pluginOwnMathConfig.katex_options)) {
            effectiveMathConfig.katex_options = this._deepMerge(
                (primaryMainConfig.math && primaryMainConfig.math.katex_options) || {},
                (pluginOwnMathConfig && pluginOwnMathConfig.katex_options) || {}
            );
        }
        currentMergedConfig.math = effectiveMathConfig;

        currentMergedConfig.css_files = [...new Set(currentCssPaths.filter(p => fs.existsSync(p)))]; 
        loadedConfigSourcePaths.cssFiles = currentMergedConfig.css_files; 

        const handlerScriptPath = path.resolve(actualPluginBasePath, currentMergedConfig.handler_script); 
        if (!fs.existsSync(handlerScriptPath)) {
            throw new Error(`Handler script '${handlerScriptPath}' not found for plugin '${pluginName}'. Expected relative to '${actualPluginBasePath}'. Original handler was '${originalHandlerScript}'.`);
        }

        const effectiveDetails = {
            pluginSpecificConfig: currentMergedConfig,
            mainConfig: primaryMainConfig, 
            pluginBasePath: actualPluginBasePath, 
            handlerScriptPath: handlerScriptPath,
            _wasFactoryDefaults: this.useFactoryDefaultsOnly 
        };
        
        this.loadedPluginConfigsCache[cacheKey] = effectiveDetails;
        this._lastEffectiveConfigSources = loadedConfigSourcePaths; 
        return effectiveDetails;
    }
}

module.exports = ConfigResolver;
