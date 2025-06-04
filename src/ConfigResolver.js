// src/ConfigResolver.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadYamlConfig, deepMerge } = require('./config_utils');
const PluginRegistryBuilder = require('./PluginRegistryBuilder');
const MainConfigLoader = require('./main_config_loader');
const PluginConfigLoader = require('./plugin_config_loader');
const AssetResolver = require('./asset_resolver');

const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

class ConfigResolver {
    constructor(mainConfigPathFromCli, useFactoryDefaultsOnly = false, isLazyLoadMode = false) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;
        this.isLazyLoadMode = isLazyLoadMode;

        this.mainConfigLoader = new MainConfigLoader(
            this.projectRoot,
            mainConfigPathFromCli,
            this.useFactoryDefaultsOnly
        );
        this.pluginConfigLoader = null;
        this.mergedPluginRegistry = null;
        this._lastProjectManifestPathForRegistry = mainConfigPathFromCli;
        this.loadedPluginConfigsCache = {};
        this._lastEffectiveConfigSources = null;
        this._initialized = false;
        this.primaryMainConfig = null;
        this.primaryMainConfigPathActual = null;
        this.primaryMainConfigLoadReason = null;
        this.resolvedCollRoot = null; // NEW: To store the resolved collections root
    }

    async _initializeResolverIfNeeded() {
        if (this._initialized) return;

        const primary = await this.mainConfigLoader.getPrimaryMainConfig();
        this.primaryMainConfig = primary.config;
        this.primaryMainConfigPathActual = primary.path;
        this.primaryMainConfigLoadReason = primary.reason; // Store this reason

        const xdg = await this.mainConfigLoader.getXdgMainConfig();
        const project = await this.mainConfigLoader.getProjectManifestConfig();

        // The primaryMainConfig already has the merged config from MainConfigLoader
        // This is where collections_root would reside if specified in a main config.
        this.resolvedCollRoot = this.primaryMainConfig.collections_root || null; // NEW: Extract collections_root

        this.pluginConfigLoader = new PluginConfigLoader(
            xdg.baseDir, xdg.config, xdg.path,
            project.baseDir, project.config, project.path,
            this.useFactoryDefaultsOnly
        );

        const currentProjectManifestPath = project.path;
        let needsRegistryBuild = this.mergedPluginRegistry === null ||
                                 (this.mergedPluginRegistry._builtWithFactoryDefaults !== this.useFactoryDefaultsOnly) ||
                                 (this._lastProjectManifestPathForRegistry !== currentProjectManifestPath) ||
                                 (this.mergedPluginRegistry.isLazyLoadMode !== this.isLazyLoadMode) || // also check if lazy load mode changed
                                 (this.mergedPluginRegistry.primaryMainConfigLoadReason !== this.primaryMainConfigLoadReason); // and if reason changed


        if (needsRegistryBuild) {
            if (process.env.DEBUG) {
                console.log(`DEBUG (ConfigResolver): Rebuilding plugin registry. ProjectManifestPath: ${currentProjectManifestPath}, FactoryDefaults: ${this.useFactoryDefaultsOnly}, LazyLoad: ${this.isLazyLoadMode}, PrimaryLoadReason: ${this.primaryMainConfigLoadReason}`);
            }
            const registryBuilder = new PluginRegistryBuilder(
                this.projectRoot, xdg.baseDir, currentProjectManifestPath,
                this.useFactoryDefaultsOnly,
                this.isLazyLoadMode,
                this.primaryMainConfigLoadReason // Pass the reason
            );
            this.mergedPluginRegistry = await registryBuilder.buildRegistry();
            if (this.mergedPluginRegistry) {
                this.mergedPluginRegistry._builtWithFactoryDefaults = this.useFactoryDefaultsOnly;
                this.mergedPluginRegistry.isLazyLoadMode = this.isLazyLoadMode; // Cache these for next check
                this.mergedPluginRegistry.primaryMainConfigLoadReason = this.primaryMainConfigLoadReason;
            }
            this._lastProjectManifestPathForRegistry = currentProjectManifestPath;
        }
        this._initialized = true;

        if (process.env.DEBUG) { // NEW debug log
            console.log("DEBUG (ConfigResolver): Resolved Collections Root:", this.resolvedCollRoot);
        }
    }

    getConfigFileSources() {
        return this._lastEffectiveConfigSources
            ? { ...this._lastEffectiveConfigSources }
            : { mainConfigPath: null, pluginConfigPaths: [], cssFiles: [] };
    }

    async _loadPluginBaseConfig(configFilePath, assetsBasePath, pluginName) {
        if (!this.pluginConfigLoader) {
            throw new Error("PluginConfigLoader not initialized in ConfigResolver.");
        }
        const cacheKey = `base-${configFilePath}-${assetsBasePath}`;
        if (this.pluginConfigLoader._rawPluginYamlCache[cacheKey]) {
            return this.pluginConfigLoader._rawPluginYamlCache[cacheKey];
        }
        if (!configFilePath || !fs.existsSync(configFilePath)) {
            console.warn(`WARN (ConfigResolver): Base config file path not provided or does not exist: ${configFilePath} for plugin ${pluginName}.`);
            return null;
        }
        try {
            const rawConfig = await loadYamlConfig(configFilePath);
            const initialCssPaths = AssetResolver.resolveAndMergeCss(
                rawConfig.css_files, assetsBasePath, [], false,
                pluginName, configFilePath
            );
            const inherit_css = rawConfig.inherit_css === true;
            const result = { rawConfig, resolvedCssPaths: initialCssPaths, inherit_css, actualPath: configFilePath };
            this.pluginConfigLoader._rawPluginYamlCache[cacheKey] = result;
            return result;
        } catch (error) {
            console.error(`ERROR (ConfigResolver): loading plugin base configuration from '${configFilePath}' for ${pluginName}: ${error.message}`);
            return { rawConfig: {}, resolvedCssPaths: [], inherit_css: false, actualPath: null };
        }
    }

    async getEffectiveConfig(pluginSpec, localConfigOverrides = null, markdownFilePath = null) {
        await this._initializeResolverIfNeeded();

        const isPathSpec = typeof pluginSpec === 'string' && (pluginSpec.includes(path.sep) || pluginSpec.startsWith('.'));
        let nominalPluginNameForLookup;
        let pluginOwnConfigPath;
        let actualPluginBasePath;

        if (isPathSpec) {
            let resolvedPathSpec = pluginSpec;
            if (!path.isAbsolute(resolvedPathSpec)) {
                if (resolvedPathSpec.startsWith('~/') || resolvedPathSpec.startsWith('~\\')) {
                    resolvedPathSpec = path.join(os.homedir(), resolvedPathSpec.substring(2));
                } else {
                    // For path specs originating from front matter or local config, they should be resolved by plugin_determiner
                    // If it reaches here as relative and not tilde-expanded, it's an issue or needs context from markdownFilePath.
                    // However, plugin_determiner now resolves them to absolute if from FM or local config.
                    // This path should only be hit if CLI provides a direct relative path NOT starting with './' or '../'
                    // which yargs might resolve against CWD. For robustness, ensure it's absolute.
                    // For now, assume plugin_determiner has made it absolute if it was from FM/local.
                     if (markdownFilePath && (pluginSpec.startsWith('./') || pluginSpec.startsWith('../'))) {
                        // This case should ideally be handled before getEffectiveConfig,
                        // e.g. by plugin_determiner.js resolving paths relative to the MD file or local config.
                        // If pluginSpec is truly meant to be relative to CWD, then path.resolve(pluginSpec) is fine.
                        // But if it was from FM, it's relative to the MD file.
                        // For safety, let's assume if it's relative here, it implies CWD or already resolved.
                        console.warn(`WARN (ConfigResolver): Plugin path spec '${pluginSpec}' is relative. Resolving from CWD. It should ideally be absolute if from front matter or local config.`);
                        resolvedPathSpec = path.resolve(pluginSpec);
                    } else if (!path.isAbsolute(resolvedPathSpec)) {
                        // If still not absolute, it's problematic without a clear base.
                        // This indicates an issue in how pluginSpec was determined or passed.
                        throw new Error(`Relative plugin path specification '${pluginSpec}' must be resolved to an absolute path before calling getEffectiveConfig if not from CLI CWD, or use a registered plugin name.`);
                    }
                }
            }
            if (!fs.existsSync(resolvedPathSpec)) {
                throw new Error(`Plugin configuration file or directory specified by path not found: '${resolvedPathSpec}'.`);
            }
            const stats = fs.statSync(resolvedPathSpec);
            if (stats.isDirectory()) {
                actualPluginBasePath = resolvedPathSpec;
                const dirName = path.basename(actualPluginBasePath);
                pluginOwnConfigPath = path.join(actualPluginBasePath, `${dirName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);
                nominalPluginNameForLookup = dirName;
                if (!fs.existsSync(pluginOwnConfigPath)) {
                    const filesInDir = fs.readdirSync(actualPluginBasePath);
                    const alternativeConfig = filesInDir.find(f => f.endsWith(PLUGIN_CONFIG_FILENAME_SUFFIX));
                    if (alternativeConfig) {
                        pluginOwnConfigPath = path.join(actualPluginBasePath, alternativeConfig);
                    } else {
                        throw new Error(`Plugin directory '${actualPluginBasePath}' specified, but no *.config.yaml file found within it.`);
                    }
                }
            } else if (stats.isFile()) {
                pluginOwnConfigPath = resolvedPathSpec;
                actualPluginBasePath = path.dirname(pluginOwnConfigPath);
                nominalPluginNameForLookup = path.basename(actualPluginBasePath);
            } else {
                 throw new Error(`Plugin path specification '${resolvedPathSpec}' is neither a file nor a directory.`);
            }
            if (!this.isLazyLoadMode || process.env.DEBUG) {
                console.log(`INFO (ConfigResolver): Loading plugin from path: ${pluginOwnConfigPath}. Nominal name for overrides: '${nominalPluginNameForLookup}'.`);
            }
        } else {
            nominalPluginNameForLookup = pluginSpec;
            const pluginRegistryEntry = this.mergedPluginRegistry ? this.mergedPluginRegistry[nominalPluginNameForLookup] : null;
            if (!pluginRegistryEntry || !pluginRegistryEntry.configPath) {
                throw new Error(`Plugin '${nominalPluginNameForLookup}' is not registered or its configuration path could not be resolved.`);
            }
            pluginOwnConfigPath = pluginRegistryEntry.configPath;
            if (!fs.existsSync(pluginOwnConfigPath)) {
                throw new Error(`Configuration file for plugin '${nominalPluginNameForLookup}' not found at registered path: '${pluginOwnConfigPath}'.`);
            }
            actualPluginBasePath = path.dirname(pluginOwnConfigPath);
        }

        const localOverridesCacheKeyPart = localConfigOverrides ? JSON.stringify(localConfigOverrides) : 'noLocalOverrides';
        const markdownFilePathCacheKeyPart = markdownFilePath || 'noMarkdownFile';
        const cacheKey = `${nominalPluginNameForLookup}-${isPathSpec ? 'pathspec' : 'namespec'}-${pluginOwnConfigPath}-${this.useFactoryDefaultsOnly}-${this.primaryMainConfigPathActual}-${localOverridesCacheKeyPart}-${markdownFilePathCacheKeyPart}`;

        if (this.loadedPluginConfigsCache[cacheKey]) {
            return this.loadedPluginConfigsCache[cacheKey];
        }

        const loadedConfigSourcePaths = {
            mainConfigPath: this.primaryMainConfigPathActual,
            pluginConfigPaths: [],
            cssFiles: []
        };

        const layer0Data = await this._loadPluginBaseConfig(pluginOwnConfigPath, actualPluginBasePath, nominalPluginNameForLookup);
        if (!layer0Data || !layer0Data.rawConfig) {
            throw new Error(`Failed to load plugin's own base configuration for '${nominalPluginNameForLookup}' from '${pluginOwnConfigPath}'.`);
        }
        loadedConfigSourcePaths.pluginConfigPaths.push(pluginOwnConfigPath);

        const originalHandlerScript = layer0Data.rawConfig.handler_script;
        if (!originalHandlerScript) {
            throw new Error(`'handler_script' not defined in plugin '${nominalPluginNameForLookup}'s own configuration file: ${pluginOwnConfigPath}`);
        }

        const {
            mergedConfig: configAfterXLPOlayers, // XDG, Local (Plugin file), Project Overrides
            mergedCssPaths: cssAfterXLPOlayers
        } = await this.pluginConfigLoader.applyOverrideLayers(
            nominalPluginNameForLookup, layer0Data, loadedConfigSourcePaths.pluginConfigPaths
        );

        let currentMergedConfig = configAfterXLPOlayers;
        let currentCssPaths = cssAfterXLPOlayers;

        if (localConfigOverrides && Object.keys(localConfigOverrides).length > 0) {
            if (process.env.DEBUG) {
                 console.log(`DEBUG (ConfigResolver): Applying localConfigOverrides for ${nominalPluginNameForLookup}:`, JSON.stringify(localConfigOverrides));
            }
            currentMergedConfig = deepMerge(currentMergedConfig, localConfigOverrides);

            if (localConfigOverrides.css_files && markdownFilePath) {
                const localConfigDir = path.dirname(markdownFilePath);
                currentCssPaths = AssetResolver.resolveAndMergeCss(
                    localConfigOverrides.css_files,
                    localConfigDir,
                    currentCssPaths,
                    localConfigOverrides.inherit_css === true,
                    nominalPluginNameForLookup,
                    `${path.basename(markdownFilePath, path.extname(markdownFilePath))}.config.yaml`
                );
            }
            const localConfigFilenameForLog = markdownFilePath ? `${path.basename(markdownFilePath, path.extname(markdownFilePath))}.config.yaml` : "<filename>.config.yaml";
            loadedConfigSourcePaths.pluginConfigPaths.push(`Local file override from '${localConfigFilenameForLog}'`);
        }

        currentMergedConfig.handler_script = originalHandlerScript;

        if (this.primaryMainConfig.global_pdf_options) {
            currentMergedConfig.pdf_options = deepMerge(
                this.primaryMainConfig.global_pdf_options,
                currentMergedConfig.pdf_options || {}
            );
            if (this.primaryMainConfig.global_pdf_options.margin && (currentMergedConfig.pdf_options || {}).margin) {
                currentMergedConfig.pdf_options.margin = deepMerge(
                    this.primaryMainConfig.global_pdf_options.margin,
                    currentMergedConfig.pdf_options.margin
                );
            }
        }

        const pluginOwnMathConfig = currentMergedConfig.math || {};
        let effectiveMathConfig = this.primaryMainConfig.math || {};
        effectiveMathConfig = deepMerge(effectiveMathConfig, pluginOwnMathConfig);
        if ((this.primaryMainConfig.math && this.primaryMainConfig.math.katex_options) || (pluginOwnMathConfig.katex_options)) {
            effectiveMathConfig.katex_options = deepMerge(
                (this.primaryMainConfig.math && this.primaryMainConfig.math.katex_options) || {},
                pluginOwnMathConfig.katex_options || {}
            );
        }
        currentMergedConfig.math = effectiveMathConfig;

        currentMergedConfig.css_files = [...new Set(currentCssPaths.filter(p => p && fs.existsSync(p)))];
        loadedConfigSourcePaths.cssFiles = currentMergedConfig.css_files;

        const handlerScriptPath = path.resolve(actualPluginBasePath, currentMergedConfig.handler_script);
        if (!fs.existsSync(handlerScriptPath)) {
            throw new Error(`Handler script '${handlerScriptPath}' not found for plugin '${nominalPluginNameForLookup}'.`);
        }

        const effectiveDetails = {
            pluginSpecificConfig: currentMergedConfig,
            mainConfig: this.primaryMainConfig,
            pluginBasePath: actualPluginBasePath,
            handlerScriptPath: handlerScriptPath,
            _wasFactoryDefaults: this.useFactoryDefaultsOnly
        };

        this.loadedPluginConfigsCache[cacheKey] = effectiveDetails;
        this._lastEffectiveConfigSources = loadedConfigSourcePaths;
        return effectiveDetails;
    }

    // NEW: Getter for the resolved collections root
    async getResolvedCollRoot() {
        await this._initializeResolverIfNeeded();
        return this.resolvedCollRoot;
    }
}

module.exports = ConfigResolver;
