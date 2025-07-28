// src/cli/commands/plugin/list.command.js
const { pluginRegistryBuilderPath, projectRoot, loggerPath } = require('@paths');
const logger = require(loggerPath);
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Determine list type from args
function determineListType(args) {
  if (args.enabled) return 'enabled';
  if (args.available) return 'available';
  if (args.disabled) return 'disabled';
  return 'all';
}

// Apply filters to plugin list based on args
function filterPlugins(allPlugins, args) {
  const listType = determineListType(args);
  const collectionFilter = args.collection_name_filter;

  if (listType === 'enabled') {
    return allPlugins.filter(p => {
      const isEnabledCM = p.status === 'Enabled (CM)';
      const isEnabledCreated = p.status === 'Enabled (Created)';
      const isRegisteredTraditional = p.status && p.status.startsWith('Registered');
      if (collectionFilter && isEnabledCM) return p.cmCollection === collectionFilter;
      if (collectionFilter && (isRegisteredTraditional || isEnabledCreated)) return false;
      return isEnabledCM || isRegisteredTraditional || isEnabledCreated;
    });
  }

  if (listType === 'available') {
    return allPlugins.filter(p => {
      // Include CM-managed available/enabled plugins
      const isCMPlugin = (p.status === 'Enabled (CM)' || p.status === 'Available (CM)') &&
        p.cmCollection && (!collectionFilter || p.cmCollection === collectionFilter);

      // Include created available plugins (ignoring collection filter for created plugins)
      const isCreatedAvailable = p.status === 'Available (Created)';

      return isCMPlugin || isCreatedAvailable;
    });
  }

  if (listType === 'disabled') {
    return allPlugins.filter(p => {
      // Include CM-managed disabled plugins
      const isCMDisabled = p.status === 'Available (CM)' &&
        p.cmCollection && (!collectionFilter || p.cmCollection === collectionFilter);

      // Include created disabled plugins
      const isCreatedDisabled = p.status === 'Available (Created)';

      return isCMDisabled || isCreatedDisabled;
    });
  }

  // Default/all type
  let results = allPlugins.filter(p =>
    (p.status && p.status.startsWith('Registered')) ||
    p.status === 'Enabled (CM)' ||
    p.status === 'Enabled (Created)' ||
    (args.short && (p.status === 'Available (CM)' || p.status === 'Available (Created)'))
  );

  if (collectionFilter && args.short) {
    results = results.filter(p => p.cmCollection === collectionFilter || !p.cmCollection);
  }

  return results;
}

module.exports = {
  command: 'list [<collection_name_filter>]',
  describe: 'list all discoverable plugins and their status',
  builder: (yargs) => {
    yargs
      .positional('collection_name_filter', {
        describe: 'filter CM-managed plugins by collection name',
        type: 'string',
        default: null,
        completionKey: 'downloadedCollections'
      })
      .option('available', {
        describe: 'list all available plugins from managed collections',
        type: 'boolean',
        default: false,
      })
      .option('enabled', {
        describe: 'list all currently enabled plugins',
        type: 'boolean',
        default: false,
      })
      .option('disabled', {
        describe: 'list available but disabled plugins',
        type: 'boolean',
        default: false,
      })
      .option('short', {
        describe: 'display a condensed, one-line summary',
        type: 'boolean',
        default: false,
      })
      .check((argv) => {
        const statusFlags = [argv.available, argv.enabled, argv.disabled].filter(Boolean).length;
        if (statusFlags > 1) {
          throw new Error('Error: --available, --enabled, and --disabled flags are mutually exclusive.');
        }
        if (argv.collection_name_filter && statusFlags === 0 && !argv.short) {
          logger.warn('Warning: Filter is ignored unless a status flag (--available, --enabled, --disabled) or --short is used.');
        }
        return true;
      })
      .epilogue(`Default view shows all usable plugins (registered and CM-enabled).
Status flags (--available, --disabled) filter within CM-managed collections.
For a list of collection names, use 'md-to-pdf collection list'.`);
  },
  handler: async (args) => {
    try {
      // 1. Fetch data
      const builderInstance = new PluginRegistryBuilder(
        projectRoot, null, args.config, args.factoryDefaults,
        args.isLazyLoadMode || false, null, args.manager,
        { collRoot: args.manager.collRoot }
      );
      const allPluginDetails = await builderInstance.getAllPluginDetails();

      // 2. Apply business logic filters
      const filteredPlugins = filterPlugins(allPluginDetails, args);

      // 3. Build structured data for formatter
      const listData = {
        type: determineListType(args),
        format: args.short ? 'table' : 'detailed',
        filter: args.collection_name_filter,
        plugins: filteredPlugins
      };

      // 4. Send to formatter
      logger.info(listData, { format: 'plugin-list' });

    } catch (error) {
      logger.error(`ERROR listing plugins: ${error.message}`);
      if (error.stack && !(process.env.NODE_ENV === 'test' && error.message.includes('mutually exclusive'))) {
        logger.error(error.stack);
      }
      process.exit(1);
    }
  }
};
