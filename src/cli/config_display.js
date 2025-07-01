// src/cli/config_display.js
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const ConfigResolver = require('../config/ConfigResolver'); // Still needed for type checking/reference, though not for new instantiation here.

async function displayGlobalConfig(configResolver, isPure) {
    // Ensure ConfigResolver is initialized to get primaryMainConfigLoadReason
    await configResolver._initializeResolverIfNeeded();
    const mainConfig = configResolver.primaryMainConfig || {};
    const mainConfigPath = configResolver.primaryMainConfigPathActual;
    const loadReason = configResolver.primaryMainConfigLoadReason; // Get the stored reason

    if (!isPure) {
        console.log("# Configuration Sources:");
        if (mainConfigPath) {
            let sourceTypeMessage = "";
            if (configResolver.useFactoryDefaultsOnly && loadReason === "factory default") { // More specific check
                sourceTypeMessage = `(Factory Default: ${path.basename(mainConfigPath)})`;
            } else if (loadReason === "project (from --config)") {
                sourceTypeMessage = "(Project --config)";
            } else if (loadReason === "XDG global") {
                sourceTypeMessage = "(XDG Global)";
            } else if (loadReason === "bundled main") {
                sourceTypeMessage = `(Bundled Main: ${path.basename(mainConfigPath)})`;
            } else if (loadReason === "factory default fallback") {
                sourceTypeMessage = `(Factory Default Fallback: ${path.basename(mainConfigPath)})`;
            } else if (loadReason) { // Fallback for any other defined reason
                 sourceTypeMessage = `(${loadReason})`;
            }
            console.log(`#   Primary Main Config Loaded: ${mainConfigPath} ${sourceTypeMessage}`);
        } else {
            console.log("#   Primary Main Config: (Using internal defaults as no file was loaded/found)");
        }

        // Logic for considered paths can be refined if MainConfigLoader exposes them too
        if (!configResolver.useFactoryDefaultsOnly) {
            const xdgConfigDetails = await configResolver.mainConfigLoader.getXdgMainConfig();
            const projectConfigDetails = await configResolver.mainConfigLoader.getProjectManifestConfig();

            if (projectConfigDetails.path && fs.existsSync(projectConfigDetails.path) && projectConfigDetails.path !== mainConfigPath) {
                console.log(`#   Considered Project Manifest (--config): ${projectConfigDetails.path}`);
            }
            if (xdgConfigDetails.path && fs.existsSync(xdgConfigDetails.path) && xdgConfigDetails.path !== mainConfigPath && (!projectConfigDetails.path || projectConfigDetails.path !== xdgConfigDetails.path)) {
                 console.log(`#   Considered XDG Global Config: ${xdgConfigDetails.path}`);
            }
        }
        const bundledMainDefaultPath = configResolver.mainConfigLoader.defaultMainConfigPath;
        if (fs.existsSync(bundledMainDefaultPath) && bundledMainDefaultPath !== mainConfigPath && mainConfigPath !== configResolver.mainConfigLoader.factoryDefaultMainConfigPath ) {
             console.log(`#   Considered Bundled Main Config (${path.basename(bundledMainDefaultPath)}): ${bundledMainDefaultPath}`);
        }
        console.log("# Active Global Configuration:\n");
    }

    const configToDump = { ...mainConfig };
    delete configToDump._sourcePath;

    console.log(yaml.dump(configToDump, { indent: 2, sortKeys: false, lineWidth: -1, noRefs: true }));

    if (!isPure) {
        console.log("\n# Note: This shows the global settings from the primary main configuration file.");
        console.log("# To see the full effective configuration for a specific plugin, use 'md-to-pdf config --plugin <pluginName>'.");
    }
}

async function displayPluginConfig(configResolver, pluginName, isPure) {
    await configResolver._initializeResolverIfNeeded();

    const effectiveConfig = await configResolver.getEffectiveConfig(pluginName);
    const configSources = configResolver.getConfigFileSources();

    if (!isPure) {
        console.log(`# Effective configuration for plugin: ${pluginName}\n`);
    }

    console.log(yaml.dump(effectiveConfig.pluginSpecificConfig, { indent: 2, sortKeys: true, lineWidth: -1, noRefs: true }));

    if (!isPure) {
        console.log("\n# Source Information:");
        console.log(`#   Plugin Base Path: ${effectiveConfig.pluginBasePath}`);
        console.log(`#   Handler Script Path: ${effectiveConfig.handlerScriptPath}`);

        console.log("#   Contributing Configuration Files (most specific last):");
        if (configSources.mainConfigPath) {
            console.log(`#     - Primary Main Config (for global settings): ${configSources.mainConfigPath}`);
        }
        configSources.pluginConfigPaths.forEach(p => console.log(`#     - ${p}`));

        console.log("\n# Resolved CSS Files (order matters):");
        if (effectiveConfig.pluginSpecificConfig.css_files && effectiveConfig.pluginSpecificConfig.css_files.length > 0) {
            effectiveConfig.pluginSpecificConfig.css_files.forEach(p => console.log(`#     - ${p}`));
        } else {
            console.log("#     (No CSS files resolved for this plugin configuration)");
        }
    }
}


async function displayConfig(args) {
    try {
        // Use the configResolver instance provided by the CLI middleware instead of creating a new one.
        const configResolver = args.configResolver;
        if (!configResolver) {
            throw new Error("ConfigResolver was not initialized by the CLI middleware.");
        }

        if (args.plugin) {
            await displayPluginConfig(configResolver, args.plugin, args.pure);
        } else {
            await displayGlobalConfig(configResolver, args.pure);
        }
    } catch (error) {
        console.error(`ERROR displaying configuration: ${error.message}`);
        if (error.stack && !args.pure) console.error(error.stack);
        process.exit(1);
    }
}

module.exports = { displayConfig };
