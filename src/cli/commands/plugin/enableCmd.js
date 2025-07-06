// src/cli/commands/plugin/enableCmd.js
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const yaml = require('js-yaml');

module.exports = {
  command: 'enable <target>',
  describe: 'enable a plugin or all plugins from a collection',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('target', {
        describe: 'plugin to enable (e.g., "collection/plugin_id"), \n or collection name (with --all)',
        type: 'string',
        demandOption: true,
        completionKey: 'availablePlugins'
      })
      .option('name', {
        alias: 'as',
        describe: 'set a custom "invoke_name" for the plugin',
        type: 'string'
      })
      .option('all', {
        describe: 'enable all available plugins from a collection.',
        type: 'boolean',
        default: false
      })
      .option('prefix', {
        describe: 'prefix for invoke names when using --all',
        type: 'string'
      })
      .option('no-prefix', {
        describe: 'disable invoke name prefixing when using --all',
        type: 'boolean',
        default: false
      })
      .option('bypass-validation', {
        describe: 'skip plugin validation during enablements',
        type: 'boolean',
        default: false
      })
      .epilogue(`
Default prefixing behavior for --all:
  - GitHub/GitLab source: uses <username>-<plugin_id>
  - Other Git sources: uses <collection_name>-<plugin_id>
  - Local path sources: uses <plugin_id> (no prefix)

Note: This is a point-in-time action. If a collection is updated,
you must re-run this command to enable any new plugins.`);
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red('FATAL ERROR: CollectionsManager instance not found in CLI arguments.'));
      process.exit(1);
    }
    const manager = args.manager;

    try {
      if (args.all) {
        console.log(chalk.blueBright('md-to-pdf plugin: Attempting to enable all plugins in collection...'));
        console.log(`  Collection Name: ${chalk.cyan(args.target)}`);

        let originalSourceForPrefixFallback = '';
        try {
          const metadataPath = path.join(manager.collRoot, args.target, '.collection-metadata.yaml');
          if (fs.existsSync(metadataPath)) {
            const metaContent = await fsp.readFile(metadataPath, 'utf8');
            const metadata = yaml.load(metaContent);
            if (metadata && metadata.source) {
              originalSourceForPrefixFallback = metadata.source;
            }
          }
        } catch {
          // empty
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
          bypassValidation: args.bypassValidation
        });
      } else {
        console.log(chalk.blueBright('md-to-pdf plugin: Attempting to enable plugin...'));
        console.log(`  Plugin Identifier: ${chalk.cyan(args.target)}`);
        if (args.name) {
          console.log(`  Requested invoke name: ${chalk.yellow(args.name)}`);
        }
        if (args.prefix || args.noPrefix){
          console.warn(chalk.yellow('WARN: --prefix and --no-prefix options are ignored when not using --all.'));
        }
        const result = await manager.enablePlugin(args.target, {
          name: args.name,
          bypassValidation: args.bypassValidation
        });
        if (result && result.success) {
          const finalInvokeName = result.invoke_name || args.target.split('/')[1];
          console.log(chalk.blueBright('\nTo use this plugin with md-to-pdf, invoke it as: ') + chalk.gray(`md-to-pdf convert ... --plugin ${finalInvokeName}`));
        }
      }

      // Trigger tab-completion cache regeneration after successful update operation
      const { cliPath } = require('@paths');
      try {
        const { execSync } = require('child_process');
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        console.error(chalk.yellow('WARN: Failed to regenerate completion cache. This is not a fatal error.'));
      }

    } catch (error) {
      const commandType = args.all ? 'plugin enable --all' : 'plugin enable';
      console.error(chalk.red(`\nERROR in '${commandType}' command: ${error.message}`));
      process.exit(1);
    }
  }
};
