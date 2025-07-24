// src/cli/commands/plugin/list.command.js
const { pluginRegistryBuilderPath, projectRoot, loggerPath } = require('@paths');
const logger = require(loggerPath);
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);
const stripAnsi = require('strip-ansi');

// Helper function for detailed display
function displayPluginEntry(plugin) {
  logger.success(`  Name: ${plugin.name}`);

  let statusText = plugin.status || 'N/A';
  if (plugin.status === 'Enabled (CM)') {
    statusText = plugin.status;
  } else if (plugin.status && plugin.status.startsWith('Registered')) {
    statusText = plugin.status;
  } else if (plugin.status === 'Available (CM)') {
    statusText = plugin.status;
  }
  logger.info(`    Status: ${statusText}`);

  if (plugin.cmCollection || plugin.cmOriginalCollection) {
    const collection = plugin.cmCollection || plugin.cmOriginalCollection;
    const pluginId = plugin.cmPluginId || plugin.cmOriginalPluginId;
    if (collection && pluginId) {
      logger.detail(`    CM Origin: ${collection}/${pluginId}`);
    }
    if (plugin.cmInvokeName && plugin.cmInvokeName !== plugin.name && plugin.status === 'Enabled (CM)') {
      logger.detail(`    CM Invoke Name: ${plugin.cmInvokeName}`);
    }
  }

  logger.detail(`    Description: ${plugin.description}`);
  let sourceDisplayMessage = plugin.registrationSourceDisplay;
  if (plugin.status === 'Enabled (CM)' && plugin.cmCollection && plugin.cmPluginId) {
    sourceDisplayMessage = `CollectionsManager (CM: ${plugin.cmCollection}/${plugin.cmPluginId})`;
  } else if (plugin.registrationSourceDisplay && plugin.registrationSourceDisplay.includes('(CM:')) {
    const parts = plugin.registrationSourceDisplay.split('(CM:');
    const cmDetails = parts[1].replace(')','').split('/');
    const cmCollectionName = cmDetails[0];
    const cmPluginIdName = cmDetails.slice(1).join('/');
    sourceDisplayMessage = `${parts[0].trim()} (CM:${cmCollectionName}/${cmPluginIdName})`;
  } else {
    sourceDisplayMessage = plugin.registrationSourceDisplay;
  }
  logger.detail(`    Source: ${sourceDisplayMessage}`);
  logger.detail(`    Config Path: ${plugin.configPath}`);

  if (plugin.cmAddedOn && plugin.status === 'Enabled (CM)') {
    logger.detail(`    CM Enabled On: ${plugin.cmAddedOn}`);
  }
  logger.info('  ---');
}

// Helper function for --short display
function displayShortPluginEntry(plugin, statusColWidth, nameColWidth) {
  const S_STATUS = plugin.status || 'N/A';
  const S_NAME = plugin.name;
  let S_CM_ORIGIN = 'n/a';
  if (plugin.cmCollection && plugin.cmPluginId) {
    S_CM_ORIGIN = `${plugin.cmCollection}/${plugin.cmPluginId}`;
  }

  logger.info('Plugin list entry', { status: S_STATUS, name: S_NAME, origin: S_CM_ORIGIN, format: 'inline' });
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
      const builderInstance = new PluginRegistryBuilder(
        projectRoot, null, args.config, args.factoryDefaults,
        args.isLazyLoadMode || false, null, args.manager,
        { collRoot: args.manager.collRoot }
      );

      const allPluginDetails = await builderInstance.getAllPluginDetails();
      let results = [];
      const collectionFilter = args.collection_name_filter;
      const inCollectionMsg = collectionFilter ? ` in collection "${collectionFilter}"` : '';
      let headerMessage = '';

      if (args.enabled) {
        headerMessage = `\nEnabled plugins${collectionFilter ? ` (filtered for CM collection '${collectionFilter}')` : ''}:`;
        results = allPluginDetails.filter(p => {
          const isEnabledCM = p.status === 'Enabled (CM)';
          const isRegisteredTraditional = p.status && p.status.startsWith('Registered');
          if (collectionFilter && isEnabledCM) return p.cmCollection === collectionFilter;
          if (collectionFilter && isRegisteredTraditional) return false;
          return isEnabledCM || isRegisteredTraditional;
        });
        if (results.length === 0) logger.warn(`No plugins are currently enabled${collectionFilter ? ` matching filter '${collectionFilter}'` : ''}.`);

      } else if (args.available) {
        headerMessage = `\nAvailable CM-managed plugins${inCollectionMsg}:`;
        results = allPluginDetails.filter(p =>
          (p.status === 'Enabled (CM)' || p.status === 'Available (CM)') &&
          p.cmCollection && (!collectionFilter || p.cmCollection === collectionFilter)
        );
        if (results.length === 0) logger.warn(`No CM-managed plugins found${inCollectionMsg}.`);

      } else if (args.disabled) {
        headerMessage = `\nDisabled (but available) CM-managed plugins${inCollectionMsg}:`;
        results = allPluginDetails.filter(p =>
          p.status === 'Available (CM)' &&
          p.cmCollection && (!collectionFilter || p.cmCollection === collectionFilter)
        );
        if (results.length === 0) logger.warn(`No disabled (but available) CM-managed plugins found${inCollectionMsg}.`);

      } else {
        results = allPluginDetails.filter(p =>
          (p.status && p.status.startsWith('Registered')) || p.status === 'Enabled (CM)' || (args.short && p.status === 'Available (CM)')
        );
        if (collectionFilter && args.short) {
          results = results.filter(p => p.cmCollection === collectionFilter || !(p.cmCollection)) ;
        }

        if (!args.short) {
          const usablePluginsCount = results.filter(p => (p.status && p.status.startsWith('Registered')) || p.status === 'Enabled (CM)').length;
          headerMessage = `\nFound ${usablePluginsCount} plugin(s) usable by md-to-pdf:`;
        } else {
          const collectionContext = collectionFilter ? `CM plugins in collection "${collectionFilter}"` : 'all known plugins';
          headerMessage = `\nSummary for ${collectionContext}:`;
        }
        if (results.length === 0) logger.warn('No plugins found or registered as usable.');
      }

      if (results.length > 0) {
        logger.info(headerMessage);
        if (args.short) {
          let maxStatusWidth = 'STATUS'.length;
          let maxNameWidth = 'NAME/INVOKE KEY'.length;
          results.forEach(p => {
            const plainStatus = stripAnsi(p.status || 'N/A');
            if (plainStatus.length > maxStatusWidth) maxStatusWidth = plainStatus.length;
            const plainName = stripAnsi(p.name);
            if (plainName.length > maxNameWidth) maxNameWidth = plainName.length;
          });
          logger.info(`  ${'STATUS'.padEnd(maxStatusWidth)} | ${'NAME/INVOKE KEY'.padEnd(maxNameWidth)} | CM ORIGIN`);
          logger.info(`  ${'-'.repeat(maxStatusWidth)} | ${'-'.repeat(maxNameWidth)} | ${'-'.repeat('CM ORIGIN'.length)}`);
          results.forEach(plugin => displayShortPluginEntry(plugin, maxStatusWidth, maxNameWidth));
        } else {
          results.forEach(plugin => displayPluginEntry(plugin));
        }
      }

    } catch (error) {
      logger.error(`ERROR listing plugins: ${error.message}`);
      if (error.stack && !(process.env.NODE_ENV === 'test' && error.message.includes('mutually exclusive'))) {
        logger.error(error.stack);
      }
      process.exit(1);
    }
  }
};
