// src/cli/plugin/list.command.js
const {
  pluginRegistryBuilderPath,
  projectRoot,
  loggerPath,
} = require('@paths');
const logger = require(loggerPath);
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

function determineListType(args) {
  if (args.enabled) return 'enabled';
  if (args.available) return 'available';
  if (args.disabled) return 'disabled';
  return 'all';
}

function filterPlugins(allPlugins, args) {
  const listType = determineListType(args);

  if (listType === 'enabled') {
    return allPlugins.filter(
      (plugin) =>
        plugin.status === 'Enabled (Installed)' ||
        plugin.status?.startsWith('Registered'),
    );
  }

  if (listType === 'available') {
    return allPlugins.filter(
      (plugin) =>
        plugin.status === 'Enabled (Installed)' ||
        plugin.status === 'Available (Installed)',
    );
  }

  if (listType === 'disabled') {
    return allPlugins.filter(
      (plugin) => plugin.status === 'Available (Installed)',
    );
  }

  if (!args.short) {
    return allPlugins.filter(
      (plugin) =>
        plugin.status?.startsWith('Registered') ||
        plugin.status === 'Enabled (Installed)',
    );
  }

  return allPlugins.filter(
    (plugin) =>
      plugin.status?.startsWith('Registered') ||
      plugin.status === 'Enabled (Installed)' ||
      plugin.status === 'Available (Installed)',
  );
}

module.exports = {
  command: 'list',
  describe: 'list discoverable plugins and their status',
  builder: (yargs) => {
    yargs
      .option('available', {
        describe: 'list all installed plugins (enabled and disabled)',
        type: 'boolean',
        default: false,
      })
      .option('enabled', {
        describe: 'list enabled plugins',
        type: 'boolean',
        default: false,
      })
      .option('disabled', {
        describe: 'list installed but disabled plugins',
        type: 'boolean',
        default: false,
      })
      .option('short', {
        describe: 'display a condensed, one-line summary',
        type: 'boolean',
        default: false,
      })
      .check((argv) => {
        const statusFlags = [
          argv.available,
          argv.enabled,
          argv.disabled,
        ].filter(Boolean).length;
        if (statusFlags > 1) {
          throw new Error(
            'Error: --available, --enabled, and --disabled flags are mutually exclusive.',
          );
        }
        return true;
      });
  },
  handler: async (args) => {
    try {
      const builderInstance = new PluginRegistryBuilder(
        projectRoot,
        null,
        args.config,
        args.factoryDefaults,
        args.isLazyLoadMode || false,
        null,
        args.manager,
        { pluginsRoot: args.manager.pluginsRoot },
      );
      const allPluginDetails = await builderInstance.getAllPluginDetails();
      const filteredPlugins = filterPlugins(allPluginDetails, args);

      const listData = {
        type: determineListType(args),
        format: args.short ? 'table' : 'detailed',
        filter: null,
        plugins: filteredPlugins,
      };
      logger.info(listData, { format: 'plugin-list' });
    } catch (error) {
      logger.error(`ERROR listing plugins: ${error.message}`);
      if (error.stack) {
        logger.error(error.stack);
      }
      process.exit(1);
    }
  },
};
