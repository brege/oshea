// src/cli/plugin/enable.command.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('node:child_process');

const logger = require(loggerPath);

module.exports = {
  command: 'enable <plugin_name>',
  describe: 'enable an installed plugin',
  builder: (yargsCmd) => {
    yargsCmd.positional('plugin_name', {
      describe: 'plugin invoke name to enable',
      type: 'string',
      demandOption: true,
      completionKey: 'availablePlugins',
    });
  },
  handler: async (args) => {
    if (!args.manager || typeof args.manager.setEnabled !== 'function') {
      logger.fatal(
        'FATAL ERROR: PluginInstaller instance not found in CLI arguments.',
      );
      process.exit(1);
    }

    logger.info('oshea plugin: Attempting to enable plugin...');
    logger.detail(`  Plugin Name: ${args.plugin_name}`);

    try {
      await args.manager.setEnabled(args.plugin_name, true);
      logger.success('Plugin enabled successfully');
      logger.info(
        `\nTo use this plugin with oshea, invoke it as: oshea convert ... --plugin ${args.plugin_name}`,
      );

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn(
          'WARN: Failed to regenerate completion cache. This is not a fatal error.',
        );
      }
    } catch (error) {
      logger.error(`\nERROR in 'plugin enable' command: ${error.message}`);
      process.exit(1);
    }
  },
};
