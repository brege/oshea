// src/PluginRegistryBuilder.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig: loadYamlConfig } = require('./markdown_utils');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';

class PluginRegistryBuilder {
    constructor(projectRoot, xdgBaseDir, projectManifestConfigPath, useFactoryDefaultsOnly = false, isLazyLoadMode = false) { // Added isLazyLoadMode
        this.projectRoot = projectRoot;
        if (!this.projectRoot || typeof this.projectRoot !== 'string') {
            throw new Error("PluginRegistryBuilder: projectRoot must be a valid path string.");
        }

        this.bundledMainConfigPath = path.join(this.projectRoot, 'config.yaml');
        this.factoryDefaultMainConfigPath = path.join(this.projectRoot, 'config.example.yaml');
        this.isLazyLoadMode = isLazyLoadMode; // Store the flag

        if (!xdgBaseDir || typeof xdgBaseDir !== 'string') {
            const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
            this.xdgBaseDir = path.join(xdgConfigHome, XDG_CONFIG_DIR_NAME);
        } else {
            this.xdgBaseDir = xdgBaseDir;
        }
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = projectManifestConfigPath;
        this.projectManifestBaseDir = this.projectManifestConfigPath && typeof this.projectManifestConfigPath === 'string' && fs.existsSync(this.projectManifestConfigPath) ? path.dirname(this.projectManifestConfigPath) : null;

        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;
        this._builtRegistry = null; 
    }

    _resolveAlias(alias, aliasValue, basePathDefiningAlias) {
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
                return null;
            }
        } else if (resolvedPath.startsWith('~/') || resolvedPath.startsWith('~\\')) {
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
                // If it's a directory, try to find <dirname>.config.yaml inside it
                const dirName = path.basename(resolvedPath);
                const conventionalConfigPath = path.join(resolvedPath, `${dirName}.config.yaml`);
                if (fs.existsSync(conventionalConfigPath) && fs.statSync(conventionalConfigPath).isFile()) {
                    return conventionalConfigPath;
                }
                // Fallback: try to find *any* *.config.yaml in the directory
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

    async buildRegistry() {
        if (this._builtRegistry && 
            this._builtRegistry.builtWithFactoryDefaults === this.useFactoryDefaultsOnly &&
            this._builtRegistry.projectManifestPathUsed === this.projectManifestConfigPath &&
            this._builtRegistry.isLazyLoadMode === this.isLazyLoadMode) { // Check lazy load mode for cache
            return this._builtRegistry.registry;
        }

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
            if (fs.existsSync(this.bundledMainConfigPath)) {
                sourcePathForInitialRegistrations = this.bundledMainConfigPath;
                initialRegistrationsSourceType = `Bundled Main (${path.basename(this.bundledMainConfigPath)})`;
            } else if (fs.existsSync(this.factoryDefaultMainConfigPath)) {
                if (!this.isLazyLoadMode) { // Suppress warning in lazy load mode
                    console.warn(`WARN (PluginRegistryBuilder): Main config '${this.bundledMainConfigPath}' not found. Using '${this.factoryDefaultMainConfigPath}' for initial plugin registrations.`);
                }
                sourcePathForInitialRegistrations = this.factoryDefaultMainConfigPath;
                initialRegistrationsSourceType = `Factory Default Fallback (${path.basename(this.factoryDefaultMainConfigPath)})`;
            } else {
                 console.error(`CRITICAL (PluginRegistryBuilder): Neither '${this.bundledMainConfigPath}' nor '${this.factoryDefaultMainConfigPath}' found. Cannot load initial plugin registrations.`);
                 sourcePathForInitialRegistrations = null; 
            }
        }
        
        if (sourcePathForInitialRegistrations) { 
            const initialRegistrations = await this._getPluginRegistrationsFromFile(sourcePathForInitialRegistrations, baseDirForInitialRegistrations, initialRegistrationsSourceType);
            registry = {...registry, ...initialRegistrations};
        }

        if (!this.useFactoryDefaultsOnly) {
            if (fs.existsSync(this.xdgGlobalConfigPath)) {
                const xdgRegistrations = await this._getPluginRegistrationsFromFile(this.xdgGlobalConfigPath, this.xdgBaseDir, "XDG Global");
                registry = {...registry, ...xdgRegistrations};
            }

            if (this.projectManifestConfigPath && typeof this.projectManifestConfigPath === 'string' && fs.existsSync(this.projectManifestConfigPath)) {
                const projectRegistrations = await this._getPluginRegistrationsFromFile(this.projectManifestConfigPath, this.projectManifestBaseDir, "Project Manifest (--config)");
                registry = {...registry, ...projectRegistrations}; 
            }
        }
        this._builtRegistry = { 
            registry, 
            builtWithFactoryDefaults: this.useFactoryDefaultsOnly,
            projectManifestPathUsed: this.projectManifestConfigPath,
            isLazyLoadMode: this.isLazyLoadMode // Cache lazy load mode
        };
        return registry;
    }

    async getAllPluginDetails() {
        const registry = await this.buildRegistry();
        const pluginDetailsList = [];

        for (const pluginName in registry) {
            if (Object.prototype.hasOwnProperty.call(registry, pluginName)) {
                const registrationInfo = registry[pluginName];
                let description = "N/A";
                try {
                    if (registrationInfo.configPath && fs.existsSync(registrationInfo.configPath)) {
                        if (fs.statSync(registrationInfo.configPath).isFile()) {
                            const pluginConfig = await loadYamlConfig(registrationInfo.configPath);
                            description = pluginConfig.description || "N/A";
                        } else {
                            description = "Error: Registered path is a directory, not a file.";
                        }
                    } else {
                         description = "Error: Config path does not exist.";
                    }
                } catch (e) {
                    console.warn(`WARN (PluginRegistryBuilder): Could not load or parse plugin config for description: ${registrationInfo.configPath} - ${e.message}`);
                     description = `Error loading config: ${e.message.substring(0, 50)}...`;
                }

                let registrationSourceDisplay = registrationInfo.sourceType;
                if (registrationInfo.definedIn) {
                    const definedInFilename = path.basename(registrationInfo.definedIn);
                    if (registrationInfo.sourceType.startsWith("Project Manifest")) {
                        registrationSourceDisplay = `Project (--config: ${definedInFilename})`;
                    } else if (registrationInfo.sourceType === "XDG Global") {
                        registrationSourceDisplay = `XDG (${definedInFilename})`;
                    } else if (registrationInfo.sourceType.includes("Bundled Main")) {
                         registrationSourceDisplay = `Bundled (${definedInFilename})`;
                    } else if (registrationInfo.sourceType.includes("Factory Default")) {
                         registrationSourceDisplay = `Factory (${definedInFilename})`;
                    } else {
                        registrationSourceDisplay = `${registrationInfo.sourceType} (${definedInFilename})`;
                    }
                }
                pluginDetailsList.push({
                    name: pluginName,
                    description: description,
                    configPath: registrationInfo.configPath,
                    registrationSourceDisplay: registrationSourceDisplay,
                });
            }
        }
        pluginDetailsList.sort((a, b) => a.name.localeCompare(b.name));
        return pluginDetailsList;
    }
}

module.exports = PluginRegistryBuilder;
