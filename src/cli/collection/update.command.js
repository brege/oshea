// src/cli/collection/update.command.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('child_process');

const logger = require(loggerPath);

module.exports = {
  command: 'update [<collection_name>]',
  describe: 'update a git-based plugin collection',
  builder: (yargsCmd) => {
    yargsCmd.positional('collection_name', {
      describe: 'name of the collection to update; omit for all',
      type: 'string',
      completionKey: 'downloadedCollections',
    });
  },
  handler: async (args) => {
    if (!args.manager) {
      logger.fatal(
        'FATAL ERROR: CollectionsManager instance not found in CLI arguments.',
      );
      process.exit(1);
    }
    const manager = args.manager;
    let commandShouldFailHard = false;

    try {
      if (args.collection_name) {
        logger.info(
          `oshea collection: Attempting to update collection '${args.collection_name}'...`,
        );
        const cmResult = await manager.updateCollection(args.collection_name);
        if (!cmResult.success) {
          logger.warn(
            `Update for '${args.collection_name}' reported issues (see CM logs above for details).`,
          );
          commandShouldFailHard = true;
        }
      } else {
        logger.info(
          'oshea collection: Attempting to update all Git-based collections...',
        );
        const cmResults = await manager.updateAllCollections();
        if (!cmResults.success) {
          logger.warn(
            'The batch update process for all collections may have encountered issues for some collections. Check CM logs above.',
          );
          commandShouldFailHard = true;
        }
      }

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn(
          'WARN: Failed to regenerate completion cache. This is not a fatal error.',
        );
      }
    } catch (error) {
      const context = args.collection_name
        ? `'collection update ${args.collection_name}'`
        : "'collection update all'";
      logger.error(
        `\nUNEXPECTED ERROR in ${context} command: ${error.message}`,
      );
      commandShouldFailHard = true;
    }

    if (commandShouldFailHard) {
      process.exit(1);
    }
  },
};
