// src/commands/collection/listCmd.js
const chalk = require('chalk');
// CollectionsManager instance will be passed via args.manager

module.exports = {
  command: 'list',
  describe: 'Lists all downloaded plugin collection names, their sources, and status.',
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
      const collections = await manager.listCollections('downloaded'); // This now returns richer objects
      if (collections.length === 0) {
        console.log(chalk.yellow("No collections downloaded."));
        return;
      }
      console.log(chalk.blue("\nDownloaded plugin collections:"));
      collections.forEach(coll => {
        let sourceDisplay = coll.source || 'N/A';
        if (sourceDisplay.startsWith(manager.collRoot)) { // Check if it's a local path within COLL_ROOT (less likely for a 'source')
            sourceDisplay = `Local (copied to collection)`; // Or some other indicator for local non-git
        } else if (!/^(http(s)?:\/\/|git@)/.test(sourceDisplay) && !sourceDisplay.endsWith('.git') && sourceDisplay !== 'N/A (Metadata missing or unreadable)') {
            sourceDisplay = `Local Path: ${chalk.gray(sourceDisplay)}`;
        } else {
            sourceDisplay = `Git: ${chalk.gray(sourceDisplay)}`;
        }

        console.log(`  - Name: ${chalk.yellowBright(coll.name)}`);
        console.log(`    Source: ${sourceDisplay}`);
        console.log(`    Added: ${coll.added_on || 'N/A'}`);
        if (coll.updated_on) {
          console.log(`    Last Updated: ${coll.updated_on}`);
        }
        console.log(chalk.white("  ---"));
      });

    } catch (error) {
      console.error(chalk.red(`\nERROR in 'collection list' command execution: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
