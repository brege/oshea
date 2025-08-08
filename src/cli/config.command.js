// src/cli/config.command.js
const fs = require('fs');

const { loggerPath, configFormatterPath } = require('@paths');
const logger = require(loggerPath);
const { formatGlobalConfig, formatPluginConfig } = require(configFormatterPath);

async function displayGlobalConfig(configResolver, isPure) {
  // Ensure ConfigResolver is initialized to get primaryMainConfigLoadReason
  await configResolver._initializeResolverIfNeeded();
  const mainConfig = configResolver.primaryMainConfig || {};
  const mainConfigPath = configResolver.primaryMainConfigPathActual;
  const loadReason = configResolver.primaryMainConfigLoadReason;

  // Prepare configuration data
  const configToDump = { ...mainConfig };
  delete configToDump._sourcePath;

  // Prepare source information
  const sources = {
    mainConfigPath,
    loadReason,
    useFactoryDefaultsOnly: configResolver.useFactoryDefaultsOnly,
    factoryDefaultMainConfigPath: configResolver.mainConfigLoader.factoryDefaultMainConfigPath
  };

  // Get additional source details if not using factory defaults only
  if (!configResolver.useFactoryDefaultsOnly) {
    const xdgConfigDetails = await configResolver.mainConfigLoader.getXdgMainConfig();
    const projectConfigDetails = await configResolver.mainConfigLoader.getProjectManifestConfig();

    sources.xdgConfigDetails = {
      path: xdgConfigDetails.path,
      pathExists: xdgConfigDetails.path && fs.existsSync(xdgConfigDetails.path)
    };
    sources.projectConfigDetails = {
      path: projectConfigDetails.path,
      pathExists: projectConfigDetails.path && fs.existsSync(projectConfigDetails.path)
    };
  }

  // Get bundled config info
  const bundledMainDefaultPath = configResolver.mainConfigLoader.defaultMainConfigPath;
  sources.bundledMainDefaultPath = {
    path: bundledMainDefaultPath,
    exists: fs.existsSync(bundledMainDefaultPath)
  };

  // Use formatter to display the configuration
  formatGlobalConfig('info', '', {
    configData: configToDump,
    sources,
    isPure
  });
}

async function displayPluginConfig(configResolver, pluginName, isPure) {
  await configResolver._initializeResolverIfNeeded();

  const effectiveConfig = await configResolver.getEffectiveConfig(pluginName);
  const configSources = configResolver.getConfigFileSources();

  // Use formatter to display the plugin configuration
  formatPluginConfig('info', '', {
    effectiveConfig,
    configSources,
    pluginName,
    isPure
  });
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

module.exports = {
  command: 'config',
  describe: 'display active configuration settings',
  builder: (yargs) => {
    yargs
      .option('plugin', {
        alias: 'p',
        describe: 'display the effective configuration for a plugin',
        type: 'string',
        completionKey: 'usablePlugins'
      })
      .option('pure', {
        describe: 'output raw configuration data (for piping)',
        type: 'boolean',
        default: false
      });
  },
  handler: async (args) => {
    args.isLazyLoad = false;
    await displayConfig(args);
  }
};
