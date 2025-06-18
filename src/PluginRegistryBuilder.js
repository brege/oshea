// src/PluginRegistryBuilder.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig: loadYamlConfig } = require('./markdown_utils');
const yaml = require('js-yaml');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';
const CM_ENABLED_MANIFEST_FILENAME = 'enabled.yaml';
const CM_COLLECTIONS_SUBDIR_NAME = 'collections';

class PluginRegistryBuilder {
    constructor(
        projectRoot,
        xdgBaseDir,
        projectManifestConfigPath,
        useFactoryDefaultsOnly = false,
        isLazyLoadMode = false,
        primaryMainConfigLoadReason = null,
        collectionsManagerInstance = null,
        dependencies = {}
    ) {
        const defaultDependencies = { fs, fsPromises: fs.promises, path, os, loadYamlConfig, yaml, process };
        this.dependencies = { ...defaultDependencies, ...dependencies };

        this.projectRoot = projectRoot;
        if (!this.projectRoot || typeof this.projectRoot !== 'string') {
            throw new Error("PluginRegistryBuilder: projectRoot must be a valid path string.");
        }

        this.bundledMainConfigPath = this.dependencies.path.join(this.projectRoot, 'config.yaml');
        this.factoryDefaultMainConfigPath = this.dependencies.path.join(this.projectRoot, 'config.example.yaml');
        this.isLazyLoadMode = isLazyLoadMode;
        this.primaryMainConfigLoadReason = primaryMainConfigLoadReason;

        if (!xdgBaseDir || typeof xdgBaseDir !== 'string') {
            const xdgConfigHome = this.dependencies.process.env.XDG_CONFIG_HOME || this.dependencies.path.join(this.dependencies.os.homedir(), '.config');
            this.xdgBaseDir = this.dependencies.path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);
        } else {
            this.xdgBaseDir = xdgBaseDir;
        }
        this.xdgGlobalConfigPath = this.dependencies.path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = projectManifestConfigPath;
        this.projectManifestBaseDir = this.projectManifestConfigPath && typeof this.projectManifestConfigPath === 'string' && this.dependencies.fs.existsSync(this.projectManifestConfigPath) ? this.dependencies.path.dirname(this.projectManifestConfigPath) : null;

        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;
        this.collectionsManager = collectionsManagerInstance;
        this._builtRegistry = null;

        this.cmCollRoot = this._determineCmCollRoot();
        this.cmEnabledManifestPath = this.dependencies.path.join(this.cmCollRoot, CM_ENABLED_MANIFEST_FILENAME);
    }

    _determineCmCollRoot() {
        const { os, path, process } = this.dependencies;
        const xdgDataHome = process.env.XDG_DATA_HOME ||
            (os.platform() === 'win32'
                ? path.join(os.homedir(), 'AppData', 'Local')
                : path.join(os.homedir(), '.local', 'share'));
        return path.join(xdgDataHome, XDG_CONFIG_DIR_NAME, CM_COLLECTIONS_SUBDIR_NAME);
    }

    _resolveAlias(alias, aliasValue, basePathDefiningAlias) {
        const { path, os } = this.dependencies;
        if (typeof aliasValue !== 'string' || aliasValue.trim() === '') return null;
        let resolvedAliasPath = aliasValue;
        if (resolvedAliasPath.startsWith('~/') || resolvedAliasPath.startsWith('~\\')) {
            resolvedAliasPath = path.join(os.homedir(), resolvedAliasPath.substring(2));
        }
        if (!path.isAbsolute(resolvedAliasPath)) {
            if (!basePathDefiningAlias) {
                console.warn(`WARN (PluginRegistryBuilder): Cannot resolve relative alias target '${aliasValue}' for alias '${alias}' because the base path of the config file defining it is unknown.`);
                return null;
            }
            resolvedAliasPath = path.resolve(basePathDefiningAlias, resolvedAliasPath);
        }
        return resolvedAliasPath;
    }

    _resolvePluginConfigPath(rawPath, basePathForMainConfig, currentAliases) {
        const { fs, path, os } = this.dependencies;
        if (typeof rawPath !== 'string' || rawPath.trim() === '') return null;

        let resolvedPath = rawPath;
        const aliasParts = rawPath.split(':');
        if (aliasParts.length > 1 && currentAliases && currentAliases[aliasParts[0]]) {
            const aliasName = aliasParts[0];
            const pathWithinAlias = aliasParts.slice(1).join(':');
            const resolvedAliasBasePath = currentAliases[aliasName];
            if (resolvedAliasBasePath) {
                resolvedPath = path.join(resolvedAliasBasePath, pathWithinAlias);
            } else {
                console.warn(`WARN (PluginRegistryBuilder): Alias '${aliasName}' used in plugin path '${rawPath}' could not be resolved to a base path. Skipping registration.`);
                return null;
            }
        }
        else if (resolvedPath.startsWith('~/') || resolvedPath.startsWith('~\\')) {
            resolvedPath = path.join(os.homedir(), resolvedPath.substring(2));
        }

        if (!path.isAbsolute(resolvedPath)) {
            if (!basePathForMainConfig) {
                console.warn(`WARN (PluginRegistryBuilder): Cannot resolve relative plugin config path '${rawPath}' because its base path (basePathForMainConfig) could not be determined. Skipping registration for this entry.`);
                return null;
            }
            resolvedPath = path.resolve(basePathForMainConfig, resolvedPath);
        }

        try {
            if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
                return resolvedPath;
            } else if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
                const dirName = path.basename(resolvedPath);
                const conventionalConfigPath = path.join(resolvedPath, `${dirName}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);
                if (fs.existsSync(conventionalConfigPath) && fs.statSync(conventionalConfigPath).isFile()) {
                    return conventionalConfigPath;
                }
                const filesInDir = fs.readdirSync(resolvedPath);
                const alternativeConfig = filesInDir.find(f => f.endsWith(PLUGIN_CONFIG_FILENAME_SUFFIX));
                if (alternativeConfig) {
                    const altPath = path.join(resolvedPath, alternativeConfig);
                    console.log(`INFO (PluginRegistryBuilder): Using '${alternativeConfig}' as config for plugin directory specified by '${rawPath}' (resolved to '${resolvedPath}').`);
                    return altPath;
                }
                console.warn(`WARN (PluginRegistryBuilder): Plugin configuration path '${rawPath}' (resolved to directory '${resolvedPath}') does not contain a suitable *.config.yaml file. Skipping registration.`);
                return null;
            } else {
                console.warn(`WARN (PluginRegistryBuilder): Plugin configuration path '${rawPath}' (resolved to '${resolvedPath}') does not exist. Skipping registration for this entry.`);
                return null;
            }
        } catch (e) {
            console.warn(`WARN (PluginRegistryBuilder): Error accessing resolved plugin configuration path '${resolvedPath}' for raw path '${rawPath}': ${e.message}. Skipping registration for this entry.`);
            return null;
        }
    }

    async _getPluginRegistrationsFromFile(mainConfigFilePath, basePathForMainConfig, sourceType) {
        const { fs, loadYamlConfig } = this.dependencies;
        if (!mainConfigFilePath || !fs.existsSync(mainConfigFilePath)) {
            return {};
        }
        try {
            const config = await loadYamlConfig(mainConfigFilePath);
            const registrations = {};
            let currentAliases = {};

            if (config && config.plugin_directory_aliases && typeof config.plugin_directory_aliases === 'object') {
                for (const [alias, aliasPathRaw] of Object.entries(config.plugin_directory_aliases)) {
                    const resolvedAliasTarget = this._resolveAlias(alias, aliasPathRaw, basePathForMainConfig);
                    if (resolvedAliasTarget) {
                        currentAliases[alias] = resolvedAliasTarget;
                    }
                }
            }

            if (config && config.plugins && typeof config.plugins === 'object') {
                for (const [pluginName, pluginConfPathRaw] of Object.entries(config.plugins)) {
                    const resolvedPath = this._resolvePluginConfigPath(pluginConfPathRaw, basePathForMainConfig, currentAliases);
                    if (resolvedPath) {
                        registrations[pluginName] = {
                            configPath: resolvedPath,
                            definedIn: mainConfigFilePath,
                            sourceType: sourceType
                        };
                    }
                }
            }
            return registrations;
        } catch (error) {
            console.error(`ERROR (PluginRegistryBuilder) reading plugin registrations from '${mainConfigFilePath}': ${error.message}`);
            return {};
        }
    }

    async _getPluginRegistrationsFromCmManifest(cmEnabledManifestPath, sourceType) {
        const { fs, fsPromises, yaml, process } = this.dependencies;
        const registrations = {};
        if (!fs.existsSync(cmEnabledManifestPath)) {
            if (process.env.DEBUG_CM_INTEGRATION === 'true') {
                console.log(`INFO (PluginRegistryBuilder): CollectionsManager manifest '${cmEnabledManifestPath}' not found. No CM plugins loaded this way.`);
            }
            return registrations;
        }
        try {
            const manifestContent = await fsPromises.readFile(cmEnabledManifestPath, 'utf8');
            const parsedManifest = yaml.load(manifestContent);

            if (parsedManifest && Array.isArray(parsedManifest.enabled_plugins)) {
                for (const pluginEntry of parsedManifest.enabled_plugins) {
                    if (pluginEntry && pluginEntry.invoke_name && pluginEntry.config_path) {
                        if (fs.existsSync(pluginEntry.config_path)) {
                            registrations[pluginEntry.invoke_name] = {
                                configPath: pluginEntry.config_path,
                                definedIn: cmEnabledManifestPath,
                                sourceType: `${sourceType} (CM: ${pluginEntry.collection_name}/${pluginEntry.plugin_id})`,
                                cmOriginalCollection: pluginEntry.collection_name,
                                cmOriginalPluginId: pluginEntry.plugin_id,
                                cmAddedOn: pluginEntry.added_on,
                                cmStatus: 'Enabled (CM)'
                            };
                        } else {
                            console.warn(`WARN (PluginRegistryBuilder): Config path '${pluginEntry.config_path}' for CM-enabled plugin '${pluginEntry.invoke_name}' does not exist. Skipping.`);
                        }
                    } else {
                        console.warn(`WARN (PluginRegistryBuilder): Invalid entry in CM manifest: ${JSON.stringify(pluginEntry)}. Skipping.`);
                    }
                }
            }
        } catch (error) {
            console.error(`ERROR (PluginRegistryBuilder) reading or parsing CM manifest '${cmEnabledManifestPath}': ${error.message}`);
        }
        return registrations;
    }

    async buildRegistry() {
        let needsRegistryBuild = this._builtRegistry === null ||
                                 this._builtRegistry.builtWithFactoryDefaults !== this.useFactoryDefaultsOnly ||
                                 this._builtRegistry.projectManifestPathUsed !== this.projectManifestConfigPath ||
                                 this._builtRegistry.isLazyLoadMode !== this.isLazyLoadMode ||
                                 this._builtRegistry.primaryMainConfigLoadReason !== this.primaryMainConfigLoadReason ||
                                 this._builtRegistry.collectionsManagerInstance !== this.collectionsManager;

        if (!needsRegistryBuild) {
            return this._builtRegistry.registry;
        }

        const { fs, path } = this.dependencies;
        let registry = {};
        let sourcePathForInitialRegistrations;
        let initialRegistrationsSourceType;
        let baseDirForInitialRegistrations = this.projectRoot;

        if (this.useFactoryDefaultsOnly) {
            sourcePathForInitialRegistrations = this.factoryDefaultMainConfigPath;
            initialRegistrationsSourceType = `Factory Default (${path.basename(this.factoryDefaultMainConfigPath)})`;
            if (!fs.existsSync(sourcePathForInitialRegistrations)) {
                console.error(`CRITICAL (PluginRegistryBuilder): Factory default config '${sourcePathForInitialRegistrations}' not found. Cannot load factory default plugin registrations.`);
                sourcePathForInitialRegistrations = null;
            }
        } else {
            if (fs.existsSync(this.factoryDefaultMainConfigPath)) {
                sourcePathForInitialRegistrations = this.factoryDefaultMainConfigPath;
                initialRegistrationsSourceType = `Bundled Definitions (${path.basename(this.factoryDefaultMainConfigPath)})`;
                const shouldWarn = !this.isLazyLoadMode && !fs.existsSync(this.bundledMainConfigPath) && (this.primaryMainConfigLoadReason === "bundled main" || this.primaryMainConfigLoadReason === "factory default fallback" || this.primaryMainConfigLoadReason === "none found");
                if (shouldWarn) {
                    console.warn(`WARN (PluginRegistryBuilder): Project root config '${this.bundledMainConfigPath}' not found, and no user-level main config (XDG or --config) was primary for global settings. Using '${this.factoryDefaultMainConfigPath}' for bundled plugin definitions.`);
                }
            } else {
                console.error(`CRITICAL (PluginRegistryBuilder): Bundled plugin definition file '${this.factoryDefaultMainConfigPath}' not found. Cannot load initial plugin registrations.`);
                sourcePathForInitialRegistrations = null;
            }
        }

        if (sourcePathForInitialRegistrations) {
            const initialRegistrations = await this._getPluginRegistrationsFromFile(sourcePathForInitialRegistrations, baseDirForInitialRegistrations, initialRegistrationsSourceType);
            registry = { ...registry, ...initialRegistrations };
        }

        if (!this.useFactoryDefaultsOnly && !this.collectionsManager) {
            const cmEnabledRegistrations = await this._getPluginRegistrationsFromCmManifest(this.cmEnabledManifestPath, "CollectionsManager");
            registry = { ...registry, ...cmEnabledRegistrations };
        }

        if (!this.useFactoryDefaultsOnly) {
            if (fs.existsSync(this.xdgGlobalConfigPath)) {
                const xdgRegistrations = await this._getPluginRegistrationsFromFile(this.xdgGlobalConfigPath, this.xdgBaseDir, "XDG Global");
                registry = { ...registry, ...xdgRegistrations };
            }
        }

        if (!this.useFactoryDefaultsOnly) {
            if (this.projectManifestConfigPath && typeof this.projectManifestConfigPath === 'string' && fs.existsSync(this.projectManifestConfigPath)) {
                if (this.projectManifestConfigPath !== sourcePathForInitialRegistrations || (this.projectManifestConfigPath === sourcePathForInitialRegistrations && !initialRegistrationsSourceType.startsWith('Bundled Definitions') && !initialRegistrationsSourceType.startsWith('Factory Default'))) {
                    const projectRegistrations = await this._getPluginRegistrationsFromFile(this.projectManifestConfigPath, this.projectManifestBaseDir, "Project Manifest (--config)");
                    registry = { ...registry, ...projectRegistrations };
                }
            }
        }

        this._builtRegistry = {
            registry,
            builtWithFactoryDefaults: this.useFactoryDefaultsOnly,
            projectManifestPathUsed: this.projectManifestConfigPath,
            isLazyLoadMode: this.isLazyLoadMode,
            primaryMainConfigLoadReason: this.primaryMainConfigLoadReason,
            collectionsManagerInstance: this.collectionsManager
        };
        return registry;
    }

    async getAllPluginDetails() {
        const { fs, path, loadYamlConfig } = this.dependencies;
        const pluginDetailsMap = new Map();
        const traditionalRegistry = await this.buildRegistry();

        for (const pluginName in traditionalRegistry) {
            if (Object.prototype.hasOwnProperty.call(traditionalRegistry, pluginName)) {
                const regInfo = traditionalRegistry[pluginName];
                let description = "N/A";
                try {
                    if (regInfo.configPath && fs.existsSync(regInfo.configPath) && fs.statSync(regInfo.configPath).isFile()) {
                        const pluginConfig = await loadYamlConfig(regInfo.configPath);
                        description = pluginConfig.description || "N/A";
                    } else {
                        description = `Error: Config path '${regInfo.configPath || 'undefined'}' not found or not a file.`;
                    }
                } catch (e) {
                    description = `Error loading config: ${e.message.substring(0, 50)}...`;
                }

                let regSourceDisplay = regInfo.sourceType;
                if (regInfo.definedIn) {
                    const definedInFilename = path.basename(regInfo.definedIn);
                    if (regInfo.sourceType.startsWith("Project Manifest")) regSourceDisplay = `Project (--config: ${definedInFilename})`;
                    else if (regInfo.sourceType === "XDG Global") regSourceDisplay = `XDG (${definedInFilename})`;
                    else if (regInfo.sourceType.includes("Bundled Definitions")) regSourceDisplay = `Bundled (${definedInFilename})`;
                    else if (regInfo.sourceType.includes("Factory Default")) regSourceDisplay = `Factory (${definedInFilename})`;
                }

                pluginDetailsMap.set(pluginName, {
                    name: pluginName, description, configPath: regInfo.configPath,
                    registrationSourceDisplay: regSourceDisplay,
                    status: regInfo.cmStatus || `Registered (${regInfo.sourceType.split('(')[0].trim()})`,
                    cmCollection: regInfo.cmOriginalCollection, cmPluginId: regInfo.cmOriginalPluginId,
                    cmInvokeName: regInfo.cmStatus === 'Enabled (CM)' ? pluginName : undefined,
                    cmAddedOn: regInfo.cmAddedOn
                });
            }
        }

        if (this.collectionsManager) {
            const cmAvailable = await this.collectionsManager.listAvailablePlugins(null) || [];
            const cmEnabled = await this.collectionsManager.listCollections('enabled', null) || [];
            const cmEnabledDetailsMap = new Map();
            cmEnabled.forEach(enabledPlugin => {
                const fullCmId = `${enabledPlugin.collection_name}/${enabledPlugin.plugin_id}`;
                if (!cmEnabledDetailsMap.has(fullCmId)) {
                    cmEnabledDetailsMap.set(fullCmId, []);
                }
                cmEnabledDetailsMap.get(fullCmId).push({
                    invokeName: enabledPlugin.invoke_name,
                    configPath: enabledPlugin.config_path,
                    addedOn: enabledPlugin.added_on
                });
            });

            for (const availableCmPlugin of cmAvailable) {
                const fullCmId = `${availableCmPlugin.collection}/${availableCmPlugin.plugin_id}`;
                const enabledInstances = cmEnabledDetailsMap.get(fullCmId);

                if (enabledInstances && enabledInstances.length > 0) {
                    enabledInstances.forEach(instance => {
                        pluginDetailsMap.set(instance.invokeName, {
                            name: instance.invokeName, description: availableCmPlugin.description,
                            configPath: instance.config_path,
                            registrationSourceDisplay: `CollectionsManager (CM: ${fullCmId})`,
                            status: 'Enabled (CM)', cmCollection: availableCmPlugin.collection,
                            cmPluginId: availableCmPlugin.plugin_id, cmInvokeName: instance.invokeName,
                            cmAddedOn: instance.addedOn
                        });
                    });
                } else {
                    if (!pluginDetailsMap.has(fullCmId)) {
                        pluginDetailsMap.set(fullCmId, {
                            name: fullCmId, description: availableCmPlugin.description,
                            configPath: availableCmPlugin.config_path,
                            registrationSourceDisplay: `CollectionsManager (CM: ${fullCmId})`,
                            status: 'Available (CM)', cmCollection: availableCmPlugin.collection,
                            cmPluginId: availableCmPlugin.plugin_id, cmInvokeName: undefined,
                            cmAddedOn: undefined
                        });
                    }
                }
            }
        }

        return Array.from(pluginDetailsMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
}

module.exports = PluginRegistryBuilder;
