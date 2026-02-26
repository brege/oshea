// src/cli/plugin/disable.command.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('node:child_process');

const logger = require(loggerPath);

module.exports = {
  command: 'disable <plugin_name>',
  describe: 'disable an installed plugin',
  builder: (yargsCmd) => {
    yargsCmd.positional('plugin_name', {
      describe: 'plugin invoke name to disable',
      type: 'string',
      demandOption: true,
      completionKey: 'enabledPlugins',
    });
  },
  handler: async (args) => {
    if (!args.manager || typeof args.manager.setEnabled !== 'function') {
      logger.fatal(
        'FATAL ERROR: PluginInstaller instance not found in CLI arguments.',
      );
      process.exit(1);
    }

    logger.info('oshea plugin: Attempting to disable plugin...');
    logger.detail(`  Plugin Name: ${args.plugin_name}`);

    try {
      await args.manager.setEnabled(args.plugin_name, false);
      logger.success('Plugin disabled successfully');

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn(
          'WARN: Failed to regenerate completion cache. This is not a fatal error.',
        );
      }
    } catch (error) {
      logger.error(`\nERROR in 'plugin disable' command: ${error.message}`);
      process.exit(1);
    }
  },
};
