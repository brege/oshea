// src/cli/commands/plugin/disableCmd.js
const chalk = require('chalk');

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
      console.error(chalk.red('FATAL ERROR: CollectionsManager instance not found in CLI arguments.'));
      process.exit(1);
    }
    const manager = args.manager;

    console.log(chalk.blueBright('md-to-pdf plugin: Attempting to disable plugin...'));
    console.log(`  Plugin Invoke Name: ${chalk.cyan(args.invoke_name)}`);
    try {
      await manager.disablePlugin(args.invoke_name);

      const { cliPath } = require('@paths');
      try {
        const { execSync } = require('child_process');
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        console.error(chalk.yellow('WARN: Failed to regenerate completion cache. This is not a fatal error.'));
      }
    } catch (error) {
      console.error(chalk.red(`\nERROR in 'plugin disable' command: ${error.message}`));
      process.exit(1);
    }
  }
};
