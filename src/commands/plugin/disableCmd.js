// src/commands/plugin/disableCmd.js
const chalk = require('chalk');
// CollectionsManager instance will be passed via args.manager

module.exports = {
  command: 'disable <invoke_name>',
  describe: 'Disables an active plugin by removing it from the enabled manifest.',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('invoke_name', {
        describe: 'The current "invoke_name" of the plugin to disable.',
        type: 'string',
        demandOption: true,
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;

    console.log(chalk.blueBright(`md-to-pdf plugin: Attempting to disable plugin...`));
    console.log(`  Plugin Invoke Name: ${chalk.cyan(args.invoke_name)}`);
    try {
      // The disablePlugin method in CM handles console output
      await manager.disablePlugin(args.invoke_name);
    } catch (error) {
      console.error(chalk.red(`\nERROR in 'plugin disable' command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
