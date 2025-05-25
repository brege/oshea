// src/config_display.js
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path'); // Added: require the path module
const ConfigResolver = require('./ConfigResolver');

async function displayGlobalConfig(configResolver, isPure) {
    await configResolver._initializeResolverIfNeeded();
    const mainConfig = configResolver.primaryMainConfig || {};
    const mainConfigPath = configResolver.primaryMainConfigPathActual;

    if (!isPure) {
        console.log("# Configuration Sources:");
        if (mainConfigPath) {
            let sourceTypeMessage = "";
            if (configResolver.useFactoryDefaultsOnly) {
                sourceTypeMessage = `(Factory Default: ${path.basename(mainConfigPath)})`;
            } else if (mainConfigPath === configResolver.projectManifestConfigPath) {
                sourceTypeMessage = "(Project --config)";
            } else if (mainConfigPath === configResolver.xdgGlobalConfigPath) {
                sourceTypeMessage = "(XDG Global)";
            } else if (mainConfigPath === configResolver.defaultMainConfigPath) {
                sourceTypeMessage = `(Bundled Main: ${path.basename(mainConfigPath)})`;
            } else if (mainConfigPath === configResolver.factoryDefaultMainConfigPath) { 
                sourceTypeMessage = `(Factory Default Fallback: ${path.basename(mainConfigPath)})`;
            }
            console.log(`#   Primary Main Config Loaded: ${mainConfigPath} ${sourceTypeMessage}`);
        } else {
            console.log("#   Primary Main Config: (Using internal defaults as no file was loaded/found)");
        }

        if (!configResolver.useFactoryDefaultsOnly) {
            if (configResolver.projectManifestConfigPath && 
                fs.existsSync(configResolver.projectManifestConfigPath) && 
                configResolver.projectManifestConfigPath !== mainConfigPath) {
                console.log(`#   Considered Project Manifest (--config): ${configResolver.projectManifestConfigPath}`);
            }
            if (fs.existsSync(configResolver.xdgGlobalConfigPath) && 
                configResolver.xdgGlobalConfigPath !== mainConfigPath &&
                (!configResolver.projectManifestConfigPath || configResolver.projectManifestConfigPath !== configResolver.xdgGlobalConfigPath)) {
                 console.log(`#   Considered XDG Global Config: ${configResolver.xdgGlobalConfigPath}`);
            }
        }
        if (fs.existsSync(configResolver.defaultMainConfigPath) && 
            configResolver.defaultMainConfigPath !== mainConfigPath &&
            mainConfigPath !== configResolver.factoryDefaultMainConfigPath) { 
             console.log(`#   Considered Bundled Main Config (${path.basename(configResolver.defaultMainConfigPath)}): ${configResolver.defaultMainConfigPath}`);
        }
        console.log("# Active Global Configuration:\n"); // Header with two newlines after
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
        // Header for the plugin config section, followed by two newlines
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
        const configResolver = new ConfigResolver(args.config, args.factoryDefaults);
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
