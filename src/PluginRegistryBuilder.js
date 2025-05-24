// src/PluginRegistryBuilder.js
const fs = require('fs');
const path = require('path');
const os = require('os'); 
const { loadConfig: loadYamlConfig } = require('./markdown_utils');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf'; 

class PluginRegistryBuilder {
    constructor(projectRoot, xdgBaseDir, projectManifestConfigPath, useFactoryDefaultsOnly = false) {
        this.projectRoot = projectRoot;
        if (!this.projectRoot || typeof this.projectRoot !== 'string') {
            throw new Error("PluginRegistryBuilder: projectRoot must be a valid path string.");
        }
        
        // Path to the user-modifiable main config in project root (if they create one)
        this.bundledMainConfigPath = path.join(this.projectRoot, 'config.yaml'); 
        // Path to the pristine factory defaults
        this.factoryDefaultMainConfigPath = path.join(this.projectRoot, 'config.example.yaml');

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

    _resolvePluginConfigPath(rawPath, basePath) {
        if (typeof rawPath !== 'string' || rawPath.trim() === '') return null;
        let resolvedPath = rawPath;
        if (resolvedPath.startsWith('~/') || resolvedPath.startsWith('~\\')) {
            resolvedPath = path.join(os.homedir(), resolvedPath.substring(2));
        }
        if (!path.isAbsolute(resolvedPath)) {
            if (!basePath) {
                 console.warn(`WARN (PluginRegistryBuilder): Cannot resolve relative plugin config path '${rawPath}' because its base path could not be determined.`);
                 return null;
            }
            resolvedPath = path.resolve(basePath, resolvedPath);
        }
        return resolvedPath; 
    }

    async _getPluginRegistrationsFromFile(mainConfigFilePath, basePathForRelativePaths, sourceType) {
        if (!mainConfigFilePath || !fs.existsSync(mainConfigFilePath)) {
            // console.log(`INFO (PluginRegistryBuilder): Main config file for '${sourceType}' not found at '${mainConfigFilePath}'. Skipping for plugin registrations.`);
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
                        console.warn(`WARN (PluginRegistryBuilder): Plugin '${pluginName}' registered in '${mainConfigFilePath}' points to a non-existent config file: '${pluginConfPathRaw}' (resolved to '${resolvedPath || pluginConfPathRaw}')`);
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
        if (this._builtRegistry && this._builtRegistry.builtWithFactoryDefaults === this.useFactoryDefaultsOnly) {
            return this._builtRegistry.registry;
        }

        let registry = {};
        let sourcePathForInitialRegistrations;
        let initialRegistrationsSourceType;

        if (this.useFactoryDefaultsOnly) {
            sourcePathForInitialRegistrations = this.factoryDefaultMainConfigPath;
            initialRegistrationsSourceType = `Factory Default (${path.basename(this.factoryDefaultMainConfigPath)})`;
            if (!fs.existsSync(sourcePathForInitialRegistrations)) {
                console.error(`CRITICAL (PluginRegistryBuilder): Factory default config '${sourcePathForInitialRegistrations}' not found. Cannot load factory default plugin registrations.`);
            }
        } else {
            // In normal mode, "Bundled" registrations could come from projectRoot/config.yaml if it exists,
            // otherwise, for a truly clean start or if config.yaml is absent,
            // config.example.yaml acts as the ultimate source of bundled plugin definitions.
            if (fs.existsSync(this.bundledMainConfigPath)) {
                sourcePathForInitialRegistrations = this.bundledMainConfigPath;
                initialRegistrationsSourceType = `Bundled Main (${path.basename(this.bundledMainConfigPath)})`;
            } else if (fs.existsSync(this.factoryDefaultMainConfigPath)) {
                console.warn(`WARN (PluginRegistryBuilder): Main config '${this.bundledMainConfigPath}' not found. Using '${this.factoryDefaultMainConfigPath}' for initial plugin registrations.`);
                sourcePathForInitialRegistrations = this.factoryDefaultMainConfigPath;
                initialRegistrationsSourceType = `Factory Default Fallback (${path.basename(this.factoryDefaultMainConfigPath)})`;
            } else {
                 console.error(`CRITICAL (PluginRegistryBuilder): Neither '${this.bundledMainConfigPath}' nor '${this.factoryDefaultMainConfigPath}' found. Cannot load initial plugin registrations.`);
            }
        }
        
        if (sourcePathForInitialRegistrations && fs.existsSync(sourcePathForInitialRegistrations)) {
            const initialRegistrations = await this._getPluginRegistrationsFromFile(sourcePathForInitialRegistrations, this.projectRoot, initialRegistrationsSourceType);
            registry = { ...registry, ...initialRegistrations };
        }


        if (!this.useFactoryDefaultsOnly) {
            if (fs.existsSync(this.xdgGlobalConfigPath)) { 
                const xdgRegistrations = await this._getPluginRegistrationsFromFile(this.xdgGlobalConfigPath, this.xdgBaseDir, "XDG Global");
                registry = { ...registry, ...xdgRegistrations };
            }

            if (this.projectManifestConfigPath && typeof this.projectManifestConfigPath === 'string' && fs.existsSync(this.projectManifestConfigPath)) {
                const projectRegistrations = await this._getPluginRegistrationsFromFile(this.projectManifestConfigPath, this.projectManifestBaseDir, "Project Manifest (--config)");
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
                    console.warn(`WARN (PluginRegistryBuilder): Could not load or parse plugin config for description: ${registrationInfo.configPath} - ${e.message}`);
                }

                let registrationSourceDisplay = registrationInfo.sourceType;
                 // More descriptive source type
                if (registrationInfo.sourceType.startsWith("Project Manifest") && registrationInfo.definedIn) {
                    registrationSourceDisplay = `Project (--config: ${registrationInfo.definedIn})`;
                } else if (registrationInfo.sourceType === "XDG Global" && registrationInfo.definedIn) {
                    registrationSourceDisplay = `XDG (${registrationInfo.definedIn})`;
                } else if (registrationInfo.sourceType.includes("Bundled Main") && registrationInfo.definedIn){
                     registrationSourceDisplay = `Bundled (${path.basename(registrationInfo.definedIn)})`;
                } else if (registrationInfo.sourceType.includes("Factory Default") && registrationInfo.definedIn){
                     registrationSourceDisplay = `Factory (${path.basename(registrationInfo.definedIn)})`;
                }


                pluginDetailsList.push({
                    name: pluginName,
                    description: description,
                    configPath: registrationInfo.configPath,
                    registrationSourceDisplay: registrationSourceDisplay, // Use the more descriptive one
                });
            }
        }
        pluginDetailsList.sort((a, b) => a.name.localeCompare(b.name));
        return pluginDetailsList;
    }
}

module.exports = PluginRegistryBuilder;
