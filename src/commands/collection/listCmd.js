// src/commands/collection/listCmd.js
const chalk = require('chalk');
const stripAnsi = require('strip-ansi');

module.exports = {
  command: 'list [type_or_collection_name]',
  describe: 'Lists available, downloaded, or enabled plugin collections and plugins.',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('type_or_collection_name', {
        describe: `Specify 'collections' for downloaded collections, 'available' for plugins across all collections, 'enabled' for enabled plugins, or provide a specific collection name to list plugins within it. Default is 'collections'.`,
        type: 'string',
        default: 'collections',
      })
      .option('short', {
        alias: 's',
        describe: 'Display a condensed, short list of downloaded collections.',
        type: 'boolean',
        default: false,
      })
      .option('raw', {
        describe: 'Display raw JSON output.',
        type: 'boolean',
        default: false,
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;
    let typeOrCollectionName = args.type_or_collection_name;

    // If --short is used without a type, assume they want to list 'collections'
    if (args.short && typeOrCollectionName.toLowerCase() !== 'collections') {
      typeOrCollectionName = 'collections';
    }

    let listType = 'downloaded'; // Default
    let collectionFilter = null;

    const recognizedTypes = ['collections', 'all', 'available', 'enabled'];
    if (recognizedTypes.includes(typeOrCollectionName.toLowerCase())) {
      listType = typeOrCollectionName.toLowerCase();
      if (listType === 'collections') listType = 'downloaded'; // Translate to internal type
    } else {
      listType = 'available';
      collectionFilter = typeOrCollectionName;
      if (!args.short) {
        console.log(chalk.blueBright(`md-to-pdf collection: Listing plugins in collection: ${chalk.cyan(collectionFilter)}`));
      }
    }

    try {
      const results = await manager.listCollections(listType, collectionFilter);

      if (args.raw) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (listType === 'downloaded') {
        if (results.length === 0) {
          console.log(chalk.yellow("No downloaded collections found."));
          return;
        }
        
        if (args.short) {
            console.log(chalk.blueBright("\nDownloaded plugin collections:"));
            let maxNameWidth = "NAME".length;
            let maxTypeWidth = "TYPE".length;
            results.forEach(coll => {
                if (coll.name.length > maxNameWidth) maxNameWidth = coll.name.length;
                let typeStr = 'Local Path';
                if (coll.special_type === 'singleton_container') typeStr = 'Managed Dir';
                else if (coll.source && (coll.source.startsWith('http') || coll.source.endsWith('.git'))) typeStr = 'Git';
                if (typeStr.length > maxTypeWidth) maxTypeWidth = typeStr.length;
            });
            console.log(chalk.bold(`  ${'NAME'.padEnd(maxNameWidth)} | ${'TYPE'.padEnd(maxTypeWidth)} | SOURCE`));
            console.log(chalk.bold(`  ${'-'.repeat(maxNameWidth)} | ${'-'.repeat(maxTypeWidth)} | ${'-'.repeat('SOURCE'.length)}`));
            results.forEach(coll => {
                let typeStr = 'Local Path';
                if (coll.special_type === 'singleton_container') typeStr = 'Managed Dir';
                else if (coll.source && (coll.source.startsWith('http') || coll.source.endsWith('.git'))) typeStr = 'Git';

                const S_NAME = chalk.yellow(coll.name);
                const S_TYPE = chalk.cyan(typeStr);
                const S_SOURCE = chalk.gray(coll.source || 'N/A');
                console.log(`  ${S_NAME.padEnd(maxNameWidth + (S_NAME.length - stripAnsi(S_NAME).length))} | ${S_TYPE.padEnd(maxTypeWidth + (S_TYPE.length - stripAnsi(S_TYPE).length))} | ${S_SOURCE}`);
            });
        } else {
            console.log(chalk.blueBright("\nDownloaded plugin collections:"));
            results.forEach(collection => {
              console.log(chalk.greenBright(`\n  Collection Name: ${chalk.yellow(collection.name)}`));
              if (collection.special_type === 'singleton_container') {
                console.log(chalk.gray(`    Type: Managed Directory (for user-added singleton plugins)`));
                console.log(chalk.gray(`    Managed Path: ${collection.source}`));
                console.log(chalk.gray(`    (To see individual singletons, run: ${chalk.cyan('md-to-pdf plugin list --available ' + collection.name)})`));
              } else {
                console.log(chalk.gray(`    Source: ${collection.source}`));
                if (collection.added_on && collection.added_on !== 'N/A (Container)') console.log(chalk.gray(`    Added On: ${new Date(collection.added_on).toLocaleString()}`));
                if (collection.updated_on) console.log(chalk.gray(`    Updated On: ${new Date(collection.updated_on).toLocaleString()}`));
              }
            });
        }

      } else if (listType === 'available') {
        if (results.length === 0) {
          console.log(chalk.yellow(`No available plugins found for collection "${collectionFilter || 'all'}"`));
          return;
        }
        console.log(chalk.blueBright(`\nAvailable plugins in collection "${collectionFilter || 'all'}"`));
        results.forEach(p => {
          console.log(chalk.greenBright(`  - Plugin ID: ${chalk.yellow(p.plugin_id)}`));
          console.log(chalk.gray(`    Description: ${p.description}`));
          if (p.is_singleton) {
            let originalSourceDisplay = p.original_source || 'N/A';
            if (p.is_original_source_missing) {
              originalSourceDisplay += chalk.red.bold(' (MISSING)');
            }
            console.log(chalk.gray(`    Original Source: ${originalSourceDisplay}`));
            if (p.added_on) console.log(chalk.gray(`    Added On: ${new Date(p.added_on).toLocaleString()}`));
            if (p.updated_on) console.log(chalk.gray(`    Updated On: ${new Date(p.updated_on).toLocaleString()}`));
          }
          if (p.config_path) console.log(chalk.gray(`    Config Path: ${p.config_path}`));
          if (p.base_path) console.log(chalk.gray(`    Base Path: ${p.base_path}`));
          if (p.metadata_error) console.log(chalk.red(`    Metadata Error: ${p.metadata_error}`));
        });
      } else if (listType === 'enabled') {
        if (results.length === 0) {
          console.log(chalk.yellow(`No enabled plugins found ${collectionFilter ? `in collection "${collectionFilter}"` : ''}.`));
          return;
        }
        console.log(chalk.blueBright(`\nEnabled plugins ${collectionFilter ? `in collection "${collectionFilter}"` : ''}:`));
        results.forEach(p => {
          console.log(chalk.greenBright(`  - Invoke Name: ${chalk.cyan(p.invoke_name)}`));
          console.log(chalk.gray(`    Plugin ID: ${p.plugin_id}`));
          console.log(chalk.gray(`    Collection: ${p.collection_name}`));
          if (p.is_singleton) { // Check if p.is_singleton is true
            let originalSourceDisplay = p.original_source || 'N/A';
            if (p.is_original_source_missing) {
              originalSourceDisplay += chalk.red.bold(' (MISSING)');
            }
            console.log(chalk.gray(`    Original Source: ${originalSourceDisplay}`));
            if (p.added_on) console.log(chalk.gray(`    Added On: ${new Date(p.added_on).toLocaleString()}`));
            if (p.updated_on) console.log(chalk.gray(`    Updated On: ${new Date(p.updated_on).toLocaleString()}`));
          }
          if (p.config_path) console.log(chalk.gray(`    Config Path: ${p.config_path}`));
        });
      }
    } catch (error) {
      console.error(chalk.red(`\nERROR in 'collection list' command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
