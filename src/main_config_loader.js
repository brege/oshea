// src/main_config_loader.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadYamlConfig } = require('./config_utils');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';

class MainConfigLoader {
    constructor(projectRoot, mainConfigPathFromCli, useFactoryDefaultsOnly = false, xdgBaseDir = null) {
        this.projectRoot = projectRoot;
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml');
        this.factoryDefaultMainConfigPath = path.join(this.projectRoot, 'config.example.yaml');

        this.xdgBaseDir = xdgBaseDir || path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), XDG_CONFIG_DIR_NAME);
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = mainConfigPathFromCli; // This IS the path from --config
        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;

        this.primaryConfig = null;
        this.primaryConfigPath = null;
        this.primaryConfigLoadReason = null; // To store the reason
        this.xdgConfigContents = null;
        this.projectConfigContents = null; // Content of the project manifest
        this._initialized = false;
    }

    async _initialize() {
        if (this._initialized) return;

        let configPathToLoad;
        let loadedFromReason = ""; // Variable to store the determined reason

        if (this.useFactoryDefaultsOnly) {
            configPathToLoad = this.factoryDefaultMainConfigPath;
            loadedFromReason = "factory default";
        } else if (this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath)) {
            configPathToLoad = this.projectManifestConfigPath;
            loadedFromReason = "project (from --config)";
        } else if (fs.existsSync(this.xdgGlobalConfigPath)) {
            configPathToLoad = this.xdgGlobalConfigPath;
            loadedFromReason = "XDG global";
        } else {
            if (fs.existsSync(this.defaultMainConfigPath)) {
                configPathToLoad = this.defaultMainConfigPath;
                loadedFromReason = "bundled main";
            } else {
                configPathToLoad = this.factoryDefaultMainConfigPath;
                loadedFromReason = "factory default fallback";
            }
        }
        this.primaryConfigLoadReason = loadedFromReason; // Store on instance

        if (configPathToLoad && fs.existsSync(configPathToLoad)) {
            try {
                if (process.env.DEBUG) {
                     console.log(`INFO (MainConfigLoader): Loading primary main configuration from: ${configPathToLoad} (Reason: ${this.primaryConfigLoadReason})`);
                }
                this.primaryConfig = await loadYamlConfig(configPathToLoad);
                this.primaryConfigPath = configPathToLoad;
            } catch (error) {
                console.error(`ERROR (MainConfigLoader): loading primary main configuration from '${configPathToLoad}': ${error.message}`);
                this.primaryConfig = {};
            }
        } else {
            this.primaryConfig = {};
            this.primaryConfigLoadReason = "none found"; // Update reason if no file loaded
            console.warn(`WARN (MainConfigLoader): Primary main configuration file could not be identified or loaded. Using empty global settings.`);
        }
        this.primaryConfig = this.primaryConfig || {};

        if (!this.useFactoryDefaultsOnly) {
            if (fs.existsSync(this.xdgGlobalConfigPath)) {
                try {
                    if (this.xdgGlobalConfigPath === this.primaryConfigPath) {
                        this.xdgConfigContents = this.primaryConfig;
                    } else {
                        this.xdgConfigContents = await loadYamlConfig(this.xdgGlobalConfigPath);
                    }
                } catch (e) {
                    console.warn(`WARN (MainConfigLoader): Could not load XDG main config from ${this.xdgGlobalConfigPath}: ${e.message}`);
                    this.xdgConfigContents = {};
                }
            } else {
                this.xdgConfigContents = {};
            }

            // Load projectConfigContents if projectManifestConfigPath is set (even if it was also primary)
            if (this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath)) {
                 try {
                    if (this.projectManifestConfigPath === this.primaryConfigPath) {
                        this.projectConfigContents = this.primaryConfig;
                    } else {
                        // This case handles if XDG was primary but --config was also given (e.g., for plugin registry)
                        this.projectConfigContents = await loadYamlConfig(this.projectManifestConfigPath);
                    }
                } catch (e) {
                    console.warn(`WARN (MainConfigLoader): Could not load project manifest from ${this.projectManifestConfigPath}: ${e.message}`);
                    this.projectConfigContents = {}; // Ensure it's an object on failure
                }
            } else {
                this.projectConfigContents = null; // Explicitly null if no path or not found
            }
        } else {
            this.xdgConfigContents = {};
            this.projectConfigContents = null;
        }
        this.xdgConfigContents = this.xdgConfigContents || {};
        this.projectConfigContents = this.projectConfigContents || {}; // Ensure it's an object if it was null

        this._initialized = true;
    }

    async getPrimaryMainConfig() {
        await this._initialize();
        return {
            config: this.primaryConfig,
            path: this.primaryConfigPath,
            baseDir: this.primaryConfigPath ? path.dirname(this.primaryConfigPath) : null,
            reason: this.primaryConfigLoadReason // Return the stored reason
        };
    }

    async getXdgMainConfig() {
        await this._initialize();
        // Ensure xdgBaseDir is correctly defined even if xdgGlobalConfigPath doesn't exist
        const xdgBase = this.xdgGlobalConfigPath ? path.dirname(this.xdgGlobalConfigPath) : this.xdgBaseDir;
        return { config: this.xdgConfigContents, path: this.xdgGlobalConfigPath, baseDir: xdgBase };
    }

    async getProjectManifestConfig() {
        await this._initialize();
        return {
            config: this.projectConfigContents, // This is the content of the --config file
            path: this.projectManifestConfigPath, // This is the path from --config CLI arg
            baseDir: this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath) ? path.dirname(this.projectManifestConfigPath) : null
        };
    }
}

module.exports = MainConfigLoader;
