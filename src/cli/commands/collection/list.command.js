// src/cli/commands/collection/list.command.js
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

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
    const manager = args.manager;
    let listType = args.type.toLowerCase();
    const collectionFilter = args.collection_name;

    if (listType === 'names') {
      listType = 'downloaded';
    }

    try {
      const results = await manager.listCollections(listType, collectionFilter);

      if (args.raw) {
        // Raw JSON output should not be formatted by the logger
        process.stdout.write(JSON.stringify(results, null, 2));
        return;
      }

      if (listType === 'downloaded') {
        if (results.length === 0) {
          logger.warn('No downloaded collections found.');
          return;
        }

        if (args.short) {
          logger.info('\nDownloaded plugin collections:');
          let maxNameWidth = 'NAME'.length;
          let maxTypeWidth = 'TYPE'.length;
          results.forEach(coll => {
            if (coll.name.length > maxNameWidth) maxNameWidth = coll.name.length;
            let typeStr = 'Local Path';
            if (coll.special_type === 'singleton_container') typeStr = 'Managed Dir';
            else if (coll.source && (coll.source.startsWith('http') || coll.source.endsWith('.git'))) typeStr = 'Git';
            if (typeStr.length > maxTypeWidth) maxTypeWidth = typeStr.length;
          });
          logger.info(`  ${'NAME'.padEnd(maxNameWidth)} | ${'TYPE'.padEnd(maxTypeWidth)} | SOURCE`);
          logger.info(`  ${'-'.repeat(maxNameWidth)} | ${'-'.repeat(maxTypeWidth)} | ${'-'.repeat('SOURCE'.length)}`);
          results.forEach(coll => {
            let typeStr = 'Local Path';
            if (coll.special_type === 'singleton_container') typeStr = 'Managed Dir';
            else if (coll.source && (coll.source.startsWith('http') || coll.source.endsWith('.git'))) typeStr = 'Git';

            logger.info(`  ${coll.name.padEnd(maxNameWidth)} | ${typeStr.padEnd(maxTypeWidth)} | ${coll.source || 'N/A'}`);
          });
        } else {
          logger.info('\nDownloaded plugin collections:');
          results.forEach(collection => {
            logger.success(`\n  Collection Name: ${collection.name}`);
            if (collection.special_type === 'singleton_container') {
              logger.detail('    Type: Managed Directory (for user-added singleton plugins)');
              logger.detail(`    Managed Path: ${collection.source}`);
              logger.detail(`    (To see individual singletons, run: 'md-to-pdf plugin list --available ${collection.name}')`);
            } else {
              logger.detail(`    Source: ${collection.source}`);
              if (collection.added_on && collection.added_on !== 'N/A (Container)') logger.detail(`    Added On: ${new Date(collection.added_on).toLocaleString()}`);
              if (collection.updated_on) logger.detail(`    Updated On: ${new Date(collection.updated_on).toLocaleString()}`);
            }
          });
        }

      } else if (listType === 'available' || listType === 'all') {
        if (results.length === 0) {
          logger.warn(`No available plugins found ${collectionFilter ? `in collection "${collectionFilter}"` : 'in any collection'}.`);
          return;
        }
        logger.info(`\nAvailable plugins ${collectionFilter ? `in collection "${collectionFilter}"` : ''}:`);
        results.forEach(p => {
          logger.success(`  - Plugin ID: ${p.plugin_id}`);
          logger.detail(`    Description: ${p.description}`);
          if (p.is_singleton) {
            let originalSourceDisplay = p.original_source || 'N/A';
            if (p.is_original_source_missing) {
              originalSourceDisplay += ' (MISSING)';
            }
            logger.detail(`    Original Source: ${originalSourceDisplay}`);
            if (p.added_on) logger.detail(`    Added On: ${new Date(p.added_on).toLocaleString()}`);
            if (p.updated_on) logger.detail(`    Updated On: ${new Date(p.updated_on).toLocaleString()}`);
          }
          if (p.config_path) logger.detail(`    Config Path: ${p.config_path}`);
          if (p.base_path) logger.detail(`    Base Path: ${p.base_path}`);
          if (p.metadata_error) logger.error(`    Metadata Error: ${p.metadata_error}`);
        });
      } else if (listType === 'enabled') {
        if (results.length === 0) {
          logger.warn(`No enabled plugins found ${collectionFilter ? `in collection "${collectionFilter}"` : ''}.`);
          return;
        }
        logger.info(`\nEnabled plugins ${collectionFilter ? `in collection "${collectionFilter}"` : ''}:`);
        results.forEach(p => {
          logger.success(`  - Invoke Name: ${p.invoke_name}`);
          logger.detail(`    Plugin ID: ${p.plugin_id}`);
          logger.detail(`    Collection: ${p.collection_name}`);
          if (p.is_singleton) {
            let originalSourceDisplay = p.original_source || 'N/A';
            if (p.is_original_source_missing) {
              originalSourceDisplay += ' (MISSING)';
            }
            logger.detail(`    Original Source: ${originalSourceDisplay}`);
            if (p.added_on) logger.detail(`    Added On: ${new Date(p.added_on).toLocaleString()}`);
            if (p.updated_on) logger.detail(`    Updated On: ${new Date(p.updated_on).toLocaleString()}`);
          }
          if (p.config_path) logger.detail(`    Config Path: ${p.config_path}`);
        });
      }
    } catch (error) {
      logger.error(`\nERROR in 'collection list' command: ${error.message}`);
      process.exit(1);
    }
  }
};
