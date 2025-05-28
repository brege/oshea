// src/main_config_loader.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadYamlConfig } = require('./config_utils');

const XDG_CONFIG_DIR_NAME = 'md-to-pdf';

class MainConfigLoader {
    constructor(projectRoot, mainConfigPathFromCli, useFactoryDefaultsOnly = false, xdgBaseDir = null) {
        this.projectRoot = projectRoot; // This is the md-to-pdf tool's root directory
        this.defaultMainConfigPath = path.join(this.projectRoot, 'config.yaml');
        this.factoryDefaultMainConfigPath = path.join(this.projectRoot, 'config.example.yaml');

        this.xdgBaseDir = xdgBaseDir || path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), XDG_CONFIG_DIR_NAME);
        this.xdgGlobalConfigPath = path.join(this.xdgBaseDir, 'config.yaml');

        this.projectManifestConfigPath = mainConfigPathFromCli;
        this.useFactoryDefaultsOnly = useFactoryDefaultsOnly;

        this.primaryConfig = null;
        this.primaryConfigPath = null;
        this.primaryConfigLoadReason = null;
        this.xdgConfigContents = null;
        this.projectConfigContents = null;
        this._initialized = false;
    }

    async _initialize() {
        if (this._initialized) return;

        let configPathToLoad;
        let loadedFromReason = "";

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
        this.primaryConfigLoadReason = loadedFromReason;

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
            this.primaryConfigLoadReason = "none found";
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

            if (this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath)) {
                 try {
                    if (this.projectManifestConfigPath === this.primaryConfigPath) {
                        this.projectConfigContents = this.primaryConfig;
                    } else {
                        this.projectConfigContents = await loadYamlConfig(this.projectManifestConfigPath);
                    }
                } catch (e) {
                    console.warn(`WARN (MainConfigLoader): Could not load project manifest from ${this.projectManifestConfigPath}: ${e.message}`);
                    this.projectConfigContents = {};
                }
            } else {
                this.projectConfigContents = null;
            }
        } else {
            this.xdgConfigContents = {};
            this.projectConfigContents = null;
        }
        this.xdgConfigContents = this.xdgConfigContents || {};
        this.projectConfigContents = this.projectConfigContents || {};

        this._initialized = true;
    }

    async getPrimaryMainConfig() {
        await this._initialize();
        return {
            // **** MODIFICATION START ****
            config: { 
                ...this.primaryConfig,
                projectRoot: this.projectRoot // Add the tool's root path here
            },
            // **** MODIFICATION END ****
            path: this.primaryConfigPath,
            baseDir: this.primaryConfigPath ? path.dirname(this.primaryConfigPath) : null,
            reason: this.primaryConfigLoadReason
        };
    }

    async getXdgMainConfig() {
        await this._initialize();
        const xdgBase = this.xdgGlobalConfigPath ? path.dirname(this.xdgGlobalConfigPath) : this.xdgBaseDir;
        // **** MODIFICATION START ****
        // Also ensure projectRoot is available if XDG config becomes primary in some scenarios
        // although getPrimaryMainConfig is the one that populates what plugins typically see as globalConfig.
        // For consistency, if this method were to be used to form the base globalConfig directly,
        // it should also include projectRoot.
        return { 
            config: {
                ...this.xdgConfigContents,
                projectRoot: this.projectRoot 
            }, 
            path: this.xdgGlobalConfigPath, 
            baseDir: xdgBase 
        };
        // **** MODIFICATION END ****
    }

    async getProjectManifestConfig() {
        await this._initialize();
        // **** MODIFICATION START ****
        // Similar consistency for projectRoot if this directly forms globalConfig
        return {
            config: {
                ...(this.projectConfigContents || {}), // Ensure projectConfigContents is an object
                projectRoot: this.projectRoot
            },
            // **** MODIFICATION END ****
            path: this.projectManifestConfigPath,
            baseDir: this.projectManifestConfigPath && fs.existsSync(this.projectManifestConfigPath) ? path.dirname(this.projectManifestConfigPath) : null
        };
    }
}

module.exports = MainConfigLoader;
