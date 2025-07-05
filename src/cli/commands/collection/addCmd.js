// src/cli/commands/collection/addCmd.js
const chalk = require('chalk');

module.exports = {
  command: 'add <url_or_path>',
  describe: 'add a new plugin collection by URL or path',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('url_or_path', {
        describe: 'source URL or local path of the collection',
        type: 'string',
        demandOption: true,
      })
      .option('name', {
        alias: 'n',
        describe: 'set a custom name for the collection',
        type: 'string'
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;

    try {
      await manager.addCollection(args.url_or_path, { name: args.name });
    } catch (error) {
      console.error(chalk.red(`\nERROR in 'md-to-pdf collection add' command execution: ${error.message}`));
      process.exit(1);
    }
  }
};
