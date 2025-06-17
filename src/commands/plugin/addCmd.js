// src/commands/plugin/addCmd.js
const path = require('path');
const chalk = require('chalk');
const fss = require('fs'); // For existsSync, lstatSync

module.exports = {
  command: 'add <path_to_plugin_dir>',
  describe: 'Adds a local plugin directory to CollectionsManager and enables it.',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('path_to_plugin_dir', {
        describe: 'Filesystem path to the local plugin directory.',
        type: 'string',
      })
      .option('name', {
        alias: 'n',
        describe: 'Optional. A specific invoke name for this plugin.',
        type: 'string',
      })
      .option('bypass-validation', {
        describe: 'Optional. Skips plugin validation during enablement. Use with caution.',
        type: 'boolean',
        default: false,
      });
  },
  handler: async (args) => {
    if (!args.manager || typeof args.manager.addSingletonPlugin !== 'function') {
      console.error(chalk.red('FATAL ERROR: CollectionsManager or addSingletonPlugin method not available.'));
      process.exit(1);
      return;
    }

    const pluginPathSourceArg = args.path_to_plugin_dir;
    const absolutePluginPath = path.resolve(pluginPathSourceArg);

    if (!fss.existsSync(absolutePluginPath) || !fss.lstatSync(absolutePluginPath).isDirectory()) {
      console.error(chalk.red(`ERROR: Source plugin path "${absolutePluginPath}" (from argument "${pluginPathSourceArg}") not found or is not a directory.`));
      process.exit(1);
      return;
    }
    
    const derivedPluginId = path.basename(absolutePluginPath);
    const invokeNameAttempt = args.name || derivedPluginId;

    console.log(chalk.blue(`md-to-pdf plugin: Attempting to add and enable plugin from local path...`));
    console.log(chalk.gray(`  Source Path: ${absolutePluginPath}`));
    console.log(chalk.gray(`  Requested Invoke Name: ${invokeNameAttempt}`));

    try {
      const addSingletonOptions = { name: args.name, bypassValidation: args.bypassValidation };
      const result = await args.manager.addSingletonPlugin(absolutePluginPath, addSingletonOptions);
      
      if (result && result.success) {
        console.log(chalk.greenBright(`\nSuccessfully processed 'plugin add' for '${chalk.yellow(result.invoke_name)}'.`));
        
        console.log(chalk.blue("Important Notes:"));
        console.log(chalk.gray(`  - A copy of your plugin from '${absolutePluginPath}' is now managed by md-to-pdf at:`));
        console.log(chalk.gray(`    ${chalk.underline(result.path)}`));
        console.log(chalk.gray(`  - For future development, it's recommended to edit your original plugin at:`));
        console.log(chalk.gray(`    ${chalk.underline(absolutePluginPath)}`));
        console.log(chalk.gray(`  - To sync any changes from your original plugin into the managed version, run:`));
        console.log(chalk.cyanBright(`    md-to-pdf collection update _user_added_plugins`));
        console.log(chalk.gray(`    (This command re-syncs all locally added plugins from their original sources)`));
        
        console.log(chalk.blue("\nNext Steps:"));
        console.log(chalk.gray(`  - List active plugins: md-to-pdf plugin list`));
        console.log(chalk.gray(`  - Use your new plugin: md-to-pdf convert mydoc.md --plugin ${result.invoke_name}`));
      } else if (result && !result.success) {
        console.error(chalk.red(`Plugin add operation reported as unsuccessful. Message: ${result.message || 'No specific message.'}`));
      }

    } catch (error) {
      console.error(chalk.red(`\nERROR in 'plugin add' command: ${error.message}`));
    }
  }
};
