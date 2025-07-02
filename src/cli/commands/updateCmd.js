// src/cli/commands/updateCmd.js
const chalk = require('chalk');
const path = require('path');

module.exports = {
  command: 'update [<collection_name>]',
  describe: 'update a git-based plugin collection(s)',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('collection_name', {
        describe: 'name of a specific collection to update; omit for all',
        type: 'string',
        completionKey: 'downloadedCollections'
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments. This is an internal setup issue."));
      process.exit(1);
      return;
    }
    const manager = args.manager;

    let commandShouldFailHard = false;

    try {
      if (args.collection_name) {
        console.log(chalk.blue(`Attempting to update collection '${chalk.cyan(args.collection_name)}' (via md-to-pdf ${args.$0})...`));
        const result = await manager.updateCollection(args.collection_name);

        if (!result.success) {
            console.warn(chalk.yellow(`Update for '${args.collection_name}' reported issues (see CM logs above for details).`));
            commandShouldFailHard = true;
        }
      } else {
        console.log(chalk.blue(`Attempting to update all Git-based collections (via md-to-pdf ${args.$0})...`));
        const results = await manager.updateAllCollections();
        if (results && !results.success) {
           console.warn(chalk.yellow("\nSome collections may not have updated successfully or were skipped. Please check output above."));
           commandShouldFailHard = true;
        }
      }

      // Trigger tab-completion cache regeneration after successful update operation
      const { cliPath } = require('@paths');
      try {
        const { execSync } = require('child_process');
        execSync(`node "${cliPath}" _tab_cache`);
      } catch (error) {
        console.error(chalk.yellow(`WARN: Failed to regenerate completion cache. This is not a fatal error.`));
      }

    } catch (error) {
      console.error(chalk.red(`\nERROR updating all collections: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) {
        console.error(chalk.red(error.stack));
      }
      commandShouldFailHard = true;
    }

    if (commandShouldFailHard) {
        process.exit(1);
    }
  }
};
