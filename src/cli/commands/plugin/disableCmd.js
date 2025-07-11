// src/cli/commands/plugin/disableCmd.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('child_process');

const logger = require(loggerPath);

module.exports = {
  command: 'disable <invoke_name>',
  describe: 'disables an active plugin',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('invoke_name', {
        describe: 'current \'invoke_name\' of plugin to disable',
        type: 'string',
        demandOption: true,
        completionKey: 'enabledPlugins'
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      logger.fatal('FATAL ERROR: CollectionsManager instance not found in CLI arguments.');
      process.exit(1);
    }
    const manager = args.manager;

    logger.info('md-to-pdf plugin: Attempting to disable plugin...');
    logger.detail(`  Plugin Invoke Name: ${args.invoke_name}`);
    try {
      await manager.disablePlugin(args.invoke_name);

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn('WARN: Failed to regenerate completion cache. This is not a fatal error.');
      }
    } catch (error) {
      logger.error(`\nERROR in 'plugin disable' command: ${error.message}`);
      process.exit(1);
    }
  }
};
