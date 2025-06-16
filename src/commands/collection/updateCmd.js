// src/commands/collection/updateCmd.js
const chalk = require('chalk');

module.exports = {
  command: 'update [<collection_name>]',
  describe: `Updates a Git-based plugin collection. If no name, updates all Git-based collections.`,
  builder: (yargsCmd) => {
    yargsCmd
      .positional('collection_name', {
        describe: 'Optional. The name of the specific collection to update.',
        type: 'string'
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;
    let commandShouldFailHard = false;

    try {
      if (args.collection_name) {
        console.log(chalk.blueBright(`md-to-pdf collection: Attempting to update collection '${chalk.cyan(args.collection_name)}'...`));
        const cmResult = await manager.updateCollection(args.collection_name);
        
        if (cmResult.success) {
            console.log(chalk.green(`Successfully updated collection "${args.collection_name}".`));
        } else {
            console.warn(chalk.yellow(`Update for '${args.collection_name}' reported issues. Message: ${cmResult.message}`));
            if (cmResult.message && cmResult.message.toLowerCase().includes("not found")) {
                commandShouldFailHard = true;
            }
        }
      } else {
        console.log(chalk.blueBright('md-to-pdf collection: Attempting to update all Git-based collections...'));
        const cmResults = await manager.updateAllCollections();
        if (!cmResults.success) { 
           console.warn(chalk.yellow("The batch update process for all collections may have encountered issues. Check logs above for details."));
        }
      }
    } catch (error) { 
      const context = args.collection_name ? `'collection update ${args.collection_name}'` : "'collection update all'";
      console.error(chalk.red(`\nUNEXPECTED ERROR in ${context} command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      commandShouldFailHard = true;
    }

    if (commandShouldFailHard) {
        process.exit(1);
    }

    // This explicitly waits for the stdout buffer to flush before the handler promise resolves.
    // This fixes the race condition where the process exits before output is captured.
    return new Promise(resolve => {
        process.stdout.write('', resolve);
    });
  }
};
