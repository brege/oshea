// src/cli/commands/plugin/listCmd.js
const PluginRegistryBuilder = require('../../../plugins/PluginRegistryBuilder');
const path = require('path');
const chalk = require('chalk');
const stripAnsi = require('strip-ansi');

// Helper function for detailed display
function displayPluginEntry(plugin) {
  console.log(`  Name: ${chalk.yellow(plugin.name)}`);

  let statusText = plugin.status || 'N/A';
  if (plugin.status === 'Enabled (CM)') {
    statusText = chalk.blueBright.bold(plugin.status);
  } else if (plugin.status && plugin.status.startsWith('Registered')) {
    statusText = chalk.cyan.bold(plugin.status);
  } else if (plugin.status === 'Available (CM)') {
    statusText = chalk.gray.bold(plugin.status);
  }
  console.log(`    Status: ${statusText}`);

  if (plugin.cmCollection || plugin.cmOriginalCollection) {
    const collection = plugin.cmCollection || plugin.cmOriginalCollection;
    const pluginId = plugin.cmPluginId || plugin.cmOriginalPluginId;
    if (collection && pluginId) {
        console.log(`    CM Origin: ${chalk.magenta(collection)}/${chalk.magenta(pluginId)}`);
    }
    if (plugin.cmInvokeName && plugin.cmInvokeName !== plugin.name && plugin.status === 'Enabled (CM)') {
        console.log(`    CM Invoke Name: ${chalk.yellow(plugin.cmInvokeName)}`);
    }
  }
  
  console.log(`    Description: ${plugin.description}`);
  let sourceDisplayMessage = plugin.registrationSourceDisplay;
  if (plugin.status === 'Enabled (CM)' && plugin.cmCollection && plugin.cmPluginId) {
    sourceDisplayMessage = `CollectionsManager (CM: ${chalk.magenta(plugin.cmCollection)}/${chalk.magenta(plugin.cmPluginId)})`;
  } else if (plugin.registrationSourceDisplay && plugin.registrationSourceDisplay.includes('(CM:')) {
      const parts = plugin.registrationSourceDisplay.split('(CM:');
      // Correctly reconstruct the source display message with colors
      const cmDetails = parts[1].replace(')','').split('/');
      const cmCollectionName = cmDetails[0];
      const cmPluginIdName = cmDetails.slice(1).join('/'); // Handles plugin IDs with slashes if any in future
      sourceDisplayMessage = `${parts[0].trim()} ${chalk.gray('(CM:')}${chalk.magenta(cmCollectionName)}/${chalk.magenta(cmPluginIdName)}${chalk.gray(')')}`;
  } else {
    sourceDisplayMessage = chalk.white(plugin.registrationSourceDisplay);
  }
  console.log(`    Source: ${sourceDisplayMessage}`);
  console.log(`    Config Path: ${chalk.gray(plugin.configPath)}`);

  if (plugin.cmAddedOn && plugin.status === 'Enabled (CM)') {
    console.log(`    CM Enabled On: ${plugin.cmAddedOn}`);
  }
  console.log(chalk.white('  ---'));
}

// Helper function for --short display
function displayShortPluginEntry(plugin, statusColWidth, nameColWidth) {
  let S_STATUS = plugin.status || 'N/A';
  if (plugin.status === 'Enabled (CM)') {
    S_STATUS = chalk.blueBright.bold(plugin.status);
  } else if (plugin.status && plugin.status.startsWith('Registered')) {
    S_STATUS = chalk.cyan.bold(plugin.status);
  } else if (plugin.status === 'Available (CM)') {
    S_STATUS = chalk.gray.bold(plugin.status);
  }

  const S_NAME = chalk.yellow(plugin.name);
  
  let S_CM_ORIGIN = chalk.gray("n/a");
  if (plugin.cmCollection && plugin.cmPluginId) {
    S_CM_ORIGIN = `${chalk.magenta(plugin.cmCollection)}/${chalk.magenta(plugin.cmPluginId)}`;
  }

  const plainStatus = stripAnsi(S_STATUS);
  const plainName = stripAnsi(S_NAME);

  console.log(`  ${S_STATUS.padEnd(statusColWidth + (S_STATUS.length - plainStatus.length))} | ${S_NAME.padEnd(nameColWidth + (S_NAME.length - plainName.length))} | ${S_CM_ORIGIN}`);
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
          console.warn(chalk.yellow("Warning: Filter is ignored unless a status flag (--available, --enabled, --disabled) or --short is used."));
        }
        return true;
      })
      .epilogue(`Default view shows all usable plugins (registered and CM-enabled).
Status flags (--available, --disabled) filter within CM-managed collections.
For a list of collection names, use 'md-to-pdf collection list'.`);
  },
  handler: async (args) => {
    try {
      const projectRoot = path.resolve(__dirname, '../../../../');
      const builderInstance = new PluginRegistryBuilder(
        projectRoot, null, args.config, args.factoryDefaults,
        args.isLazyLoadMode || false, null, args.manager,
        { collRoot: args.manager.collRoot }
      );

      const allPluginDetails = await builderInstance.getAllPluginDetails();
      let results = [];
      const collectionFilter = args.collection_name_filter;
      const inCollectionMsg = collectionFilter ? ` in collection "${chalk.cyan(collectionFilter)}"` : '';
      let headerMessage = "";

      if (args.enabled) {
        headerMessage = chalk.blue(`\nEnabled plugins${collectionFilter ? ` (filtered for CM collection '${collectionFilter}')` : ''}:`);
        results = allPluginDetails.filter(p => {
          const isEnabledCM = p.status === 'Enabled (CM)';
          const isRegisteredTraditional = p.status && p.status.startsWith('Registered');
          if (collectionFilter && isEnabledCM) return p.cmCollection === collectionFilter;
          if (collectionFilter && isRegisteredTraditional) return false;
          return isEnabledCM || isRegisteredTraditional;
        });
        if (results.length === 0) console.log(chalk.yellow(`No plugins are currently enabled${collectionFilter ? ` matching filter '${collectionFilter}'` : ''}.`));
      
      } else if (args.available) {
        headerMessage = chalk.blue(`\nAvailable CM-managed plugins${inCollectionMsg}:`);
        results = allPluginDetails.filter(p =>
          (p.status === 'Enabled (CM)' || p.status === 'Available (CM)') &&
          p.cmCollection && (!collectionFilter || p.cmCollection === collectionFilter)
        );
        if (results.length === 0) console.log(chalk.yellow(`No CM-managed plugins found${inCollectionMsg}.`));
      
      } else if (args.disabled) {
        headerMessage = chalk.blue(`\nDisabled (but available) CM-managed plugins${inCollectionMsg}:`);
        results = allPluginDetails.filter(p =>
          p.status === 'Available (CM)' &&
          p.cmCollection && (!collectionFilter || p.cmCollection === collectionFilter)
        );
        if (results.length === 0) console.log(chalk.yellow(`No disabled (but available) CM-managed plugins found${inCollectionMsg}.`));

      } else { 
        results = allPluginDetails.filter(p =>
          (p.status && p.status.startsWith('Registered')) || p.status === 'Enabled (CM)' || (args.short && p.status === 'Available (CM)')
        );
         if (collectionFilter && args.short) { 
            results = results.filter(p => p.cmCollection === collectionFilter || !(p.cmCollection)) ;
        }
        
        if (!args.short) {
            const usablePluginsCount = results.filter(p => (p.status && p.status.startsWith('Registered')) || p.status === 'Enabled (CM)').length;
            headerMessage = chalk.blue(`\nFound ${usablePluginsCount} plugin(s) usable by md-to-pdf:`);
        } else {
            const collectionContext = collectionFilter ? `CM plugins in collection "${collectionFilter}"` : "all known plugins";
            headerMessage = chalk.blue(`\nSummary for ${collectionContext}:`);
        }
        if (results.length === 0) console.log(chalk.yellow("No plugins found or registered as usable."));
      }

      if (results.length > 0) {
        console.log(headerMessage);
        if (args.short) {
          let maxStatusWidth = "STATUS".length;
          let maxNameWidth = "NAME/INVOKE KEY".length;
          results.forEach(p => {
            const plainStatus = stripAnsi(
                p.status === 'Enabled (CM)' ? chalk.blueBright.bold(p.status) :
                (p.status && p.status.startsWith('Registered')) ? chalk.cyan.bold(p.status) :
                p.status === 'Available (CM)' ? chalk.gray.bold(p.status) : p.status || 'N/A'
            );
            if (plainStatus.length > maxStatusWidth) maxStatusWidth = plainStatus.length;
            const plainName = stripAnsi(chalk.yellow(p.name)); 
            if (plainName.length > maxNameWidth) maxNameWidth = plainName.length;
          });
          console.log(chalk.bold(`  ${'STATUS'.padEnd(maxStatusWidth)} | ${'NAME/INVOKE KEY'.padEnd(maxNameWidth)} | CM ORIGIN`));
          console.log(chalk.bold(`  ${'-'.repeat(maxStatusWidth)} | ${'-'.repeat(maxNameWidth)} | ${'-'.repeat('CM ORIGIN'.length)}`));
          results.forEach(plugin => displayShortPluginEntry(plugin, maxStatusWidth, maxNameWidth));
        } else {
          results.forEach(plugin => displayPluginEntry(plugin));
        }
      }

    } catch (error) {
      console.error(chalk.red(`ERROR listing plugins: ${error.message}`));
      if (error.stack && !(process.env.NODE_ENV === 'test' && error.message.includes('mutually exclusive'))) {
          console.error(chalk.red(error.stack));
      }
      process.exit(1);
    }
  }
};
