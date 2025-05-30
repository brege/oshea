// src/commands/collectionCmd.js
const addCmd = require('./collection/addCmd');
const listCmd = require('./collection/listCmd');
const removeCmd = require('./collection/removeCmd');
const updateCmd = require('./collection/updateCmd');

module.exports = {
  command: 'collection <subcommand>',
  describe: 'Manage plugin collections.',
  builder: (yargs) => {
    return yargs
      .command(addCmd)
      .command(listCmd)
      .command(removeCmd)
      .command(updateCmd)
      .demandCommand(1, 'You need to specify a collection subcommand (e.g., add, list, remove, update).')
      .strict();
  },
  handler: (argv) => {
    // This top-level handler for 'collection' won't be called if a subcommand is matched.
  }
};
