// src/commands/plugin/addCmd.js
const chalk = require('chalk');
const path = require('path'); // For resolving the source plugin path

module.exports = {
  command: 'add <path_to_plugin_dir>',
  describe: 'Adds a new standalone plugin from a local directory to CollectionsManager and enables it.',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('path_to_plugin_dir', {
        describe: 'The local filesystem path to the plugin directory you want to add.',
        type: 'string',
        demandOption: true,
        normalize: true, // Automatically normalize the path
      })
      .option('name', {
        alias: 'n',
        describe: 'Optional. A specific invoke_name for this plugin. If not provided, the plugin\'s directory name will be used.',
        type: 'string',
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;
    const sourcePluginPath = path.resolve(args.path_to_plugin_dir); // Ensure absolute path

    console.log(chalk.blueBright(`md-to-pdf plugin: Attempting to add and enable plugin from local path...`));
    console.log(`  Source Path: ${chalk.cyan(sourcePluginPath)}`);
    if (args.name) {
      console.log(`  Requested invoke name: ${chalk.yellow(args.name)}`);
    }

    try {
      const result = await manager.addSingletonPlugin(sourcePluginPath, { name: args.name });
      // The addSingletonPlugin method in CM already logs success messages.
      if (result && result.success) {
        console.log(chalk.blueBright(`\nPlugin from "${sourcePluginPath}" successfully added and enabled as "${result.invoke_name}".`));
        console.log(chalk.gray(`  It is now managed by CollectionsManager in: ${result.path}`));
        console.log(chalk.blueBright(`\nTo use this plugin with md-to-pdf, invoke it as: `) + chalk.gray(`md-to-pdf convert ... --plugin ${result.invoke_name}`));
      } else {
        // This case might not be reached if addSingletonPlugin throws on failure,
        // but kept for robustness.
        console.error(chalk.red(`Failed to add plugin. ${result ? result.message : 'An unknown error occurred.'}`));
      }
    } catch (error) {
      console.error(chalk.red(`\nERROR in 'plugin add' command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) {
        console.error(chalk.red(error.stack));
      }
      process.exit(1);
    }
  }
};
