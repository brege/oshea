// src/commands/updateCmd.js
const chalk = require('chalk');

module.exports = {
  command: 'update [<collection_name>]',
  describe: 'update a git-based plugin collection(s)',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('collection_name', {
        describe: 'name of a specific collection to update',
        type: 'string',
      })
      .epilogue(`This is a shortcut for "collection update". If no name is provided, all collections are updated.
It fetches updates from the remote Git source. Local modifications may be overwritten.`);
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments. This is an internal setup issue."));
      process.exit(1);
      return;
    }
    const manager = args.manager;

    if (args.collection_name) {
      console.log(chalk.blue(`Attempting to update collection '${chalk.cyan(args.collection_name)}' (via md-to-pdf ${args.$0})...`));
      try {
        const result = await manager.updateCollection(args.collection_name);
        if (result && !result.success) {
           console.warn(chalk.yellow(`Update for '${args.collection_name}' may have had issues: ${result.message || 'Please check output above.'}`));
        }
      } catch (error) {
        console.error(chalk.red(`\nERROR updating collection '${args.collection_name}': ${error.message}`));
        if (process.env.DEBUG_CM === 'true' && error.stack) {
          console.error(chalk.red(error.stack));
        }
        process.exit(1);
      }
    } else {
      console.log(chalk.blue(`Attempting to update all Git-based collections (via md-to-pdf ${args.$0})...`));
      try {
        const results = await manager.updateAllCollections();
        if (results && !results.success) {
            console.warn(chalk.yellow("\nSome collections may not have updated successfully or were skipped. Please check output above."));
        }
      } catch (error) {
        console.error(chalk.red(`\nERROR updating all collections: ${error.message}`));
        if (process.env.DEBUG_CM === 'true' && error.stack) {
          console.error(chalk.red(error.stack));
        }
        process.exit(1);
      }
    }
  }
};
