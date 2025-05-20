// src/PluginRegistryBuilder.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig: loadYamlConfig } = require('./markdown_utils');

class PluginRegistryBuilder {
    constructor(projectRoot, xdgBaseDir, projectManifestConfigPath, useFactoryDefaultsOnly = false) {
        this.projectRoot = projectRoot;
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml');

        this.xdgBaseDir = xdgBaseDir;
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = projectManifestConfigPath;
        this.projectManifestBaseDir = this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath) ? path.dirname(this.projectManifestConfigPath) : null;
        
        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;
    }

    _resolvePluginConfigPath(rawPath, basePath) {
        if (typeof rawPath !== 'string' || rawPath.trim() === '') return null;
        let resolvedPath = rawPath;
        if (resolvedPath.startsWith('~/') || resolvedPath.startsWith('~\\')) {
            resolvedPath = path.join(os.homedir(), resolvedPath.substring(2));
        }
        if (!path.isAbsolute(resolvedPath)) {
            // If basePath is null (e.g. projectManifestConfigPath didn't exist), we can't resolve relative paths.
            if (!basePath) {
                 console.warn(`WARN: Cannot resolve relative plugin config path '${rawPath}' because its base path could not be determined.`);
                 return null;
            }
            resolvedPath = path.resolve(basePath, resolvedPath);
        }
        return resolvedPath; 
    }

    async _getPluginRegistrationsFromFile(mainConfigFilePath, basePathForRelativePaths) {
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
                        registrations[pluginName] = resolvedPath;
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

    async build() {
        let registry = {};

        // 1. Bundled main config (lowest precedence for registration)
        const bundledRegistrations = await this._getPluginRegistrationsFromFile(this.defaultMainConfigPath, this.projectRoot);
        registry = { ...registry, ...bundledRegistrations };

        if (!this.useFactoryDefaultsOnly) {
            // 2. XDG global config (middle precedence)
            if (fs.existsSync(this.xdgGlobalConfigPath)) { 
                const xdgRegistrations = await this._getPluginRegistrationsFromFile(this.xdgGlobalConfigPath, this.xdgBaseDir);
                registry = { ...registry, ...xdgRegistrations };
            }

            // 3. Project manifest config (highest precedence)
            if (this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath)) {
                const projectRegistrations = await this._getPluginRegistrationsFromFile(this.projectManifestConfigPath, this.projectManifestBaseDir);
                registry = { ...registry, ...projectRegistrations };
            }
        }
        return registry;
    }
}

module.exports = PluginRegistryBuilder;
