// src/commands/collection/removeCmd.js
const chalk = require('chalk');
// CollectionsManager instance will be passed via args.manager

module.exports = {
  command: 'remove <collection_name>',
  describe: 'Removes a downloaded plugin collection. Use --force to also disable its plugins.',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('collection_name', {
        describe: 'The name of the collection to remove.',
        type: 'string',
        demandOption: true,
      })
      .option('force', {
        alias: 'f',
        describe: 'Forcibly remove the collection, automatically disabling any of its enabled plugins first.',
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
      // The removeCollection method in CM handles console output
      await manager.removeCollection(args.collection_name, { force: args.force });
    } catch (error) {
      console.error(chalk.red(`\nERROR in 'collection remove' command: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
