// src/commands/collectionCmd.js
const chalk = require('chalk'); // Added for the epilogue
const addCmd = require('./collection/addCmd');
const listCmd = require('./collection/listCmd');
const removeCmd = require('./collection/removeCmd');
const updateCmd = require('./collection/updateCmd');
const archetypeCmd = require('./collection/archetypeCmd'); // Import the new command

module.exports = {
  command: 'collection <subcommand>',
  describe: 'Manage plugin collections (Note: "collection archetype" is deprecated).',
  builder: (yargs) => {
    return yargs
      .command(addCmd)
      .command(listCmd)
      .command(removeCmd)
      .command(updateCmd)
      .command(archetypeCmd) // Register the archetype command
      .demandCommand(1, 'You need to specify a collection subcommand (e.g., add, list, remove, update).')
      .strict()
      .epilogue(chalk.yellow('For creating new plugin instances from existing ones, prefer "md-to-pdf plugin create <newName> --from <source>".'));
  },
  handler: (argv) => {
    // This top-level handler for 'collection' won't be called if a subcommand is matched.
  }
};
