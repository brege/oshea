// src/cli/commands/updateCmd.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('child_process');

const logger = require(loggerPath);

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
      logger.fatal('FATAL ERROR: CollectionsManager instance not found in CLI arguments. This is an internal setup issue.');
      process.exit(1);
      return;
    }
    const manager = args.manager;

    let commandShouldFailHard = false;

    try {
      if (args.collection_name) {
        logger.info(`Attempting to update collection '${args.collection_name}' (via md-to-pdf ${args.$0})...`);
        const result = await manager.updateCollection(args.collection_name);

        if (!result.success) {
          logger.warn(`Update for '${args.collection_name}' reported issues (see CM logs above for details).`);
          commandShouldFailHard = true;
        }
      } else {
        logger.info(`Attempting to update all Git-based collections (via md-to-pdf ${args.$0})...`);
        const results = await manager.updateAllCollections();
        if (results && !results.success) {
          logger.warn('\nSome collections may not have updated successfully or were skipped. Please check output above.');
          commandShouldFailHard = true;
        }
      }

      // Trigger tab-completion cache regeneration after successful update operation
      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn('WARN: Failed to regenerate completion cache. This is not a fatal error.');
      }

    } catch (error) {
      logger.error(`\nERROR updating all collections: ${error.message}`);
      commandShouldFailHard = true;
    }

    if (commandShouldFailHard) {
      process.exit(1);
    }
  }
};
