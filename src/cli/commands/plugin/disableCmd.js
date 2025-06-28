// src/cli/commands/plugin/disableCmd.js
const chalk = require('chalk');
const path = require('path'); 

module.exports = {
  command: 'disable <invoke_name>',
  describe: 'disables an active plugin',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('invoke_name', {
        describe: "current 'invoke_name' of plugin to disable",
        type: 'string',
        demandOption: true,
        completionKey: 'enabledPlugins' 
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
      await manager.disablePlugin(args.invoke_name);
      
      const cliPath = path.resolve(__dirname, '../../../../cli.js');
      try {
        const { execSync } = require('child_process');
        execSync(`node "${cliPath}" _tab_cache`, { stdio: 'inherit' });
      } catch (error) {
        console.error(chalk.red(`WARN: Failed to regenerate completion cache: ${error.message}`));
      }
    } catch (error) {
      console.error(chalk.red(`\nERROR in 'plugin disable' command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
