// src/cli/config-display.js
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const { loggerPath } = require('@paths');
const logger = require(loggerPath);

async function displayGlobalConfig(configResolver, isPure) {
  // Ensure ConfigResolver is initialized to get primaryMainConfigLoadReason
  await configResolver._initializeResolverIfNeeded();
  const mainConfig = configResolver.primaryMainConfig || {};
  const mainConfigPath = configResolver.primaryMainConfigPathActual;
  const loadReason = configResolver.primaryMainConfigLoadReason;

  if (!isPure) {
    logger.info('# Configuration Sources:');
    if (mainConfigPath) {
      let sourceTypeMessage = '';
      if (configResolver.useFactoryDefaultsOnly && loadReason === 'factory default') {
        sourceTypeMessage = `(Factory Default: ${path.basename(mainConfigPath)})`;
      } else if (loadReason === 'project (from --config)') {
        sourceTypeMessage = '(Project --config)';
      } else if (loadReason === 'XDG global') {
        sourceTypeMessage = '(XDG Global)';
      } else if (loadReason === 'bundled main') {
        sourceTypeMessage = `(Bundled Main: ${path.basename(mainConfigPath)})`;
      } else if (loadReason === 'factory default fallback') {
        sourceTypeMessage = `(Factory Default Fallback: ${path.basename(mainConfigPath)})`;
      } else if (loadReason) {
        sourceTypeMessage = `(${loadReason})`;
      }
      logger.info(`#   Primary Main Config Loaded: ${mainConfigPath} ${sourceTypeMessage}`);
    } else {
      logger.info('#   Primary Main Config: (Using internal defaults as no file was loaded/found)');
    }

    // Logic for considered paths can be refined if MainConfigLoader exposes them too
    if (!configResolver.useFactoryDefaultsOnly) {
      const xdgConfigDetails = await configResolver.mainConfigLoader.getXdgMainConfig();
      const projectConfigDetails = await configResolver.mainConfigLoader.getProjectManifestConfig();

      if (projectConfigDetails.path && fs.existsSync(projectConfigDetails.path) && projectConfigDetails.path !== mainConfigPath) {
        logger.info(`#   Considered Project Manifest (--config): ${projectConfigDetails.path}`);
      }
      if (xdgConfigDetails.path && fs.existsSync(xdgConfigDetails.path) && xdgConfigDetails.path !== mainConfigPath && (!projectConfigDetails.path || projectConfigDetails.path !== xdgConfigDetails.path)) {
        logger.info(`#   Considered XDG Global Config: ${xdgConfigDetails.path}`);
      }
    }
    const bundledMainDefaultPath = configResolver.mainConfigLoader.defaultMainConfigPath;
    if (fs.existsSync(bundledMainDefaultPath) && bundledMainDefaultPath !== mainConfigPath && mainConfigPath !== configResolver.mainConfigLoader.factoryDefaultMainConfigPath) {
      logger.info(`#   Considered Bundled Main Config (${path.basename(bundledMainDefaultPath)}): ${bundledMainDefaultPath}`);
    }
    logger.info('# Active Global Configuration:\n');
  }

  const configToDump = { ...mainConfig };
  delete configToDump._sourcePath;

  logger.info(yaml.dump(configToDump, { indent: 2, sortKeys: false, lineWidth: -1, noRefs: true }));

  if (!isPure) {
    logger.info('\n# Note: This shows the global settings from the primary main configuration file.');
    logger.info('# To see the full effective configuration for a specific plugin, use \'md-to-pdf config --plugin <pluginName>\'.');
  }
}

async function displayPluginConfig(configResolver, pluginName, isPure) {
  await configResolver._initializeResolverIfNeeded();

  const effectiveConfig = await configResolver.getEffectiveConfig(pluginName);
  const configSources = configResolver.getConfigFileSources();

  if (!isPure) {
    logger.info(`# Effective configuration for plugin: ${pluginName}\n`);
  }

  logger.info(yaml.dump(effectiveConfig.pluginSpecificConfig, { indent: 2, sortKeys: true, lineWidth: -1, noRefs: true }));

  if (!isPure) {
    logger.info('\n# Source Information:');
    logger.info(`#   Plugin Base Path: ${effectiveConfig.pluginBasePath}`);
    logger.info(`#   Handler Script Path: ${effectiveConfig.handlerScriptPath}`);

    logger.info('#   Contributing Configuration Files (most specific last):');
    if (configSources.mainConfigPath) {
      logger.info(`#     - Primary Main Config (for global settings): ${configSources.mainConfigPath}`);
    }
    configSources.pluginConfigPaths.forEach(p => logger.info(`#     - ${p}`));

    logger.info('\n# Resolved CSS Files (order matters):');
    if (effectiveConfig.pluginSpecificConfig.css_files && effectiveConfig.pluginSpecificConfig.css_files.length > 0) {
      effectiveConfig.pluginSpecificConfig.css_files.forEach(p => logger.info(`#     - ${p}`));
    } else {
      logger.info('#     (No CSS files resolved for this plugin configuration)');
    }
  }
}

async function displayConfig(args) {
  try {
    const configResolver = args.configResolver;
    if (!configResolver) {
      throw new Error('ConfigResolver was not initialized by the CLI middleware.');
    }

    if (args.plugin) {
      await displayPluginConfig(configResolver, args.plugin, args.pure);
    } else {
      await displayGlobalConfig(configResolver, args.pure);
    }
  } catch (error) {
    logger.error(`ERROR displaying configuration: ${error.message}`);
    if (error.stack && !args.pure) logger.error(error.stack);
    process.exit(1);
  }
}

module.exports = { displayConfig };

