// src/commands/collection/listCmd.js
const chalk = require('chalk');
const path = require('path'); // For path.sep if needed, though USER_ADDED_PLUGINS_DIR_NAME is simple
const { USER_ADDED_PLUGINS_DIR_NAME } = require('../../collections-manager/constants');

module.exports = {
  command: 'list [<type_or_collection_name>] [<collection_name_if_type_provided>]',
  describe: `Lists collections or plugins.
Default: Shows all downloaded collection names.
If <type_or_collection_name> is a collection name, lists available plugins in that collection.
If <type_or_collection_name> is a type, it can be 'collections', 'all', 'available'.`,
  builder: (yargsCmd) => {
    yargsCmd
      .positional('type_or_collection_name', {
        describe: `Either the type of items to list ('collections', 'all', 'available') or a specific collection name.`,
        type: 'string',
        default: 'collections',
      })
      .positional('collection_name_if_type_provided', {
        describe: 'Optional. Filter plugins by this collection name when a type like "all" or "available" is specified.',
        type: 'string',
      })
      .option('short', {
        alias: 's',
        type: 'boolean',
        describe: 'Display a condensed, short list (applies to listing collections).',
      })
      .epilogue(`Examples:
  md-to-pdf collection list                  (Lists all downloaded collection names)
  md-to-pdf collection list _user_added_plugins (Lists available plugins in the singletons directory)
  md-to-pdf collection list available          (Lists all available plugins from all collections)
  md-to-pdf collection list available my-coll  (Lists available plugins in 'my-coll')`);
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;
    let results;

    let typeFromArgs = args.type_or_collection_name;
    let collectionNameFromArgs = args.collection_name_if_type_provided;
    let determinedType = 'collections'; // Default
    let determinedCollectionName = null;

    const potentialCollectionNames = (await manager.listCollections('downloaded')).map(c => c.name);

    if (potentialCollectionNames.includes(typeFromArgs) || typeFromArgs === USER_ADDED_PLUGINS_DIR_NAME) {
        determinedType = 'available'; // When a collection name is given first, list its available plugins
        determinedCollectionName = typeFromArgs;
        if (collectionNameFromArgs) { // User provided two collection names? Or type and then collection name?
             console.warn(chalk.yellow(`Warning: Received two potential collection names. Using "${determinedCollectionName}" and ignoring "${collectionNameFromArgs}" for listing plugins.`));
        }
    } else if (['collections', 'all', 'available'].includes(typeFromArgs)) {
        determinedType = typeFromArgs;
        determinedCollectionName = collectionNameFromArgs; // This might be null, which is fine for 'collections' or 'all/available' (all collections)
    } else {
        // type_or_collection_name was not a known type or a known collection.
        // This could be an error or an attempt to list a non-existent collection.
        // The manager methods will handle non-existent collections gracefully.
        determinedType = 'available'; // Assume they meant to list plugins in a collection
        determinedCollectionName = typeFromArgs; // And this is the collection name
    }


    try {
      if (determinedType === 'collections') {
        if (determinedCollectionName) {
          console.warn(chalk.yellow("Warning: Specifying a collection name has no effect when listing 'collections'. Did you mean 'md-to-pdf collection list available <collection_name>'?"));
        }
        results = await manager.listCollections('downloaded');
        if (results.length === 0) {
          console.log(chalk.yellow("No collections downloaded."));
          return;
        }
        console.log(chalk.blue("\nDownloaded plugin collections:"));
        results.forEach(coll => {
          if (args.short) {
            let typeStr = 'N/A';
            if (coll.special_type === 'singleton_container') typeStr = 'Managed Directory';
            else if (coll.source) { // Check if coll.source is defined
                typeStr = coll.source.startsWith('http') || coll.source.endsWith('.git') ? 'Git' : 'Local Path';
            }

            let sourceDisplay = coll.source || 'N/A';
            console.log(
              `${chalk.greenBright(coll.name.padEnd(30))} ${chalk.yellow(`(${typeStr})`)} ${chalk.gray(sourceDisplay)}`
            );
          } else {
            if (coll.special_type === 'singleton_container') {
              console.log(chalk.cyanBright(`\n  Collection Name: ${chalk.yellow(coll.name)}`));
              console.log(chalk.gray(`    Type: Managed Directory (for user-added singleton plugins)`));
              console.log(chalk.gray(`    Managed Path: ${coll.source}`)); // Source for container is its own path
              console.log(chalk.blueBright(`    (To see individual singletons, run: md-to-pdf collection list ${USER_ADDED_PLUGINS_DIR_NAME})`));
            } else {
              console.log(chalk.greenBright(`\n  Collection Name: ${chalk.yellow(coll.name)}`));
              console.log(chalk.gray(`    Source: ${coll.source || 'N/A'}`));
              if(coll.added_on && coll.added_on !== 'N/A') console.log(chalk.gray(`    Added On: ${new Date(coll.added_on).toLocaleString()}`));
              if(coll.updated_on) console.log(chalk.gray(`    Updated On: ${new Date(coll.updated_on).toLocaleString()}`));
            }
          }
        });
      } else if ((determinedType === 'all' || determinedType === 'available') && determinedCollectionName) {
        results = await manager.listAvailablePlugins(determinedCollectionName);
        const inCollectionMsg = determinedCollectionName ? ` in collection "${chalk.cyan(determinedCollectionName)}"` : ' from all collections'; // Should always have collectionName here
        if (results.length === 0) {
          console.log(chalk.yellow(`No available plugins found${inCollectionMsg}.`));
          return;
        }
        console.log(chalk.blue(`\nAvailable plugins${inCollectionMsg}:`));
        results.forEach(p => {
          console.log(chalk.greenBright(`  - Plugin ID: ${chalk.yellow(p.plugin_id)}`));
          console.log(chalk.gray(`    Description: ${p.description}`));
          if (p.is_singleton) {
            console.log(chalk.gray(`    Original Source: ${p.original_source || 'N/A'}`));
            if (p.added_on) console.log(chalk.gray(`    Added On: ${new Date(p.added_on).toLocaleString()}`));
            if (p.updated_on) console.log(chalk.gray(`    Updated On: ${new Date(p.updated_on).toLocaleString()}`));
          }
          console.log(chalk.gray(`    Config Path: ${p.config_path}`));
          if (p.metadata_error) console.log(chalk.red(`    Metadata Note: ${p.metadata_error}`));
        });
      } else if ((determinedType === 'all' || determinedType === 'available') && !determinedCollectionName) {
        results = await manager.listAvailablePlugins(null);
         if (results.length === 0) {
          console.log(chalk.yellow(`No available plugins found in any collection.`));
          return;
        }
        console.log(chalk.blue(`\nAll available plugins from all collections:`));
        const groupedByCollection = results.reduce((acc, p) => {
            acc[p.collection] = acc[p.collection] || [];
            acc[p.collection].push(p);
            return acc;
        }, {});

        Object.keys(groupedByCollection).sort().forEach(collName => {
            console.log(chalk.cyanBright(`\n  From Collection: ${chalk.yellow(collName)}`));
            groupedByCollection[collName].forEach(p => {
                console.log(chalk.greenBright(`    - Plugin ID: ${chalk.yellow(p.plugin_id)}`));
                console.log(chalk.gray(`      Description: ${p.description}`));
                if (p.is_singleton) { // Check if p.is_singleton is true
                    console.log(chalk.gray(`      Original Source: ${p.original_source || 'N/A'}`));
                    if (p.added_on) console.log(chalk.gray(`      Added On: ${new Date(p.added_on).toLocaleString()}`));
                    if (p.updated_on) console.log(chalk.gray(`      Updated On: ${new Date(p.updated_on).toLocaleString()}`));
                }
                console.log(chalk.gray(`      Config Path: ${p.config_path}`));
                if (p.metadata_error) console.log(chalk.red(`      Metadata Note: ${p.metadata_error}`));
            });
        });
      } else {
        console.log(chalk.yellow(`Invalid arguments for 'collection list'. Please use 'md-to-pdf collection list --help' for usage.`));
      }
    } catch (error) {
      console.error(chalk.red(`ERROR in 'collection list' command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  },
};
