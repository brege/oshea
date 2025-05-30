// src/commands/collection/listCmd.js
const chalk = require('chalk');
// CollectionsManager instance will be passed via args.manager

module.exports = {
  command: 'list',
  describe: 'Lists all downloaded plugin collection names.',
  builder: (yargsCmd) => {
    // No specific options for this list variant
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;

    try {
      // The listCollections method (type 'downloaded') in CM handles console output
      const collections = await manager.listCollections('downloaded');
      if (collections.length === 0) {
        console.log(chalk.yellow("No collections downloaded."));
        return;
      }
      console.log(chalk.blue("\nDownloaded plugin collections:"));
      collections.forEach(name => console.log(chalk.greenBright(`  - ${name}`)));

    } catch (error) {
      console.error(chalk.red(`\nERROR in 'collection list' command execution: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
