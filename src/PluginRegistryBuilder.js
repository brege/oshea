// src/PluginRegistryBuilder.js
const fs = require('fs');
const path = require('path');
const os = require('os'); // Ensure 'os' is required
const { loadConfig: loadYamlConfig } = require('./markdown_utils');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf'; // Define this constant

class PluginRegistryBuilder {
    constructor(projectRoot, xdgBaseDir, projectManifestConfigPath, useFactoryDefaultsOnly = false) {
        this.projectRoot = projectRoot;
        if (!this.projectRoot || typeof this.projectRoot !== 'string') {
            throw new Error("PluginRegistryBuilder: projectRoot must be a valid path string.");
        }
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml');

        // If xdgBaseDir is not provided or is null, determine it internally.
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
        this._builtRegistry = null; // Cache for the built registry
    }

    _resolvePluginConfigPath(rawPath, basePath) {
        if (typeof rawPath !== 'string' || rawPath.trim() === '') return null;
        let resolvedPath = rawPath;
        if (resolvedPath.startsWith('~/') || resolvedPath.startsWith('~\\')) {
            resolvedPath = path.join(os.homedir(), resolvedPath.substring(2));
        }
        if (!path.isAbsolute(resolvedPath)) {
            if (!basePath) {
                 console.warn(`WARN: Cannot resolve relative plugin config path '${rawPath}' because its base path could not be determined.`);
                 return null;
            }
            resolvedPath = path.resolve(basePath, resolvedPath);
        }
        return resolvedPath; 
    }

    async _getPluginRegistrationsFromFile(mainConfigFilePath, basePathForRelativePaths, sourceType) {
        if (!mainConfigFilePath || !fs.existsSync(mainConfigFilePath)) {
            return {};
        }
        try {
            const config = await loadYamlConfig(mainConfigFilePath);
            const registrations = {};
            if (config && config.document_type_plugins && typeof config.document_type_plugins === 'object') {
                for (const [pluginName, pluginConfPathRaw] of Object.entries(config.document_type_plugins)) {
                    const resolvedPath = this._resolvePluginConfigPath(pluginConfPathRaw, basePathForRelativePaths);
                    if (resolvedPath && fs.existsSync(resolvedPath)) {
                        registrations[pluginName] = {
                            configPath: resolvedPath,
                            definedIn: mainConfigFilePath,
                            sourceType: sourceType
                        };
                    } else {
                        console.warn(`WARN: Plugin '${pluginName}' registered in '${mainConfigFilePath}' points to a non-existent config file: '${pluginConfPathRaw}' (resolved to '${resolvedPath || pluginConfPathRaw}')`);
                    }
                }
            }
            return registrations;
        } catch (error) {
            console.error(`ERROR reading plugin registrations from '${mainConfigFilePath}': ${error.message}`);
            return {};
        }
    }

    async buildRegistry() {
        if (this._builtRegistry && this._builtRegistry.builtWithFactoryDefaults === this.useFactoryDefaultsOnly) {
            return this._builtRegistry.registry;
        }

        let registry = {};

        const bundledRegistrations = await this._getPluginRegistrationsFromFile(this.defaultMainConfigPath, this.projectRoot, "Bundled");
        registry = { ...registry, ...bundledRegistrations };

        if (!this.useFactoryDefaultsOnly) {
            if (fs.existsSync(this.xdgGlobalConfigPath)) { 
                const xdgRegistrations = await this._getPluginRegistrationsFromFile(this.xdgGlobalConfigPath, this.xdgBaseDir, "XDG");
                registry = { ...registry, ...xdgRegistrations };
            }

            if (this.projectManifestConfigPath && typeof this.projectManifestConfigPath === 'string' && fs.existsSync(this.projectManifestConfigPath)) {
                const projectRegistrations = await this._getPluginRegistrationsFromFile(this.projectManifestConfigPath, this.projectManifestBaseDir, "Project");
                registry = { ...registry, ...projectRegistrations };
            }
        }
        this._builtRegistry = { registry, builtWithFactoryDefaults: this.useFactoryDefaultsOnly };
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
                        const pluginConfig = await loadYamlConfig(registrationInfo.configPath);
                        description = pluginConfig.description || "N/A";
                    }
                } catch (e) {
                    console.warn(`WARN: Could not load or parse plugin config for description: ${registrationInfo.configPath} - ${e.message}`);
                }

                let registrationSourceDisplay = registrationInfo.sourceType;
                if (registrationInfo.sourceType === "Project" && registrationInfo.definedIn) {
                    registrationSourceDisplay = `Project: ${registrationInfo.definedIn}`;
                } else if (registrationInfo.sourceType === "XDG" && registrationInfo.definedIn) {
                    registrationSourceDisplay = `XDG: ${registrationInfo.definedIn}`;
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
