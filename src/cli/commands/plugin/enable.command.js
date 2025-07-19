// src/cli/commands/plugin/enable.command.js
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const yaml = require('js-yaml');
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('child_process');

const logger = require(loggerPath);

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
      logger.fatal('FATAL ERROR: CollectionsManager instance not found in CLI arguments.');
      process.exit(1);
    }
    const manager = args.manager;

    try {
      if (args.all) {
        logger.info('md-to-pdf plugin: Attempting to enable all plugins in collection...');
        logger.detail(`  Collection Name: ${args.target}`);

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
          logger.detail(`  Using custom prefix for invoke names: ${args.prefix}`);
        } else if (args.noPrefix) {
          logger.warn('  --no-prefix specified: Attempting to enable plugins with their original IDs as invoke names.');
        } else {
          logger.info('  Using default prefixing strategy for invoke names (see help for details).');
        }

        await manager.enableAllPluginsInCollection(args.target, {
          prefix: args.prefix,
          noPrefix: args.noPrefix,
          isCliCall: true,
          originalSourceForPrefixFallback,
          bypassValidation: args.bypassValidation
        });
      } else {
        logger.info('md-to-pdf plugin: Attempting to enable plugin...');
        logger.detail(`  Plugin Identifier: ${args.target}`);
        if (args.name) {
          logger.detail(`  Requested invoke name: ${args.name}`);
        }
        if (args.prefix || args.noPrefix){
          logger.warn('WARN: --prefix and --no-prefix options are ignored when not using --all.');
        }
        const result = await manager.enablePlugin(args.target, {
          name: args.name,
          bypassValidation: args.bypassValidation
        });
        if (result && result.success) {
          const finalInvokeName = result.invoke_name || args.target.split('/')[1];
          logger.info(`\nTo use this plugin with md-to-pdf, invoke it as: md-to-pdf convert ... --plugin ${finalInvokeName}`);
        }
      }

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn('WARN: Failed to regenerate completion cache. This is not a fatal error.');
      }

    } catch (error) {
      const commandType = args.all ? 'plugin enable --all' : 'plugin enable';
      logger.error(`\nERROR in '${commandType}' command: ${error.message}`);
      process.exit(1);
    }
  }
};
