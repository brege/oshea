// src/cli/collection/remove.command.js
const { loggerPath, cliPath } = require('@paths');
const { execSync } = require('node:child_process');

const logger = require(loggerPath);

module.exports = {
  command: 'remove <collection_name>',
  describe: 'remove a downloaded plugin collection',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('collection_name', {
        describe: 'name of the collection to remove',
        type: 'string',
        demandOption: true,
        completionKey: 'downloadedCollections',
      })
      .option('force', {
        alias: 'f',
        describe: 'force removal by disabling its plugins first',
        type: 'boolean',
        default: false,
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

    logger.debug('oshea collection: Attempting to remove collection...');
    logger.detail(`  Collection Name: ${args.collection_name}`);
    if (args.force) {
      logger.warn(
        '  Force option is enabled. Will attempt to disable plugins from this collection first.',
      );
    }
    try {
      await manager.removeCollection(args.collection_name, {
        force: args.force,
      });

      try {
        execSync(`node "${cliPath}" _tab_cache`);
      } catch {
        logger.warn(
          'WARN: Failed to regenerate completion cache. This is not a fatal error.',
        );
      }
    } catch (error) {
      logger.error(`\nERROR in 'collection remove' command: ${error.message}`);
      process.exit(1);
    }
  },
};
