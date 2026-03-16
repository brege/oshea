// src/cli/plugin/update.command.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('node:child_process');

const logger = require(loggerPath);

module.exports = {
  command: 'update [plugin_name]',
  describe: 'update installed plugins that were added from git sources',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('plugin_name', {
        describe:
          'optional plugin invoke name to update (if omitted, updates all git-sourced installed plugins)',
        type: 'string',
        completionKey: 'userPlugins',
      })
      .epilogue(
        'This command updates managed plugin copies from their configured git origins.\n' +
          'Safety checks abort updates when local uncommitted changes or local commits are present.',
      );
  },
  handler: async (args) => {
    if (
      !args.manager ||
      typeof args.manager.updatePlugin !== 'function' ||
      typeof args.manager.updateAllPlugins !== 'function'
    ) {
      logger.fatal(
        'FATAL ERROR: PluginInstaller update methods are unavailable.',
      );
      process.exit(1);
    }

    try {
      if (args.plugin_name) {
        logger.info('oshea plugin: Attempting to update plugin...');
        logger.detail(`  Plugin Name: ${args.plugin_name}`);
        const result = await args.manager.updatePlugin(args.plugin_name);
        if (!result.success) {
          logger.error(result.message || 'Plugin update failed.');
          process.exit(1);
          return;
        }
        logger.success(result.message || 'Plugin updated successfully.');
      } else {
        logger.info(
          'oshea plugin: Attempting to update all git-sourced installed plugins...',
        );
        const result = await args.manager.updateAllPlugins();
        for (const message of result.messages || []) {
          logger.info(message);
        }
        if (!result.success) {
          logger.error('One or more plugin updates failed.');
          process.exit(1);
          return;
        }
        logger.success(
          `Plugin update complete. Updated ${result.updatedCount || 0} plugin(s), unchanged ${result.unchangedCount || 0}, skipped ${result.skippedCount || 0}.`,
        );
      }

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn(
          'WARN: Failed to regenerate completion cache. This is not a fatal error.',
        );
      }
    } catch (error) {
      logger.error(`\nERROR in 'plugin update' command: ${error.message}`);
      process.exit(1);
    }
  },
};
