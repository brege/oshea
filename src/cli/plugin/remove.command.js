// src/cli/plugin/remove.command.js
const { loggerPath, cliPath, colorThemePath } = require('@paths');
const { execSync } = require('node:child_process');

const logger = require(loggerPath);
const { theme } = require(colorThemePath);

module.exports = {
  command: 'remove <plugin_name>',
  describe: 'remove an installed plugin from the system',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('plugin_name', {
        describe: 'invoke name of the plugin to remove',
        type: 'string',
        demandOption: true,
        completionKey: 'userPlugins',
      })
      .epilogue(`
This command removes installed plugins from the managed plugins directory.
It will:
  • Remove the plugin entry from the plugins manifest
  • Remove the plugin directory when no other entry points to it
  • Update plugin completion cache`);
  },
  handler: async (args) => {
    if (!args.manager || typeof args.manager.removePlugin !== 'function') {
      logger.fatal(
        'FATAL ERROR: PluginInstaller instance not found in CLI arguments.',
      );
      process.exit(1);
    }

    const pluginName = args.plugin_name;
    logger.info('oshea plugin: Attempting to remove plugin...');
    logger.detail(`  Plugin Name: ${theme.value(pluginName)}`);

    try {
      const result = await args.manager.removePlugin(pluginName);
      logger.success(
        `\nPlugin '${theme.value(pluginName)}' removed successfully.`,
      );

      if (result?.removed?.installed_path) {
        logger.info(`  Removed: ${theme.path(result.removed.installed_path)}`);
      }

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn(
          'WARN: Failed to regenerate completion cache. This is not a fatal error.',
        );
      }
    } catch (error) {
      logger.error(`\nERROR in 'plugin remove' command: ${error.message}`);
      process.exit(1);
    }
  },
};
