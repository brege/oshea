// src/commands/collection/removeCmd.js
const chalk = require('chalk');

module.exports = {
  command: 'remove <collection_name>',
  describe: 'remove a downloaded plugin collection',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('collection_name', {
        describe: 'name of the collection to remove',
        type: 'string',
        demandOption: true,
      })
      .option('force', {
        alias: 'f',
        describe: 'force removal by disabling its plugins first',
        type: 'boolean',
        default: false
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;

    console.log(chalk.blueBright(`md-to-pdf collection: Attempting to remove collection...`));
    console.log(`  Collection Name: ${chalk.cyan(args.collection_name)}`);
    if (args.force) {
      console.log(chalk.yellow('  Force option is enabled. Will attempt to disable plugins from this collection first.'));
    }
    try {
      await manager.removeCollection(args.collection_name, { force: args.force });
    } catch (error) {
      console.error(chalk.red(`\nERROR in 'collection remove' command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
