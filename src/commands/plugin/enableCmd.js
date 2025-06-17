// src/commands/plugin/enableCmd.js
const chalk = require('chalk');
const path = require('path'); // Required for path.join if constructing messages with paths
const fs = require('fs'); // For existsSync
const fsp = require('fs').promises; // For readFile
const yaml = require('js-yaml'); // To read metadata for prefix heuristic

// CollectionsManager instance will be passed via args.manager

module.exports = {
  command: 'enable <target>',
  describe: 'Enables a plugin or all plugins from a collection.',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('target', {
        describe: 'The plugin to enable ("collection_name/plugin_id") OR the collection name (if using --all).',
        type: 'string',
        demandOption: true,
      })
      .option('name', {
        alias: 'as', // Retaining 'as' as an alias
        describe: 'Optional. An alternative "invoke_name" to register the plugin under (only for single plugin enablement).',
        type: 'string'
      })
      .option('all', {
        describe: `Enable all available plugins from the specified collection name.
                 Default prefixing behavior for invoke names when using --all:
                 - GitHub/GitLab source: Uses <username>-<plugin_id>.
                 - Other Git source: Uses <collection_name>-<plugin_id>.
                 - Local path source: Uses <plugin_id> (no prefix).
                 Use --prefix or --no-prefix to override this default.
                 Note: This is a point-in-time action. If the collection is updated later with new plugins,
                 this command needs to be re-run if you wish to enable those new plugins.`,
        type: 'boolean',
        default: false
      })
      .option('prefix', {
        describe: 'Optional. A custom prefix string for invoke names when using --all. Overrides default prefixing.',
        type: 'string'
      })
      .option('no-prefix', {
        describe: 'Optional. Disables all automatic prefixing when using --all, using only plugin_id as invoke_name. Use with caution due to potential conflicts.',
        type: 'boolean',
        default: false
      })
      .option('bypass-validation', { // ADDED: --bypass-validation flag
        describe: 'Optional. Skips plugin validation during enablement. Use with caution.',
        type: 'boolean',
        default: false
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;

    try {
      if (args.all) {
        console.log(chalk.blueBright(`md-to-pdf plugin: Attempting to enable all plugins in collection...`));
        console.log(`  Collection Name: ${chalk.cyan(args.target)}`);

        let originalSourceForPrefixFallback = "";
        try {
            const metadataPath = path.join(manager.collRoot, args.target, '.collection-metadata.yaml');
            if (fs.existsSync(metadataPath)) {
                const metaContent = await fsp.readFile(metadataPath, 'utf8');
                const metadata = yaml.load(metaContent);
                if (metadata && metadata.source) {
                    originalSourceForPrefixFallback = metadata.source;
                }
            }
        } catch (e) {
            if(process.env.DEBUG_CM === 'true') console.warn(chalk.yellow(`  WARN: Could not read metadata for prefix fallback heuristic: ${e.message}`));
        }
        
        if (args.prefix) {
          console.log(`  Using custom prefix for invoke names: ${chalk.yellow(args.prefix)}`);
        } else if (args.noPrefix) {
          console.log(chalk.yellow('  --no-prefix specified: Attempting to enable plugins with their original IDs as invoke names.'));
        } else {
          console.log(chalk.blue('  Using default prefixing strategy for invoke names (see help for details).'));
        }

        await manager.enableAllPluginsInCollection(args.target, {
          prefix: args.prefix,
          noPrefix: args.noPrefix,
          isCliCall: true, 
          originalSourceForPrefixFallback,
          bypassValidation: args.bypassValidation // ADDED: Pass bypassValidation
        });
      } else {
        console.log(chalk.blueBright(`md-to-pdf plugin: Attempting to enable plugin...`));
        console.log(`  Plugin Identifier: ${chalk.cyan(args.target)}`);
        if (args.name) {
          console.log(`  Requested invoke name: ${chalk.yellow(args.name)}`);
        }
        if (args.prefix || args.noPrefix){
            console.warn(chalk.yellow("WARN: --prefix and --no-prefix options are ignored when not using --all."))
        }
        const result = await manager.enablePlugin(args.target, { 
          name: args.name,
          bypassValidation: args.bypassValidation // ADDED: Pass bypassValidation
        });
        if (result && result.success) {
            const finalInvokeName = result.invoke_name || args.target.split('/')[1]; 
            console.log(chalk.blueBright(`\nTo use this plugin with md-to-pdf, invoke it as: `) + chalk.gray(`md-to-pdf convert ... --plugin ${finalInvokeName}`));
        }
      }
    } catch (error) {
      const commandType = args.all ? 'plugin enable --all' : 'plugin enable';
      console.error(chalk.red(`\nERROR in '${commandType}' command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
