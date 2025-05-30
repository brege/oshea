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
      process.exit(1); // Definitely a hard fail
    }
    const manager = args.manager;
    let commandShouldFailHard = false;

    try {
      if (args.collection_name) {
        console.log(chalk.blueBright(`md-to-pdf collection: Attempting to update collection '${chalk.cyan(args.collection_name)}'...`));
        const cmResult = await manager.updateCollection(args.collection_name);
        // CM's updateCollection returns {success:false, message:...} for "not found"
        // and for "local changes abort". It logs its own console.error/warn.
        if (!cmResult.success) {
            console.warn(chalk.yellow(`Update for '${args.collection_name}' reported issues (see CM logs above for details).`));
            if (cmResult.message && cmResult.message.toLowerCase().includes("not found")) {
                commandShouldFailHard = true;
            }
            // For "local changes" or "not git source", CM handles logging, and we don't consider it a hard CLI fail.
        }
      } else {
        console.log(chalk.blueBright('md-to-pdf collection: Attempting to update all Git-based collections...'));
        const cmResults = await manager.updateAllCollections();
        if (!cmResults.success) { 
           // updateAllCollections success refers to the batch operation. Individual errors are logged by CM.
           console.warn(chalk.yellow("The batch update process for all collections may have encountered issues for some collections. Check CM logs above."));
        }
      }
    } catch (error) { 
      // This catches if manager.updateCollection itself throws an unhandled error
      const context = args.collection_name ? `'collection update ${args.collection_name}'` : "'collection update all'";
      console.error(chalk.red(`\nUNEXPECTED ERROR in ${context} command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      commandShouldFailHard = true;
    }

    if (commandShouldFailHard) {
        process.exit(1);
    }
  }
};
