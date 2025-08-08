// src/cli/collection/list.command.js
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

// Normalize list type from args
function normalizeListType(args) {
  let listType = args.type.toLowerCase();
  if (listType === 'names') {
    listType = 'downloaded';
  }
  return listType;
}

module.exports = {
  command: 'list [type] [collection_name]',
  describe: 'list downloaded collections or plugins',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('type', {
        describe: 'the type of items to list',
        type: 'string',
        choices: ['names', 'available', 'enabled', 'all'],
        default: 'names', // Set default type
        completionKey: 'listTypes'
      })
      .positional('collection_name', {
        describe: 'filter available/enabled plugins by collection name',
        type: 'string',
        completionKey: 'downloadedCollections'
      })
      .option('short', {
        alias: 's',
        describe: 'display condensed list of downloaded collection \'names\'',
        type: 'boolean',
        default: false,
      })
      .option('raw', {
        describe: 'display raw JSON output',
        type: 'boolean',
        default: false,
      })
      .example('$0 collection list available', 'list all available plugins from all collections')
      .example('$0 collection list enabled my-collection', 'list enabled plugins from "my-collection"');
  },
  handler: async (args) => {
    if (!args.manager) {
      logger.fatal('FATAL ERROR: CollectionsManager instance not found in CLI arguments.');
      process.exit(1);
    }

    try {
      // 1. Fetch data
      const manager = args.manager;
      const listType = normalizeListType(args);
      const collectionFilter = args.collection_name;
      const results = await manager.listCollections(listType, collectionFilter);

      // 2. Handle raw JSON output (bypass formatter)
      if (args.raw) {
        process.stdout.write(JSON.stringify(results, null, 2));
        return;
      }

      // 3. Build structured data for formatter
      const listData = {
        type: listType,
        format: (listType === 'downloaded' && args.short) ? 'table' : 'detailed',
        filter: collectionFilter,
        items: results
      };

      // 4. Send to formatter
      logger.info(listData, { format: 'collection-list' });

    } catch (error) {
      logger.error(`\nERROR in 'collection list' command: ${error.message}`);
      process.exit(1);
    }
  }
};
